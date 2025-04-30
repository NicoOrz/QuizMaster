
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Home, Check, X } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Question } from '@/types/quiz';

export default function PracticePage() {
  const { questions } = useQuiz();
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // Store selections for *all* questions visited in practice
  const [practiceSelections, setPracticeSelections] = useState<Record<number, string[]>>({});
  // State for the current question's selection before checking
  const [currentSelection, setCurrentSelection] = useState<string[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const currentQuestionNumber = currentQuestion?.question_number;

  // Load saved selection or reset when question index changes
  useEffect(() => {
    console.log(`Effect running for index: ${currentQuestionIndex}`);
    if (questions.length === 0 && currentQuestionIndex === 0) {
      console.log("No questions loaded, redirecting home.");
      router.push('/');
      return;
    }

    const question = questions[currentQuestionIndex];
    if (question) {
        const questionNum = question.question_number;
        console.log(`Setting up question number: ${questionNum}`);
        setShowAnswer(false);
        setIsCorrect(null);
        const savedSelection = practiceSelections[questionNum] || [];
        setCurrentSelection(savedSelection);
        console.log(`Loaded selection for question ${questionNum}:`, savedSelection);
    } else {
        console.log(`Question at index ${currentQuestionIndex} not found.`);
        // Handle case where index might be out of bounds briefly during navigation
    }
  }, [currentQuestionIndex, questions, practiceSelections, router]);


  const handleAnswerChange = (questionNumber: number, answerKey: string, checked: boolean) => {
    // Only allow changes if the answer hasn't been revealed yet
    if (showAnswer) {
      console.log("Answer shown, blocking change.");
      return;
    }
     console.log(`Answer change for Q#${questionNumber}: Key=${answerKey}, Checked=${checked}`);

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
        // Single choice (RadioGroup)
        newSelection = [answerKey];
      }
       console.log("New current selection:", newSelection);
      return newSelection;
    });
  };

  const checkAnswer = () => {
    if (!currentQuestion) {
        console.error("Cannot check answer: currentQuestion is null");
        return;
    }
     console.log("Checking answer for question:", currentQuestion.question_number);
     console.log("User's current selection:", currentSelection);


    const correctAnswers = currentQuestion.correct_answer;
    // Sort both arrays for comparison
    const sortedSelected = [...currentSelection].sort();
    const sortedCorrect = [...correctAnswers].sort();

    const correct = sortedSelected.length === sortedCorrect.length &&
                    sortedSelected.every((value, index) => value === sortedCorrect[index]);

     console.log("Correct answers:", sortedCorrect);
     console.log("Is correct?", correct);

    setIsCorrect(correct);
    setShowAnswer(true); // This should trigger the display of feedback

    // Save the selection made for this question
    setPracticeSelections(prev => {
        const updatedSelections = {
            ...prev,
            [currentQuestionNumber]: currentSelection
        };
         console.log("Updated practice selections:", updatedSelections);
        return updatedSelections;
    });

     console.log("State after checkAnswer: isCorrect =", correct, "showAnswer =", true);
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
        console.log("Going to next question");
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
        console.log("Already at the last question");
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
        console.log("Going to previous question");
      setCurrentQuestionIndex(prev => prev - 1);
    } else {
        console.log("Already at the first question");
    }
  };

   const goToHome = () => {
       console.log("Going back home");
    router.push('/');
   };

   console.log(`Rendering PracticePage - Index: ${currentQuestionIndex}, ShowAnswer: ${showAnswer}, IsCorrect: ${isCorrect}`);


  if (questions.length === 0 || !currentQuestion) {
    // Render loading or placeholder
    return <div className="container mx-auto p-4 text-center">Loading questions or redirecting...</div>;
  }


  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center pt-10 pb-10">
       <Button onClick={goToHome} variant="outline" className="absolute top-4 left-4">
          <Home className="mr-2 h-4 w-4" /> Back to Home
       </Button>
      <h1 className="text-3xl font-bold mb-8">Practice Mode</h1>

      <QuestionCard
          key={currentQuestionNumber} // Add key to force re-render on question change
          question={currentQuestion}
          selectedAnswers={currentSelection}
          onAnswerChange={(answerKey, checked) => handleAnswerChange(currentQuestionNumber, answerKey, checked)}
          questionIndex={currentQuestionIndex}
          totalQuestions={questions.length}
          revealAnswers={showAnswer} // Pass showAnswer to reveal correct/incorrect
          userAnswer={currentSelection} // Pass current selection as user answer for highlighting
          isDisabled={showAnswer} // Disable input once answer is shown
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
                    {/* Use whitespace-pre-wrap for explanation */}
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                        {currentQuestion.explanation || "No explanation provided."}
                    </p>
                 </div>
            </CardContent>
        </Card>
      )}

      {/* Navigation Section */}
      <Card className="w-full max-w-2xl mx-auto mt-6 shadow-md rounded-lg">
        <CardContent className="flex justify-between p-4">
          <Button onClick={goToPreviousQuestion} disabled={currentQuestionIndex === 0} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>

           {!showAnswer ? (
             <Button onClick={checkAnswer} disabled={currentSelection.length === 0}>
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
