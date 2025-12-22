'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Play, Users, BookOpen, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Player {
    id: string;
    username: string;
    image: string | null;
}

interface Game {
    id: string;
    name: string;
    status: string;
    ownerId: string;
    language: string;
    currentTurnIndex: number;
    selectedQuestionId: string | null;
    players: { userId: string; score: number; user: Player }[];
    questions: { questionId: string; isPlayed: boolean; question: any }[];
}

export default function PlayGamePage({ params }: { params: Promise<{ id: string }> }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { t } = useTranslation();
    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    // Unwrap params Promise
    const { id } = use(params);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchGame();
        }
    }, [status, id]);

    const fetchGame = async () => {
        try {
            const res = await fetch(`/api/games/${id}`);
            if (res.ok) {
                const data = await res.json();
                setGame(data);
            } else {
                setError('Failed to fetch game');
            }
        } catch (error) {
            console.error('Failed to fetch game:', error);
            setError('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const startGame = async () => {
        setProcessing(true);
        try {
            const res = await fetch(`/api/games/${id}/start`, { method: 'POST' });
            if (res.ok) {
                const updatedGame = await res.json();
                setGame(updatedGame);
                // We might need to refetch to get full relations if the start API only returns the basic game object
                fetchGame();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to start game');
            }
        } catch (error) {
            console.error('Failed to start game:', error);
        } finally {
            setProcessing(false);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
            </div>
        );
    }

    if (error || !game) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-white mb-4">{error || 'Game not found'}</h2>
                <button
                    onClick={() => router.push('/dashboard/games')}
                    className="text-cyan-400 hover:underline"
                >
                    Back to Games
                </button>
            </div>
        );
    }

    const isOwner = session?.user?.id === game.ownerId || session?.user?.role === 'ADMIN';

    // Render based on status
    if (game.status === 'CREATED') {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">{game.name}</h1>
                            <div className="flex gap-4 text-white/60">
                                <span className="flex items-center gap-1">
                                    <BookOpen size={16} /> {game.language.toUpperCase()}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Users size={16} /> {game.players.length} Players
                                </span>
                            </div>
                        </div>
                        <div className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-full text-sm font-semibold border border-blue-500/30">
                            LOBBY
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4">Players</h2>
                            <div className="space-y-3">
                                {game.players.map((p) => (
                                    <div key={p.userId} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                                        <img
                                            src={p.user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user.username}`}
                                            alt={p.user.username}
                                            className="w-10 h-10 rounded-full"
                                        />
                                        <span className="text-white font-medium">{p.user.username}</span>
                                        {p.userId === game.ownerId && (
                                            <span className="ml-auto text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded">Owner</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col justify-center items-center p-8 bg-white/5 rounded-2xl border border-white/10 text-center">
                            {isOwner ? (
                                <>
                                    <p className="text-white/60 mb-6">You are the owner. You can start the game when everyone is ready!</p>
                                    <button
                                        onClick={startGame}
                                        disabled={processing}
                                        className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-8 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50"
                                    >
                                        {processing ? 'Starting...' : (
                                            <>
                                                <Play size={24} />
                                                START GAME
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="animate-pulse flex flex-col items-center">
                                        <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mb-4">
                                            <Users size={32} className="text-cyan-400" />
                                        </div>
                                        <p className="text-white font-semibold">Waiting for owner to start...</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (game.status === 'STARTED') {
        return <GamePlay game={game} session={session} onUpdate={fetchGame} />;
    }

    if (game.status === 'ENDED') {
        return <GameResults game={game} onBack={() => router.push('/dashboard/games')} />;
    }

    return null;
}

// Sub-components
function GamePlay({ game, session, onUpdate }: { game: Game, session: any, onUpdate: () => void }) {
    if (!game.players || game.players.length === 0) {
        return <div className="text-white text-center py-12">Waiting for data...</div>;
    }

    const turnIndex = game.currentTurnIndex || 0;
    const players = game.players || [];

    if (players.length === 0) {
        return <div className="text-white text-center py-12">Waiting for players...</div>;
    }

    const currentPlayer = players[turnIndex % players.length];

    if (!currentPlayer) {
        return <div className="text-white text-center py-12">Loading turn data...</div>;
    }

    const isMyTurn = session?.user?.id === currentPlayer.userId || session?.user?.role === 'ADMIN';
    const [processing, setProcessing] = useState(false);
    const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ correct: boolean, choice: string, correctId: string } | null>(null);

    const selectQuestion = async (questionId: string) => {
        setProcessing(true);
        try {
            const res = await fetch(`/api/games/${game.id}/select-question`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionId }),
            });
            if (res.ok) {
                onUpdate();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to select question');
            }
        } catch (error) {
            console.error('Failed to select question:', error);
        } finally {
            setProcessing(false);
        }
    };

    const submitAnswer = async () => {
        if (!selectedAnswerId) return;
        setProcessing(true);
        try {
            const res = await fetch(`/api/games/${game.id}/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answerId: selectedAnswerId }),
            });
            if (res.ok) {
                const data = await res.json();
                setFeedback(data);
                // Show feedback for 2 seconds then update state
                setTimeout(() => {
                    setFeedback(null);
                    setSelectedAnswerId(null);
                    onUpdate();
                }, 2500);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to submit answer');
                setProcessing(false);
            }
        } catch (error) {
            console.error('Failed to submit answer:', error);
            setProcessing(false);
        }
    };

    // Group unplayed questions by topic
    const topicsMap: Record<string, { topic: any, questions: any[] }> = {};
    game.questions.forEach(gq => {
        if (!gq.isPlayed) {
            const tId = gq.question.topic.id;
            if (!topicsMap[tId]) {
                topicsMap[tId] = { topic: gq.question.topic, questions: [] };
            }
            topicsMap[tId].questions.push(gq);
        }
    });

    // Sort questions within topics by difficulty
    Object.values(topicsMap).forEach(t => {
        t.questions.sort((a, b) => a.question.difficulty - b.question.difficulty);
    });

    const activeQuestion = game.selectedQuestionId
        ? game.questions.find(gq => gq.questionId === game.selectedQuestionId)?.question
        : null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Current Turn Header */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img
                        src={currentPlayer.user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentPlayer.user.username}`}
                        alt={currentPlayer.user.username}
                        className="w-10 h-10 rounded-full ring-2 ring-cyan-400"
                    />
                    <div>
                        <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Current Turn</p>
                        <p className="text-white font-bold">{currentPlayer.user.username}</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    {game.players.map(p => (
                        <div key={p.userId} className="text-center">
                            <p className="text-white/40 text-[10px] uppercase">{p.user.username}</p>
                            <p className="text-cyan-400 font-bold leading-none">{p.score}</p>
                        </div>
                    ))}
                </div>
            </div>

            {!game.selectedQuestionId ? (
                /* Selection Screen */
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">
                        {isMyTurn ? "Select a question to answer" : `Waiting for ${currentPlayer.user.username} to select...`}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.values(topicsMap).map(({ topic, questions }) => (
                            <div key={topic.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="flex items-center gap-3 mb-4">
                                    {topic.image && <img src={topic.image} className="w-8 h-8 rounded-lg" />}
                                    <h3 className="text-lg font-semibold text-white">{topic.text}</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {questions.map((gq: any) => (
                                        <button
                                            key={gq.questionId}
                                            disabled={!isMyTurn || processing}
                                            onClick={() => selectQuestion(gq.questionId)}
                                            className={`h-12 w-12 rounded-lg font-bold flex items-center justify-center transition-all ${isMyTurn
                                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/40'
                                                : 'bg-white/10 text-white/40 border border-white/10 cursor-not-allowed'
                                                }`}
                                        >
                                            {gq.question.difficulty}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* Answering Screen */
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                    {feedback ? (
                        <div className="text-center py-12 animate-in fade-in zoom-in duration-300">
                            {feedback.correct ? (
                                <div className="flex flex-col items-center">
                                    <CheckCircle2 size={80} className="text-green-400 mb-4" />
                                    <h2 className="text-4xl font-bold text-white mb-2">CORRECT!</h2>
                                    <p className="text-green-300 text-xl font-semibold">You earned points!</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <XCircle size={80} className="text-red-400 mb-4" />
                                    <h2 className="text-4xl font-bold text-white mb-2">WRONG!</h2>
                                    <p className="text-red-300 text-xl font-semibold">Better luck next time!</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-cyan-400 font-bold uppercase tracking-widest">{activeQuestion?.topic.text}</span>
                                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold">Difficulty {activeQuestion?.difficulty}</span>
                            </div>

                            <h2 className="text-3xl font-bold text-white mb-10 text-center leading-tight">
                                {activeQuestion?.text}
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                {activeQuestion?.answers.map((a: any) => (
                                    <button
                                        key={a.id}
                                        disabled={!isMyTurn || processing}
                                        onClick={() => setSelectedAnswerId(a.id)}
                                        className={`p-6 rounded-2xl border-2 text-left font-medium transition-all ${selectedAnswerId === a.id
                                            ? 'border-cyan-400 bg-cyan-400/20 text-white'
                                            : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                                            } ${!isMyTurn ? 'opacity-70 grayscale' : ''}`}
                                    >
                                        {a.text}
                                    </button>
                                ))}
                            </div>

                            {isMyTurn && (
                                <div className="flex justify-center">
                                    <button
                                        onClick={submitAnswer}
                                        disabled={!selectedAnswerId || processing}
                                        className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 px-12 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50"
                                    >
                                        {processing ? 'Submitting...' : 'CONFIRM ANSWER'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function GameResults({ game, onBack }: { game: Game, onBack: () => void }) {
    const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-700">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 text-center relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/20 blur-[100px] rounded-full -z-10"></div>

                <div className="inline-block p-4 bg-cyan-500/20 rounded-full mb-6 ring-4 ring-cyan-400/30">
                    <img
                        src={winner.user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${winner.user.username}`}
                        alt={winner.user.username}
                        className="w-24 h-24 rounded-full"
                    />
                </div>

                <h1 className="text-5xl font-extrabold text-white mb-2">🎉 CONGRATULATIONS! 🎉</h1>
                <p className="text-2xl text-cyan-400 font-bold mb-12">{winner.user.username} is the winner!</p>

                <div className="max-w-md mx-auto space-y-4 mb-12">
                    {sortedPlayers.map((p, index) => (
                        <div
                            key={p.userId}
                            className={`flex items-center gap-4 p-4 rounded-2xl border ${index === 0
                                ? 'bg-cyan-500/20 border-cyan-400/50 ring-2 ring-cyan-400/20'
                                : 'bg-white/5 border-white/10'
                                }`}
                        >
                            <span className={`text-2xl font-black w-8 ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-white/40'
                                }`}>
                                #{index + 1}
                            </span>
                            <img
                                src={p.user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user.username}`}
                                alt={p.user.username}
                                className="w-10 h-10 rounded-full"
                            />
                            <span className="text-white font-bold text-lg">{p.user.username}</span>
                            <span className="ml-auto text-2xl font-black text-white">{p.score}</span>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-center">
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-4 px-8 rounded-xl hover:bg-white/20 transition-all border border-white/10"
                    >
                        PLAY AGAIN
                    </button>
                    <button
                        onClick={onBack}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 px-12 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all"
                    >
                        <ArrowRight size={20} />
                        BACK TO DASHBOARD
                    </button>
                </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <h2 className="text-xl font-bold text-white mb-6">Game Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
                        <p className="text-white/40 text-xs font-bold uppercase mb-1">Total Questions</p>
                        <p className="text-2xl font-black text-white">{game.questions.length}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
                        <p className="text-white/40 text-xs font-bold uppercase mb-1">Difficulty Avg</p>
                        <p className="text-2xl font-black text-white">
                            {(game.questions.reduce((acc, q) => acc + q.question.difficulty, 0) / game.questions.length).toFixed(1)}
                        </p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
                        <p className="text-white/40 text-xs font-bold uppercase mb-1">Total Score</p>
                        <p className="text-2xl font-black text-white">
                            {game.players.reduce((acc, p) => acc + p.score, 0)}
                        </p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
                        <p className="text-white/40 text-xs font-bold uppercase mb-1">Language</p>
                        <p className="text-2xl font-black text-white">{game.language.toUpperCase()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
