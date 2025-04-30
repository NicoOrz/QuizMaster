
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Home, Check, X, List, RotateCcw } from 'lucide-react'; // Added List, RotateCcw icons
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Question } from '@/types/quiz';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { QuizOverview } from '@/components/quiz/QuizOverview';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"; // For Reset confirmation

export default function PracticePage() {
  const { questions, practiceProgress, setPracticeProgress, clearPracticeProgress } = useQuiz();
  const router = useRouter();

  // Initialize state from context or defaults
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => practiceProgress?.currentIndex ?? 0);
  const [currentSelections, setCurrentSelections] = useState<Record<number, string[]>>(
    () => practiceProgress?.selections ?? {}
  );
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Derived state for the current question based on index
  const currentQuestion = questions[currentQuestionIndex];
  const currentQuestionNumber = currentQuestion?.question_number;

  // Effect to handle initial load, redirection, and current question state updates
  useEffect(() => {
    if (questions.length === 0) {
      router.push('/'); // Redirect if no questions loaded
      return;
    }

    // Ensure index is within bounds
    if (currentQuestionIndex >= questions.length) {
      setCurrentQuestionIndex(questions.length - 1);
      return; // Re-run effect with corrected index
    }

    const question = questions[currentQuestionIndex];
    if (question) {
      const questionNum = question.question_number;
      // Always reset feedback state when question index changes
      setIsCorrect(null);
      setShowAnswer(false);

      const savedSelection = currentSelections[questionNum];

      // Check if *this specific question* was previously answered and feedback shown in the saved state
      // This check is subtle. We don't want to *always* show the answer just because a selection exists,
      // only if the user had previously clicked "Check Answer" for this question.
      // We'll rely on the `showAnswer` state which is reset above. If a selection exists,
      // the QuestionCard will show it, but feedback/explanation only appears after checkAnswer.
      // console.log(`Navigated to Q#${questionNum}, Selection: ${savedSelection}`);

    } else {
      // This case might happen briefly during loading or if index is somehow invalid
      setIsCorrect(null);
      setShowAnswer(false);
    }
  }, [currentQuestionIndex, questions, router, currentSelections]); // Removed currentSelections dependency to avoid resetting feedback on every selection change


  // Effect to update practice progress in context whenever index or selections change
  useEffect(() => {
    if (questions.length > 0) { // Only save progress if questions are loaded
        // console.log("Saving practice progress:", { currentIndex: currentQuestionIndex, selections: currentSelections });
        setPracticeProgress({
          currentIndex: currentQuestionIndex,
          selections: currentSelections,
        });
    }
  }, [currentQuestionIndex, currentSelections, setPracticeProgress, questions.length]);


  // Handle changes to the selected answers for the current question
  const handleAnswerChange = useCallback((questionNumber: number, answerKey: string, checked: boolean) => {
    if (showAnswer) return; // Don't allow changes if answer is revealed

    setCurrentSelections(prev => {
      const currentSelection = prev[questionNumber] || [];
      const question = questions.find(q => q.question_number === questionNumber);
      if (!question) return prev;

      const isMultipleChoice = question.correct_answer.length > 1;
      let newSelection: string[];

      if (isMultipleChoice) {
        if (checked) {
          newSelection = [...currentSelection, answerKey];
        } else {
          newSelection = currentSelection.filter(ans => ans !== answerKey);
        }
      } else {
        // Single choice (radio button logic): always replace the selection
        newSelection = [answerKey];
      }

      const newState = {
        ...prev,
        [questionNumber]: newSelection.sort(), // Store sorted answers
      };
       // console.log(`Answer changed for Q#${questionNumber}: ${newState[questionNumber]}`);
       return newState;
    });
  }, [showAnswer, questions]); // Keep `questions` dependency


  // Check the answer for the current question
  const checkAnswer = useCallback(() => {
    if (!currentQuestion || !currentQuestionNumber || showAnswer) return; // Don't re-check if already shown

    const userSelection = currentSelections[currentQuestionNumber] || [];
    // Require a selection before checking
    if (userSelection.length === 0) {
       // Optionally, provide feedback that an answer must be selected
       // console.log("Please select an answer before checking.");
        return;
    }

    const correctAnswers = currentQuestion.correct_answer;
    const sortedSelected = [...userSelection].sort();
    const sortedCorrect = [...correctAnswers].sort();

    const correct = sortedSelected.length === sortedCorrect.length &&
                    sortedSelected.every((value, index) => value === sortedCorrect[index]);

    // console.log(`Checking Q#${currentQuestionNumber}: Selected=${sortedSelected}, Correct=${sortedCorrect}, Result=${correct}`);
    setIsCorrect(correct);
    setShowAnswer(true); // Reveal feedback
    // Progress is saved via the useEffect watching currentSelections/currentQuestionIndex
  }, [currentQuestion, currentQuestionNumber, currentSelections, showAnswer]);


  // Navigation functions
  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      // Reset feedback state for the new question
      // setShowAnswer(false);
      // setIsCorrect(null);
    }
  }, [currentQuestionIndex, questions.length]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      // Reset feedback state for the new question
      // setShowAnswer(false);
      // setIsCorrect(null);
    }
  }, [currentQuestionIndex]);

  const navigateToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
      setIsSheetOpen(false);
       // Reset feedback state when jumping to a question
       // setShowAnswer(false);
       // setIsCorrect(null);
    }
  }, [questions.length]);

  const goToHome = useCallback(() => {
    // Progress is saved automatically by context/localStorage effect
    router.push('/');
  }, [router]);

  const handleResetPractice = useCallback(() => {
    clearPracticeProgress(); // Clears context and localStorage
    setCurrentQuestionIndex(0); // Go to the first question
    setCurrentSelections({}); // Clear local selection state
    setShowAnswer(false); // Reset feedback
    setIsCorrect(null);
     // No need to manually reset state based on question 0, useEffect[currentQuestionIndex] will handle it
     console.log("Practice reset.");
  }, [clearPracticeProgress]);


  // --- Render Logic ---
  if (questions.length === 0) {
    return <div className="container mx-auto p-4 text-center">Loading questions or no questions imported. Redirecting...</div>;
  }
  if (!currentQuestion) {
    console.error(`Current question at index ${currentQuestionIndex} is undefined.`);
    return <div className="container mx-auto p-4 text-center">Error loading question data.</div>;
  }

  const currentSelectionForCard = currentSelections[currentQuestionNumber] || [];

  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center pt-10 pb-10 relative">
      {/* Header Buttons */}
      <div className="absolute top-4 left-4 z-20 flex space-x-2">
        <Button onClick={goToHome} variant="outline">
          <Home className="mr-2 h-4 w-4" /> Back to Home
        </Button>
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                    <RotateCcw className="h-4 w-4" />
                    <span className="sr-only">Reset Practice</span>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Reset Practice?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will clear your current practice progress and start over from the first question. Are you sure?
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
            <List className="mr-2 h-4 w-4" /> Overview
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle>Practice Overview ({currentQuestionIndex + 1}/{questions.length})</SheetTitle>
          </SheetHeader>
          <QuizOverview
            questions={questions}
            userAnswers={currentSelections} // Pass the full selections record
            currentQuestionIndex={currentQuestionIndex}
            navigateToQuestion={navigateToQuestion}
            mode="practice"
          />
        </SheetContent>
      </Sheet>

      <h1 className="text-3xl font-bold mb-8 mt-12">Practice Mode</h1>

      {/* Question Card */}
      <div className="w-full max-w-4xl">
        <QuestionCard
          key={currentQuestionNumber} // Ensure re-render on question change
          question={currentQuestion}
          selectedAnswers={currentSelectionForCard}
          onAnswerChange={(key, checked) => currentQuestionNumber && handleAnswerChange(currentQuestionNumber, key, checked)}
          questionIndex={currentQuestionIndex}
          totalQuestions={questions.length}
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
            <Button onClick={goToNextQuestion} disabled={currentQuestionIndex === questions.length - 1}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
