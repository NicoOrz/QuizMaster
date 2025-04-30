"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function PracticePage() {
  const { questions } = useQuiz();
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string[]>>({});

  useEffect(() => {
    if (questions.length === 0) {
      // Redirect back home if no questions are loaded
      router.push('/');
    }
  }, [questions, router]);

  const handleAnswerChange = (questionNumber: number, answerKey: string, checked: boolean) => {
    setSelectedAnswers(prev => {
      const currentAnswers = prev[questionNumber] || [];
      const question = questions.find(q => q.question_number === questionNumber);
      const isMultipleChoice = question && question.correct_answer.length > 1;

      if (isMultipleChoice) {
        if (checked) {
          return { ...prev, [questionNumber]: [...currentAnswers, answerKey] };
        } else {
          return { ...prev, [questionNumber]: currentAnswers.filter(ans => ans !== answerKey) };
        }
      } else {
        // Single choice (RadioGroup)
        return { ...prev, [questionNumber]: [answerKey] };
      }
    });
  };


  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

   const goToHome = () => {
    router.push('/');
   };


  if (questions.length === 0) {
    // Render loading or placeholder while redirecting
    return <div className="container mx-auto p-4 text-center">Loading questions or redirecting...</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentQuestionNumber = currentQuestion.question_number;

  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center pt-10">
       <Button onClick={goToHome} variant="outline" className="absolute top-4 left-4">
          <Home className="mr-2 h-4 w-4" /> Back to Home
       </Button>
      <h1 className="text-3xl font-bold mb-8">Practice Mode</h1>

      {currentQuestion && (
        <QuestionCard
          question={currentQuestion}
          selectedAnswers={selectedAnswers[currentQuestionNumber] || []}
          onAnswerChange={(answerKey, checked) => handleAnswerChange(currentQuestionNumber, answerKey, checked)}
          questionIndex={currentQuestionIndex}
          totalQuestions={questions.length}
        />
      )}

      <Card className="w-full max-w-2xl mx-auto mt-6 shadow-md rounded-lg">
        <CardContent className="flex justify-between p-4">
          <Button onClick={goToPreviousQuestion} disabled={currentQuestionIndex === 0} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          <Button onClick={goToNextQuestion} disabled={currentQuestionIndex === questions.length - 1}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
