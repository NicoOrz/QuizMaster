

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Home, Check, X, List } from 'lucide-react'; // Added List icon
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Question } from '@/types/quiz';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"; // Added Sheet components
import { QuizOverview } from '@/components/quiz/QuizOverview'; // Added QuizOverview

export default function PracticePage() {
  const { questions } = useQuiz();
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [practiceSelections, setPracticeSelections] = useState<Record<number, string[]>>({});
  const [currentSelection, setCurrentSelection] = useState<string[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false); // State for overview sheet

  const currentQuestion = questions[currentQuestionIndex];
  const currentQuestionNumber = currentQuestion?.question_number;

  useEffect(() => {
    if (questions.length === 0 && currentQuestionIndex === 0) {
      // Redirect immediately if no questions are loaded
      router.push('/');
      return;
    }

    const question = questions[currentQuestionIndex];
    if (question) {
        const questionNum = question.question_number;
        setShowAnswer(false);
        setIsCorrect(null);
        const savedSelection = practiceSelections[questionNum];
        if (savedSelection) {
             // If navigating back to an answered question, show its previous state
             setCurrentSelection(savedSelection);
             const correctAnswers = question.correct_answer;
             const sortedSelected = [...savedSelection].sort();
             const sortedCorrect = [...correctAnswers].sort();
             const correct = sortedSelected.length === sortedCorrect.length &&
                             sortedSelected.every((value, index) => value === sortedCorrect[index]);
             setIsCorrect(correct);
             setShowAnswer(true); // Show the feedback immediately
        } else {
            // Reset for a new, unanswered question
             setCurrentSelection([]);
        }
    } else if (questions.length > 0 && currentQuestionIndex >= questions.length) {
        // Handle edge case where index might be out of bounds after question changes
        setCurrentQuestionIndex(questions.length - 1);
    } else if (questions.length === 0) {
        // If questions become empty (e.g., context cleared), redirect
        router.push('/');
    }
  }, [currentQuestionIndex, questions, router, practiceSelections]); // Added practiceSelections dependency


  const handleAnswerChange = useCallback((questionNumber: number, answerKey: string, checked: boolean) => {
    // Only allow changes if the answer hasn't been revealed yet
    if (showAnswer) {
      return;
    }

    setCurrentSelection(prev => {
      const question = questions.find(q => q.question_number === questionNumber);
      if (!question) return prev; // Should not happen, but safeguard

      const isMultipleChoice = question.correct_answer.length > 1;

      let newSelection: string[];
      if (isMultipleChoice) {
        // For checkboxes, add or remove the selected key
        if (checked) {
          newSelection = [...prev, answerKey];
        } else {
          newSelection = prev.filter(ans => ans !== answerKey);
        }
      } else {
        // For radio buttons, replace the selection with the new key
        newSelection = [answerKey];
      }
      return newSelection;
    });
  }, [showAnswer, questions]); // Include questions in dependency if needed

  const checkAnswer = useCallback(() => {
     if (!currentQuestion || currentSelection.length === 0) {
         // Don't check if no question or no selection made
         return;
     }

     const correctAnswers = currentQuestion.correct_answer;
     const sortedSelected = [...currentSelection].sort();
     const sortedCorrect = [...correctAnswers].sort();

     const correct = sortedSelected.length === sortedCorrect.length &&
                     sortedSelected.every((value, index) => value === sortedCorrect[index]);

     setIsCorrect(correct);
     setShowAnswer(true); // Reveal feedback and switch button state

     // Save the selection made for this question *after* checking
     // This ensures the state reflects what was actually evaluated
     setPracticeSelections(prev => ({
         ...prev,
         [currentQuestionNumber]: currentSelection
     }));
   }, [currentQuestion, currentSelection, currentQuestionNumber]);


  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      // Reset state handled by useEffect
    }
  }, [currentQuestionIndex, questions.length]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
       // Reset state handled by useEffect
    }
  }, [currentQuestionIndex]);

   const goToHome = useCallback(() => {
    router.push('/');
   }, [router]);

   const navigateToQuestion = useCallback((index: number) => {
     if (index >= 0 && index < questions.length) {
         setCurrentQuestionIndex(index);
         setIsSheetOpen(false); // Close sheet after navigation
         // Reset state handled by useEffect
     }
   }, [questions.length]);

  // Conditional rendering if no questions or question data is missing
  if (questions.length === 0) {
    return <div className="container mx-auto p-4 text-center">Loading questions or no questions imported. Redirecting...</div>;
  }
  if (!currentQuestion) {
      // This might happen briefly during state transitions or if index is invalid
       console.error(`Current question at index ${currentQuestionIndex} is undefined.`);
      // Optionally, try to reset or show an error state
      // setCurrentQuestionIndex(0); // Example reset
      return <div className="container mx-auto p-4 text-center">Error loading question data.</div>;
  }


  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center pt-10 pb-10 relative">
       <Button onClick={goToHome} variant="outline" className="absolute top-4 left-4 z-20">
          <Home className="mr-2 h-4 w-4" /> Back to Home
       </Button>

        {/* Overview Sheet Trigger */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="absolute top-4 right-4 z-20">
                    <List className="mr-2 h-4 w-4" /> Overview
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                    <SheetTitle>Quiz Overview ({currentQuestionIndex + 1}/{questions.length})</SheetTitle>
                </SheetHeader>
                <QuizOverview
                    questions={questions}
                    userAnswers={practiceSelections} // Pass the saved selections keyed by question_number
                    currentQuestionIndex={currentQuestionIndex}
                    navigateToQuestion={navigateToQuestion}
                    mode="practice"
                />
            </SheetContent>
        </Sheet>


      <h1 className="text-3xl font-bold mb-8 mt-12">Practice Mode</h1>

      {/* Adjust max-width to accommodate the new QuestionCard layout */}
      <div className="w-full max-w-4xl">
        <QuestionCard
            key={currentQuestionNumber} // Key ensures re-render when question changes
            question={currentQuestion}
            selectedAnswers={currentSelection}
            onAnswerChange={(key, checked) => handleAnswerChange(currentQuestionNumber, key, checked)}
            questionIndex={currentQuestionIndex}
            totalQuestions={questions.length}
            revealAnswers={showAnswer}
            userAnswer={practiceSelections[currentQuestionNumber]} // Pass the saved answer for review styling
            isDisabled={showAnswer} // Disable inputs after checking
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
                disabled={currentSelection.length === 0} // Disable if no answer is selected
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
