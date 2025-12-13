import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Question } from '@/types';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export async function POST(req: NextRequest) {
    try {
        const { topicId, topicText, difficulties, count, answersCount } = await req.json();

        // Validation
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
        }
        if (!topicId || !topicText || !difficulties || !difficulties.length || !count) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const totalQuestions = count * difficulties.length;

        const prompt = `
        Generate ${totalQuestions} multiple choice quiz questions about "${topicText}".
        
        Requirements:
        - Generate exactly ${count} questions for EACH of the following difficulty levels: ${difficulties.join(', ')}.
        - Difficulty scale is 1-5.
        - Each question must have exactly ${answersCount} answer options.
        
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
            return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
        }

        if (!Array.isArray(questionsData)) {
            return NextResponse.json({ error: 'AI returned invalid format' }, { status: 500 });
        }

        // Save to Firestore
        const batch = [];
        for (const qData of questionsData) {
            const id = generateId();
            // Ensure difficulty is valid, otherwise default to first selected
            const diff = qData.difficulty && difficulties.includes(qData.difficulty)
                ? qData.difficulty
                : difficulties[0];

            const question: Question = {
                id,
                topicId,
                text: qData.text,
                difficulty: diff,
                answers: qData.answers
            };
            // Note: Parallel writes or batch would be better, but loop is fine for small counts
            await setDoc(doc(db, 'questions', id), question);
            batch.push(question);
        }

        return NextResponse.json({ success: true, count: batch.length });

    } catch (error: any) {
        console.error("Generate error:", error);

        // Handle Rate Limits specifically
        if (error.message?.includes('429') || error.message?.includes('quota')) {
            return NextResponse.json({
                error: 'AI Rate limit exceeded. Please wait a minute and try again. (Free Tier Limit)',
                isRateLimit: true
            }, { status: 429 });
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
