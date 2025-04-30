"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import type { Question, UserAnswer } from '@/types/quiz';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';


// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}


export default function ExamTakePage() {
  const { questions: allQuestions, addExamRecord } = useQuiz();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNumQuestions = parseInt(searchParams.get('numQuestions') || '10', 10);

  const examQuestions = useMemo(() => {
     if (allQuestions.length === 0) return [];
    const shuffled = shuffleArray(allQuestions);
    return shuffled.slice(0, Math.min(requestedNumQuestions, allQuestions.length));
  }, [allQuestions, requestedNumQuestions]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, UserAnswer>>({}); // Store answers by question_number
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examStartTime] = useState(Date.now()); // Record start time

  useEffect(() => {
    if (allQuestions.length === 0) {
      router.push('/'); // Redirect if no questions loaded
    } else if (examQuestions.length === 0 && allQuestions.length > 0) {
        // If examQuestions is empty but allQuestions exist (maybe numQuestions issue)
        router.push('/exam/config');
    }
  }, [allQuestions, examQuestions, router]);

  const handleAnswerChange = (questionNumber: number, answerKey: string, checked: boolean) => {
    setUserAnswers(prev => {
      const currentAnswer = prev[questionNumber] || { question_number: questionNumber, selected_answers: [] };
      const question = examQuestions.find(q => q.question_number === questionNumber);
      const isMultipleChoice = question && question.correct_answer.length > 1;

       let newSelectedAnswers: string[];

      if (isMultipleChoice) {
        if (checked) {
          newSelectedAnswers = [...currentAnswer.selected_answers, answerKey];
        } else {
          newSelectedAnswers = currentAnswer.selected_answers.filter(ans => ans !== answerKey);
        }
      } else {
         // Single choice (RadioGroup) - replace existing answer
        newSelectedAnswers = [answerKey];
      }
       return {
        ...prev,
        [questionNumber]: { ...currentAnswer, selected_answers: newSelectedAnswers }
      };
    });
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < examQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

   const goToHome = () => {
    router.push('/');
   };


  const handleSubmitExam = () => {
     setIsSubmitting(true);

    let correctCount = 0;
    const incorrectQuestionsDetail = [];

    for (const question of examQuestions) {
       const userAnswer = userAnswers[question.question_number];
       const selected = userAnswer?.selected_answers || [];
       const correct = question.correct_answer;

        // Sort both arrays to ensure order doesn't matter for comparison
       const isCorrect = selected.length === correct.length && [...selected].sort().every((value, index) => value === [...correct].sort()[index]);


       if (isCorrect) {
         correctCount++;
       } else {
         incorrectQuestionsDetail.push({
           question_number: question.question_number,
           question_text: question.question_text,
           options: question.options,
           user_answer: selected,
           correct_answer: correct,
           explanation: question.explanation,
           image_url: question.image_url,
         });
       }
    }

     const score = examQuestions.length > 0 ? (correctCount / examQuestions.length) * 100 : 0;
     const examEndTime = Date.now();
     const duration = Math.round((examEndTime - examStartTime) / 1000); // Duration in seconds

     const record = {
        // Generate a simple local ID for now, Firestore will generate its own
       id: `exam_${Date.now()}`,
       userId: 'anonymous', // Replace with actual user ID if auth is implemented
       score: parseFloat(score.toFixed(2)),
       totalQuestions: examQuestions.length,
       correctCount: correctCount,
       timestamp: examStartTime,
       incorrectQuestions: incorrectQuestionsDetail,
       duration: duration,
     };

     addExamRecord(record);

     // Navigate to results page, passing the record ID (or the whole record for now)
     router.push(`/exam/results?recordId=${record.id}`);
  };


  if (examQuestions.length === 0) {
    return <div className="container mx-auto p-4 text-center">Loading exam questions or redirecting...</div>;
  }

  const currentQuestion = examQuestions[currentQuestionIndex];
   const currentQuestionNumber = currentQuestion.question_number;
  const progress = ((currentQuestionIndex + 1) / examQuestions.length) * 100;

  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center pt-10">
        <Button onClick={goToHome} variant="outline" className="absolute top-4 left-4">
            <Home className="mr-2 h-4 w-4" /> Back to Home
        </Button>
      <h1 className="text-3xl font-bold mb-4">Exam Mode</h1>
      <div className="w-full max-w-2xl mb-4">
         <Progress value={progress} className="w-full h-2" />
         <p className="text-sm text-muted-foreground text-center mt-1">
           Question {currentQuestionIndex + 1} of {examQuestions.length}
         </p>
      </div>


      {currentQuestion && (
        <QuestionCard
          question={currentQuestion}
          selectedAnswers={userAnswers[currentQuestionNumber]?.selected_answers || []}
          onAnswerChange={(answerKey, checked) => handleAnswerChange(currentQuestionNumber, answerKey, checked)}
          questionIndex={currentQuestionIndex}
          totalQuestions={examQuestions.length}
        />
      )}

       <Card className="w-full max-w-2xl mx-auto mt-6 shadow-md rounded-lg">
         <CardContent className="flex justify-between p-4 items-center">
          <Button onClick={goToPreviousQuestion} disabled={currentQuestionIndex === 0 || isSubmitting} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>

          {currentQuestionIndex === examQuestions.length - 1 ? (
             <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isSubmitting}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Submit Exam
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to submit your exam? You cannot change your answers after submitting.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmitExam} disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting...' : 'Submit'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          ) : (
            <Button onClick={goToNextQuestion} disabled={isSubmitting}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
         </CardContent>
      </Card>
    </div>
  );
}
