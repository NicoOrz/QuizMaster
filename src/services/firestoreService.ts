import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, getDoc, doc, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { ExamRecord, IncorrectQuestionDetail } from '@/types/quiz';

const EXAM_RECORDS_COLLECTION = 'examRecords';

// Interface matching the structure in Firestore (using Timestamp)
interface FirestoreExamRecord {
  userId: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  timestamp: Timestamp; // Use Firestore Timestamp for server time
  incorrectQuestions: IncorrectQuestionDetail[];
  duration?: number;
}

// Type expected by the save function (client-side timestamp is optional)
type ExamRecordDataToSave = Omit<ExamRecord, 'id' | 'timestamp'> & { timestamp?: number };

// Helper to convert Firestore data to our app's ExamRecord type
const mapFirestoreDocToExamRecord = (docSnapshot: firebase.firestore.DocumentSnapshot<FirestoreExamRecord> | import("firebase/firestore").DocumentSnapshot<FirestoreExamRecord>): ExamRecord | null => {
    if (!docSnapshot.exists()) {
        return null;
    }
    const data = docSnapshot.data() as FirestoreExamRecord;
    const timestamp = data.timestamp?.toMillis() || Date.now(); // Convert Timestamp to number
    return { id: docSnapshot.id, ...data, timestamp };
};


// Function to save an exam record to Firestore
export const saveExamRecord = async (record: ExamRecordDataToSave): Promise<string> => {
  try {
     // Prepare the record for Firestore, ensuring Firestore handles the timestamp
     const recordToSave: Omit<FirestoreExamRecord, 'timestamp'> & { timestamp: any } = {
        userId: record.userId,
        score: record.score,
        totalQuestions: record.totalQuestions,
        correctCount: record.correctCount,
        incorrectQuestions: record.incorrectQuestions,
        duration: record.duration,
        timestamp: serverTimestamp(), // Let Firestore set the timestamp
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
        const record = mapFirestoreDocToExamRecord(doc as import("firebase/firestore").DocumentSnapshot<FirestoreExamRecord>);
        if (record) {
             records.push(record);
        }
    });
    console.log(`Fetched ${records.length} records for user ${userId}`);
    return records;
  } catch (error) {
    console.error("Error fetching documents: ", error);
    throw new Error('Failed to fetch exam records.');
  }
};

// Function to fetch a single exam record by its ID from Firestore
export const fetchExamRecordById = async (recordId: string): Promise<ExamRecord | null> => {
  try {
    const docRef = doc(db, EXAM_RECORDS_COLLECTION, recordId);
    const docSnap = await getDoc(docRef);

    const record = mapFirestoreDocToExamRecord(docSnap as import("firebase/firestore").DocumentSnapshot<FirestoreExamRecord>);
    if (record) {
        console.log(`Fetched record with ID ${recordId}`);
        return record;
    } else {
        console.warn(`No record found with ID ${recordId}`);
        return null;
    }

  } catch (error) {
    console.error(`Error fetching document with ID ${recordId}: `, error);
    throw new Error(`Failed to fetch exam record with ID ${recordId}.`);
  }
};


// Potential future functions:
// - deleteExamRecord(recordId: string)


// Example usage within a component (using QuizContext update and local state):
/*
import { useQuiz } from '@/context/QuizContext';
import { saveExamRecord, fetchExamRecords, fetchExamRecordById } from '@/services/firestoreService';
import { useEffect } from 'react';

function MyComponent() {
  const { addExamRecord, setExamHistory, examHistory } = useQuiz();
  const userId = 'anonymous'; // Replace with actual user ID

  const handleSave = async (newRecordData) => {
    try {
      const recordToSave = { ...newRecordData, userId };
      const docId = await saveExamRecord(recordToSave);
      // Optimistically update local state with client-side timestamp
      addExamRecord({ ...recordToSave, id: docId, timestamp: Date.now() });
    } catch (error) {
      // Handle error (e.g., show toast)
    }
  }

  // Load full history on initial mount or user change
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


  // Example of fetching a single record if needed elsewhere
  const getSingleRecord = async (id) => {
      const record = examHistory.find(r => r.id === id) || await fetchExamRecordById(id);
      // use the record...
  }

  // ... rest of component
}
*/
