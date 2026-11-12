"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { AuthScreen, type AuthUser } from "@/components/auth-screen";
import { AppWorkspace } from "@/components/app-workspace";
import { messages, type Locale } from "@/lib/messages";
import {
  getQueuedAnswers,
  clearCachedSnapshot,
  loadLastSnapshot,
  queueAnswer,
  removeQueuedAnswer,
  saveSnapshot,
  type PendingAnswer,
} from "@/lib/offline";
import type { AppSnapshot, GameRecord } from "@/lib/types";

type AuthResponse = { user: AuthUser | null; googleAuthEnabled: boolean };

function applyQueuedAnswers(snapshot: AppSnapshot, queued: PendingAnswer[]): AppSnapshot {
  return {
    ...snapshot,
    games: snapshot.games.map((game) => {
      const localEvents = queued.filter((event) => event.gameId === game.id);
      if (!localEvents.length) return game;
      const questions = game.questions.map((question) => {
        const event = localEvents.find((item) => item.gameQuestionId === question.id);
        if (!event || question.answer) return question;
        const player = game.players.find((item) => item.id === event.playerId);
        const option = question.options.find((item) => item.id === event.selectedOptionId);
        if (!player || !option) return question;
        return {
          ...question,
          answer: {
            player,
            selectedOptionId: option.id,
            selectedText: option.text,
          },
        };
      });
      return { ...game, status: "in_progress", questions };
    }),
  };
}

function offlineSnapshot(snapshot: AppSnapshot): AppSnapshot {
  return {
    ...snapshot,
    users: [snapshot.user],
    topics: [],
    questions: [],
    games: snapshot.games.filter((game) => game.status === "in_progress"),
    leaderboard: [],
  };
}

async function fetchSnapshot() {
  const response = await fetch("/api/app", { cache: "no-store" });
  const data = (await response.json()) as AppSnapshot & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Could not load the workspace.");
  return data;
}

export function SynaptiQuizApp({ locale }: { locale: Locale }) {
  const [user, setUser] = useState<AppSnapshot["user"] | null>(null);
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [toast, setToast] = useState("");
  const [view, setView] = useState("dashboard");
  const [gameId, setGameId] = useState<string | null>(null);
  const { setTheme } = useTheme();
  const router = useRouter();
  const t = messages[locale];

  async function refresh() {
    const data = await fetchSnapshot();
    setSnapshot(data);
    setUser(data.user);
    setTheme(data.user.theme);
    await saveSnapshot(data.user.id, offlineSnapshot(data));
    setPendingCount((await getQueuedAnswers()).length);
    return data;
  }

  async function syncQueued() {
    if (!navigator.onLine) return;
    try {
      const queued = await getQueuedAnswers();
      for (const event of queued) {
        const response = await fetch("/api/app", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "game.answer", ...event }),
        });
        if (!response.ok) {
          const result = (await response.json().catch(() => ({}))) as { error?: string };
          setToast(result.error ?? t.networkError);
          break;
        }
        await removeQueuedAnswer(event.clientEventId);
      }
      const data = await fetchSnapshot();
      setSnapshot(data);
      setUser(data.user);
      await saveSnapshot(data.user.id, offlineSnapshot(data));
      setPendingCount((await getQueuedAnswers()).length);
    } catch {
      setToast(t.networkError);
    }
  }

  const refreshFromEffect = useEffectEvent(refresh);
  const syncFromEffect = useEffectEvent(syncQueued);
  const setThemeFromEffect = useEffectEvent(setTheme);
  const messageFromEffect = useEffectEvent((key: "networkError" | "offlineUnavailable") => messages[locale][key]);

  useEffect(() => {
    let active = true;
    async function boot() {
      setOnline(navigator.onLine);
      if (navigator.onLine) {
        try {
          const authResponse = await fetch("/api/auth", { cache: "no-store" });
          const auth = (await authResponse.json()) as AuthResponse;
          if (!active) return;
          setGoogleAuthEnabled(auth.googleAuthEnabled);
          if (auth.user) await refreshFromEffect();
        } catch {
          setToast(messageFromEffect("networkError"));
        }
      } else {
        try {
          const cached = await loadLastSnapshot<AppSnapshot>();
          if (!active) return;
          if (cached) {
            const queued = await getQueuedAnswers();
            setSnapshot(applyQueuedAnswers(cached, queued));
            setUser(cached.user);
            setPendingCount(queued.length);
            setThemeFromEffect(cached.user.theme);
          }
        } catch {
          setToast(messageFromEffect("offlineUnavailable"));
        }
      }
      if (active) setLoading(false);
    }
    void boot();
    const goOffline = () => setOnline(false);
    const goOnline = () => {
      setOnline(true);
      void syncFromEffect();
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    return () => {
      active = false;
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function authenticate(authUser: AuthUser) {
    setUser(authUser as AppSnapshot["user"]);
    setTheme(authUser.theme);
    try {
      await refresh();
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : t.networkError);
    }
  }

  async function mutate(payload: Record<string, unknown>) {
    if (!navigator.onLine) throw new Error(t.offline);
    const response = await fetch("/api/app", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { error?: string; id?: string };
    if (!response.ok) throw new Error(result.error ?? t.networkError);
    const data = await refresh();
    return { result, data };
  }

  async function answerQuestion(game: GameRecord, questionId: string, playerId: string, optionId: string) {
    const event: PendingAnswer = {
      clientEventId: crypto.randomUUID(),
      gameId: game.id,
      gameQuestionId: questionId,
      playerId,
      selectedOptionId: optionId,
      createdAt: Date.now(),
    };
    if (navigator.onLine) {
      let response: Response | null = null;
      try {
        response = await fetch("/api/app", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "game.answer", ...event }),
        });
      } catch {
        setOnline(false);
      }
      if (response) {
        const result = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(result.error ?? t.networkError);
        await refresh();
        return;
      }
    }
    await queueAnswer(event);
    const queued = await getQueuedAnswers();
    setPendingCount(queued.length);
    setSnapshot((current) => current && applyQueuedAnswers(current, [event]));
    setOnline(false);
  }

  async function logout() {
    const queued = await getQueuedAnswers();
    if (queued.length && !navigator.onLine) {
      setToast(t.offline);
      return;
    }
    if (queued.length) {
      await syncQueued();
      if ((await getQueuedAnswers()).length) return;
    }
    if (navigator.onLine) {
      await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    }
    if (user) await clearCachedSnapshot(user.id);
    setSnapshot(null);
    setUser(null);
    setGameId(null);
    setView("dashboard");
  }

  if (loading) return <main className="auth-main">{t.loading}</main>;
  if (!user || !snapshot) {
    return <AuthScreen locale={locale} googleAuthEnabled={googleAuthEnabled} onAuthenticated={authenticate} />;
  }

  return (
    <>
      <AppWorkspace
        locale={locale}
        snapshot={snapshot}
        view={view}
        setView={setView}
        gameId={gameId}
        setGameId={setGameId}
        onMutation={mutate}
        onAnswer={answerQuestion}
        onLogout={logout}
        onLocaleChange={(nextLocale) => router.push(`/${nextLocale}`)}
        onThemeChange={setTheme}
        online={online}
        pendingCount={pendingCount}
      />
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}