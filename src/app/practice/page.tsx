
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Home, Check, X, List, RotateCcw, Settings } from 'lucide-react'; // Added Settings
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Question } from '@/types/quiz';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { QuizOverview } from '@/components/quiz/QuizOverview';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast"; // Import useToast

export default function PracticePage() {
  const { practiceProgress, setPracticeProgress, clearPracticeProgress, isLoading: isContextLoading } = useQuiz();
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
  const [isInitialized, setIsInitialized] = useState(false); // Track initialization

  // Derived state for the current question based on index
   const currentQuestion = practiceQuestions[currentQuestionIndex];
   const currentQuestionNumber = currentQuestion?.question_number;

  // --- Initialization and Validation Effect ---
  useEffect(() => {
     // Wait for context to finish loading before initializing
     if (isContextLoading) return;

     if (practiceProgress && practiceProgress.questions.length > 0) {
        // Load state from context
        setPracticeQuestions(practiceProgress.questions);
        setCurrentQuestionIndex(practiceProgress.currentIndex);
        setCurrentSelections(practiceProgress.selections);
        setIsInitialized(true); // Mark as initialized
         // Reset feedback for the initially loaded question
         setShowAnswer(false);
         setIsCorrect(null);
        console.log("Practice session loaded from progress.", practiceProgress);
     } else {
         // No valid progress found (or context still loading)
         // Only redirect if not loading and no progress found
         if (!isContextLoading) {
             toast({
                 title: "No Practice Session",
                 description: "No active practice session found. Redirecting to configuration.",
                 variant: "destructive",
             });
             router.replace('/practice/config'); // Use replace to avoid adding to history
         }
     }
  }, [practiceProgress, isContextLoading, router, toast]); // Depend on practiceProgress and context loading state

   // Effect to reset feedback when index changes *after* initialization
    useEffect(() => {
        if (isInitialized) {
            setShowAnswer(false);
            setIsCorrect(null);
        }
    }, [currentQuestionIndex, isInitialized]);


  // Effect to update practice progress in context whenever index or selections change
  useEffect(() => {
    // Only save if initialized and there are questions and progress object exists
    if (isInitialized && practiceQuestions.length > 0 && practiceProgress) {
         setPracticeProgress(prev => {
            // Ensure prev is not null before spreading
            if (!prev) return null;
            // Only update if index or selections actually changed from the stored progress
            if (prev.currentIndex === currentQuestionIndex && prev.selections === currentSelections) {
                return prev; // No change, return previous object reference
            }
            // Return new object with updated values
            return {
                ...prev,
                currentIndex: currentQuestionIndex,
                selections: currentSelections,
            };
         });
     }
  }, [currentQuestionIndex, currentSelections, setPracticeProgress, isInitialized, practiceQuestions.length, practiceProgress]); // Include practiceProgress


  // Handle changes to the selected answers for the current question
  const handleAnswerChange = useCallback((questionNumber: number, answerKey: string, checked: boolean) => {
    if (showAnswer) return; // Don't allow changes if answer is revealed

    setCurrentSelections(prev => {
      const previousQuestionSelection = prev[questionNumber] || [];
      const question = practiceQuestions.find(q => q.question_number === questionNumber);
      if (!question) return prev; // Return previous state if question not found

      const isMultipleChoice = question.correct_answer.length > 1;
      let newSelection: string[];

      if (isMultipleChoice) {
        if (checked) {
          // Add answerKey if checked, avoid duplicates
          newSelection = Array.from(new Set([...previousQuestionSelection, answerKey])).sort();
        } else {
          // Remove answerKey if unchecked
          newSelection = previousQuestionSelection.filter(ans => ans !== answerKey).sort();
        }
      } else {
        // Single choice logic: always replace the selection
        newSelection = [answerKey]; // Already sorted as it has one element
      }

      // Optimization: Check if the actual selection for this question *changed*
      // This prevents unnecessary state updates if the logic results in the same array content and order
      if (
        previousQuestionSelection.length === newSelection.length &&
        previousQuestionSelection.every((val, index) => val === newSelection[index]) // Assumes both are sorted
       ) {
         // console.log(`Skipping update for Q#${questionNumber}, selection unchanged.`);
         return prev; // Return the previous state object reference if no change occurred
      }

      // Create a *new* state object only if there was a change
      const newState = {
        ...prev,
        [questionNumber]: newSelection,
      };
       console.log(`Answer changed for Q#${questionNumber}: ${newState[questionNumber]}`);
       return newState; // Return the new state object
    });
  }, [showAnswer, practiceQuestions]); // Depend on practiceQuestions


  // Check the answer for the current question
  const checkAnswer = useCallback(() => {
    if (!currentQuestion || !currentQuestionNumber) return; // Ensure question exists

    const userSelection = currentSelections[currentQuestionNumber] || [];

    // Require a selection before checking, unless already showing answer
    if (userSelection.length === 0 && !showAnswer) {
        toast({ title: "No Answer Selected", description: "Please select an answer before checking.", variant: "default" });
        return;
    }

     // If already showing answer, maybe reset or do nothing? Currently just re-checks.
     // Let's prevent re-checking if already shown.
     if (showAnswer) return;


    const correctAnswers = currentQuestion.correct_answer;
    const sortedSelected = [...userSelection].sort(); // Ensure it's sorted for comparison
    const sortedCorrect = [...correctAnswers].sort();

    const correct = sortedSelected.length === sortedCorrect.length &&
                    sortedSelected.every((value, index) => value === sortedCorrect[index]);

    // console.log(`Checking Q#${currentQuestionNumber}: Selected=${sortedSelected}, Correct=${sortedCorrect}, Result=${correct}`);
    setIsCorrect(correct);
    setShowAnswer(true); // Reveal feedback
    // Progress saving is handled by the useEffect watching currentSelections/currentQuestionIndex
  }, [currentQuestion, currentQuestionNumber, currentSelections, showAnswer, toast]);


  // Navigation functions
  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < practiceQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      // Feedback state reset is handled by the index change effect
    }
  }, [currentQuestionIndex, practiceQuestions.length]);

  // Corrected goToPreviousQuestion
  const correctedGoToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1); // Corrected logic
      // Feedback state reset is handled by the index change effect
    }
  }, [currentQuestionIndex]);


  const navigateToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < practiceQuestions.length) {
      setCurrentQuestionIndex(index);
      setIsSheetOpen(false);
       // Feedback state reset is handled by the index change effect
    }
  }, [practiceQuestions.length]);

  const goToHome = useCallback(() => {
    router.push('/'); // Progress is saved automatically
  }, [router]);

   const goToConfig = useCallback(() => {
     router.push('/practice/config'); // Go back to config page
   }, [router]);


  const handleResetPractice = useCallback(() => {
    clearPracticeProgress(); // Clears context and localStorage
    toast({ title: "Practice Reset", description: "Your progress has been cleared. Redirecting to configuration." });
    router.replace('/practice/config'); // Redirect to config after clearing
  }, [clearPracticeProgress, router, toast]);


  // --- Render Logic ---
  // Use isContextLoading to show loading state until context is ready
  if (isContextLoading || (!isInitialized && !practiceProgress)) {
     return <div className="container mx-auto p-4 text-center">Loading practice session...</div>;
  }

  // If initialized and currentQuestion is somehow still undefined (shouldn't happen with checks)
  if (!currentQuestion) {
      toast({ title: "Error", description: "Could not load current question. Redirecting.", variant: "destructive"});
      router.replace('/practice/config');
      return <div className="container mx-auto p-4 text-center">Error loading question...</div>;
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
          onAnswerChange={handleAnswerChange} // Use the optimized handler
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
          <Button onClick={correctedGoToPreviousQuestion} disabled={currentQuestionIndex === 0} variant="outline">
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
