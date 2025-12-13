'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Topic } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card, CardContent } from '@/components/ui/Card';
import { Plus, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// import { v4 as uuidv4 } from 'uuid';
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export default function TopicsPage() {
    const { player: currentUser } = useAuth();
    const router = useRouter();
    const [topics, setTopics] = useState<Topic[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
    const { t } = useTranslation('common');

    const [formData, setFormData] = useState({ text: '', imageUrl: '' });

    const fetchTopics = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'topics'));
            const list = querySnapshot.docs.map(doc => doc.data() as Topic);
            setTopics(list);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTopics();
    }, []);

    const handleOpenCreate = () => {
        setEditingTopic(null);
        setFormData({ text: '', imageUrl: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (topic: Topic) => {
        setEditingTopic(topic);
        setFormData({ text: topic.text, imageUrl: topic.imageUrl || '' });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingTopic) {
                // Update
                const ref = doc(db, 'topics', editingTopic.id);
                await updateDoc(ref, {
                    text: formData.text,
                    imageUrl: formData.imageUrl
                });
            } else {
                // Create
                const id = generateId();
                const ref = doc(db, 'topics', id);
                await setDoc(ref, {
                    id,
                    text: formData.text,
                    imageUrl: formData.imageUrl
                });
            }
            setIsModalOpen(false);
            fetchTopics();
        } catch (error) {
            console.error(error);
        }
    };

    // Optional Delete
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        await deleteDoc(doc(db, 'topics', id));
        setTopics(topics.filter(t => t.id !== id));
    }

    if (isLoading) return <div>{t('common.loading')}</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Topics Management</h1>
                {currentUser?.isAdmin && (
                    <Button onClick={handleOpenCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Topic
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {topics.map((topic) => (
                    <Card
                        key={topic.id}
                        className="overflow-hidden group hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => router.push(`/dashboard/topics/${topic.id}`)}
                    >
                        <div className="aspect-video w-full bg-gray-100 relative">
                            {topic.imageUrl ? (
                                <img src={topic.imageUrl} alt={topic.text} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-gray-400">
                                    <ImageIcon className="h-10 w-10" />
                                </div>
                            )}
                            {currentUser?.isAdmin && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpenEdit(topic); }}>
                                        <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDelete(topic.id); }}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                        </div>
                        <CardContent className="p-4">
                            <h3 className="font-semibold text-lg text-gray-900">{topic.text}</h3>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingTopic ? "Edit Topic" : "Create Topic"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Topic Name"
                        value={formData.text}
                        onChange={e => setFormData({ ...formData, text: e.target.value })}
                        required
                        placeholder="e.g. Science, History"
                    />
                    <Input
                        label="Image URL (Optional)"
                        value={formData.imageUrl}
                        onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                    />
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit">
                            {t('common.save')}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
