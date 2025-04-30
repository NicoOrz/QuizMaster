"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import type { ExamRecord, IncorrectQuestionDetail } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, X, Clock, Home, ListChecks } from 'lucide-react';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} sec`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes} min ${remainingSeconds} sec`;
}


export default function ExamResultsPage() {
  const { examHistory } = useQuiz();
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordId = searchParams.get('recordId');
  const [examRecord, setExamRecord] = useState<ExamRecord | null>(null);

  useEffect(() => {
    if (!recordId) {
      router.push('/'); // Redirect if no record ID is provided
      return;
    }

    // Find the record in the local state (replace with Firestore fetch later)
    const foundRecord = examHistory.find(record => record.id === recordId);

    if (foundRecord) {
      setExamRecord(foundRecord);
    } else {
      // Handle case where record is not found (e.g., user refreshed, state lost)
      // Ideally, fetch from Firestore here as a fallback
      console.warn(`Exam record with ID ${recordId} not found in local state.`);
      // For now, redirect home, but Firestore fetch is better
      // router.push('/');
      // Placeholder if needed:
       setExamRecord({
            id: recordId,
            userId: 'unknown',
            score: 0,
            totalQuestions: 0,
            correctCount: 0,
            timestamp: Date.now(),
            incorrectQuestions: [],
            duration: 0,
        });
    }
  }, [recordId, examHistory, router]);

   const goToHome = () => {
    router.push('/');
   };

   const goToHistory = () => {
     router.push('/history');
   }

  if (!examRecord) {
    return <div className="container mx-auto p-4 text-center">Loading results...</div>;
  }

  const incorrectQuestions = examRecord.incorrectQuestions || [];
  const scoreColor = examRecord.score >= 70 ? 'text-green-600' : examRecord.score >= 40 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center pt-10">
      <Button onClick={goToHome} variant="outline" className="absolute top-4 left-4">
          <Home className="mr-2 h-4 w-4" /> Back to Home
      </Button>
        <Button onClick={goToHistory} variant="outline" className="absolute top-4 right-4">
          <ListChecks className="mr-2 h-4 w-4" /> View History
        </Button>
      <h1 className="text-3xl font-bold mb-6 text-center">Exam Results</h1>

      <Card className="w-full max-w-3xl mb-8 shadow-lg rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Your Score</CardTitle>
          <CardDescription>
            Completed on: {format(new Date(examRecord.timestamp), 'PPP p')}
             {examRecord.duration !== undefined && (
               <span className="flex items-center justify-center text-muted-foreground mt-1">
                 <Clock className="mr-1 h-4 w-4" /> {formatDuration(examRecord.duration)}
               </span>
             )}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className={`text-6xl font-bold ${scoreColor}`}>{examRecord.score.toFixed(1)}%</p>
          <p className="text-lg text-muted-foreground mt-2">
            {examRecord.correctCount} out of {examRecord.totalQuestions} questions correct
          </p>
        </CardContent>
      </Card>

      {incorrectQuestions.length > 0 && (
         <Card className="w-full max-w-3xl shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle className="text-xl">Review Incorrect Questions</CardTitle>
               <CardDescription>Here are the questions you answered incorrectly.</CardDescription>
            </CardHeader>
             <CardContent>
                 <Accordion type="single" collapsible className="w-full">
                    {incorrectQuestions.map((item, index) => (
                        <AccordionItem value={`item-${index}`} key={item.question_number}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                             <span className="text-left font-medium">Question {item.question_number}</span>
                             <div className="flex items-center space-x-2">
                               <span className="text-sm text-muted-foreground">Your Answer: {item.user_answer.join(', ') || 'N/A'}</span>
                               <X className="h-5 w-5 text-red-500" />
                             </div>
                           </div>
                        </AccordionTrigger>
                         <AccordionContent className="pt-4">
                           <QuestionCard
                             question={{ // Construct a Question object for the card
                                question_number: item.question_number,
                                question_text: item.question_text,
                                options: item.options,
                                correct_answer: item.correct_answer,
                                explanation: item.explanation,
                                image_url: item.image_url,
                             }}
                             selectedAnswers={item.user_answer} // Show what the user selected
                             onAnswerChange={() => {}} // No action needed in review
                             questionIndex={index} // Use accordion index for display purposes if needed
                             totalQuestions={incorrectQuestions.length}
                             isReviewMode={true} // Enable review styling
                             userAnswer={item.user_answer}
                            />
                             <Separator className="my-4" />
                             <div className="mt-4 p-4 bg-secondary/50 rounded-md border border-border">
                               <h4 className="font-semibold mb-2">Explanation:</h4>
                               <p className="text-sm whitespace-pre-wrap">{item.explanation || "No explanation provided."}</p>
                               <p className="text-sm mt-2 font-medium">Correct Answer(s): <span className="text-green-600">{item.correct_answer.join(', ')}</span></p>
                             </div>
                         </AccordionContent>
                        </AccordionItem>
                    ))}
                 </Accordion>
             </CardContent>
         </Card>

      )}

       {incorrectQuestions.length === 0 && examRecord.totalQuestions > 0 && (
        <Card className="w-full max-w-3xl shadow-lg rounded-lg bg-green-50 border-green-200">
          <CardContent className="p-6 text-center">
            <Check className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <p className="text-xl font-semibold text-green-700">Congratulations! You answered all questions correctly!</p>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
