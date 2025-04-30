
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
             setCurrentSelection(savedSelection);
             const correctAnswers = question.correct_answer;
             const sortedSelected = [...savedSelection].sort();
             const sortedCorrect = [...correctAnswers].sort();
             const correct = sortedSelected.length === sortedCorrect.length &&
                             sortedSelected.every((value, index) => value === sortedCorrect[index]);
             setIsCorrect(correct);
             setShowAnswer(true);
        } else {
             setCurrentSelection([]);
        }
    }
  }, [currentQuestionIndex, questions, router, practiceSelections]); // Added practiceSelections dependency


  const handleAnswerChange = (questionNumber: number, answerKey: string, checked: boolean) => {
    if (showAnswer) {
      return;
    }

    setCurrentSelection(prev => {
      const question = questions.find(q => q.question_number === questionNumber);
      const isMultipleChoice = question && question.correct_answer.length > 1;

      let newSelection: string[];
      if (isMultipleChoice) {
        if (checked) {
          newSelection = [...prev, answerKey];
        } else {
          newSelection = prev.filter(ans => ans !== answerKey);
        }
      } else {
        newSelection = [answerKey];
      }
      return newSelection;
    });
  };

  const checkAnswer = () => {
     if (!currentQuestion) {
         console.error("Cannot check answer: currentQuestion is null");
         return;
     }

     const correctAnswers = currentQuestion.correct_answer;
     const sortedSelected = [...currentSelection].sort();
     const sortedCorrect = [...correctAnswers].sort();

     const correct = sortedSelected.length === sortedCorrect.length &&
                     sortedSelected.every((value, index) => value === sortedCorrect[index]);

     setIsCorrect(correct);
     setShowAnswer(true); // Reveal feedback and switch button

     // Save the selection made for this question *after* checking
     setPracticeSelections(prev => ({
         ...prev,
         [currentQuestionNumber]: currentSelection // Save the selection that was checked
     }));
   };


  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

   const goToHome = () => {
    router.push('/');
   };

   const navigateToQuestion = (index: number) => {
     if (index >= 0 && index < questions.length) {
         setCurrentQuestionIndex(index);
         setIsSheetOpen(false); // Close sheet after navigation
     }
   }

  if (questions.length === 0 || !currentQuestion) {
    return <div className="container mx-auto p-4 text-center">Loading questions or redirecting...</div>;
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
                    userAnswers={practiceSelections} // Pass the saved selections
                    currentQuestionIndex={currentQuestionIndex}
                    navigateToQuestion={navigateToQuestion}
                    mode="practice"
                />
            </SheetContent>
        </Sheet>


      <h1 className="text-3xl font-bold mb-8 mt-12">Practice Mode</h1>

      <QuestionCard
          key={currentQuestionNumber} // Add key to force re-render on question change
          question={currentQuestion}
          selectedAnswers={currentSelection}
          onAnswerChange={(answerKey, checked) => handleAnswerChange(currentQuestionNumber, answerKey, checked)}
          questionIndex={currentQuestionIndex}
          totalQuestions={questions.length}
          revealAnswers={showAnswer}
          userAnswer={currentSelection}
          isDisabled={showAnswer}
      />

      {/* Feedback Section */}
      {showAnswer && (
        <Card className="w-full max-w-2xl mx-auto mt-4 shadow-md rounded-lg border border-border">
            <CardContent className="p-4 space-y-3">
                 <div className={`flex items-center ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {isCorrect ? <Check className="mr-2 h-5 w-5" /> : <X className="mr-2 h-5 w-5" />}
                    <span className="font-semibold">{isCorrect ? 'Correct!' : 'Incorrect'}</span>
                 </div>
                 {!isCorrect && (
                     <p className="text-sm font-medium">
                        Correct Answer(s): <span className="text-green-600">{currentQuestion.correct_answer.join(', ')}</span>
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
      <Card className="w-full max-w-2xl mx-auto mt-6 shadow-md rounded-lg">
        <CardContent className="flex justify-between p-4 items-center">
          <Button onClick={goToPreviousQuestion} disabled={currentQuestionIndex === 0} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>

           {!showAnswer ? (
             <Button
                onClick={checkAnswer}
                disabled={currentSelection.length === 0}
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
