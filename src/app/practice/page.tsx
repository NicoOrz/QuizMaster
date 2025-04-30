

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
   // Get the **actual question_number** of the currently displayed question
   const currentQuestionNumber = currentQuestion?.question_number;


  // --- Initialization and Validation Effect ---
  useEffect(() => {
     if (isContextLoading || !isContextInitialized || isComponentInitialized) {
         // console.log("PracticePage: Waiting for context/component init...");
         return;
     }

     // console.log("PracticePage: Context initialized. Checking practiceProgress:", practiceProgress);

     if (practiceProgress && practiceProgress.questions.length > 0) {
        const { questions, currentIndex, selections } = practiceProgress;
        const questionsExist = Array.isArray(questions) && questions.length > 0;
        const indexIsValid = typeof currentIndex === 'number' && currentIndex >= 0 && currentIndex < questions.length;
        const selectionsExist = typeof selections === 'object' && selections !== null;

        if (questionsExist && indexIsValid && selectionsExist) {
             setPracticeQuestions(questions);
             setCurrentQuestionIndex(currentIndex);
             setCurrentSelections(selections);
             setIsComponentInitialized(true);
             setShowAnswer(false);
             setIsCorrect(null);
             // console.log("Practice session loaded successfully from progress.");
        } else {
             console.warn("PracticePage: Invalid practice progress structure. Clearing and redirecting.", practiceProgress);
             toast({ title: "Invalid Progress", description: "Clearing invalid session data.", variant: "destructive" });
             clearPracticeProgress();
             setShouldRedirect(true);
        }
     } else {
         // console.log("PracticePage: No active practice session. Redirecting.");
         // Don't toast here, config page handles the "no progress" case gracefully
         // toast({ title: "No Practice Session", description: "Redirecting to configuration.", variant: "destructive" });
         setShouldRedirect(true);
     }
  }, [practiceProgress, isContextLoading, isContextInitialized, isComponentInitialized, toast, clearPracticeProgress]);

  // --- Redirect Effect ---
   useEffect(() => {
    if (shouldRedirect) {
        console.log("PracticePage: Triggering redirect to /practice/config");
        // Use timeout to ensure state updates settle before redirecting
        const timer = setTimeout(() => router.replace('/practice/config'), 0);
        return () => clearTimeout(timer); // Cleanup timer on unmount or if redirect changes
    }
   }, [shouldRedirect, router]);

   // Effect to reset feedback when index changes *after* initialization
    useEffect(() => {
        if (isComponentInitialized) {
            // console.log(`PracticePage: Index changed to ${currentQuestionIndex}. Resetting feedback.`);
            setShowAnswer(false);
            setIsCorrect(null);
        }
    }, [currentQuestionIndex, isComponentInitialized]);


  // Effect to update practice progress in context whenever index or selections change
  useEffect(() => {
    if (isComponentInitialized && isContextInitialized && practiceQuestions.length > 0) {
        setPracticeProgress(prev => {
            if (!prev) return null; // Should not happen if isComponentInitialized is true

            // Update only the relevant parts: index and selections
            const newState: PracticeProgress = {
                ...prev,
                currentIndex: currentQuestionIndex,
                selections: currentSelections,
                questions: practiceQuestions, // Update questions in case they were modified (e.g., shuffle on load)
            };

            // Basic check for actual changes to avoid unnecessary writes
            if (prev.currentIndex !== newState.currentIndex ||
                JSON.stringify(prev.selections) !== JSON.stringify(newState.selections) ||
                JSON.stringify(prev.questions) !== JSON.stringify(newState.questions)) {
                 // console.log("Practice progress updated in context/localStorage.");
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
    // console.log(`handleAnswerChange: Q#${questionNumber}, Key: ${answerKey}, Checked: ${checked}, showAnswer: ${showAnswer}`);
    if (showAnswer) {
      // console.log("handleAnswerChange: Skipping, answer already shown.");
      return;
    }

    setCurrentSelections(prevSelections => {
      const previousQuestionSelection = prevSelections[questionNumber] || [];
      const question = practiceQuestions.find(q => q.question_number === questionNumber);

      if (!question) {
          console.warn(`handleAnswerChange: Question #${questionNumber} not found.`);
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
        newSelection = checked ? [answerKey] : []; // Allow unchecking radio button conceptually? Or just set directly.
        // RadioGroup usually handles the single selection logic, onValueChange might be better here.
        // For simplicity with the shared handler, we'll set directly:
        newSelection = [answerKey];
      }

       // console.log(`handleAnswerChange -> Setting selections for Q#${questionNumber} to:`, newSelection);
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
    // console.log(`Checked answer for Q#${currentQuestionNumber}. Correct: ${correct}`);
  }, [currentQuestion, currentQuestionNumber, currentSelections, showAnswer, toast]);


  // Navigation functions
  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < practiceQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex, practiceQuestions.length]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
       setCurrentQuestionIndex(prev => prev - 1); // Corrected here
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


  // --- Render Logic ---
  if (shouldRedirect) {
      // Render minimal loading/redirecting state while redirect effect runs
      return (
          <div className="container mx-auto p-4 min-h-screen flex items-center justify-center">
              Redirecting...
          </div>
      );
  }
  if (isContextLoading || !isContextInitialized || !isComponentInitialized) {
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

  // Safety check after initialization logic
  if (!currentQuestion) {
      // This should ideally not be reached if initialization logic is correct
      console.error("PracticePage Render: Current question is undefined after initialization. Triggering redirect.");
      setShouldRedirect(true); // Trigger redirect if state is inconsistent
      return <div className="container mx-auto p-4 text-center">Error loading question state...</div>;
  }

  // Get the potentially empty selection for the *current* question number
  const currentSelectionForCard = currentSelections[currentQuestionNumber] || [];
  // Get the original question number for display
  const originalQuestionNumber = currentQuestion.question_number;

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

          {!showAnswer ? (
            <Button
              onClick={checkAnswer}
              disabled={currentSelectionForCard.length === 0} // Disable if no answer selected
            >
              Check Answer
            </Button>
          ) : (
             // Show "Next" button even if it's the last question, to provide clear progression end
             <Button
               onClick={goToNextQuestion}
               disabled={currentQuestionIndex === practiceQuestions.length - 1}
              >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>

        {/* Add a message on the last question after checking */}
       {showAnswer && currentQuestionIndex === practiceQuestions.length - 1 && (
          <p className="text-center text-muted-foreground mt-4">You've reached the end of this practice session.</p>
       )}
    </div>
  );
}
