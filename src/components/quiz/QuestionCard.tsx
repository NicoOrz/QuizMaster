
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

// Helper function to check if a string is a valid URL
const isValidUrl = (urlString: string | undefined): boolean => {
  if (!urlString) return false;
  try {
    new URL(urlString);
    return true;
  } catch (_) {
    return false;
  }
};


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

   if (!question) {
      console.error("QuestionCard received null question prop.");
      return <Card className="w-full max-w-2xl mx-auto shadow-md rounded-lg mb-6 p-4 text-center text-destructive">Error: Question data missing.</Card>;
   }

  const isMultipleChoice = question.correct_answer.length > 1;

  const getOptionStyle = (optionKey: string): string => {
    if (!revealAnswers) return 'border-border'; // Default style if not revealing

    const isCorrect = question.correct_answer.includes(optionKey);
    const isSelected = userAnswer?.includes(optionKey);

     let style = 'border-border '; // Start with default border
     if (isSelected && isCorrect) style += 'text-green-600 font-semibold border-green-300 bg-green-50/50'; // Correctly selected
     else if (isSelected && !isCorrect) style += 'text-red-600 line-through border-red-300 bg-red-50/50'; // Incorrectly selected
     else if (!isSelected && isCorrect) style += 'text-green-600 border-green-300'; // Correct but not selected

    return style.trim();
  };


  // --- Image Proxy and Validation Logic ---
  const placeholderUrl = `https://picsum.photos/seed/${question.question_number}/600/400`;
  let finalImageUrl: string = placeholderUrl; // Default to placeholder

  // Decide if the image needs proxying. Proxy images from modb.pro
  const needsProxy = (url: string): boolean => {
    try {
        const hostname = new URL(url).hostname;
        // Add other domains that require proxying if necessary
        return hostname.includes('modb.pro');
    } catch {
        return false; // Invalid URL cannot need proxying
    }
  };

  if (isValidUrl(question.image_url)) {
    const originalUrl = question.image_url!; // Assert non-null because isValidUrl checked
    if (needsProxy(originalUrl)) {
        try {
            const encodedUrl = encodeURIComponent(originalUrl);
            finalImageUrl = `/api/image-proxy?url=${encodedUrl}`;
            // console.log(`Using proxy for image: ${originalUrl} -> ${finalImageUrl}`);
        } catch (error) {
            console.error("Error encoding image URL for proxy:", originalUrl, error);
            finalImageUrl = placeholderUrl; // Fallback on encoding error
        }
    } else {
        finalImageUrl = originalUrl; // Use original valid URL if no proxy needed
    }
  } else {
     if (question.image_url) { // Log only if an invalid URL was actually provided
       console.warn(`Invalid image URL provided for Q#${question.question_number}, using placeholder: ${question.image_url}`);
     } else {
        // console.log(`No image URL for Q#${question.question_number}, using placeholder.`);
     }
     finalImageUrl = placeholderUrl; // Ensure placeholder if original is invalid or missing
  }
  // --- End Image Proxy and Validation Logic ---


  return (
    <Card key={question.question_number} className="w-full max-w-2xl mx-auto shadow-md rounded-lg mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Question {questionIndex + 1} of {totalQuestions}
        </CardTitle>
         {/* Use finalImageUrl which is guaranteed to be a valid URL string (either original, proxied, or placeholder) */}
         {finalImageUrl && (
          <div className="mt-4 mb-4 relative h-60 w-full">
            <Image
              src={finalImageUrl}
              alt={`Question ${question.question_number} Image`}
              fill
              style={{ objectFit: 'contain' }}
              className="rounded-md"
              // Unoptimize if using the proxy OR if it's the placeholder (picsum optimization might not be needed/wanted)
              unoptimized={needsProxy(question.image_url || '') || finalImageUrl === placeholderUrl}
              onError={(e) => {
                console.error(`Error loading image for Q#${question.question_number}: ${finalImageUrl}`, e);
                // Attempt to set to the known placeholder URL on error
                // Note: This might trigger another onError if the placeholder itself fails, creating a loop.
                // Consider adding a state to prevent infinite loops if necessary.
                const target = e.target as HTMLImageElement;
                if (target.src !== placeholderUrl) {
                     target.src = placeholderUrl;
                     target.srcset = ""; // Clear srcset if it exists
                     console.warn(`Falling back to placeholder for Q#${question.question_number}`);
                }
              }}
              priority={questionIndex === 0} // Prioritize loading the first image
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
              <div key={key} className={`flex items-start space-x-3 p-3 rounded-md border transition-colors ${getOptionStyle(key)}`}>
                <Checkbox
                  id={`${question.question_number}-${key}`}
                  checked={selectedAnswers.includes(key)}
                  onCheckedChange={(checked) => {
                    onAnswerChange(key, !!checked);
                  }}
                  disabled={isDisabled} // Disable based on prop
                  aria-label={`Option ${key}`}
                  className="mt-1" // Align checkbox slightly lower if text wraps
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
                 if (value) {
                    onAnswerChange(value, true);
                 }
             }}
             disabled={isDisabled} // Disable based on prop
             className="space-y-3"
          >
            {Object.entries(question.options).map(([key, value]) => (
              <div key={key} className={`flex items-start space-x-3 p-3 rounded-md border transition-colors ${getOptionStyle(key)}`}>
                <RadioGroupItem value={key} id={`${question.question_number}-${key}`} aria-label={`Option ${key}`} className="mt-1" />
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
