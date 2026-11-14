import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { isPrismaUniqueConstraintError, prisma } from "@/lib/db";
import { hasFairQuestionCount, playerIndexForTurn, pointsForAnswer, sharedRanks } from "@/lib/game-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicUserSelect = {
  id: true,
  username: true,
  avatar: true,
  role: true,
  isGuest: true,
  locale: true,
  theme: true,
  defaultLanguage: true,
} satisfies Prisma.UserSelect;

const gameInclude = {
  creator: { select: publicUserSelect },
  players: {
    orderBy: { position: "asc" },
    include: { user: { select: publicUserSelect } },
  },
  questions: {
    orderBy: { position: "asc" },
    include: {
      variant: { select: { questionId: true } },
      options: { orderBy: { position: "asc" } },
      answer: { include: { player: { select: publicUserSelect }, selectedOption: true } },
    },
  },
} satisfies Prisma.GameInclude;

type GameWithDetails = Prisma.GameGetPayload<{ include: typeof gameInclude }>;
type JsonRecord = Record<string, unknown>;

class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const answerInputSchema = z.object({
  text: z.string().trim().min(1).max(240),
  correct: z.boolean(),
  plausibility: z.number().int().min(0).max(100),
});

const variantInputSchema = z.object({
  language: z.enum(["en", "it"]),
  text: z.string().trim().min(5).max(500),
  answers: z.array(answerInputSchema).length(4).refine(
    (answers) => answers.filter((answer) => answer.correct).length === 1,
    "Exactly one answer must be correct.",
  ),
});

const questionInputSchema = z.object({
  id: z.string().optional(),
  topicId: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  variants: z.array(variantInputSchema).length(2).refine(
    (variants) => new Set(variants.map((variant) => variant.language)).size === 2,
    "Add one English and one Italian version.",
  ),
});

const gameInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  language: z.enum(["en", "it"]),
  playerIds: z.array(z.string()).min(1),
  questionIds: z.array(z.string()).min(1),
});

function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Invalid input.");
  return parsed.data;
}

function requireRole(user: { role: string }, allowed: string[]) {
  if (!allowed.includes(user.role)) throw new ApiError("You do not have permission to do that.", 403);
}

function serializeGame(game: GameWithDetails, canReview: boolean) {
  const reveal = game.status === "completed" && canReview;
  return {
    id: game.id,
    name: game.name,
    language: game.language,
    status: game.status,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    creator: game.creator,
    players: game.players.map((entry) => ({ ...entry.user, position: entry.position })),
    questions: game.questions.map((question) => ({
      id: question.id,
      questionId: question.variant.questionId,
      position: question.position,
      text: question.questionText,
      topic: question.topicText,
      difficulty: question.difficulty,
      options: question.options.map((option) => ({
        id: option.id,
        position: option.position,
        text: option.text,
        plausibility: option.plausibility,
        correct: reveal ? option.correct : undefined,
      })),
      answer: question.answer
        ? {
            player: question.answer.player,
            selectedOptionId: question.answer.selectedOptionId,
            selectedText: question.answer.selectedOption.text,
            correct: reveal ? question.answer.correct : undefined,
            points: reveal ? question.answer.points : undefined,
          }
        : null,
    })),
  };
}

