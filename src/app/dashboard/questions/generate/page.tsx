'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Topic, Question } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function GenerateQuestionsPage() {
    const { player: currentUser } = useAuth();
    const router = useRouter();
    const { t } = useTranslation('common');

    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [resultMessage, setResultMessage] = useState('');

    const [files, setFiles] = useState<{
        topicId: string;
        difficulty: number;
        count: number;
        answersCount: number;
    }>({
        topicId: '',
        difficulty: 3,
        count: 5,
        answersCount: 4
    });

    useEffect(() => {
        const fetchTopics = async () => {
            const tSnap = await getDocs(collection(db, 'topics'));
            setTopics(tSnap.docs.map(d => d.data() as Topic));
            setLoading(false);
        };
        fetchTopics();
    }, []);

    const handleGenerate = async () => {
        if (!files.topicId) return alert('Select a Topic');

        const selectedTopic = topics.find(t => t.id === files.topicId);
        if (!selectedTopic) return;

        setGenerating(true);
        setResultMessage('');

        try {
            const response = await fetch('/api/questions/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topicId: files.topicId,
                    topicText: selectedTopic.text,
                    difficulty: files.difficulty,
                    count: files.count,
                    answersCount: files.answersCount
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setResultMessage(`Success! Generated ${data.count} questions.`);
            // Optional: Redirect after success? 
            // setTimeout(() => router.push('/dashboard/questions'), 2000);
        } catch (e: any) {
            console.error(e);
            setResultMessage(`Error: ${e.message}`);
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-indigo-500" />
                    AI Question Generator
                </h1>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                    <select
                        className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                        value={files.topicId}
                        onChange={(e) => setFiles({ ...files, topicId: e.target.value })}
                    >
                        <option value="">Select Topic...</option>
                        {topics.map(t => (
                            <option key={t.id} value={t.id}>{t.text}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty (1-5)</label>
                        <select
                            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                            value={files.difficulty}
                            onChange={(e) => setFiles({ ...files, difficulty: parseInt(e.target.value) })}
                        >
                            {[1, 2, 3, 4, 5].map(d => (
                                <option key={d} value={d}>Level {d}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Questions</label>
                        <Input
                            type="number"
                            min={1}
                            max={20}
                            value={files.count}
                            onChange={(e) => setFiles({ ...files, count: parseInt(e.target.value) })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Answers per Question</label>
                        <Input
                            type="number"
                            min={2}
                            max={6}
                            value={files.answersCount}
                            onChange={(e) => setFiles({ ...files, answersCount: parseInt(e.target.value) })}
                        />
                    </div>
                </div>

                {resultMessage && (
                    <div className={`p-4 rounded-lg ${resultMessage.startsWith('Success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {resultMessage}
                    </div>
                )}

                <Button
                    onClick={handleGenerate}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                    disabled={generating || !files.topicId}
                >
                    {generating ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-4 w-4 mr-2" /> Generate Questions
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
