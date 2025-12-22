'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Search } from 'lucide-react';

interface Topic {
    id: string;
    text: string;
    image: string | null;
}

export default function TopicsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { t } = useTranslation();
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
    const [formData, setFormData] = useState({ text: '', image: '' });

    useEffect(() => {
        if (status === 'authenticated') {
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
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const url = editingTopic ? `/api/topics/${editingTopic.id}` : '/api/topics';
            const method = editingTopic ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                fetchTopics();
                setShowModal(false);
                setEditingTopic(null);
                setFormData({ text: '', image: '' });
            }
        } catch (error) {
            console.error('Failed to save topic:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this topic?')) return;

        try {
            const res = await fetch(`/api/topics/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchTopics();
            }
        } catch (error) {
            console.error('Failed to delete topic:', error);
        }
    };

    const openEditModal = (topic: Topic) => {
        setEditingTopic(topic);
        setFormData({ text: topic.text, image: topic.image || '' });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingTopic(null);
        setFormData({ text: '', image: '' });
        setShowModal(true);
    };

    const filteredTopics = topics.filter(topic =>
        topic.text.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                <h1 className="text-3xl font-bold text-white">{t('menu.topics')}</h1>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all"
                >
                    <Plus size={20} />
                    Create Topic
                </button>
            </div>

            {/* Search */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search topics..."
                        className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                </div>
            </div>

            {/* Topics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTopics.map((topic) => (
                    <div
                        key={topic.id}
                        className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all"
                    >
                        {topic.image && (
                            <img
                                src={topic.image}
                                alt={topic.text}
                                className="w-full h-40 object-cover rounded-lg mb-4"
                            />
                        )}
                        <h3 className="text-xl font-semibold text-white mb-4">{topic.text}</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => openEditModal(topic)}
                                className="flex-1 flex items-center justify-center gap-2 bg-blue-500/20 text-white py-2 px-4 rounded-lg hover:bg-blue-500/30 transition-all"
                            >
                                <Edit size={16} />
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(topic.id)}
                                className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 text-white py-2 px-4 rounded-lg hover:bg-red-500/30 transition-all"
                            >
                                <Trash2 size={16} />
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredTopics.length === 0 && (
                <div className="text-center text-white/60 py-12">
                    No topics found. Create your first topic!
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 w-full max-w-md">
                        <h2 className="text-2xl font-bold text-white mb-6">
                            {editingTopic ? 'Edit Topic' : 'Create Topic'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-white text-sm font-medium mb-2">
                                    Topic Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.text}
                                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    placeholder="Enter topic name"
                                />
                            </div>
                            <div>
                                <label className="block text-white text-sm font-medium mb-2">
                                    Image URL (optional)
                                </label>
                                <input
                                    type="url"
                                    value={formData.image}
                                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    placeholder="https://example.com/image.jpg"
                                />
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
                                    {editingTopic ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
