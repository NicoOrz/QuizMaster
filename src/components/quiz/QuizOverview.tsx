
"use client";

import React from 'react';
import type { Question, UserAnswer } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Circle } from 'lucide-react';

interface QuizOverviewProps {
  questions: Question[];
  userAnswers: Record<number, UserAnswer>; // Answers keyed by question_number
  currentQuestionIndex: number;
  navigateToQuestion: (index: number) => void;
  mode: 'practice' | 'exam';
}

export function QuizOverview({
  questions,
  userAnswers,
  currentQuestionIndex,
  navigateToQuestion,
  mode,
}: QuizOverviewProps) {

  const getStatus = (question: Question, index: number): 'current' | 'answered' | 'unanswered' => {
    if (index === currentQuestionIndex) {
      return 'current';
    }
    if (userAnswers[question.question_number]?.selected_answers?.length > 0) {
       return 'answered';
    }
    return 'unanswered';
  };

  const getVariant = (status: 'current' | 'answered' | 'unanswered'): "default" | "secondary" | "outline" => {
     switch (status) {
         case 'current':
            return 'default'; // Highlight current question
         case 'answered':
             // In practice mode, we might eventually differentiate correct/incorrect if state allows
             return 'secondary'; // Mark answered questions differently
         case 'unanswered':
            return 'outline'; // Default for unanswered
         default:
            return 'outline';
     }
  }

  return (
    <ScrollArea className="h-[calc(100vh-12rem)] pr-4"> {/* Adjust height as needed */}
      <div className="grid grid-cols-5 gap-2 p-1">
        {questions.map((question, index) => {
          const status = getStatus(question, index);
          const variant = getVariant(status);
          const hasAnswered = !!userAnswers[question.question_number]?.selected_answers?.length;

          return (
            <Button
              key={question.question_number}
              variant={variant}
              size="sm"
              className="h-9 w-9 p-0 flex items-center justify-center relative text-xs"
              onClick={() => navigateToQuestion(index)}
              aria-label={`Go to question ${index + 1}`}
            >
              {index + 1}
               {status === 'answered' && (
                 <Check className="absolute -top-1 -right-1 h-3 w-3 text-green-600 bg-background rounded-full" />
               )}
                {/* Optionally add an indicator for unanswered */}
                {/* {status === 'unanswered' && (
                 <Circle className="absolute -top-1 -right-1 h-3 w-3 text-muted-foreground fill-muted-foreground/50" />
               )} */}
            </Button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
