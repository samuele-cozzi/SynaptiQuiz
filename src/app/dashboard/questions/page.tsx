'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Question, Topic, Answer } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

const INITIAL_ANSWERS: Answer[] = [
    { text: '', correct: true, plausibility: 100 },
    { text: '', correct: false, plausibility: 0 },
    { text: '', correct: false, plausibility: 0 },
    { text: '', correct: false, plausibility: 0 },
];

export default function QuestionsPage() {
    const { player: currentUser } = useAuth();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
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
        answers: [...INITIAL_ANSWERS]
    });

    // Filters
    const [filterText, setFilterText] = useState('');
    const [filterTopic, setFilterTopic] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState('');

    const filteredQuestions = questions.filter(q => {
        const matchesText = q.text.toLowerCase().includes(filterText.toLowerCase());
        const matchesTopic = filterTopic ? q.topicId === filterTopic : true;
        const matchesDifficulty = filterDifficulty ? q.difficulty === parseInt(filterDifficulty) : true;
        return matchesText && matchesTopic && matchesDifficulty;
    });

    const { t } = useTranslation('common');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [qSnap, tSnap] = await Promise.all([
                    getDocs(collection(db, 'questions')),
                    getDocs(collection(db, 'topics'))
                ]);
                setQuestions(qSnap.docs.map(d => d.data() as Question));
                setTopics(tSnap.docs.map(d => d.data() as Topic));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({
            text: '',
            difficulty: 1,
            topicId: topics[0]?.id || '',
            answers: JSON.parse(JSON.stringify(INITIAL_ANSWERS)) // Deep copy
        });
        setIsModalOpen(true);
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

    const handleDelete = async (id: string) => {
        if (!confirm("Delete question?")) return;
        try {
            await deleteDoc(doc(db, 'questions', id));
            setQuestions(questions.filter(q => q.id !== id));
        } catch (e) { console.error(e); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.topicId) {
            alert("Please select a topic (create one if none exist)");
            return;
        }

        // Validate: 1 correct, 3 incorrect
        const correctCount = formData.answers.filter(a => a.correct).length;
        if (correctCount !== 1) {
            alert("Exactly one answer must be correct.");
            return;
        }

        try {
            if (editingId) {
                const ref = doc(db, 'questions', editingId);
                const updated: Question = { id: editingId, ...formData } as Question;
                await updateDoc(ref, updated);
                setQuestions(questions.map(q => q.id === editingId ? updated : q));
            } else {
                const id = generateId();
                const ref = doc(db, 'questions', id);
                const newQ: Question = { id, ...formData } as Question;
                await setDoc(ref, newQ);
                setQuestions([...questions, newQ]);
            }
            setIsModalOpen(false);
        } catch (e) { console.error(e); }
    };

    const updateAnswer = (index: number, field: keyof Answer, value: any) => {
        const newAnswers = [...formData.answers];
        newAnswers[index] = { ...newAnswers[index], [field]: value };

        // Enforce single correct answer UI logic if checking 'correct'
        if (field === 'correct' && value === true) {
            newAnswers.forEach((a, i) => {
                if (i !== index) a.correct = false;
            });
        }

        setFormData({ ...formData, answers: newAnswers });
    };

    if (loading) return <div>{t('common.loading')}</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Questions Management</h1>
                {currentUser?.isAdmin && (
                    <Button onClick={handleOpenCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Question
                    </Button>
                )}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search Question</label>
                    <Input
                        placeholder="Search text..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Topic</label>
                    <select
                        className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                        value={filterTopic}
                        onChange={(e) => setFilterTopic(e.target.value)}
                    >
                        <option value="">All Topics</option>
                        {topics.map(t => <option key={t.id} value={t.id}>{t.text}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Difficulty</label>
                    <select
                        className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                        value={filterDifficulty}
                        onChange={(e) => setFilterDifficulty(e.target.value)}
                    >
                        <option value="">All Difficulties</option>
                        {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Question</TableHead>
                            <TableHead>Topic</TableHead>
                            <TableHead>Difficulty</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredQuestions.map(q => (
                            <TableRow key={q.id}>
                                <TableCell className="max-w-md truncate font-medium">{q.text}</TableCell>
                                <TableCell>{topics.find(t => t.id === q.topicId)?.text || 'Unknown'}</TableCell>
                                <TableCell>{q.difficulty}</TableCell>
                                <TableCell className="text-right">
                                    {currentUser?.isAdmin && (
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(q)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(q.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Edit Question" : "Create Question"}
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                                <select
                                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                                    value={formData.topicId}
                                    onChange={e => setFormData({ ...formData, topicId: e.target.value })}
                                >
                                    <option value="">Select Topic...</option>
                                    {topics.map(t => <option key={t.id} value={t.id}>{t.text}</option>)}
                                </select>
                            </div>
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
                                        title="Mark as correct"
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
                                    placeholder="%"
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
                            Save Question
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
