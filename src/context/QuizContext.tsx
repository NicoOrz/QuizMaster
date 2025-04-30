
"use client";

import type { Question, ExamRecord, UserAnswer } from '@/types/quiz';
import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useEffect, useCallback } from 'react';

// Define types for progress state
interface PracticeProgress {
  currentIndex: number;
  selections: Record<number, string[]>; // question_number -> selected options
}

interface ExamProgress {
  questions: Question[]; // The specific questions for the current exam attempt
  currentIndex: number;
  answers: Record<number, UserAnswer>; // question_number -> UserAnswer
  startTime: number; // Timestamp when the exam was started/resumed
  configNumQuestions: number; // Store the number of questions requested for this exam
}


interface QuizContextProps {
  questions: Question[];
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

// Helper to safely get item from localStorage
const safelyGetLocalStorage = <T,>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') {
        return defaultValue;
    }
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading localStorage key “${key}”:`, error);
        return defaultValue;
    }
};

// Helper to safely set item in localStorage
const safelySetLocalStorage = (key: string, value: any) => {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error setting localStorage key “${key}”:`, error);
    }
};


export const QuizProvider = ({ children }: { children: ReactNode }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examHistory, setExamHistory] = useState<ExamRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // --- Progress State ---
  const [practiceProgress, setPracticeProgress] = useState<PracticeProgress | null>(
    () => safelyGetLocalStorage<PracticeProgress | null>(PRACTICE_PROGRESS_KEY, null)
  );
  const [examProgress, setExamProgress] = useState<ExamProgress | null>(
    () => safelyGetLocalStorage<ExamProgress | null>(EXAM_PROGRESS_KEY, null)
  );

  // --- Effects for Persisting Progress ---
  useEffect(() => {
    safelySetLocalStorage(PRACTICE_PROGRESS_KEY, practiceProgress);
  }, [practiceProgress]);

  useEffect(() => {
     safelySetLocalStorage(EXAM_PROGRESS_KEY, examProgress);
  }, [examProgress]);

  // --- Functions to Clear Progress ---
   const clearPracticeProgress = useCallback(() => {
    setPracticeProgress(null);
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem(PRACTICE_PROGRESS_KEY);
    }
    console.log("Practice progress cleared.");
  }, []);

  const clearExamProgress = useCallback(() => {
    setExamProgress(null);
     if (typeof window !== 'undefined') {
        window.localStorage.removeItem(EXAM_PROGRESS_KEY);
    }
    console.log("Exam progress cleared.");
  }, []);


  // Function to add a new exam record
  const addExamRecord = useCallback((record: ExamRecord) => {
    setExamHistory(prev => {
        const newState = [...prev, record].sort((a, b) => b.timestamp - a.timestamp); // Keep history sorted
        // Optionally persist full history to localStorage if needed, but Firestore is primary
        // safelySetLocalStorage('quizMasterExamHistory', newState);
        return newState;
    });
    // Clear exam progress after successfully saving/submitting
    clearExamProgress();
  }, [clearExamProgress]);

   // Load history from localStorage on initial mount (optional, if not relying solely on Firestore fetch)
    // useEffect(() => {
    //     const loadedHistory = safelyGetLocalStorage<ExamRecord[]>('quizMasterExamHistory', []);
    //     setExamHistory(loadedHistory.sort((a, b) => b.timestamp - a.timestamp));
    // }, []);


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
