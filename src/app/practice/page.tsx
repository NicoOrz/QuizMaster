

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Home, Check, X, List, RotateCcw, Settings } from 'lucide-react'; // Added Settings
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Question, PracticeProgress } from '@/types/quiz';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { QuizOverview } from '@/components/quiz/QuizOverview';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast"; // Import useToast
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton for loading

export default function PracticePage() {
  const { practiceProgress, setPracticeProgress, clearPracticeProgress, isInitialized: isContextInitialized, isLoading: isContextLoading } = useQuiz();
  const router = useRouter();
  const { toast } = useToast();

  // State derived from practiceProgress - initialize safely
  const [practiceQuestions, setPracticeQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [currentSelections, setCurrentSelections] = useState<Record<number, string[]>>({});

  // Local UI state
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isComponentInitialized, setIsComponentInitialized] = useState(false); // Track local initialization
  const [shouldRedirect, setShouldRedirect] = useState(false); // State to trigger redirect effect

  // Derived state for the current question based on index
   const currentQuestion = practiceQuestions[currentQuestionIndex];
   const currentQuestionNumber = currentQuestion?.question_number;

  // --- Initialization and Validation Effect ---
  useEffect(() => {
     // Wait for context to finish loading before initializing
     if (isContextLoading || !isContextInitialized) {
         console.log("PracticePage: Waiting for context to initialize...");
         return;
     }

     console.log("PracticePage: Context initialized. Checking practiceProgress:", practiceProgress);

     if (practiceProgress && practiceProgress.questions.length > 0) {
        // Validate progress data before setting state
        const questionsExist = Array.isArray(practiceProgress.questions) && practiceProgress.questions.length > 0;
        const indexIsValid = typeof practiceProgress.currentIndex === 'number' &&
                              practiceProgress.currentIndex >= 0 &&
                              practiceProgress.currentIndex < practiceProgress.questions.length;
        const selectionsExist = typeof practiceProgress.selections === 'object' && practiceProgress.selections !== null;

        if (questionsExist && indexIsValid && selectionsExist) {
             // Load state from valid context
             setPracticeQuestions(practiceProgress.questions);
             setCurrentQuestionIndex(practiceProgress.currentIndex);
             setCurrentSelections(practiceProgress.selections);
             setIsComponentInitialized(true); // Mark local component as initialized *after* setting state
             // Reset feedback for the initially loaded question
             setShowAnswer(false);
             setIsCorrect(null);
             console.log("Practice session loaded successfully from progress.", practiceProgress);
        } else {
             // Invalid progress data found in context
             console.warn("PracticePage: Invalid practice progress structure found in context. Clearing and redirecting.", practiceProgress);
             toast({
                title: "Invalid Progress",
                description: "Invalid practice session data found. Clearing and redirecting.",
                variant: "destructive",
             });
             clearPracticeProgress(); // Clear the invalid data from context/storage
             setShouldRedirect(true);
        }
     } else {
         // No valid progress found in context
         console.log("PracticePage: No active practice session found in context. Redirecting.");
         toast({
             title: "No Practice Session",
             description: "No active practice session found. Redirecting to configuration.",
             variant: "destructive",
         });
         setShouldRedirect(true); // Set state to trigger redirect effect
     }
  }, [practiceProgress, isContextLoading, isContextInitialized, toast, clearPracticeProgress]); // Add isContextInitialized dependency

  // --- Redirect Effect ---
   useEffect(() => {
    if (shouldRedirect) {
        console.log("PracticePage: Triggering redirect to /practice/config");
        router.replace('/practice/config'); // Use replace to avoid adding to history
    }
   }, [shouldRedirect, router]);

   // Effect to reset feedback when index changes *after* initialization
    useEffect(() => {
        // Only run if the component has successfully initialized
        if (isComponentInitialized) {
            console.log(`PracticePage: Index changed to ${currentQuestionIndex}. Resetting feedback.`);
            setShowAnswer(false);
            setIsCorrect(null);
        }
    }, [currentQuestionIndex, isComponentInitialized]);


  // Effect to update practice progress in context whenever index or selections change
  useEffect(() => {
    // Only save if component initialized, context initialized, and there are questions
    if (isComponentInitialized && isContextInitialized && practiceQuestions.length > 0) {
        setPracticeProgress(prev => {
            if (!prev) {
                // Should not happen if isComponentInitialized is true, but safety check
                console.warn("PracticePage: setPracticeProgress called but previous context state is null.");
                return null;
            }

            // Create the potential new state based *only* on current local state
            const newState: PracticeProgress = {
                ...prev, // Keep existing range, etc. from the previous valid state
                currentIndex: currentQuestionIndex,
                selections: currentSelections,
                questions: practiceQuestions, // Ensure questions are also up-to-date
                range: prev.range // Explicitly carry over the range
            };

            // Prevent unnecessary updates if the state object reference changes but content is the same.
             if (prev.currentIndex !== currentQuestionIndex ||
                 JSON.stringify(prev.selections) !== JSON.stringify(currentSelections) ||
                 JSON.stringify(prev.questions) !== JSON.stringify(practiceQuestions)) // Compare questions content too
             {
                 // console.log("Practice progress updated in context/localStorage.");
                 return newState;
             }

            // console.log("Skipping practice progress update, no change detected.");
            return prev;
        });
    }
  }, [
      isComponentInitialized,
      isContextInitialized, // Ensure context is ready too
      practiceQuestions,
      currentQuestionIndex,
      currentSelections,
      setPracticeProgress
  ]);


  // Handle changes to the selected answers for the current question
  const handleAnswerChange = useCallback((questionNumber: number, answerKey: string, checked: boolean) => {
    console.log(`handleAnswerChange called: Q#${questionNumber}, Key: ${answerKey}, Checked: ${checked}`);
    if (showAnswer) {
      console.log("handleAnswerChange: Skipping update, answer already shown.");
      return;
    }

    setCurrentSelections(prevSelections => {
      console.log(`handleAnswerChange -> setCurrentSelections: prevSelections for Q#${questionNumber}`, prevSelections[questionNumber]);
      const previousQuestionSelection = prevSelections[questionNumber] || [];
      // Find question in the *local state* which should be initialized by now
      const question = practiceQuestions.find(q => q.question_number === questionNumber);
      if (!question) {
          console.warn(`handleAnswerChange: Question #${questionNumber} not found in local state.`);
          return prevSelections;
      }

      const isMultipleChoice = question.correct_answer.length > 1;
      let newSelection: string[];

      if (isMultipleChoice) {
        if (checked) {
          newSelection = Array.from(new Set([...previousQuestionSelection, answerKey])).sort();
        } else {
          newSelection = previousQuestionSelection.filter(ans => ans !== answerKey).sort();
        }
      } else {
        // Radio button behavior: only one can be selected
        newSelection = [answerKey];
      }

      // Optimization: Check if the actual selection for this question *changed*
      if (
        previousQuestionSelection.length === newSelection.length &&
        previousQuestionSelection.every((val, index) => val === newSelection[index])
       ) {
         console.log(`handleAnswerChange -> setCurrentSelections: No change detected for Q#${questionNumber}. Skipping state update.`);
         return prevSelections;
      }

       console.log(`handleAnswerChange -> setCurrentSelections: Updating selections for Q#${questionNumber} to:`, newSelection);
       return {
         ...prevSelections,
         [questionNumber]: newSelection,
       };
    });
  }, [showAnswer, practiceQuestions]); // Depend on practiceQuestions (local state)


  // Check the answer for the current question
  const checkAnswer = useCallback(() => {
    // Ensure question exists (use local state derived value)
    if (!currentQuestion || !currentQuestionNumber) {
        console.warn("checkAnswer: Current question data is missing.");
        return;
    }

    const userSelection = currentSelections[currentQuestionNumber] || [];

    if (userSelection.length === 0 && !showAnswer) {
        toast({ title: "No Answer Selected", description: "Please select an answer before checking.", variant: "default" });
        return;
    }

     if (showAnswer) return; // Already showing answer

    const correctAnswers = currentQuestion.correct_answer;
    const sortedSelected = [...userSelection].sort();
    const sortedCorrect = [...correctAnswers].sort();

    const correct = sortedSelected.length === sortedCorrect.length &&
                    sortedSelected.every((value, index) => value === sortedCorrect[index]);

    setIsCorrect(correct);
    setShowAnswer(true); // Reveal feedback
  }, [currentQuestion, currentQuestionNumber, currentSelections, showAnswer, toast]);


  // Navigation functions
  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < practiceQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex, practiceQuestions.length]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev + 1); // Corrected: should be prev - 1
    }
  }, [currentQuestionIndex]);


  const navigateToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < practiceQuestions.length) {
      setCurrentQuestionIndex(index);
      setIsSheetOpen(false);
    }
  }, [practiceQuestions.length]);

  const goToHome = useCallback(() => {
    router.push('/'); // Progress is saved automatically by useEffect
  }, [router]);

   const goToConfig = useCallback(() => {
     router.push('/practice/config'); // Go back to config page
   }, [router]);


  const handleResetPractice = useCallback(() => {
    clearPracticeProgress(); // Clears context and localStorage
    toast({ title: "Practice Reset", description: "Your progress has been cleared. Redirecting to configuration." });
    setShouldRedirect(true); // Trigger redirect effect after clearing
  }, [clearPracticeProgress, toast]);


  // --- Render Logic ---
  // Loading States:
  // 1. Context is still loading/initializing.
  // 2. Context is initialized, but local component hasn't loaded state yet.
  // 3. Redirect is pending.
  if (isContextLoading || !isContextInitialized || !isComponentInitialized || shouldRedirect) {
     return (
         <div className="container mx-auto p-4 min-h-screen flex flex-col items-center pt-10 pb-10 space-y-6">
             {/* Skeleton Header */}
             <div className="absolute top-4 left-4 z-20 flex space-x-2">
                 <Skeleton className="h-9 w-24" /> {/* Home */}
                 <Skeleton className="h-9 w-28" /> {/* Configure */}
                 <Skeleton className="h-9 w-9 rounded-md" /> {/* Reset */}
             </div>
             <Skeleton className="h-9 w-36 absolute top-4 right-4 z-20" /> {/* Overview */}

             {/* Skeleton Title */}
             <Skeleton className="h-8 w-48 mt-12" />
             <Skeleton className="h-4 w-64 mb-6" /> {/* Range */}

             {/* Skeleton Question Card */}
             <div className="w-full max-w-4xl space-y-4">
                 <Skeleton className="h-60 w-full" /> {/* Placeholder for card content */}
             </div>

             {/* Skeleton Navigation */}
             <Skeleton className="w-full max-w-4xl h-16 mt-6" />
         </div>
     );
  }

  // After initialization, check if currentQuestion is valid (safety net)
  // This should ideally not be reached if initialization logic is correct
  if (!currentQuestion) {
      console.error("PracticePage Render: Current question is undefined after initialization checks. State might be inconsistent.");
      // Avoid rendering potentially broken UI, maybe show a specific error message or redirect again
      setShouldRedirect(true); // Attempt redirect again if this state is reached
      return <div className="container mx-auto p-4 text-center">Error loading question state...</div>;
  }


  const currentSelectionForCard = currentSelections[currentQuestionNumber] || [];

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
            questions={practiceQuestions} // Pass the subset of questions
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
                (Questions {practiceProgress.range.start} - {practiceProgress.range.end})
            </p>
       )}


      {/* Question Card */}
      <div className="w-full max-w-4xl">
        <QuestionCard
          key={currentQuestionNumber} // Ensure re-render on question change
          question={currentQuestion}
          selectedAnswers={currentSelectionForCard}
          onAnswerChange={handleAnswerChange} // Pass the stable callback
          questionIndex={currentQuestionIndex}
          totalQuestions={practiceQuestions.length} // Use length of subset
          revealAnswers={showAnswer} // Pass the state to control feedback visibility in card
          userAnswer={showAnswer ? currentSelectionForCard : undefined} // Pass the selection when revealing
          isDisabled={showAnswer} // Disable inputs when feedback is shown
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
              {/* Use whitespace-pre-wrap for explanation */}
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

          {!showAnswer ? (
            <Button
              onClick={checkAnswer}
              disabled={currentSelectionForCard.length === 0} // Disable if no answer selected
            >
              Check Answer
            </Button>
          ) : (
            <Button onClick={goToNextQuestion} disabled={currentQuestionIndex === practiceQuestions.length - 1}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
