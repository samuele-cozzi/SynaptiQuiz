'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Search, Filter } from 'lucide-react';

interface Answer {
    id?: string;
    text: string;
    correct: boolean;
    plausibility: number;
}

interface Topic {
    id: string;
    text: string;
}

interface Question {
    id: string;
    text: string;
    difficulty: number;
    language: string;
    topicId: string;
    topic: Topic;
    answers: Answer[];
}

export default function QuestionsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { t } = useTranslation();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

    // Filters
    const [searchText, setSearchText] = useState('');
    const [filterTopic, setFilterTopic] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState('');
    const [filterLanguage, setFilterLanguage] = useState('');

    // Form data
    const [formData, setFormData] = useState({
        text: '',
        difficulty: 1,
        language: 'en',
        topicId: '',
        answers: [
            { text: '', correct: true, plausibility: 100 },
            { text: '', correct: false, plausibility: 80 },
            { text: '', correct: false, plausibility: 60 },
            { text: '', correct: false, plausibility: 40 },
        ] as Answer[],
    });

    useEffect(() => {
        if (status === 'authenticated') {
            fetchQuestions();
            fetchTopics();
        }
    }, [status]);

    const fetchTopics = async () => {
        try {
            const res = await fetch('/api/topics');
            const data = await res.json();
            setTopics(data);
        } catch (error) {
            console.error('Failed to fetch topics:', error);
        }
    };

    const fetchQuestions = async () => {
        try {
            const res = await fetch('/api/questions');
            const data = await res.json();
            setQuestions(data);
        } catch (error) {
            console.error('Failed to fetch questions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const correctAnswers = formData.answers.filter(a => a.correct).length;
        if (correctAnswers !== 1) {
            alert('Exactly one answer must be marked as correct');
            return;
        }

        if (formData.answers.some(a => !a.text.trim())) {
            alert('All answers must have text');
            return;
        }

        try {
            const url = editingQuestion ? `/api/questions/${editingQuestion.id}` : '/api/questions';
            const method = editingQuestion ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                fetchQuestions();
                setShowModal(false);
                setEditingQuestion(null);
                resetForm();
            }
        } catch (error) {
            console.error('Failed to save question:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this question?')) return;

        try {
            const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchQuestions();
            }
        } catch (error) {
            console.error('Failed to delete question:', error);
        }
    };

    const openEditModal = (question: Question) => {
        setEditingQuestion(question);
        setFormData({
            text: question.text,
            difficulty: question.difficulty,
            language: question.language,
            topicId: question.topicId,
            answers: question.answers.map(a => ({
                text: a.text,
                correct: a.correct,
                plausibility: a.plausibility,
            })),
        });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingQuestion(null);
        resetForm();
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            text: '',
            difficulty: 1,
            language: 'en',
            topicId: topics[0]?.id || '',
            answers: [
                { text: '', correct: true, plausibility: 100 },
                { text: '', correct: false, plausibility: 80 },
                { text: '', correct: false, plausibility: 60 },
                { text: '', correct: false, plausibility: 40 },
            ],
        });
    };

    const updateAnswer = (index: number, field: keyof Answer, value: any) => {
        const newAnswers = [...formData.answers];
        if (field === 'correct' && value === true) {
            // Only one correct answer allowed
            newAnswers.forEach((a, i) => {
                a.correct = i === index;
            });
        } else {
            newAnswers[index] = { ...newAnswers[index], [field]: value };
        }
        setFormData({ ...formData, answers: newAnswers });
    };

    const filteredQuestions = questions.filter(q => {
        if (searchText && !q.text.toLowerCase().includes(searchText.toLowerCase())) return false;
        if (filterTopic && q.topicId !== filterTopic) return false;
        if (filterDifficulty && q.difficulty !== parseInt(filterDifficulty)) return false;
        if (filterLanguage && q.language !== filterLanguage) return false;
        return true;
    });

    if (status === 'loading' || loading) {
        return <div className="text-white">Loading...</div>;
    }

    if (session?.user.role === 'PLAYER') {
        router.push('/dashboard');
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">{t('menu.questions')}</h1>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all"
                >
                    <Plus size={20} />
                    Create Question
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 space-y-4">
                <div className="flex items-center gap-2 text-white font-semibold mb-4">
                    <Filter size={20} />
                    <span>Filters</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="Search text..."
                            className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        />
                    </div>

                    <select
                        value={filterTopic}
                        onChange={(e) => setFilterTopic(e.target.value)}
                        className="px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="">All Topics</option>
                        {topics.map(topic => (
                            <option key={topic.id} value={topic.id} className="bg-gray-800">
                                {topic.text}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filterDifficulty}
                        onChange={(e) => setFilterDifficulty(e.target.value)}
                        className="px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="">All Difficulties</option>
                        {[1, 2, 3, 4, 5].map(d => (
                            <option key={d} value={d} className="bg-gray-800">
                                Difficulty {d}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filterLanguage}
                        onChange={(e) => setFilterLanguage(e.target.value)}
                        className="px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="">All Languages</option>
                        <option value="en" className="bg-gray-800">English</option>
                        <option value="it" className="bg-gray-800">Italian</option>
                    </select>
                </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
                {filteredQuestions.map((question) => (
                    <div
                        key={question.id}
                        className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold text-white mb-2">{question.text}</h3>
                                <div className="flex gap-4 text-sm text-white/60">
                                    <span>Topic: {question.topic.text}</span>
                                    <span>Difficulty: {question.difficulty}/5</span>
                                    <span>Language: {question.language.toUpperCase()}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => openEditModal(question)}
                                    className="flex items-center gap-2 bg-blue-500/20 text-white py-2 px-4 rounded-lg hover:bg-blue-500/30 transition-all"
                                >
                                    <Edit size={16} />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(question.id)}
                                    className="flex items-center gap-2 bg-red-500/20 text-white py-2 px-4 rounded-lg hover:bg-red-500/30 transition-all"
                                >
                                    <Trash2 size={16} />
                                    Delete
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {question.answers.map((answer, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3 rounded-lg ${answer.correct
                                            ? 'bg-green-500/20 border border-green-500/50'
                                            : 'bg-white/5 border border-white/10'
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-white">{answer.text}</span>
                                        <span className="text-white/60 text-sm">{answer.plausibility}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {filteredQuestions.length === 0 && (
                <div className="text-center text-white/60 py-12">
                    No questions found. Create your first question!
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 w-full max-w-2xl my-8">
                        <h2 className="text-2xl font-bold text-white mb-6">
                            {editingQuestion ? 'Edit Question' : 'Create Question'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-white text-sm font-medium mb-2">
                                    Question Text
                                </label>
                                <textarea
                                    value={formData.text}
                                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                                    required
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    placeholder="Enter question text"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">
                                        Topic
                                    </label>
                                    <select
                                        value={formData.topicId}
                                        onChange={(e) => setFormData({ ...formData, topicId: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    >
                                        <option value="" className="bg-gray-800">Select Topic</option>
                                        {topics.map(topic => (
                                            <option key={topic.id} value={topic.id} className="bg-gray-800">
                                                {topic.text}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">
                                        Difficulty (1-5)
                                    </label>
                                    <select
                                        value={formData.difficulty}
                                        onChange={(e) => setFormData({ ...formData, difficulty: parseInt(e.target.value) })}
                                        required
                                        className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    >
                                        {[1, 2, 3, 4, 5].map(d => (
                                            <option key={d} value={d} className="bg-gray-800">
                                                {d}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">
                                        Language
                                    </label>
                                    <select
                                        value={formData.language}
                                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    >
                                        <option value="en" className="bg-gray-800">English</option>
                                        <option value="it" className="bg-gray-800">Italian</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-white text-sm font-medium mb-2">
                                    Answers (mark one as correct)
                                </label>
                                <div className="space-y-3">
                                    {formData.answers.map((answer, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={answer.text}
                                                onChange={(e) => updateAnswer(idx, 'text', e.target.value)}
                                                required
                                                placeholder={`Answer ${idx + 1}`}
                                                className="flex-1 px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                            />
                                            <input
                                                type="number"
                                                value={answer.plausibility}
                                                onChange={(e) => updateAnswer(idx, 'plausibility', parseInt(e.target.value))}
                                                min="0"
                                                max="100"
                                                className="w-20 px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                                title="Plausibility %"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => updateAnswer(idx, 'correct', true)}
                                                className={`px-4 py-3 rounded-lg transition-all ${answer.correct
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-white/20 text-white/60 hover:bg-white/30'
                                                    }`}
                                            >
                                                ✓
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-white/20 text-white py-3 rounded-lg hover:bg-white/30 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-lg hover:shadow-lg transition-all"
                                >
                                    {editingQuestion ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
