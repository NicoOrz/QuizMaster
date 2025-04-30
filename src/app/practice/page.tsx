
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

  // Load saved selection when question index changes
  useEffect(() => {
    if (questions.length === 0 && currentQuestionIndex === 0) {
      // Redirect back home if no questions are loaded initially
      router.push('/');
      return; // Stop further execution in this effect
    }

    if (currentQuestionNumber !== undefined) {
      // Reset state for the new question
      setShowAnswer(false);
      setIsCorrect(null);
      // Load previous selection for this question if it exists
      setCurrentSelection(practiceSelections[currentQuestionNumber] || []);
    }
  }, [currentQuestionIndex, questions, currentQuestionNumber, practiceSelections, router]);


  const handleAnswerChange = (questionNumber: number, answerKey: string, checked: boolean) => {
    // Only allow changes if the answer hasn't been revealed yet
    if (showAnswer) return;

    setCurrentSelection(prev => {
      const question = questions.find(q => q.question_number === questionNumber);
      const isMultipleChoice = question && question.correct_answer.length > 1;

      if (isMultipleChoice) {
        if (checked) {
          return [...prev, answerKey];
        } else {
          return prev.filter(ans => ans !== answerKey);
        }
      } else {
        // Single choice (RadioGroup)
        return [answerKey];
      }
    });
  };

  const checkAnswer = () => {
    if (!currentQuestion) return;

    const correctAnswers = currentQuestion.correct_answer;
    // Sort both arrays for comparison
    const sortedSelected = [...currentSelection].sort();
    const sortedCorrect = [...correctAnswers].sort();

    const correct = sortedSelected.length === sortedCorrect.length &&
                    sortedSelected.every((value, index) => value === sortedCorrect[index]);

    setIsCorrect(correct);
    setShowAnswer(true);
    // Save the selection made for this question
    setPracticeSelections(prev => ({
      ...prev,
      [currentQuestionNumber]: currentSelection
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
          question={currentQuestion}
          selectedAnswers={currentSelection}
          onAnswerChange={(answerKey, checked) => handleAnswerChange(currentQuestionNumber, answerKey, checked)}
          questionIndex={currentQuestionIndex}
          totalQuestions={questions.length}
          revealAnswers={showAnswer} // Pass showAnswer to reveal correct/incorrect
          userAnswer={currentSelection} // Pass current selection as user answer for highlighting
          isDisabled={showAnswer} // Disable input once answer is shown
      />

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
