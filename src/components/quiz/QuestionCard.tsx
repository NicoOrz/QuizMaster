
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
  selectedAnswers: string[]; // Currently selected by the user before checking/submitting
  onAnswerChange: (answerKey: string, checked: boolean) => void;
  questionIndex: number;
  totalQuestions: number;
  revealAnswers?: boolean; // Renamed from isReviewMode
  userAnswer?: string[]; // The answer submitted/checked by the user (for highlighting)
  isDisabled?: boolean; // To disable input after checking/submitting
}

export function QuestionCard({
  question,
  selectedAnswers,
  onAnswerChange,
  questionIndex,
  totalQuestions,
  revealAnswers = false, // Default to false
  userAnswer, // This will hold the checked answer in practice/review
  isDisabled = false, // Default to not disabled
}: QuestionCardProps) {
  console.log(`Rendering QuestionCard for Q#${question?.question_number}, Index: ${questionIndex}, Reveal: ${revealAnswers}, Disabled: ${isDisabled}, Selected:`, selectedAnswers);

  const isMultipleChoice = question.correct_answer.length > 1;

  const getOptionStyle = (optionKey: string): string => {
    if (!revealAnswers) return 'border-border'; // Default style if not revealing

    const isCorrect = question.correct_answer.includes(optionKey);
    // Use `userAnswer` (the confirmed/checked answer) for highlighting, which should be the same as `selectedAnswers` in practice mode when revealAnswers is true
    const isSelected = userAnswer?.includes(optionKey);

     let style = 'border-border '; // Start with default border
     if (isSelected && isCorrect) style += 'text-green-600 font-semibold border-green-300 bg-green-50/50'; // Correctly selected
     else if (isSelected && !isCorrect) style += 'text-red-600 line-through border-red-300 bg-red-50/50'; // Incorrectly selected
     else if (!isSelected && isCorrect) style += 'text-green-600 border-green-300'; // Correct but not selected

    // console.log(`Option ${optionKey}: isSelected=${isSelected}, isCorrect=${isCorrect}, style='${style.trim()}'`);
    return style.trim();
  };

  if (!question) {
      console.error("QuestionCard received null question prop.");
      return <Card className="w-full max-w-2xl mx-auto shadow-md rounded-lg mb-6 p-4 text-center text-destructive">Error: Question data missing.</Card>;
  }

  return (
    <Card key={question.question_number} className="w-full max-w-2xl mx-auto shadow-md rounded-lg mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Question {questionIndex + 1} of {totalQuestions}
        </CardTitle>
         {question.image_url && (
          <div className="mt-4 mb-4 relative h-60 w-full">
            <Image
              src={question.image_url.includes('modb.pro') || question.image_url.includes('picsum.photos') ? question.image_url : `https://picsum.photos/seed/${question.question_number}/600/400`}
              alt={`Question ${question.question_number} Image`}
              fill
              style={{ objectFit: 'contain' }}
              className="rounded-md"
              unoptimized={!question.image_url.includes('picsum.photos')}
              onError={(e) => console.error(`Error loading image for Q#${question.question_number}: ${question.image_url}`, e)}
            />
          </div>
        )}
        {/* Use whitespace-pre-wrap to respect newlines from JSON */}
        <CardDescription className="text-foreground pt-2 whitespace-pre-wrap">{question.question_text}</CardDescription>
      </CardHeader>
      <CardContent>
        {isMultipleChoice ? (
          <div className="space-y-3">
            {Object.entries(question.options).map(([key, value]) => (
              <div key={key} className={`flex items-center space-x-3 p-3 rounded-md border transition-colors ${getOptionStyle(key)}`}>
                <Checkbox
                  id={`${question.question_number}-${key}`}
                  checked={selectedAnswers.includes(key)}
                  onCheckedChange={(checked) => {
                    console.log(`Checkbox ${key} changed to: ${checked}`);
                    onAnswerChange(key, !!checked);
                  }}
                  disabled={isDisabled} // Disable based on prop
                  aria-label={`Option ${key}`}
                />
                <Label
                  htmlFor={`${question.question_number}-${key}`}
                  className={`flex-1 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="font-medium mr-2">{key}.</span>
                  {/* Use whitespace-pre-wrap for option text as well */}
                  <span className="whitespace-pre-wrap align-middle">{value}</span>
                </Label>
              </div>
            ))}
          </div>
        ) : (
          <RadioGroup
             value={selectedAnswers[0] || ''}
             onValueChange={(value) => {
                 if (value) { // Ensure value is not empty string if nothing selected
                    console.log(`RadioGroup changed to: ${value}`);
                    onAnswerChange(value, true); // Radio always means 'checked' is true for the new value
                 }
             }}
             disabled={isDisabled} // Disable based on prop
             className="space-y-3"
          >
            {Object.entries(question.options).map(([key, value]) => (
              <div key={key} className={`flex items-center space-x-3 p-3 rounded-md border transition-colors ${getOptionStyle(key)}`}>
                <RadioGroupItem value={key} id={`${question.question_number}-${key}`} aria-label={`Option ${key}`} />
                <Label
                  htmlFor={`${question.question_number}-${key}`}
                  className={`flex-1 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="font-medium mr-2">{key}.</span>
                  {/* Use whitespace-pre-wrap for option text */}
                   <span className="whitespace-pre-wrap align-middle">{value}</span>
                 </Label>
              </div>
            ))}
          </RadioGroup>
        )}
      </CardContent>
    </Card>
  );
}
