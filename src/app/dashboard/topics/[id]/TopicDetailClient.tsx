'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { Topic, Question, Answer } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ArrowLeft, Image as ImageIcon, Edit2, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { useAuth } from '@/context/AuthContext';

export default function TopicDetailClient() {
    const { player: currentUser } = useAuth();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [topic, setTopic] = useState<Topic | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<{
        text: string;
        difficulty: number;
        topicId: string;
        answers: Answer[];
    }>({
        text: '',
        difficulty: 1,
        topicId: '',
        answers: []
    });

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                // Fetch Topic
                const topicDoc = await getDoc(doc(db, 'topics', id));
                if (topicDoc.exists()) {
                    setTopic(topicDoc.data() as Topic);
                } else {
                    // Handle 404
                    console.error('Topic not found');
                }

                // Fetch Questions
                const qQuery = query(collection(db, 'questions'), where('topicId', '==', id));
                const qSnap = await getDocs(qQuery);
                setQuestions(qSnap.docs.map(d => d.data() as Question));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleDelete = async (qId: string) => {
        if (!confirm("Delete question?")) return;
        try {
            await deleteDoc(doc(db, 'questions', qId));
            setQuestions(questions.filter(q => q.id !== qId));
        } catch (e) { console.error(e); }
    };

    const handleOpenEdit = (q: Question) => {
        setEditingId(q.id);
        setFormData({
            text: q.text,
            difficulty: q.difficulty,
            topicId: q.topicId,
            answers: q.answers
        });
        setIsModalOpen(true);
    };

    const updateAnswer = (index: number, field: keyof Answer, value: any) => {
        const newAnswers = [...formData.answers];
        newAnswers[index] = { ...newAnswers[index], [field]: value };
        if (field === 'correct' && value === true) {
            newAnswers.forEach((a, i) => { if (i !== index) a.correct = false; });
        }
        setFormData({ ...formData, answers: newAnswers });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const correctCount = formData.answers.filter(a => a.correct).length;
        if (correctCount !== 1) {
            alert("Exactly one answer must be correct.");
            return;
        }

        try {
            if (editingId) {
                const ref = doc(db, 'questions', editingId);
                const updated = { id: editingId, ...formData } as Question;
                await updateDoc(ref, updated);
                setQuestions(questions.map(q => q.id === editingId ? updated : q));
                setIsModalOpen(false);
            }
        } catch (e) { console.error(e); }
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!topic) return <div className="p-8">Topic not found</div>;

    return (
        <div className="min-h-screen bg-gray-50 -m-8">
            {/* Header with Background Image */}
            <div className="relative h-64 w-full bg-gray-900">
                {topic.imageUrl ? (
                    <>
                        <div className="absolute inset-0">
                            <img
                                src={topic.imageUrl}
                                alt={topic.text}
                                className="h-full w-full object-cover opacity-60"
                            />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                    </>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                        <ImageIcon className="h-24 w-24 text-white" />
                    </div>
                )}

                <div className="absolute top-6 left-6 z-10">
                    <Button variant="secondary" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Topics
                    </Button>
                </div>

                <div className="absolute bottom-8 left-8 z-10">
                    <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-md">
                        {topic.text}
                    </h1>
                    <p className="text-gray-200 mt-2 font-medium">
                        {questions.length} Questions available
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto py-8 px-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-xl font-semibold text-gray-900">Questions List</h2>
                    </div>

                    {questions.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            No questions added for this topic yet.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Question</TableHead>
                                    <TableHead>Difficulty</TableHead>
                                    <TableHead>Answers</TableHead>
                                    {currentUser?.isAdmin && (currentUser?.isEnabled ?? true) && <TableHead className="text-right">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {questions.map(q => (
                                    <TableRow key={q.id}>
                                        <TableCell className="font-medium">{q.text}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${q.difficulty <= 2 ? 'bg-green-100 text-green-800' :
                                                q.difficulty <= 4 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                Level {q.difficulty}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-sm">
                                            {q.answers.length} options
                                        </TableCell>
                                        {currentUser?.isAdmin && (currentUser?.isEnabled ?? true) && (
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(q)}>
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(q.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Edit Question"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <Input
                            label="Question Text"
                            value={formData.text}
                            onChange={e => setFormData({ ...formData, text: e.target.value })}
                            required
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty (1-5)</label>
                                <input
                                    type="number"
                                    min="1" max="5"
                                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                                    value={formData.difficulty || ''}
                                    onChange={e => setFormData({ ...formData, difficulty: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 || 0 })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-900 border-b pb-1">Answers</label>
                        {formData.answers.map((ans, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <div className="pt-2">
                                    <input
                                        type="radio"
                                        name="correctAnswer"
                                        checked={ans.correct}
                                        onChange={() => updateAnswer(i, 'correct', true)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-600"
                                    />
                                </div>
                                <Input
                                    placeholder={`Answer ${i + 1}`}
                                    value={ans.text}
                                    onChange={e => updateAnswer(i, 'text', e.target.value)}
                                    required
                                    className="flex-1"
                                />
                                <input
                                    type="number"
                                    min="0" max="100"
                                    className="w-20 rounded-lg border border-gray-300 p-2 text-sm"
                                    value={ans.plausibility}
                                    onChange={e => updateAnswer(i, 'plausibility', parseInt(e.target.value) || 0)}
                                    title="Plausibility %"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
