
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation"; // Import useSearchParams
import { useQuiz } from '@/context/QuizContext';
import type { PracticeResult, PracticeIncorrectQuestion } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, X, Clock, Home, BookOpenText, Settings, ListChecks } from 'lucide-react'; // Added ListChecks
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
  const { practiceHistory } = useQuiz(); // Get history
  const router = useRouter();
  const searchParams = useSearchParams(); // Use hook to get search params
  const resultId = searchParams.get('resultId'); // Get the ID from query

  const [practiceResult, setPracticeResult] = useState<PracticeResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resultId) {
      setError("No practice result ID provided.");
      setIsLoading(false);
      return;
    }

    // Find the result in the history
    const foundResult = practiceHistory.find(result => result.id === resultId);

    if (foundResult) {
      setPracticeResult(foundResult);
      setIsLoading(false);
    } else {
      setError(`Practice result with ID ${resultId} not found in history.`);
      setIsLoading(false);
    }
    // No cleanup needed here as we're reading from context history
  }, [resultId, practiceHistory]); // Depend on ID and history

   const goToHome = () => {
    router.push('/');
   };

   const startNewPractice = () => {
     router.push('/practice/config');
   }

   const goToPracticeHistory = () => {
    router.push('/history/practice'); // Navigate to new practice history page
   };


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
   if (error || !practiceResult) {
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
              <Button onClick={goToPracticeHistory} variant="outline">
                 <ListChecks className="mr-2 h-4 w-4" /> View Practice History
               </Button>
          </div>
       );
   }

  // --- Display Record ---
  const incorrectQuestions = practiceResult.incorrectQuestions || [];
  const scoreColor = practiceResult.score >= 70 ? 'text-green-600 dark:text-green-400' : practiceResult.score >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';

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
           {practiceResult.range && (
                <CardDescription>
                 (Practiced original questions: {practiceResult.range.start} - {practiceResult.range.end})
                </CardDescription>
           )}
          <CardDescription>
            Completed on: {format(new Date(practiceResult.timestamp), 'PPP p')}
             {practiceResult.duration !== undefined && practiceResult.duration > 0 && (
               <span className="flex items-center justify-center text-muted-foreground mt-1">
                 <Clock className="mr-1 h-4 w-4" /> {formatDuration(practiceResult.duration)}
               </span>
             )}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className={`text-6xl font-bold ${scoreColor}`}>{practiceResult.score.toFixed(1)}%</p>
          <p className="text-lg text-muted-foreground mt-2">
            {practiceResult.correctCount} out of {practiceResult.totalQuestions} questions correct
          </p>
        </CardContent>
      </Card>

      {incorrectQuestions.length > 0 && (
         <Card className="w-full max-w-4xl shadow-lg rounded-lg mb-8"> {/* Added mb-8 */}
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

       {incorrectQuestions.length === 0 && practiceResult.totalQuestions > 0 && (
        <Card className="w-full max-w-3xl shadow-lg rounded-lg bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 mt-8 mb-8"> {/* Added mb-8 */}
          <CardContent className="p-6 text-center">
            <Check className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <p className="text-xl font-semibold text-green-700 dark:text-green-300">Excellent! You answered all practice questions correctly!</p>
          </CardContent>
        </Card>
      )}

       {practiceResult.totalQuestions === 0 && (
           <Card className="w-full max-w-3xl shadow-lg rounded-lg mt-8 mb-8"> {/* Added mb-8 */}
               <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">This practice session contained no questions.</p>
               </CardContent>
           </Card>
       )}

       {/* Button to view full practice history */}
        <Button onClick={goToPracticeHistory} variant="outline" size="lg">
           <ListChecks className="mr-2 h-4 w-4" /> View Practice History
        </Button>

    </div>
  );
}
