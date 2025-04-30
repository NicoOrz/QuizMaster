
"use client";

import type { Question, ExamRecord, UserAnswer, PracticeProgress, ExamProgress, PracticeResult } from '@/types/quiz';
import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useEffect, useCallback } from 'react';


interface QuizContextProps {
  questions: Question[]; // All loaded questions
  setQuestions: Dispatch<SetStateAction<Question[]>>;
  examHistory: ExamRecord[];
  setExamHistory: Dispatch<SetStateAction<ExamRecord[]>>;
  addExamRecord: (record: ExamRecord) => void;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;

  // Progress state and setters
  practiceProgress: PracticeProgress | null;
  setPracticeProgress: Dispatch<SetStateAction<PracticeProgress | null>>;
  examProgress: ExamProgress | null;
  setExamProgress: Dispatch<SetStateAction<ExamProgress | null>>;

  // Functions to clear progress
  clearPracticeProgress: () => void;
  clearExamProgress: () => void;

  // Flag for initialization
  isInitialized: boolean;

  // Practice History
  practiceHistory: PracticeResult[];
  setPracticeHistory: Dispatch<SetStateAction<PracticeResult[]>>;
  addPracticeResult: (result: Omit<PracticeResult, 'id'>) => PracticeResult; // Returns the added result with ID

}

const QuizContext = createContext<QuizContextProps | undefined>(undefined);

// localStorage keys
const PRACTICE_PROGRESS_KEY = 'quizMasterPracticeProgress';
const EXAM_PROGRESS_KEY = 'quizMasterExamProgress';
const ALL_QUESTIONS_KEY = 'quizMasterAllQuestions'; // Key for all questions
const EXAM_HISTORY_KEY = 'quizMasterExamHistory'; // Key for exam history
const PRACTICE_HISTORY_KEY = 'quizMasterPracticeHistory'; // Key for practice history

// Helper to safely get item from localStorage
const safelyGetLocalStorage = <T,>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') {
        return defaultValue;
    }
    try {
        const item = window.localStorage.getItem(key);
        // Ensure we don't parse "undefined" or "null" strings incorrectly
        if (item === null || item === 'undefined' || item === '') {
             return defaultValue;
        }
        // Add basic check for empty progress objects that might have been saved incorrectly
        const parsed = JSON.parse(item);

        // Specific checks for progress structures
        if (key === PRACTICE_PROGRESS_KEY) {
           const progress = parsed as PracticeProgress | null;
            if (progress && (!progress.questions || !Array.isArray(progress.questions) || typeof progress.currentIndex !== 'number' || typeof progress.selections !== 'object')) {
                console.warn(`Invalid practice progress structure found in localStorage for key "${key}". Resetting.`);
                window.localStorage.removeItem(key);
                return defaultValue;
            }
        }
         if (key === EXAM_PROGRESS_KEY) {
            const progress = parsed as ExamProgress | null;
            if (progress && (!progress.questions || !Array.isArray(progress.questions) || typeof progress.currentIndex !== 'number' || typeof progress.answers !== 'object' || typeof progress.startTime !== 'number')) {
                console.warn(`Invalid exam progress structure found in localStorage for key "${key}". Resetting.`);
                window.localStorage.removeItem(key);
                return defaultValue;
            }
        }
         // Add specific checks for history structures if needed

        return parsed !== null ? parsed : defaultValue; // Return parsed value or default
    } catch (error) {
        console.error(`Error reading localStorage key “${key}”:`, error);
         // Attempt to remove corrupted data
         try {
            window.localStorage.removeItem(key);
            console.log(`Removed potentially corrupted localStorage item for key "${key}".`);
         } catch (removeError) {
             console.error(`Failed to remove corrupted localStorage item for key "${key}":`, removeError);
         }
        return defaultValue;
    }
};

// Helper to safely set item in localStorage
const safelySetLocalStorage = (key: string, value: any) => {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        // Prevent saving null/undefined directly, remove instead if value is nullish
        if (value === null || value === undefined) {
             window.localStorage.removeItem(key);
             // console.log(`Removed localStorage item for key "${key}" (value was null/undefined).`);
        } else {
             // Ensure progress objects have the correct structure before saving
             if (key === PRACTICE_PROGRESS_KEY) {
                const progress = value as PracticeProgress;
                // Allow empty questions array initially, but other fields must be correct type
                if (!progress || !Array.isArray(progress.questions) || typeof progress.currentIndex !== 'number' || typeof progress.selections !== 'object') {
                    console.warn(`Attempted to save invalid practice progress structure for key "${key}". Skipping save. Value:`, progress);
                    return; // Skip saving invalid structure
                }
             }
              if (key === EXAM_PROGRESS_KEY) {
                 const progress = value as ExamProgress;
                 if (!progress || !Array.isArray(progress.questions) || typeof progress.currentIndex !== 'number' || typeof progress.answers !== 'object' || typeof progress.startTime !== 'number') {
                    console.warn(`Attempted to save invalid exam progress structure for key "${key}". Skipping save. Value:`, progress);
                    return;
                 }
              }
             window.localStorage.setItem(key, JSON.stringify(value));
             // console.log(`Saved localStorage item for key "${key}".`);
        }
    } catch (error) {
        console.error(`Error setting localStorage key “${key}”:`, error);
    }
};


