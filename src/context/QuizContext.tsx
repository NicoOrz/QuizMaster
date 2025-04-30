
"use client";

import type { Question, ExamRecord, UserAnswer, PracticeProgress, ExamProgress } from '@/types/quiz';
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
}

const QuizContext = createContext<QuizContextProps | undefined>(undefined);

// localStorage keys
const PRACTICE_PROGRESS_KEY = 'quizMasterPracticeProgress';
const EXAM_PROGRESS_KEY = 'quizMasterExamProgress';
const ALL_QUESTIONS_KEY = 'quizMasterAllQuestions'; // Key for all questions
const EXAM_HISTORY_KEY = 'quizMasterExamHistory'; // Key for exam history

// Helper to safely get item from localStorage
const safelyGetLocalStorage = <T,>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') {
        return defaultValue;
    }
    try {
        const item = window.localStorage.getItem(key);
        // Ensure we don't parse "undefined" or "null" strings incorrectly
        if (item === null || item === 'undefined') {
             return defaultValue;
        }
        // Add basic check for empty progress objects that might have been saved incorrectly
        const parsed = JSON.parse(item);
        if (key === PRACTICE_PROGRESS_KEY && parsed && (!parsed.questions || !Array.isArray(parsed.questions))) {
            console.warn(`Invalid practice progress structure found in localStorage for key "${key}". Resetting.`);
            window.localStorage.removeItem(key);
            return defaultValue;
        }
         if (key === EXAM_PROGRESS_KEY && parsed && (!parsed.questions || !Array.isArray(parsed.questions))) {
            console.warn(`Invalid exam progress structure found in localStorage for key "${key}". Resetting.`);
            window.localStorage.removeItem(key);
            return defaultValue;
        }

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
        } else {
             // Ensure progress objects have the 'questions' array before saving
             if ((key === PRACTICE_PROGRESS_KEY || key === EXAM_PROGRESS_KEY) && (!value.questions || !Array.isArray(value.questions))) {
                console.warn(`Attempted to save invalid progress structure for key "${key}". Skipping save.`);
                return;
             }
             window.localStorage.setItem(key, JSON.stringify(value));
        }
    } catch (error) {
        console.error(`Error setting localStorage key “${key}”:`, error);
    }
};


export const QuizProvider = ({ children }: { children: ReactNode }) => {
  // Load questions from localStorage on initial mount
  const [questions, setQuestions] = useState<Question[]>(() =>
    safelyGetLocalStorage<Question[]>(ALL_QUESTIONS_KEY, [])
  );
  const [examHistory, setExamHistory] = useState<ExamRecord[]>(() =>
     safelyGetLocalStorage<ExamRecord[]>(EXAM_HISTORY_KEY, []).sort((a, b) => b.timestamp - a.timestamp)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false); // Initially not loading

  // --- Progress State ---
  const [practiceProgress, setPracticeProgress] = useState<PracticeProgress | null>(
    () => safelyGetLocalStorage<PracticeProgress | null>(PRACTICE_PROGRESS_KEY, null)
  );
  const [examProgress, setExamProgress] = useState<ExamProgress | null>(
    () => safelyGetLocalStorage<ExamProgress | null>(EXAM_PROGRESS_KEY, null)
  );

   // --- Effect to Persist All Questions ---
   useEffect(() => {
     safelySetLocalStorage(ALL_QUESTIONS_KEY, questions);
   }, [questions]);

  // --- Effects for Persisting Progress ---
  useEffect(() => {
    safelySetLocalStorage(PRACTICE_PROGRESS_KEY, practiceProgress);
  }, [practiceProgress]);

  useEffect(() => {
     safelySetLocalStorage(EXAM_PROGRESS_KEY, examProgress);
  }, [examProgress]);

   // --- Effect for Persisting Exam History ---
    useEffect(() => {
     safelySetLocalStorage(EXAM_HISTORY_KEY, examHistory);
   }, [examHistory]);


  // --- Functions to Clear Progress ---
   const clearPracticeProgress = useCallback(() => {
    setPracticeProgress(null); // Set state to null
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem(PRACTICE_PROGRESS_KEY); // Remove from localStorage
    }
    console.log("Practice progress cleared.");
  }, []);

  const clearExamProgress = useCallback(() => {
    setExamProgress(null); // Set state to null
     if (typeof window !== 'undefined') {
        window.localStorage.removeItem(EXAM_PROGRESS_KEY); // Remove from localStorage
    }
    console.log("Exam progress cleared.");
  }, []);


  // Function to add a new exam record
  const addExamRecord = useCallback((record: ExamRecord) => {
    setExamHistory(prev => {
        // Avoid duplicates just in case
        const exists = prev.some(r => r.id === record.id);
        if (exists) return prev;
        const newState = [...prev, record].sort((a, b) => b.timestamp - a.timestamp); // Keep history sorted
        return newState;
    });
    // Clear exam progress after successfully saving/submitting
    clearExamProgress();
  }, [clearExamProgress]);


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
