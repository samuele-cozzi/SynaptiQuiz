'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, increment, getDoc } from 'firebase/firestore';
import { Game, Player, Question, Answer } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Trophy } from 'lucide-react';

const POINTS_MAP: Record<number, number> = {
    1: 10,
    2: 20,
    3: 50,
    4: 100,
    5: 150
};

function GameContent() {
    const searchParams = useSearchParams();
    const gameId = searchParams.get('id');

    const { player: currentUser } = useAuth();

    const [game, setGame] = useState<Game | null>(null);
    const [players, setPlayers] = useState<Record<string, Player>>({});
    const [questions, setQuestions] = useState<Record<string, Question>>({});
    const [loading, setLoading] = useState(true);

    // Local state for "Answering" phase if we want to show UI before submitting
    const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

    useEffect(() => {
        if (!gameId) return;

        // Listen to Game
        const unsub = onSnapshot(doc(db, 'games', gameId), async (docSnap) => {
            if (docSnap.exists()) {
                const g = docSnap.data() as Game;
                setGame(g);

                // Fetch static data if not loaded
                // Optimization: checking if we already have players/questions could be better but this is fine for now
                // We need to fetch ALL referenced players/questions to render UI
                if (loading) {
                    const pSnaps = await Promise.all(g.playerIds.map(pid => getDoc(doc(db, 'players', pid))));
                    const pMap: Record<string, Player> = {};
                    pSnaps.forEach(s => { if (s.exists()) pMap[s.id] = s.data() as Player; });
                    setPlayers(pMap);

                    const qSnaps = await Promise.all(g.questionIds.map(qid => getDoc(doc(db, 'questions', qid))));
                    const qMap: Record<string, Question> = {};
                    qSnaps.forEach(s => { if (s.exists()) qMap[s.id] = s.data() as Question; });
                    setQuestions(qMap);
                    setLoading(false);
                }
            }
        });
        return () => unsub();
    }, [gameId, loading]);

    const handleStartGame = async () => {
        if (!game) return;
        await updateDoc(doc(db, 'games', game.id), {
            status: 'IN_PROGRESS',
            currentTurnPlayerId: game.playerIds[0] // First player starts
        });
    };

    const handleSelectQuestion = (qId: string) => {
        // Only current player can select
        if (game?.currentTurnPlayerId !== currentUser?.id) return;
        setSelectedQuestionId(qId);
    };

    const handleAnswer = async (answer: Answer) => {
        if (!game || !currentUser || !selectedQuestionId) return;

        const question = questions[selectedQuestionId];
        const isCorrect = answer.correct;
        const points = isCorrect ? POINTS_MAP[question.difficulty] : 0;

        // Update Game State
        // 1. Add history
        // 2. Update status (remove question from pool logic? Or just mark used?)
        //    Actually we should keep track of "Used Questions". 
        //    The `history` field tracks executed turns. 
        //    "Choosing a question... until there are no more questions"

        // Determine Next Player
        const currentPlayerIdx = game.playerIds.indexOf(currentUser.id);
        const nextPlayerIdx = (currentPlayerIdx + 1) % game.playerIds.length;
        const nextPlayerId = game.playerIds[nextPlayerIdx];

        const historyItem = {
            questionId: selectedQuestionId,
            playerId: currentUser.id,
            correct: isCorrect,
            points,
            timestamp: Date.now()
        };

        const usedQuestions = [...(game.history || []).map(h => h.questionId), selectedQuestionId];
        const isGameOver = usedQuestions.length >= game.questionIds.length;

        const updates: any = {
            history: arrayUnion(historyItem),
            [`scores.${currentUser.id}`]: increment(points),
            currentTurnPlayerId: isGameOver ? null : nextPlayerId,
            status: isGameOver ? 'COMPLETED' : 'IN_PROGRESS'
        };

        // Optimistic UI clear
        setSelectedQuestionId(null);

        await updateDoc(doc(db, 'games', game.id), updates);
    };

    if (!gameId) return <div className="p-8">No Game ID provided</div>;
    if (loading || !game) return <div className="flex justify-center p-8"><span className="loading">Loading Arena...</span></div>;

    // VIEW: COMPLETED - LEADERBOARD
    if (game.status === 'COMPLETED') {
        const sortedPlayers = Object.entries(game.scores)
            .sort(([, a], [, b]) => b - a)
            .map(([pid, score]) => ({ player: players[pid], score }));

        return (
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-xl p-8 text-white shadow-lg text-center">
                    <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-100" />
                    <h1 className="text-4xl font-bold mb-2">Game Over!</h1>
                    <p className="text-xl opacity-90">Questions exhausted. Here are the results.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader><CardTitle>Leaderboard</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {sortedPlayers.map(({ player, score }, idx) => (
                                    <div key={player.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-600'}`}>
                                                {idx + 1}
                                            </div>
                                            <img src={player.avatarUrl} className="w-10 h-10 rounded-full bg-gray-200" alt="" />
                                            <span className="font-bold text-gray-900">{player.username}</span>
                                        </div>
                                        <span className="text-2xl font-bold text-indigo-600">{score} pts</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Game History</CardTitle></CardHeader>
                        <CardContent className="max-h-96 overflow-y-auto">
                            <div className="space-y-2">
                                {game.history?.map((h, i) => {
                                    const q = questions[h.questionId];
                                    const p = players[h.playerId];
                                    const corrAns = q.answers.find(a => a.correct)?.text;
                                    return (
                                        <div key={i} className="text-sm p-3 border rounded">
                                            <div className="flex justify-between font-medium">
                                                <span>{p?.username}</span>
                                                <span className={h.correct ? 'text-green-600' : 'text-red-500'}>
                                                    {h.correct ? `+${h.points}` : '0'} pts
                                                </span>
                                            </div>
                                            <p className="text-gray-600 mt-1">{q?.text}</p>
                                            <div className="mt-1 text-xs text-gray-400">
                                                Correct: <span className="text-green-600">{corrAns}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // VIEW: PRE-GAME
    if (game.status === 'CREATED') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <h1 className="text-2xl font-bold">Waiting to start...</h1>
                <p>Players joined: {game.playerIds.map(pid => players[pid]?.username).join(', ')}</p>
                {currentUser?.isAdmin ? (
                    <Button size="lg" onClick={handleStartGame}> Start Game </Button>
                ) : (
                    <p className="text-gray-500 animate-pulse">Waiting for admin to start...</p>
                )}
            </div>
        )
    }

    // VIEW: IN_PROGRESS
    const isMyTurn = game.currentTurnPlayerId === currentUser?.id;
    const usedQuestionIds = new Set(game.history?.map(h => h.questionId));
    const availableQuestions = game.questionIds.filter(qid => !usedQuestionIds.has(qid));

    const currentTurnPlayer = players[game.currentTurnPlayerId || ''];

    // 1. ACTIVE ANSWERING STATE (Modal or specific view)
    if (selectedQuestionId && isMyTurn) {
        const q = questions[selectedQuestionId];
        return (
            <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-right">
                <Button variant="ghost" onClick={() => setSelectedQuestionId(null)}>← Back to board</Button>
                <Card className="border-2 border-indigo-100 shadow-xl">
                    <CardHeader className="text-center pb-2">
                        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold mb-4">
                            Difficulty {q.difficulty} • {POINTS_MAP[q.difficulty]} pts
                        </div>
                        <CardTitle className="text-2xl">{q.text}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 pt-6">
                        {q.answers.map((ans, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(ans)}
                                className="p-4 text-left rounded-xl border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all font-medium text-lg relative group"
                            >
                                <span className="inline-block w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-center leading-8 mr-3 group-hover:bg-indigo-200 group-hover:text-indigo-700">
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                {ans.text}
                            </button>
                        ))}
                    </CardContent>
                </Card>
            </div>
        )
    }

    // 2. BOARD STATE
    return (
        <div className="space-y-6">
            {/* HEADER: Turn Info */}
            <div className="flex flex-col md:flex-row items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <img src={currentTurnPlayer?.avatarUrl} className="w-12 h-12 rounded-full border-2 border-indigo-500" />
                        <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                            Turn
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Current Turn</p>
                        <h2 className="text-xl font-bold text-gray-900">
                            {isMyTurn ? "It's your turn!" : `${currentTurnPlayer?.username}'s turn`}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-6 mt-4 md:mt-0">
                    {Object.entries(game.scores).map(([pid, score]) => (
                        <div key={pid} className={`text-center ${pid === game.currentTurnPlayerId ? 'opacity-100 scale-110' : 'opacity-60'} transition-all`}>
                            <div className="text-xs font-semibold text-gray-500">{players[pid]?.username}</div>
                            <div className="text-xl font-bold text-indigo-600">{score}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* QUESTION GRID */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {game.questionIds.map((qid) => {
                    const q = questions[qid];
                    const isUsed = usedQuestionIds.has(qid);
                    if (!q) return null; // Loading or error

                    return (
                        <button
                            key={qid}
                            disabled={isUsed || !isMyTurn}
                            onClick={() => handleSelectQuestion(qid)}
                            className={`
                          p-6 rounded-xl border flex flex-col items-center justify-center min-h-[160px] text-center transition-all
                          ${isUsed
                                    ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                    : isMyTurn
                                        ? 'bg-white border-indigo-200 shadow-sm hover:shadow-md hover:border-indigo-500 hover:scale-105 cursor-pointer'
                                        : 'bg-white border-gray-200 cursor-wait'
                                }
                      `}
                        >
                            {isUsed ? (
                                <>
                                    <CheckCircle className="h-8 w-8 text-gray-400 mb-2" />
                                    <span className="text-gray-400 text-sm">Completed</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-3xl font-black text-indigo-100 mb-2">{POINTS_MAP[q.difficulty]}</span>
                                    <span className="font-semibold text-gray-900 line-clamp-2">{q.text}</span>
                                    <span className="mt-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                        Difficulty {q.difficulty}
                                    </span>
                                </>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}

export default function GamePlayPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-8"><span className="loading">Loading Game...</span></div>}>
            <GameContent />
        </Suspense>
    );
}
