
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
        console.warn(`mapFirestoreDocToExamRecord: Document snapshot does not exist (ID: ${docSnapshot.id}).`);
        return null;
    }
    const data = docSnapshot.data();
    if (!data) {
        console.warn(`mapFirestoreDocToExamRecord: Document data is missing (ID: ${docSnapshot.id}).`);
        return null;
    }
    const timestamp = data.timestamp?.toMillis(); // Convert Timestamp to number
    if (!timestamp) {
        console.warn(`mapFirestoreDocToExamRecord: Document timestamp is missing or invalid (ID: ${docSnapshot.id}). Using current time as fallback.`);
    }
    return {
        id: docSnapshot.id,
        userId: data.userId,
        score: data.score,
        totalQuestions: data.totalQuestions,
        correctCount: data.correctCount,
        incorrectQuestions: data.incorrectQuestions || [], // Ensure array exists
        duration: data.duration,
        timestamp: timestamp || Date.now(), // Fallback to current time if Firestore timestamp is missing
    };
};


// Function to save an exam record to Firestore
export const saveExamRecord = async (record: ExamRecordDataToSave): Promise<string> => {
  console.log("[saveExamRecord] Attempting to save:", record);
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
    console.log("[saveExamRecord] Successfully saved. Document ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("[saveExamRecord] Error adding document: ", error);
    let errorMessage = 'Failed to save exam record.';
    if (error instanceof Error) {
        errorMessage = `Failed to save exam record: ${error.message}`;
        console.error("[saveExamRecord] Error details:", error.stack);
    }
    throw new Error(errorMessage);
  }
};

// Function to fetch exam records for a user from Firestore
export const fetchExamRecords = async (userId: string): Promise<ExamRecord[]> => {
    console.log(`[fetchExamRecords] Attempting to fetch records for user ID: ${userId}`);
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
        } else {
             console.warn(`[fetchExamRecords] Failed to map document ${doc.id} for user ${userId}.`);
        }
    });
    console.log(`[fetchExamRecords] Fetched ${records.length} records for user ${userId}.`);
    return records;
  } catch (error) {
    console.error(`[fetchExamRecords] Error fetching documents for user ${userId}: `, error);
    let errorMessage = 'Failed to fetch exam records.';
     if (error instanceof Error) {
         errorMessage = `Failed to fetch exam records for user ${userId}: ${error.message}`;
         console.error(`[fetchExamRecords] Error details for user ${userId}:`, error.stack);
     }
    throw new Error(errorMessage);
  }
};

// Function to fetch a single exam record by its ID from Firestore
export const fetchExamRecordById = async (recordId: string): Promise<ExamRecord | null> => {
    console.log(`[fetchExamRecordById] Attempting to fetch record with ID: ${recordId}`);
  try {
    if (!recordId) {
        console.error("[fetchExamRecordById] Invalid recordId provided (empty or null).");
        throw new Error("Invalid record ID provided.");
    }
    const docRef = doc(db, EXAM_RECORDS_COLLECTION, recordId);
    const docSnap = await getDoc(docRef);

    const record = mapFirestoreDocToExamRecord(docSnap as import("firebase/firestore").DocumentSnapshot<FirestoreExamRecord>);
    if (record) {
        console.log(`[fetchExamRecordById] Successfully fetched record with ID ${recordId}.`);
        return record;
    } else {
        console.warn(`[fetchExamRecordById] No record found with ID ${recordId}.`);
        return null; // Return null explicitly if not found or mapping failed
    }

  } catch (error) {
    console.error(`[fetchExamRecordById] Error fetching document with ID ${recordId}: `, error);
     let errorMessage = `Failed to fetch exam record with ID ${recordId}.`;
     if (error instanceof Error) {
         errorMessage = `Failed to fetch exam record with ID ${recordId}: ${error.message}`;
         console.error(`[fetchExamRecordById] Error details for ID ${recordId}:`, error.stack);
     }
    throw new Error(errorMessage);
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
