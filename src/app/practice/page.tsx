
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Home, Check, X, List, RotateCcw, Settings, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Question, PracticeProgress, PracticeResult, PracticeIncorrectQuestion } from '@/types/quiz';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { QuizOverview } from '@/components/quiz/QuizOverview';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';

export default function PracticePage() {
  // Replaced setLastPracticeResult with addPracticeResult
  const { practiceProgress, setPracticeProgress, clearPracticeProgress, isInitialized: isContextInitialized, isLoading: isContextLoading, addPracticeResult } = useQuiz();
  const router = useRouter();
  const { toast } = useToast();

  // State derived from practiceProgress - initialize safely
  const [practiceQuestions, setPracticeQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [currentSelections, setCurrentSelections] = useState<Record<number, string[]>>({});
   // Store start time when the component initializes with valid progress
   const [practiceStartTime, setPracticeStartTime] = useState<number | null>(null);

  // Local UI state
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isComponentInitialized, setIsComponentInitialized] = useState(false); // Track local initialization
  const [shouldRedirect, setShouldRedirect] = useState(false); // State to trigger redirect effect

  // Derived state for the current question based on index
   const currentQuestion = practiceQuestions[currentQuestionIndex];
   // Get the **actual question_number** of the currently displayed question
   const currentQuestionNumber = currentQuestion?.question_number;


  // --- Initialization and Validation Effect ---
  useEffect(() => {
     if (isContextLoading || !isContextInitialized || isComponentInitialized) {
         return;
     }

     if (practiceProgress && practiceProgress.questions.length > 0) {
        const { questions, currentIndex, selections } = practiceProgress;
        const questionsExist = Array.isArray(questions) && questions.length > 0;
        const indexIsValid = typeof currentIndex === 'number' && currentIndex >= 0 && currentIndex < questions.length;
        const selectionsExist = typeof selections === 'object' && selections !== null;

        if (questionsExist && indexIsValid && selectionsExist) {
             setPracticeQuestions(questions);
             setCurrentQuestionIndex(currentIndex);
             setCurrentSelections(selections);
             setPracticeStartTime(Date.now()); // Set start time on successful load
             setIsComponentInitialized(true);
             setShowAnswer(false);
             setIsCorrect(null);
        } else {
             console.warn("PracticePage: Invalid practice progress structure. Clearing and redirecting.", practiceProgress);
             toast({ title: "Invalid Progress", description: "Clearing invalid session data.", variant: "destructive" });
             clearPracticeProgress();
             setShouldRedirect(true);
        }
     } else {
         // No valid progress, need to redirect
         // Check if we are not already initialized/loading to avoid multiple redirects
         if (!isContextLoading && isContextInitialized) {
              setShouldRedirect(true);
         }
     }
  }, [practiceProgress, isContextLoading, isContextInitialized, isComponentInitialized, toast, clearPracticeProgress]);

  // --- Redirect Effect ---
   useEffect(() => {
    if (shouldRedirect && isComponentInitialized) { // Only redirect after component init check
        console.log("PracticePage: Triggering redirect to /practice/config");
        // Use replace to avoid adding to history stack
        router.replace('/practice/config');
        // No need for timer, rely on React's update cycle
    }
   }, [shouldRedirect, router, isComponentInitialized]);

   // Effect to reset feedback when index changes *after* initialization
    useEffect(() => {
        if (isComponentInitialized) {
            setShowAnswer(false);
            setIsCorrect(null);
        }
    }, [currentQuestionIndex, isComponentInitialized]);


  // Effect to update practice progress in context whenever index or selections change
  useEffect(() => {
    if (isComponentInitialized && isContextInitialized && practiceQuestions.length > 0) {
        setPracticeProgress(prev => {
            // Ensure prev is not null before spreading
             if (!prev) return prev;

            const newState: PracticeProgress = {
                ...prev,
                currentIndex: currentQuestionIndex,
                selections: currentSelections,
                questions: practiceQuestions, // Ensure questions are also saved if they could change (though unlikely here)
            };

            // Compare relevant parts to avoid unnecessary updates
            if (prev.currentIndex !== newState.currentIndex ||
                JSON.stringify(prev.selections) !== JSON.stringify(newState.selections) ||
                JSON.stringify(prev.questions) !== JSON.stringify(newState.questions)) { // Added question check for robustness
                 // console.log("Saving practice progress:", newState);
                 return newState;
             }
            return prev; // No change
        });
    }
  }, [
      isComponentInitialized,
      isContextInitialized,
      practiceQuestions,
      currentQuestionIndex,
      currentSelections,
      setPracticeProgress
  ]);


  const handleAnswerChange = useCallback((questionNumber: number, answerKey: string, checked: boolean) => {
    if (showAnswer) {
        return; // Don't allow changes after revealing the answer
    }

    setCurrentSelections(prevSelections => {
        const currentQuestion = practiceQuestions.find(q => q.question_number === questionNumber);
        if (!currentQuestion) {
            console.warn(`handleAnswerChange: Question #${questionNumber} not found.`);
            return prevSelections;
        }

        const currentSelection = prevSelections[questionNumber] || [];
        const isMultipleChoice = currentQuestion.correct_answer.length > 1;
        let newSelection: string[];

        if (isMultipleChoice) {
            if (checked) {
                newSelection = Array.from(new Set([...currentSelection, answerKey])).sort();
            } else {
                newSelection = currentSelection.filter(ans => ans !== answerKey).sort();
            }
        } else {
            // For RadioGroup (single choice), directly set the new value
            newSelection = [answerKey];
        }

        // console.log(`Answer changed for Q#${questionNumber}: ${newSelection.join(', ')}`);

        return {
            ...prevSelections,
            [questionNumber]: newSelection,
        };
    });
  }, [showAnswer, practiceQuestions]);


  const checkAnswer = useCallback(() => {
    if (!currentQuestion || !currentQuestionNumber) {
        console.warn("checkAnswer: Current question data is missing.");
        return;
    }

    const userSelection = currentSelections[currentQuestionNumber] || [];

    if (userSelection.length === 0 && !showAnswer) {
        toast({ title: "No Answer Selected", description: "Please select an answer before checking.", variant: "default" });
        return;
    }

     if (showAnswer) return;

    const correctAnswers = currentQuestion.correct_answer;
    const sortedSelected = [...userSelection].sort();
    const sortedCorrect = [...correctAnswers].sort();

    const correct = sortedSelected.length === sortedCorrect.length &&
                    sortedSelected.every((value, index) => value === sortedCorrect[index]);

    setIsCorrect(correct);
    setShowAnswer(true);
  }, [currentQuestion, currentQuestionNumber, currentSelections, showAnswer, toast]);


  // Navigation functions
  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < practiceQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex, practiceQuestions.length]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
       setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);


  const navigateToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < practiceQuestions.length) {
      setCurrentQuestionIndex(index);
      setIsSheetOpen(false);
    }
  }, [practiceQuestions.length]);

  const goToHome = useCallback(() => {
    router.push('/');
  }, [router]);

   const goToConfig = useCallback(() => {
     router.push('/practice/config');
   }, [router]);


  const handleResetPractice = useCallback(() => {
    clearPracticeProgress();
    toast({ title: "Practice Reset", description: "Your progress has been cleared. Redirecting..." });
    setShouldRedirect(true);
  }, [clearPracticeProgress, toast]);

  // --- Finish Practice Logic ---
   const finishPractice = useCallback(() => {
        if (!practiceQuestions || practiceQuestions.length === 0 || !practiceProgress) {
            toast({ title: "Error", description: "No practice session data found to finish.", variant: "destructive" });
            return;
        }

        let correctCount = 0;
        const incorrectQuestionsDetail: PracticeIncorrectQuestion[] = [];
        const finalSelections = currentSelections; // Use the latest selections state

        practiceQuestions.forEach((question) => {
            const questionNum = question.question_number;
            const userSelection = finalSelections[questionNum] || [];
            const correctAnswers = question.correct_answer;
            const sortedSelected = [...userSelection].sort();
            const sortedCorrect = [...correctAnswers].sort();

            const isCorrect = sortedSelected.length === sortedCorrect.length &&
                              sortedSelected.every((value, index) => value === sortedCorrect[index]);

            if (isCorrect) {
                correctCount++;
            } else {
                incorrectQuestionsDetail.push({
                    question_number: questionNum,
                    question_text: question.question_text,
                    options: question.options,
                    user_answer: sortedSelected,
                    correct_answer: sortedCorrect,
                    explanation: question.explanation,
                    image_url: question.image_url,
                });
            }
        });

        const score = practiceQuestions.length > 0 ? (correctCount / practiceQuestions.length) * 100 : 0;
        const practiceEndTime = Date.now();
        const duration = practiceStartTime ? Math.round((practiceEndTime - practiceStartTime) / 1000) : undefined;

        const result: PracticeResult = {
            // Generate a temporary ID here, context will add the final one
            id: `temp-${practiceEndTime}`,
            score: parseFloat(score.toFixed(2)),
            totalQuestions: practiceQuestions.length,
            correctCount: correctCount,
            incorrectQuestions: incorrectQuestionsDetail,
            timestamp: practiceEndTime,
            duration: duration,
            range: practiceProgress.range, // Include the range practiced
        };

        addPracticeResult(result); // Store result in context history & clear progress
        toast({ title: "Practice Finished!", description: "Showing your results." });

        // Find the newly added result in the updated history to get its real ID
        // Note: This relies on addPracticeResult updating the history synchronously
        // or having a slight delay before navigating. Let's assume sync for now.
        // A better approach might be for addPracticeResult to return the added result with ID.
        // For now, let's just navigate to the general results page.
        router.push(`/practice/results?resultId=${result.id}`); // Use the temporary ID for navigation

   }, [practiceQuestions, currentSelections, practiceProgress, practiceStartTime, addPracticeResult, router, toast]);


  // --- Render Logic ---
  if (isContextLoading || !isContextInitialized || !isComponentInitialized) {
     return (
         <div className="container mx-auto p-4 min-h-screen flex flex-col items-center pt-10 pb-10 space-y-6">
             <div className="absolute top-4 left-4 z-20 flex space-x-2">
                 <Skeleton className="h-9 w-24" />
                 <Skeleton className="h-9 w-28" />
                 <Skeleton className="h-9 w-9 rounded-md" />
             </div>
             <Skeleton className="h-9 w-36 absolute top-4 right-4 z-20" />
             <Skeleton className="h-8 w-48 mt-12" />
             <Skeleton className="h-4 w-64 mb-6" />
             <div className="w-full max-w-4xl space-y-4">
                 <Skeleton className="h-60 w-full" />
             </div>
             <Skeleton className="w-full max-w-4xl h-16 mt-6" />
         </div>
     );
  }

   if (shouldRedirect) { // Render loading/redirecting state if redirect is pending
       return <div className="container mx-auto p-4 text-center">Redirecting...</div>;
   }


  if (!currentQuestion) {
      // This case should ideally be covered by the redirect logic now.
      // If it still occurs, log an error but avoid rendering potentially broken UI.
      console.error("Current question is undefined after initialization. Practice state might be inconsistent.");
      return <div className="container mx-auto p-4 text-center">Error loading question state...</div>;
  }

  // Get the potentially empty selection for the *current* question number
  const currentSelectionForCard = currentSelections[currentQuestionNumber] || [];
  // Get the original question number for display
  const originalQuestionNumber = currentQuestion.question_number;
  const isLastQuestion = currentQuestionIndex === practiceQuestions.length - 1;

  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center pt-10 pb-10 relative">
      {/* Header Buttons */}
      <div className="absolute top-4 left-4 z-20 flex space-x-2">
        <Button onClick={goToHome} variant="outline" size="sm">
          <Home className="mr-2 h-4 w-4" /> Home
        </Button>
         <Button onClick={goToConfig} variant="outline" size="sm">
           <Settings className="mr-2 h-4 w-4" /> Configure
         </Button>
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" title="Reset Practice">
                    <RotateCcw className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Reset Practice?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will clear your current practice progress and return you to the configuration screen. Are you sure?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetPractice} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Reset
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Overview Sheet Trigger */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="absolute top-4 right-4 z-20">
            <List className="mr-2 h-4 w-4" /> Overview ({currentQuestionIndex + 1}/{practiceQuestions.length})
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle>Practice Overview</SheetTitle>
          </SheetHeader>
          <QuizOverview
            questions={practiceQuestions} // Pass the subset (potentially shuffled)
            userAnswers={currentSelections} // Pass the full selections record
            currentQuestionIndex={currentQuestionIndex}
            navigateToQuestion={navigateToQuestion}
            mode="practice"
          />
        </SheetContent>
      </Sheet>

      <h1 className="text-3xl font-bold mb-2 mt-12">Practice Mode</h1>
       {practiceProgress?.range && (
            <p className="text-sm text-muted-foreground mb-6">
                (Selected original questions {practiceProgress.range.start} - {practiceProgress.range.end})
            </p>
       )}


      {/* Question Card */}
      <div className="w-full max-w-4xl">
        <QuestionCard
          key={currentQuestionNumber} // Ensure re-render on question number change
          question={currentQuestion}
          practiceQuestionNumber={originalQuestionNumber} // Pass original number
          selectedAnswers={currentSelectionForCard}
          onAnswerChange={handleAnswerChange}
          questionIndex={currentQuestionIndex}
          totalQuestions={practiceQuestions.length}
          revealAnswers={showAnswer}
          userAnswer={showAnswer ? currentSelectionForCard : undefined}
          isDisabled={showAnswer}
        />
      </div>

      {/* Feedback Section */}
      {showAnswer && (
        <Card className="w-full max-w-4xl mx-auto mt-4 shadow-md rounded-lg border border-border">
          <CardContent className="p-4 space-y-3">
            <div className={`flex items-center ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isCorrect ? <Check className="mr-2 h-5 w-5" /> : <X className="mr-2 h-5 w-5" />}
              <span className="font-semibold">{isCorrect ? 'Correct!' : 'Incorrect'}</span>
            </div>
            {!isCorrect && (
              <p className="text-sm font-medium">
                Correct Answer(s): <span className="text-green-600 dark:text-green-400">{currentQuestion.correct_answer.join(', ')}</span>
              </p>
            )}
            <Separator className="my-3" />
            <div>
              <h4 className="font-semibold mb-1 text-sm">Explanation:</h4>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {currentQuestion.explanation || "No explanation provided."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Section */}
      <Card className="w-full max-w-4xl mx-auto mt-6 shadow-md rounded-lg">
        <CardContent className="flex justify-between p-4 items-center">
          <Button onClick={goToPreviousQuestion} disabled={currentQuestionIndex === 0} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>

            {/* Central Button Logic */}
            {!showAnswer ? (
                <Button
                    onClick={checkAnswer}
                    disabled={currentSelectionForCard.length === 0}
                >
                    Check Answer
                </Button>
            ) : (
                 isLastQuestion ? (
                     <Button onClick={finishPractice} variant="destructive">
                        <CheckCircle className="mr-2 h-4 w-4" /> Finish Practice
                     </Button>
                 ) : (
                    <Button onClick={goToNextQuestion}>
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                 )
            )}

             {/* Empty div to balance the flex layout when middle button is present */}
             {/* This ensures Prev/Next stay at the edges */}
             {/* {showAnswer && !isLastQuestion && <div></div>} */}
             {/* {!showAnswer && <div></div>} */}
             {/* Simplified: Let justify-between handle spacing */}


            {/* Conditionally render the "Next" button on the right only if needed and not last */}
            {/* This button is now part of the middle logic */}

        </CardContent>
      </Card>

       {/* Add a message on the last question after checking */}
       {showAnswer && currentQuestionIndex === practiceQuestions.length - 1 && (
          <p className="text-center text-muted-foreground mt-4">You've reached the end. Click "Finish Practice" to see your results.</p>
       )}
    </div>
  );
}
