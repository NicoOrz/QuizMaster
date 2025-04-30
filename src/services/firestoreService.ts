import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { ExamRecord, IncorrectQuestionDetail } from '@/types/quiz';

const EXAM_RECORDS_COLLECTION = 'examRecords';

interface FirestoreExamRecord {
  userId: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  timestamp: Timestamp; // Use Firestore Timestamp for server time
  incorrectQuestions: IncorrectQuestionDetail[];
  duration?: number;
}


// Function to save an exam record to Firestore
export const saveExamRecord = async (record: Omit<ExamRecord, 'id' | 'timestamp'> & { timestamp?: number }): Promise<string> => {
  try {
     const recordToSave: FirestoreExamRecord = {
      ...record,
      timestamp: serverTimestamp() as Timestamp, // Let Firestore set the timestamp
     };
    const docRef = await addDoc(collection(db, EXAM_RECORDS_COLLECTION), recordToSave);
    console.log("Exam record saved with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error adding document: ", error);
    throw new Error('Failed to save exam record.');
  }
};

// Function to fetch exam records for a user from Firestore
export const fetchExamRecords = async (userId: string): Promise<ExamRecord[]> => {
  try {
    const q = query(
      collection(db, EXAM_RECORDS_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc') // Order by most recent first
    );

    const querySnapshot = await getDocs(q);
    const records: ExamRecord[] = [];
    querySnapshot.forEach((doc) => {
       const data = doc.data() as FirestoreExamRecord;
       // Convert Firestore Timestamp to number for consistency in the app state
        const timestamp = data.timestamp?.toMillis() || Date.now();
      records.push({ id: doc.id, ...data, timestamp });
    });
    console.log(`Fetched ${records.length} records for user ${userId}`);
    return records;
  } catch (error) {
    console.error("Error fetching documents: ", error);
    throw new Error('Failed to fetch exam records.');
  }
};


// Potential future functions:
// - fetchExamRecordById(recordId: string)
// - deleteExamRecord(recordId: string)


// Example usage within a component (using QuizContext update and local state):
/*
import { useQuiz } from '@/context/QuizContext';
import { saveExamRecord, fetchExamRecords } from '@/services/firestoreService';
import { useEffect } from 'react';

function MyComponent() {
  const { addExamRecord, setExamHistory } = useQuiz();
  const userId = 'anonymous'; // Replace with actual user ID

  const handleSave = async (newRecordData) => {
    try {
      const recordToSave = { ...newRecordData, userId };
      const docId = await saveExamRecord(recordToSave);
      addExamRecord({ ...recordToSave, id: docId, timestamp: Date.now() }); // Update local state optimistically or after save
    } catch (error) {
      // Handle error (e.g., show toast)
    }
  }

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const records = await fetchExamRecords(userId);
        setExamHistory(records);
      } catch (error) {
         // Handle error
      }
    };
    loadHistory();
  }, [userId, setExamHistory]);

  // ... rest of component
}
*/
