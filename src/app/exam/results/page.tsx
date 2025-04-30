

"use client";

import React, { useEffect, useState, useCallback } from 'react';
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
import { fetchExamRecordById } from '@/services/firestoreService'; // Assuming a function to fetch a single record
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

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


export default function ExamResultsPage() {
  const { examHistory } = useQuiz(); // Get local history for potential fallback or quick access
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordId = searchParams.get('recordId');
  const [examRecord, setExamRecord] = useState<ExamRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecord = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Attempt to find in local state first (quick access after submission)
      const localRecord = examHistory.find(record => record.id === id);
      if (localRecord) {
        setExamRecord(localRecord);
      } else {
        // If not in local state (e.g., direct navigation, refresh), fetch from Firestore
        console.log(`Record ${id} not in local state, fetching from Firestore...`);
        const fetchedRecord = await fetchExamRecordById(id); // Use the new service function
        if (fetchedRecord) {
          setExamRecord(fetchedRecord);
        } else {
          setError(`Exam record with ID ${id} not found.`);
          console.warn(`Exam record with ID ${id} not found in Firestore.`);
        }
      }
    } catch (fetchError) {
      console.error("Error fetching exam record:", fetchError);
      setError("Failed to load exam results. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [examHistory]); // Depend on local history

  useEffect(() => {
    if (recordId) {
      loadRecord(recordId);
    } else {
      setError("No exam record ID provided.");
      setIsLoading(false);
       // Consider redirecting or showing a clearer error message
       // router.push('/history');
    }
  }, [recordId, loadRecord]); // Rerun if recordId changes

   const goToHome = () => {
    router.push('/');
   };

   const goToHistory = () => {
     router.push('/history');
   }

   // Loading State
   if (isLoading) {
     return (
       <div className="container mx-auto p-4 min-h-screen flex flex-col items-center pt-10 pb-10 space-y-8">
         <Skeleton className="h-10 w-32 absolute top-4 left-4" />
         <Skeleton className="h-10 w-36 absolute top-4 right-4" />
         <Skeleton className="h-8 w-64 mt-12" /> {/* Title */}
         <Skeleton className="w-full max-w-3xl h-48" /> {/* Score Card */}
         <Skeleton className="w-full max-w-4xl h-64" /> {/* Incorrect Questions Card */}
       </div>
     );
   }

   // Error State
   if (error) {
       return (
          <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center text-center">
               <Button onClick={goToHome} variant="outline" className="absolute top-4 left-4">
                   <Home className="mr-2 h-4 w-4" /> Back to Home
               </Button>
                <Button onClick={goToHistory} variant="outline" className="absolute top-4 right-4">
                 <ListChecks className="mr-2 h-4 w-4" /> View History
               </Button>
             <h1 className="text-2xl font-bold mb-4 text-destructive">Error Loading Results</h1>
             <p className="text-muted-foreground mb-6">{error}</p>
             <Button onClick={() => recordId && loadRecord(recordId)}>Retry</Button>
          </div>
       );
   }

  // No Record Found State (Specific case after loading finishes without error but no record)
  if (!examRecord) {
    return (
       <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center text-center">
             <Button onClick={goToHome} variant="outline" className="absolute top-4 left-4">
                 <Home className="mr-2 h-4 w-4" /> Back to Home
             </Button>
              <Button onClick={goToHistory} variant="outline" className="absolute top-4 right-4">
               <ListChecks className="mr-2 h-4 w-4" /> View History
             </Button>
           <h1 className="text-2xl font-bold mb-4">Exam Record Not Found</h1>
           <p className="text-muted-foreground">The requested exam record could not be located.</p>
       </div>
    );
  }

  // --- Display Record ---
  const incorrectQuestions = examRecord.incorrectQuestions || [];
  const scoreColor = examRecord.score >= 70 ? 'text-green-600 dark:text-green-400' : examRecord.score >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';

  return (
     // Adjust max-width for the overall container
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center pt-10 pb-10">
      <Button onClick={goToHome} variant="outline" className="absolute top-4 left-4">
          <Home className="mr-2 h-4 w-4" /> Back to Home
      </Button>
        <Button onClick={goToHistory} variant="outline" className="absolute top-4 right-4">
          <ListChecks className="mr-2 h-4 w-4" /> View History
        </Button>
      <h1 className="text-3xl font-bold mb-6 text-center mt-12">Exam Results</h1>

      <Card className="w-full max-w-3xl mb-8 shadow-lg rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Your Score</CardTitle>
          <CardDescription>
            Completed on: {format(new Date(examRecord.timestamp), 'PPP p')}
             {examRecord.duration !== undefined && examRecord.duration > 0 && ( // Check duration > 0
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
         // Adjust max-width for the incorrect questions section
         <Card className="w-full max-w-4xl shadow-lg rounded-lg">
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
                               <X className="h-5 w-5 text-red-500 dark:text-red-400" />
                             </div>
                           </div>
                        </AccordionTrigger>
                         <AccordionContent className="pt-4">
                           {/* QuestionCard will now take max-w-4xl */}
                           <QuestionCard
                             question={{ // Construct a Question object for the card
                                question_number: item.question_number,
                                question_text: item.question_text,
                                options: item.options,
                                correct_answer: item.correct_answer,
                                explanation: item.explanation,
                                image_url: item.image_url,
                             }}
                             selectedAnswers={item.user_answer} // Show what the user selected (for display)
                             onAnswerChange={() => {}} // No action needed in review
                             questionIndex={index} // Use accordion index for display purposes if needed
                             totalQuestions={incorrectQuestions.length}
                             revealAnswers={true} // Enable answer revealing
                             userAnswer={item.user_answer} // Pass the user's actual answer
                             isDisabled={true} // Disable inputs in review mode
                            />
                             <Separator className="my-4" />
                              {/* Explanation Section */}
                             <div className="mt-4 p-4 bg-secondary/50 dark:bg-secondary/20 rounded-md border border-border">
                               <h4 className="font-semibold mb-2">Explanation:</h4>
                               {/* Use whitespace-pre-wrap for explanation */}
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

       {incorrectQuestions.length === 0 && examRecord.totalQuestions > 0 && (
        <Card className="w-full max-w-3xl shadow-lg rounded-lg bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 mt-8">
          <CardContent className="p-6 text-center">
            <Check className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <p className="text-xl font-semibold text-green-700 dark:text-green-300">Congratulations! You answered all questions correctly!</p>
          </CardContent>
        </Card>
      )}

       {examRecord.totalQuestions === 0 && (
           <Card className="w-full max-w-3xl shadow-lg rounded-lg mt-8">
               <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">This exam contained no questions.</p>
               </CardContent>
           </Card>
       )}

    </div>
  );
}
