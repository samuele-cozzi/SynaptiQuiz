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
        difficulties: number[];
        count: number;
        answersCount: number;
        language: 'en' | 'it';
    }>({
        topicId: '',
        difficulties: [3],
        count: 5,
        answersCount: 4,
        language: 'en'
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
        if (files.difficulties.length === 0) return alert('Select at least one difficulty level');

        const selectedTopic = topics.find(t => t.id === files.topicId);
        if (!selectedTopic) return;

        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            setResultMessage('⚠️ GEMINI_API_KEY not configured. Please add NEXT_PUBLIC_GEMINI_API_KEY to .env.local');
            return;
        }

        setGenerating(true);
        setResultMessage('');

        try {
            // Import Gemini SDK dynamically
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

            const totalQuestions = files.count * files.difficulties.length;
            const langText = files.language === 'it' ? 'Italian' : 'English';

            const prompt = `
Generate ${totalQuestions} multiple choice quiz questions about "${selectedTopic.text}" in ${langText}.

Requirements:
- Generate exactly ${files.count} questions for EACH of the following difficulty levels: ${files.difficulties.join(', ')}.
- Difficulty scale is 1-5.
- Each question must have exactly ${files.answersCount} answer options.
- The questions and answers must be in ${langText}.

Example JSON format:
[
  {
    "text": "Question text here?",
    "difficulty": 3,
    "answers": [
       { "text": "Answer 1", "correct": false, "plausibility": 50 },
       { "text": "Correct Answer", "correct": true, "plausibility": 100 }
    ]
  }
]
RETURN ONLY RAW JSON ARRAY. NO MARKDOWN.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean markdown if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

            let questionsData = [];
            try {
                questionsData = JSON.parse(jsonStr);
            } catch (e) {
                console.error("Failed to parse AI response:", text);
                setResultMessage('❌ Failed to parse AI response. Please try again.');
                return;
            }

            if (!Array.isArray(questionsData)) {
                setResultMessage('❌ AI returned invalid format. Please try again.');
                return;
            }

            // Save to Firestore
            const { collection: firestoreCollection, doc, setDoc } = await import('firebase/firestore');
            const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

            for (const qData of questionsData) {
                const id = generateId();
                const diff = qData.difficulty && files.difficulties.includes(qData.difficulty)
                    ? qData.difficulty
                    : files.difficulties[0];

                const question: Question = {
                    id,
                    topicId: files.topicId,
                    text: qData.text,
                    difficulty: diff,
                    answers: qData.answers,
                    language: files.language || 'en'
                };

                await setDoc(doc(db, 'questions', id), question);
            }

            setResultMessage(`✅ Success! Generated ${questionsData.length} questions.`);

        } catch (e: any) {
            console.error(e);

            // Handle Rate Limits specifically
            if (e.message?.includes('429') || e.message?.includes('quota') || e.message?.includes('RESOURCE_EXHAUSTED')) {
                setResultMessage('⚠️ AI Rate limit exceeded. Please wait a minute and try again. (Free Tier Limit)');
            } else {
                setResultMessage(`❌ Error: ${e.message}`);
            }
        } finally {
            setGenerating(false);
        }
    };

    const toggleDifficulty = (level: number) => {
        setFiles(prev => {
            const exists = prev.difficulties.includes(level);
            if (exists) {
                // Don't allow deselecting the last one? Or just handle empty in validation (done above)
                return { ...prev, difficulties: prev.difficulties.filter(d => d !== level) };
            } else {
                return { ...prev, difficulties: [...prev.difficulties, level].sort() };
            }
        });
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

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Levels (Select multiple)</label>
                    <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5].map(level => {
                            const isSelected = files.difficulties.includes(level);
                            return (
                                <button
                                    key={level}
                                    onClick={() => toggleDifficulty(level)}
                                    className={`
                                        w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                                        ${isSelected
                                            ? 'bg-indigo-600 text-white shadow-md scale-105'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                                    `}
                                >
                                    {level}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Select one or more levels. Questions will be generated for each selected level.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Questions per Level</label>
                        <Input
                            type="number"
                            min={1}
                            max={20}
                            value={files.count}
                            onChange={(e) => setFiles({ ...files, count: parseInt(e.target.value) })}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Total: {files.count * files.difficulties.length} questions
                        </p>
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

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <select
                        className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                        value={files.language}
                        onChange={(e) => setFiles({ ...files, language: e.target.value as 'en' | 'it' })}
                    >
                        <option value="en">English (default)</option>
                        <option value="it">Italian</option>
                    </select>
                </div>

                {resultMessage && (
                    <div className={`p-4 rounded-lg ${resultMessage.startsWith('Success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {resultMessage}
                    </div>
                )}

                <Button
                    onClick={handleGenerate}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                    disabled={generating || !files.topicId || files.difficulties.length === 0}
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