async function getSnapshot(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  const isContentManager = user.role === "admin" || user.role === "editor";
  const visibleGames = await prisma.game.findMany({
    include: gameInclude,
    orderBy: { updatedAt: "desc" },
  });
  const [users, topics, questionSets, completedGames] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, select: publicUserSelect, orderBy: { username: "asc" } }),
    isContentManager ? prisma.topic.findMany({ orderBy: { text: "asc" } }) : Promise.resolve([]),
    isContentManager
      ? prisma.questionSet.findMany({
          where: { isActive: true },
          include: {
            topic: true,
            variants: { include: { answers: { orderBy: { position: "asc" } } } },
          },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.game.findMany({
      where: { status: "completed" },
      include: {
        players: { include: { user: { select: publicUserSelect } } },
        questions: { include: { answer: true } },
      },
    }),
  ]);

  const totals = new Map<string, { id: string; username: string; avatar: string | null; points: number; wins: number; games: number }>();
  for (const game of completedGames) {
    const scores = new Map<string, number>();
    for (const player of game.players) {
      scores.set(player.userId, 0);
      const current = totals.get(player.userId) ?? {
        id: player.user.id,
        username: player.user.username,
        avatar: player.user.avatar,
        points: 0,
        wins: 0,
        games: 0,
      };
      current.games += 1;
      totals.set(player.userId, current);
    }
    for (const question of game.questions) {
      if (!question.answer) continue;
      scores.set(question.answer.playerId, (scores.get(question.answer.playerId) ?? 0) + question.answer.points);
      const total = totals.get(question.answer.playerId);
      if (total) total.points += question.answer.points;
    }
    const highScore = Math.max(0, ...scores.values());
    for (const [playerId, score] of scores) {
      if (score === highScore) {
        const total = totals.get(playerId);
        if (total) total.wins += 1;
      }
    }
  }

  for (const game of visibleGames) {
    for (const player of game.players) {
      if (!totals.has(player.userId)) {
        totals.set(player.userId, {
          id: player.user.id,
          username: player.user.username,
          avatar: player.user.avatar,
          points: 0,
          wins: 0,
          games: 0,
        });
      }
      const total = totals.get(player.userId)!;
      if (game.status !== "draft" && !completedGames.some((completed) => completed.id === game.id)) {
        total.games += 1;
      }
    }
  }

  const ownGames = visibleGames.filter((game) => game.players.some((player) => player.userId === user.id));
  const manageableGames = visibleGames.filter((game) => game.creatorId === user.id || game.players.some((player) => player.userId === user.id));
  const ownTotal = totals.get(user.id) ?? { points: 0, wins: 0, games: 0 };
  const leaderboard = sharedRanks([...totals.values()].sort((left, right) => left.username.localeCompare(right.username)));

  return {
    user,
    users,
    topics,
    questions: questionSets,
    games: visibleGames.map((game) =>
      serializeGame(game, user.role !== "player" || game.creatorId === user.id || game.players.some((player) => player.userId === user.id)),
    ),
    manageableGameIds: manageableGames.map((game) => game.id),
    stats: {
      points: ownTotal.points,
      wins: ownTotal.wins,
      gamesPlayed: ownGames.filter((game) => game.status !== "draft").length,
      gamesAgainstOthers: ownGames.filter((game) => game.status !== "draft" && game.players.length > 1).length,
    },
    leaderboard,
  };
}

async function resolveGameQuestions(
  tx: Prisma.TransactionClient,
  questionIds: string[],
  language: string,
  playerIds: string[],
) {
  const uniqueQuestionIds = [...new Set(questionIds)];
  if (uniqueQuestionIds.length !== questionIds.length) throw new ApiError("Remove duplicate questions.");
  if (!hasFairQuestionCount(uniqueQuestionIds.length, playerIds.length)) {
    throw new ApiError("The number of questions must be divisible by the number of players.");
  }
  const questionSets = await tx.questionSet.findMany({
    where: { id: { in: uniqueQuestionIds }, isActive: true },
    include: { topic: true, variants: { where: { language }, include: { answers: { orderBy: { position: "asc" } } } } },
  });
  const byId = new Map(questionSets.map((question) => [question.id, question]));
  const selected = uniqueQuestionIds.map((id) => byId.get(id));
  if (selected.some((question) => !question?.variants[0] || question.variants[0].answers.length !== 4)) {
    throw new ApiError("Every selected question needs four answers in the game language.");
  }
  return selected as NonNullable<(typeof selected)[number]>[];
}

