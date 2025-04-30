"use client";

import type { Question, ExamRecord } from '@/types/quiz';
import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

interface QuizContextProps {
  questions: Question[];
  setQuestions: Dispatch<SetStateAction<Question[]>>;
  examHistory: ExamRecord[];
  setExamHistory: Dispatch<SetStateAction<ExamRecord[]>>;
  addExamRecord: (record: ExamRecord) => void;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
}

const QuizContext = createContext<QuizContextProps | undefined>(undefined);

export const QuizProvider = ({ children }: { children: ReactNode }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examHistory, setExamHistory] = useState<ExamRecord[]>([]);
   const [isLoading, setIsLoading] = useState<boolean>(false);


  // Function to add a new exam record (can be expanded to save to Firestore)
  const addExamRecord = (record: ExamRecord) => {
    // For now, just update local state. Later, this will interact with Firestore.
    setExamHistory(prev => [...prev, record]);
    // TODO: Add Firestore saving logic here or in a dedicated service
  };

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
