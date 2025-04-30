"use client";

import React from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Question } from '@/types/quiz';

interface QuestionCardProps {
  question: Question;
  selectedAnswers: string[];
  onAnswerChange: (answerKey: string, checked: boolean) => void;
  questionIndex: number;
  totalQuestions: number;
  isReviewMode?: boolean;
  userAnswer?: string[];
}

export function QuestionCard({
  question,
  selectedAnswers,
  onAnswerChange,
  questionIndex,
  totalQuestions,
  isReviewMode = false,
  userAnswer,
}: QuestionCardProps) {
  const isMultipleChoice = question.correct_answer.length > 1;

  const getOptionStyle = (optionKey: string): string => {
    if (!isReviewMode) return '';

    const isCorrect = question.correct_answer.includes(optionKey);
    const isSelected = userAnswer?.includes(optionKey);

    if (isSelected && isCorrect) return 'text-green-600 font-semibold'; // Correctly selected
    if (isSelected && !isCorrect) return 'text-red-600 line-through'; // Incorrectly selected
    if (!isSelected && isCorrect) return 'text-green-600'; // Correct but not selected
    return ''; // Default style
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-md rounded-lg mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Question {questionIndex + 1} of {totalQuestions}
        </CardTitle>
         {question.image_url && (
          <div className="mt-4 mb-4 relative h-60 w-full">
             {/* Using picsum placeholder as image_url likely won't work directly with next/image without config */}
            <Image
              src={question.image_url.startsWith('https://picsum.photos') ? question.image_url : `https://picsum.photos/seed/${question.question_number}/600/400`} // Fallback placeholder
              alt={`Question ${question.question_number} Image`}
              layout="fill"
              objectFit="contain"
              className="rounded-md"
            />
          </div>
        )}
        <CardDescription className="text-foreground pt-2">{question.question_text}</CardDescription>
      </CardHeader>
      <CardContent>
        {isMultipleChoice ? (
          <div className="space-y-3">
            {Object.entries(question.options).map(([key, value]) => (
              <div key={key} className={`flex items-center space-x-3 p-3 rounded-md border ${getOptionStyle(key)}`}>
                <Checkbox
                  id={`${question.question_number}-${key}`}
                  checked={selectedAnswers.includes(key)}
                  onCheckedChange={(checked) => onAnswerChange(key, !!checked)}
                  disabled={isReviewMode}
                />
                <Label
                  htmlFor={`${question.question_number}-${key}`}
                  className="flex-1 cursor-pointer"
                >
                  <span className="font-medium mr-2">{key}.</span>{value}
                </Label>
              </div>
            ))}
          </div>
        ) : (
          <RadioGroup
             value={selectedAnswers[0] || ''}
             onValueChange={(value) => onAnswerChange(value, true)} // For radio, selecting one deselects others automatically
             disabled={isReviewMode}
             className="space-y-3"
          >
            {Object.entries(question.options).map(([key, value]) => (
              <div key={key} className={`flex items-center space-x-3 p-3 rounded-md border ${getOptionStyle(key)}`}>
                <RadioGroupItem value={key} id={`${question.question_number}-${key}`} />
                <Label
                  htmlFor={`${question.question_number}-${key}`}
                  className="flex-1 cursor-pointer"
                >
                  <span className="font-medium mr-2">{key}.</span>{value}
                 </Label>
              </div>
            ))}
          </RadioGroup>
        )}
      </CardContent>
    </Card>
  );
}