export const QuizProvider = ({ children }: { children: ReactNode }) => {
  // Initial state set to defaults (empty/null) to avoid hydration mismatch
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examHistory, setExamHistory] = useState<ExamRecord[]>([]);
  const [practiceHistory, setPracticeHistory] = useState<PracticeResult[]>([]); // Added practice history state
  const [isLoading, setIsLoading] = useState<boolean>(true); // Assume loading initially
  const [practiceProgress, setPracticeProgress] = useState<PracticeProgress | null>(null);
  const [examProgress, setExamProgress] = useState<ExamProgress | null>(null);
  const [isInitialized, setIsInitialized] = useState(false); // Track client-side initialization

  // Effect to load data from localStorage *only on the client*
  useEffect(() => {
    // Check if already initialized to prevent re-running
    if (!isInitialized) {
        setQuestions(safelyGetLocalStorage<Question[]>(ALL_QUESTIONS_KEY, []));
        setExamHistory(safelyGetLocalStorage<ExamRecord[]>(EXAM_HISTORY_KEY, []).sort((a, b) => b.timestamp - a.timestamp));
        setPracticeHistory(safelyGetLocalStorage<PracticeResult[]>(PRACTICE_HISTORY_KEY, []).sort((a, b) => b.timestamp - a.timestamp)); // Load practice history
        setPracticeProgress(safelyGetLocalStorage<PracticeProgress | null>(PRACTICE_PROGRESS_KEY, null));
        setExamProgress(safelyGetLocalStorage<ExamProgress | null>(EXAM_PROGRESS_KEY, null));
        setIsLoading(false); // Finish loading after retrieving from storage
        setIsInitialized(true); // Mark initialization complete
        console.log("QuizContext initialized from localStorage.");
    }
  }, [isInitialized]); // Depend on isInitialized

   // --- Effect to Persist All Questions ---
   useEffect(() => {
     // Only save after initial client-side load is complete
     if (isInitialized) {
        safelySetLocalStorage(ALL_QUESTIONS_KEY, questions);
     }
   }, [questions, isInitialized]);

  // --- Effects for Persisting Progress ---
  useEffect(() => {
    if (isInitialized) {
        safelySetLocalStorage(PRACTICE_PROGRESS_KEY, practiceProgress);
    }
  }, [practiceProgress, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
        safelySetLocalStorage(EXAM_PROGRESS_KEY, examProgress);
    }
  }, [examProgress, isInitialized]);

   // --- Effect for Persisting Exam History ---
    useEffect(() => {
    if (isInitialized) {
        safelySetLocalStorage(EXAM_HISTORY_KEY, examHistory);
    }
   }, [examHistory, isInitialized]);

    // --- Effect for Persisting Practice History ---
    useEffect(() => {
    if (isInitialized) {
        safelySetLocalStorage(PRACTICE_HISTORY_KEY, practiceHistory);
    }
   }, [practiceHistory, isInitialized]);


  // --- Functions to Clear Progress ---
   const clearPracticeProgress = useCallback(() => {
    setPracticeProgress(null); // Set state to null
    // localStorage removal is handled by the useEffect for practiceProgress
    console.log("Practice progress cleared.");
  }, []);

  const clearExamProgress = useCallback(() => {
    setExamProgress(null); // Set state to null
    // localStorage removal is handled by the useEffect for examProgress
    console.log("Exam progress cleared.");
  }, []);


  // Function to add a new exam record
  const addExamRecord = useCallback((record: ExamRecord) => {
    setExamHistory(prev => {
        // Assign ID if missing (though Firestore ID should be preferred)
        const recordWithId = { ...record, id: record.id ?? `local-${Date.now()}-${Math.random()}` };
        // Avoid duplicates just in case
        const exists = prev.some(r => r.id === recordWithId.id);
        if (exists) return prev;
        const newState = [...prev, recordWithId].sort((a, b) => b.timestamp - a.timestamp); // Keep history sorted
        return newState;
    });
    // Clear exam progress after successfully saving/submitting
    clearExamProgress();
  }, [clearExamProgress]);

   // Function to add a new practice result and return it with the final ID
   const addPracticeResult = useCallback((result: Omit<PracticeResult, 'id'>): PracticeResult => {
     // Generate a simple local ID for practice results
     const resultWithId: PracticeResult = { ...result, id: `practice-${Date.now()}-${Math.random()}` };
     setPracticeHistory(prev => {
        // Note: We use resultWithId here which already has the ID
        const newState = [resultWithId, ...prev].sort((a, b) => b.timestamp - a.timestamp); // Keep history sorted
        return newState;
     });
     // Clear practice progress after finishing
     clearPracticeProgress();
     return resultWithId; // Return the result including the generated ID
   }, [clearPracticeProgress]);


  return (
    <QuizContext.Provider
      value={{
        questions,
        setQuestions,
        examHistory,
        setExamHistory,
        addExamRecord,
        isLoading,
        setIsLoading,
        practiceProgress,
        setPracticeProgress,
        examProgress,
        setExamProgress,
        clearPracticeProgress,
        clearExamProgress,
        isInitialized, // Provide initialization status
        practiceHistory, // Provide practice history
        setPracticeHistory, // Provide setter
        addPracticeResult, // Provide add function
      }}
    >
      {children}
    </QuizContext.Provider>
  );
};

export const useQuiz = () => {
  const context = useContext(QuizContext);
  if (context === undefined) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
};
