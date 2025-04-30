
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuiz } from '@/context/QuizContext';
import type { PracticeResult, PracticeIncorrectQuestion } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, X, Clock, Home, BookOpenText, Settings } from 'lucide-react';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} sec`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }
  return `${minutes} min ${remainingSeconds} sec`;
}


export default function PracticeResultsPage() {
  const { lastPracticeResult, setLastPracticeResult } = useQuiz();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(!lastPracticeResult); // Start loading if no result initially
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lastPracticeResult) {
        setError("No practice result found. Perhaps you refreshed the page?");
        setIsLoading(false);
        // Clear the context in case it's stale, though it should be null anyway
        // setLastPracticeResult(null);
    } else {
        setIsLoading(false); // Result is available
    }
     // Cleanup function to clear the result when navigating away or unmounting
     return () => {
        setLastPracticeResult(null);
     };
  }, [lastPracticeResult, setLastPracticeResult]);

   const goToHome = () => {
    router.push('/');
   };

   const startNewPractice = () => {
     router.push('/practice/config');
   }

   // Loading State
   if (isLoading) {
     return (
       <div className="container mx-auto p-4 min-h-screen flex flex-col items-center pt-10 pb-10 space-y-8">
         <Skeleton className="h-10 w-32 absolute top-4 left-4" />
         <Skeleton className="h-10 w-40 absolute top-4 right-4" />
         <Skeleton className="h-8 w-64 mt-12" /> {/* Title */}
         <Skeleton className="w-full max-w-3xl h-48" /> {/* Score Card */}
         <Skeleton className="w-full max-w-4xl h-64" /> {/* Incorrect Questions Card */}
       </div>
     );
   }

   // Error State or No Result Found
   if (error || !lastPracticeResult) {
       return (
          <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center text-center">
               <Button onClick={goToHome} variant="outline" className="absolute top-4 left-4">
                   <Home className="mr-2 h-4 w-4" /> Back to Home
               </Button>
                <Button onClick={startNewPractice} variant="outline" className="absolute top-4 right-4">
                 <Settings className="mr-2 h-4 w-4" /> Configure New Practice
               </Button>
             <h1 className="text-2xl font-bold mb-4 text-destructive">Error Loading Results</h1>
             <p className="text-muted-foreground mb-6">{error || "Could not retrieve practice session results."}</p>
             {/* Optional: Retry logic if it makes sense */}
          </div>
       );
   }

  // --- Display Record ---
  const incorrectQuestions = lastPracticeResult.incorrectQuestions || [];
  const scoreColor = lastPracticeResult.score >= 70 ? 'text-green-600 dark:text-green-400' : lastPracticeResult.score >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center pt-10 pb-10">
      <Button onClick={goToHome} variant="outline" className="absolute top-4 left-4">
          <Home className="mr-2 h-4 w-4" /> Back to Home
      </Button>
        <Button onClick={startNewPractice} variant="outline" className="absolute top-4 right-4">
          <Settings className="mr-2 h-4 w-4" /> New Practice Session
        </Button>
      <h1 className="text-3xl font-bold mb-6 text-center mt-12">Practice Results</h1>

      <Card className="w-full max-w-3xl mb-8 shadow-lg rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Your Score</CardTitle>
           {lastPracticeResult.range && (
                <CardDescription>
                 (Practiced original questions: {lastPracticeResult.range.start} - {lastPracticeResult.range.end})
                </CardDescription>
           )}
          <CardDescription>
            Completed on: {format(new Date(lastPracticeResult.timestamp), 'PPP p')}
             {lastPracticeResult.duration !== undefined && lastPracticeResult.duration > 0 && (
               <span className="flex items-center justify-center text-muted-foreground mt-1">
                 <Clock className="mr-1 h-4 w-4" /> {formatDuration(lastPracticeResult.duration)}
               </span>
             )}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className={`text-6xl font-bold ${scoreColor}`}>{lastPracticeResult.score.toFixed(1)}%</p>
          <p className="text-lg text-muted-foreground mt-2">
            {lastPracticeResult.correctCount} out of {lastPracticeResult.totalQuestions} questions correct
          </p>
        </CardContent>
      </Card>

      {incorrectQuestions.length > 0 && (
         <Card className="w-full max-w-4xl shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle className="text-xl">Review Incorrect Questions</CardTitle>
               <CardDescription>Here are the questions you answered incorrectly during practice.</CardDescription>
            </CardHeader>
             <CardContent>
                 <Accordion type="single" collapsible className="w-full">
                    {incorrectQuestions.map((item, index) => (
                        <AccordionItem value={`item-${index}`} key={item.question_number}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                             <span className="text-left font-medium">Original Question {item.question_number}</span>
                             <div className="flex items-center space-x-2">
                               <span className="text-sm text-muted-foreground">Your Answer: {item.user_answer.join(', ') || 'N/A'}</span>
                               <X className="h-5 w-5 text-red-500 dark:text-red-400" />
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
                             questionIndex={index} // Use accordion index for display purposes
                             totalQuestions={incorrectQuestions.length}
                             revealAnswers={true} // Enable answer revealing
                             userAnswer={item.user_answer} // Pass the user's actual answer
                             isDisabled={true} // Disable inputs in review mode
                             practiceQuestionNumber={item.question_number} // Show original number
                            />
                             <Separator className="my-4" />
                             <div className="mt-4 p-4 bg-secondary/50 dark:bg-secondary/20 rounded-md border border-border">
                               <h4 className="font-semibold mb-2">Explanation:</h4>
                               <p className="text-sm whitespace-pre-wrap text-muted-foreground">{item.explanation || "No explanation provided."}</p>
                               <p className="text-sm mt-2 font-medium">Correct Answer(s): <span className="text-green-600 dark:text-green-400">{item.correct_answer.join(', ')}</span></p>
                             </div>
                         </AccordionContent>
                        </AccordionItem>
                    ))}
                 </Accordion>
             </CardContent>
         </Card>
      )}

       {incorrectQuestions.length === 0 && lastPracticeResult.totalQuestions > 0 && (
        <Card className="w-full max-w-3xl shadow-lg rounded-lg bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 mt-8">
          <CardContent className="p-6 text-center">
            <Check className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <p className="text-xl font-semibold text-green-700 dark:text-green-300">Excellent! You answered all practice questions correctly!</p>
          </CardContent>
        </Card>
      )}

       {lastPracticeResult.totalQuestions === 0 && (
           <Card className="w-full max-w-3xl shadow-lg rounded-lg mt-8">
               <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">This practice session contained no questions.</p>
               </CardContent>
           </Card>
       )}

    </div>
  );
}
