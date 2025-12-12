import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import TopicDetailClient from './TopicDetailClient';

export async function generateStaticParams() {
    const querySnapshot = await getDocs(collection(db, 'topics'));
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
    }));
}

export default function TopicDetailPage() {
    return <TopicDetailClient />;
}