async function createGame(
  tx: Prisma.TransactionClient,
  creatorId: string,
  input: z.infer<typeof gameInputSchema>,
) {
  const playerIds = [...new Set(input.playerIds)];
  if (!playerIds.length) throw new ApiError("Select at least one player.");
  const players = await tx.user.findMany({ where: { id: { in: playerIds }, isActive: true } });
  if (players.length !== playerIds.length) throw new ApiError("One or more selected players are unavailable.");
  const selectedQuestions = await resolveGameQuestions(tx, input.questionIds, input.language, playerIds);
  return tx.game.create({
    data: {
      name: input.name,
      language: input.language,
      creatorId,
      players: { create: playerIds.map((userId, position) => ({ userId, position })) },
      questions: {
        create: selectedQuestions.map((question, position) => {
          const variant = question.variants[0];
          return {
            variantId: variant.id,
            position,
            questionText: variant.text,
            topicText: question.topic.text,
            difficulty: question.difficulty,
            options: {
              create: variant.answers.map((answer) => ({
                position: answer.position,
                text: answer.text,
                correct: answer.correct,
                plausibility: answer.plausibility,
              })),
            },
          };
        }),
      },
    },
    select: { id: true },
  });
}

async function updateQuestion(input: z.infer<typeof questionInputSchema>) {
  if (!input.id) throw new ApiError("Question id is required.");
  const question = await prisma.questionSet.findUnique({ where: { id: input.id } });
  if (!question) throw new ApiError("Question not found.", 404);
  const topic = await prisma.topic.findUnique({ where: { id: input.topicId } });
  if (!topic) throw new ApiError("Choose a valid topic.");

  await prisma.$transaction(async (tx) => {
    await tx.questionSet.update({ where: { id: input.id }, data: { topicId: input.topicId, difficulty: input.difficulty } });
    for (const variantInput of input.variants) {
      const variant = await tx.questionVariant.upsert({
        where: { questionId_language: { questionId: input.id!, language: variantInput.language } },
        create: { questionId: input.id!, language: variantInput.language, text: variantInput.text },
        update: { text: variantInput.text },
      });
      for (const [position, answerInput] of variantInput.answers.entries()) {
        await tx.answer.upsert({
          where: { variantId_position: { variantId: variant.id, position } },
          create: { ...answerInput, variantId: variant.id, position },
          update: answerInput,
        });
      }
    }
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  return NextResponse.json(await getSnapshot(user));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    const input = (await request.json()) as JsonRecord;
    const action = input.action;
    let result: unknown = { ok: true };

    if (action === "settings.update") {
      const settings = parseOrThrow(
        z.object({ locale: z.enum(["en", "it"]), theme: z.enum(["light", "dark"]), defaultLanguage: z.enum(["en", "it"]) }),
        input,
      );
      await prisma.user.update({ where: { id: user.id }, data: settings });
    } else if (action === "topic.create" || action === "topic.update") {
      requireRole(user, ["admin", "editor"]);
      const topicInput = parseOrThrow(
        z.object({ id: z.string().optional(), text: z.string().trim().min(2).max(60), image: z.string().url().or(z.literal("")).optional() }),
        input,
      );
      if (action === "topic.create") {
        const topic = await prisma.topic.create({ data: { text: topicInput.text, image: topicInput.image || null } });
        result = { id: topic.id };
      } else {
        if (!topicInput.id) throw new ApiError("Topic id is required.");
        await prisma.topic.update({ where: { id: topicInput.id }, data: { text: topicInput.text, image: topicInput.image || null } });
      }
    } else if (action === "question.create" || action === "question.update") {
      requireRole(user, ["admin", "editor"]);
      const questionInput = parseOrThrow(questionInputSchema, input);
      if (!(await prisma.topic.findUnique({ where: { id: questionInput.topicId } }))) throw new ApiError("Choose a valid topic.");
      if (action === "question.create") {
        const question = await prisma.questionSet.create({
          data: {
            topicId: questionInput.topicId,
            difficulty: questionInput.difficulty,
            variants: {
              create: questionInput.variants.map((variant) => ({
                language: variant.language,
                text: variant.text,
                answers: {
                  create: variant.answers.map((answer, position) => ({ ...answer, position })),
                },
              })),
            },
          },
        });
        result = { id: question.id };
      } else {
        await updateQuestion(questionInput);
      }
    } else if (action === "question.delete") {
      requireRole(user, ["admin", "editor"]);
      const { id } = parseOrThrow(z.object({ id: z.string() }), input);
      const linked = await prisma.gameQuestion.count({ where: { variant: { questionId: id } } });
      if (linked) await prisma.questionSet.update({ where: { id }, data: { isActive: false } });
      else await prisma.questionSet.delete({ where: { id } });
    } else if (action === "player.update" || action === "player.delete") {
      requireRole(user, ["admin"]);
      const playerInput = parseOrThrow(
        z.object({
          id: z.string(),
          username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9._-]+$/).optional(),
          avatar: z.string().url().or(z.literal("")).optional(),
          role: z.enum(["admin", "editor", "player"]).optional(),
        }),
        input,
      );
      const target = await prisma.user.findUnique({ where: { id: playerInput.id } });
      if (!target) throw new ApiError("Player not found.", 404);
      const removesAdmin = target.role === "admin" && (action === "player.delete" || playerInput.role !== undefined && playerInput.role !== "admin");
      if (removesAdmin) {
        const adminCount = await prisma.user.count({ where: { role: "admin", isActive: true } });
        if (adminCount <= 1) throw new ApiError("At least one active admin must remain.", 409);
      }
      if (action === "player.delete") {
        await prisma.user.update({ where: { id: target.id }, data: { isActive: false } });
      } else {
        await prisma.user.update({
          where: { id: target.id },
          data: {
            username: playerInput.username,
            avatar: playerInput.avatar || null,
            role: playerInput.role,
          },
        });
      }
    } else if (action === "game.create" || action === "game.update") {
      requireRole(user, ["admin", "editor"]);
      const gameInput = parseOrThrow(gameInputSchema, input);
      if (action === "game.create") {
        result = await prisma.$transaction((tx) => createGame(tx, user.id, gameInput));
      } else {
        const existing = await prisma.game.findUnique({ where: { id: gameInput.id } });
        if (!existing) throw new ApiError("Game not found.", 404);
        if (existing.status !== "draft") throw new ApiError("Only draft games can be edited.", 409);
        if (user.role !== "admin" && user.role !== "editor" && existing.creatorId !== user.id) {
          throw new ApiError("You cannot edit this game.", 403);
        }
        const playerIds = [...new Set(gameInput.playerIds)];
        const players = await prisma.user.findMany({ where: { id: { in: playerIds }, isActive: true } });
        if (players.length !== playerIds.length) throw new ApiError("One or more selected players are unavailable.");
        const selectedQuestions = await resolveGameQuestions(
          prisma,
          gameInput.questionIds,
          gameInput.language,
          playerIds,
        );
        await prisma.game.update({
          where: { id: existing.id },
          data: {
            name: gameInput.name,
            language: gameInput.language,
            players: { deleteMany: {}, create: playerIds.map((userId, position) => ({ userId, position })) },
            questions: {
              deleteMany: {},
              create: selectedQuestions.map((question, position) => {
                const variant = question.variants[0];
                return {
                  variantId: variant.id,
                  position,
                  questionText: variant.text,
                  topicText: question.topic.text,
                  difficulty: question.difficulty,
                  options: {
                    create: variant.answers.map((answer) => ({
                      position: answer.position,
                      text: answer.text,
                      correct: answer.correct,
                      plausibility: answer.plausibility,
                    })),
                  },
                };
              }),
            },
          },
        });
      }
    } else if (action === "game.delete") {
      requireRole(user, ["admin", "editor"]);
      const { id } = parseOrThrow(z.object({ id: z.string() }), input);
      const game = await prisma.game.findUnique({ where: { id } });
      if (!game) throw new ApiError("Game not found.", 404);
      if (user.role !== "admin" && game.status !== "draft") throw new ApiError("Only admins can delete games after they start.", 403);
      await prisma.game.delete({ where: { id } });
    } else if (action === "game.duplicate") {
      const { id, name, language, playerIds, questionIds } = parseOrThrow(
        z.object({
          id: z.string(),
          name: z.string().trim().min(2).max(80),
          language: z.enum(["en", "it"]).optional(),
          playerIds: z.array(z.string()).optional(),
          questionIds: z.array(z.string()).optional(),
        }),
        input,
      );
      const source = await prisma.game.findUnique({
        where: { id },
        include: { players: true, questions: { include: { variant: true } } },
      });
      if (!source) throw new ApiError("Game not found.", 404);
      const duplicateInput = {
        name,
        language: language ?? (source.language as "en" | "it"),
        playerIds: playerIds ?? source.players.map((player) => player.userId),
        questionIds: questionIds ?? source.questions.map((question) => question.variant.questionId),
      };
      result = await prisma.$transaction((tx) => createGame(tx, user.id, duplicateInput));
    } else if (action === "game.start") {
      const { id } = parseOrThrow(z.object({ id: z.string() }), input);
      const game = await prisma.game.findUnique({ where: { id }, include: { players: true, questions: true } });
      if (!game) throw new ApiError("Game not found.", 404);
      if (game.creatorId !== user.id && !game.players.some((player) => player.userId === user.id)) {
        throw new ApiError("Only the creator or a listed player can start this game.", 403);
      }
      if (game.status === "draft") {
        await prisma.game.update({ where: { id }, data: { status: "in_progress" } });
      }
    } else if (action === "game.answer") {
      const answerInput = parseOrThrow(
        z.object({
          gameId: z.string(),
          gameQuestionId: z.string(),
          playerId: z.string(),
          selectedOptionId: z.string(),
          clientEventId: z.string().min(12).max(80),
        }),
        input,
      );
      result = await prisma.$transaction(async (tx) => {
        const priorEvent = await tx.gameAnswer.findUnique({ where: { clientEventId: answerInput.clientEventId } });
        if (priorEvent) {
          if (priorEvent.gameQuestionId !== answerInput.gameQuestionId || priorEvent.playerId !== answerInput.playerId) {
            throw new ApiError("This offline event id has already been used.", 409);
          }
          return { ok: true, duplicate: true };
        }

        const game = await tx.game.findUnique({
          where: { id: answerInput.gameId },
          include: { players: { orderBy: { position: "asc" } }, questions: { include: { answer: true, options: true } } },
        });
        if (!game) throw new ApiError("Game not found.", 404);
        if (game.status !== "in_progress") throw new ApiError("This game is not accepting answers.", 409);
        if (game.creatorId !== user.id && !game.players.some((player) => player.userId === user.id)) {
          throw new ApiError("You are not allowed to play this game.", 403);
        }
        const question = game.questions.find((item) => item.id === answerInput.gameQuestionId);
        if (!question || question.answer) throw new ApiError("That question has already been answered.", 409);
        const answeredCount = game.questions.filter((item) => item.answer).length;
        const currentPlayer = game.players[playerIndexForTurn(answeredCount, game.players.length)];
        if (!currentPlayer || currentPlayer.userId !== answerInput.playerId) {
          throw new ApiError("It is another player's turn.", 409);
        }
        const option = question.options.find((item) => item.id === answerInput.selectedOptionId);
        if (!option) throw new ApiError("Choose one of this question's answers.");

        const claimedTurn = await tx.game.updateMany({
          where: { id: game.id, status: "in_progress", turnVersion: game.turnVersion },
          data: { turnVersion: { increment: 1 } },
        });
        if (claimedTurn.count !== 1) throw new ApiError("The game changed while this answer was being saved. Refresh and retry.", 409);

        const correct = option.correct;
        const points = pointsForAnswer(question.difficulty, correct);
        await tx.gameAnswer.create({
          data: {
            gameQuestionId: question.id,
            playerId: currentPlayer.userId,
            selectedOptionId: option.id,
            correct,
            points,
            clientEventId: answerInput.clientEventId,
          },
        });
        if (answeredCount + 1 === game.questions.length) {
          await tx.game.update({ where: { id: game.id }, data: { status: "completed" } });
        }
        return { ok: true, correct, points, duplicate: false };
      });
    } else {
      throw new ApiError("Unknown action.");
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (isPrismaUniqueConstraintError(error)) {
      return NextResponse.json({ error: "That record already exists." }, { status: 409 });
    }
    console.error("SynaptiQuiz API error", error);
    return NextResponse.json({ error: "The request could not be completed." }, { status: 500 });
  }
}