

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
    // Use URL constructor which is standard and robust
    new URL(urlString);
    // Additional check for common protocols if needed, though URL constructor handles many cases
    return urlString.startsWith('http://') || urlString.startsWith('https://') || urlString.startsWith('/');
  } catch (_) {
    return false; // Invalid URL format
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
      return <Card className="w-full max-w-4xl mx-auto shadow-md rounded-lg mb-6 p-4 text-center text-destructive">Error: Question data missing.</Card>;
   }

  const isMultipleChoice = question.correct_answer.length > 1;

  const getOptionStyle = (optionKey: string): string => {
    if (!revealAnswers) return 'border-border'; // Default style if not revealing

    const isCorrect = question.correct_answer.includes(optionKey);
    const isSelected = userAnswer?.includes(optionKey);

     let style = 'border-border '; // Start with default border
     if (isSelected && isCorrect) style += 'text-green-600 font-semibold border-green-300 bg-green-50/50 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700'; // Correctly selected
     else if (isSelected && !isCorrect) style += 'text-red-600 line-through border-red-300 bg-red-50/50 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700'; // Incorrectly selected
     else if (!isSelected && isCorrect) style += 'text-green-600 border-green-300 dark:text-green-400 dark:border-green-700'; // Correct but not selected

    return style.trim();
  };


  // --- Image Proxy and Validation Logic ---
  let finalImageUrl: string | null = null; // Default to null initially

  // Decide if the image needs proxying. Proxy images from modb.pro
  const needsProxy = (url: string | undefined): boolean => {
    if (!url) return false;
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
            // Use absolute URL for proxy to avoid issues with relative paths
            const proxied = `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
            if (isValidUrl(proxied)) { // Check if proxy URL is valid before setting
                 finalImageUrl = proxied;
                // console.log(`Using proxy for image: ${originalUrl} -> ${finalImageUrl}`);
            } else {
                console.warn(`Generated proxy URL is invalid: ${proxied}`);
            }

        } catch (error) {
            console.error("Error encoding image URL for proxy:", originalUrl, error);
            // Keep finalImageUrl null
        }
    } else {
         // Check if the non-proxied URL is valid before assigning
         if (isValidUrl(originalUrl)) {
            finalImageUrl = originalUrl; // Use original valid URL if no proxy needed
         } else {
            console.warn(`Original image URL is invalid: ${originalUrl}`);
         }

    }
  } else {
     if (question.image_url && question.image_url.trim() !== '') { // Log only if a non-empty, invalid URL was actually provided
       console.warn(`Invalid image URL provided for Q#${question.question_number}: ${question.image_url}`);
     }
     // Keep finalImageUrl null if original is invalid or missing/empty
  }
  // --- End Image Proxy and Validation Logic ---


  return (
     // Use grid layout for medium screens and up
    <Card key={question.question_number} className="w-full max-w-4xl mx-auto shadow-md rounded-lg mb-6 overflow-hidden">
       <div className="md:grid md:grid-cols-2 md:gap-0"> {/* Use gap-0 to make border seamless */}
          {/* Left Column: Question Info */}
          <div className="border-b md:border-b-0 md:border-r border-border">
             <CardHeader className="p-6">
               <CardTitle className="text-lg font-semibold mb-4">
                 Question {questionIndex + 1} of {totalQuestions}
               </CardTitle>
               {/* Conditionally render the image container only if finalImageUrl is valid */}
               {finalImageUrl && isValidUrl(finalImageUrl) && (
                 <div className="mb-4 relative aspect-video w-full"> {/* Use aspect-video for consistent ratio */}
                   <Image
                     src={finalImageUrl}
                     alt={`Question ${question.question_number} Image`}
                     fill
                     style={{ objectFit: 'contain' }}
                     className="rounded-md"
                     unoptimized={needsProxy(question.image_url)}
                     onError={(e) => {
                       console.error(`Error loading image for Q#${question.question_number}: ${finalImageUrl}`, e);
                       // Optionally set to a broken image placeholder or hide the element
                       const target = e.target as HTMLImageElement;
                       target.style.display = 'none'; // Hide the broken image
                       console.warn(`Hiding image due to loading error for Q#${question.question_number}`);
                     }}
                     priority={questionIndex === 0} // Prioritize loading the first image
                   />
                 </div>
               )}
               {/* Use whitespace-pre-wrap to respect newlines from JSON */}
               <CardDescription className="text-foreground pt-2 whitespace-pre-wrap">{question.question_text}</CardDescription>
             </CardHeader>
          </div>

          {/* Right Column: Options */}
          <div className="flex flex-col justify-center"> {/* Center options vertically */}
             <CardContent className="p-6 space-y-3">
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
          </div>
       </div>
    </Card>
  );
}
