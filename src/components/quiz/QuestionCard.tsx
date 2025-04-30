
"use client";

import React, { useMemo } from 'react'; // Added useMemo
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Question } from '@/types/quiz';
import { shuffleArray } from '@/lib/utils'; // Import shuffleArray

interface QuestionCardProps {
  question: Question;
  selectedAnswers: string[]; // Currently selected by the user before checking/submitting
  onAnswerChange: (questionNumber: number, answerKey: string, checked: boolean) => void;
  questionIndex: number;
  totalQuestions: number;
  revealAnswers?: boolean;
  userAnswer?: string[];
  isDisabled?: boolean;
  practiceQuestionNumber?: number; // Optional: To show the original number in practice mode
}

// Helper function to check if a string is a valid URL
const isValidUrl = (urlString: string | undefined): boolean => {
  if (!urlString) return false;
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
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
  revealAnswers = false,
  userAnswer,
  isDisabled = false,
  practiceQuestionNumber, // Receive the original number
}: QuestionCardProps) {

   if (!question) {
      console.error("QuestionCard received null question prop.");
      return <Card className="w-full max-w-4xl mx-auto shadow-md rounded-lg mb-6 p-4 text-center text-destructive">Error: Question data missing.</Card>;
   }

   // Shuffle options only once per question render using useMemo
   const shuffledOptions = useMemo(() => {
        const entries = Object.entries(question.options);
        return shuffleArray(entries);
   }, [question.options]); // Dependency: only reshuffle if options change

  const isMultipleChoice = question.correct_answer.length > 1;

  const getOptionStyle = (optionKey: string): string => {
    if (!revealAnswers) return 'border-border';

    const isCorrect = question.correct_answer.includes(optionKey);
    const isSelected = userAnswer?.includes(optionKey);

     let style = 'border-border ';
     if (isSelected && isCorrect) style += 'text-green-600 font-semibold border-green-300 bg-green-50/50 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700';
     else if (isSelected && !isCorrect) style += 'text-red-600 line-through border-red-300 bg-red-50/50 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700';
     else if (!isSelected && isCorrect) style += 'text-green-600 border-green-300 dark:text-green-400 dark:border-green-700';

    return style.trim();
  };

  // --- Image Proxy and Validation Logic ---
  let finalImageUrl: string | null = null;

  const needsProxy = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
        const hostname = new URL(url).hostname;
        return hostname.includes('modb.pro');
    } catch {
        return false;
    }
  };

  if (question.image_url && question.image_url.trim() !== '') {
      const originalUrl = question.image_url;
      if (isValidUrl(originalUrl)) {
            if (needsProxy(originalUrl)) {
                try {
                    const proxied = `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
                    if (proxied.startsWith('/')) {
                         finalImageUrl = proxied;
                    } else {
                        console.warn(`Generated proxy URL is invalid: ${proxied}`);
                    }
                } catch (error) {
                    console.error("Error encoding image URL for proxy:", originalUrl, error);
                }
            } else {
                finalImageUrl = originalUrl;
            }
      } else {
          console.warn(`Invalid image URL provided for Q#${question.question_number}: ${originalUrl}`);
      }
  }
  // --- End Image Proxy and Validation Logic ---

  return (
    <Card key={question.question_number} className="w-full max-w-4xl mx-auto shadow-md rounded-lg mb-6 overflow-hidden">
       <div className="md:grid md:grid-cols-2 md:gap-0">
          {/* Left Column: Question Info */}
          <div className="border-b md:border-b-0 md:border-r border-border p-6">
             <CardHeader className="p-0 mb-4">
               <CardTitle className="text-lg font-semibold mb-4">
                 {/* Display current index / total and optionally the original number */}
                 Question {questionIndex + 1} of {totalQuestions}
                 {practiceQuestionNumber !== undefined && practiceQuestionNumber !== question.question_number && (
                     <span className="text-sm text-muted-foreground ml-2">(Original #: {practiceQuestionNumber})</span>
                 )}
                 {practiceQuestionNumber === undefined && (
                     <span className="text-sm text-muted-foreground ml-2">(Original #: {question.question_number})</span>
                 )}
               </CardTitle>
               <CardDescription className="text-foreground pt-2 whitespace-pre-wrap">{question.question_text}</CardDescription>
             </CardHeader>
             {finalImageUrl && (
                 <div className="mb-4 relative aspect-video w-full">
                   <Image
                     src={finalImageUrl}
                     alt={`Question ${question.question_number} Image`}
                     fill
                     style={{ objectFit: 'contain' }}
                     className="rounded-md"
                     unoptimized={true}
                     onError={(e) => {
                       console.error(`Error loading image for Q#${question.question_number}: ${finalImageUrl}`, e);
                       const target = e.target as HTMLImageElement;
                       // Ensure the target exists and has a style property
                       if (target && target.style) {
                           target.style.display = 'none';
                           console.warn(`Hiding image due to loading error for Q#${question.question_number}`);
                       }
                     }}
                     priority={questionIndex === 0}
                   />
                 </div>
             )}
          </div>

          {/* Right Column: Options */}
          <div className="flex flex-col justify-center">
             <CardContent className="p-6 space-y-3">
               {isMultipleChoice ? (
                 <div className="space-y-3">
                   {/* Use shuffledOptions here */}
                   {shuffledOptions.map(([key, value]) => (
                     <div key={key} className={`flex items-start space-x-3 p-3 rounded-md border transition-colors ${getOptionStyle(key)}`}>
                       <Checkbox
                         id={`${question.question_number}-${key}`}
                         checked={selectedAnswers.includes(key)}
                         onCheckedChange={(checked) => {
                           // console.log(`Checkbox changed: Q#${question.question_number}, Key: ${key}, Checked: ${!!checked}`);
                           onAnswerChange(question.question_number, key, !!checked);
                         }}
                         disabled={isDisabled}
                         aria-label={`Option ${key}`}
                         className="mt-1"
                       />
                       <Label
                         htmlFor={`${question.question_number}-${key}`}
                         className={`flex-1 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                       >
                         <span className="font-medium mr-2">{key}.</span>
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
                            // console.log(`RadioGroup changed: Q#${question.question_number}, Value: ${value}`);
                           onAnswerChange(question.question_number, value, true);
                        }
                    }}
                    disabled={isDisabled}
                    className="space-y-3"
                 >
                   {/* Use shuffledOptions here */}
                   {shuffledOptions.map(([key, value]) => (
                     <div key={key} className={`flex items-start space-x-3 p-3 rounded-md border transition-colors ${getOptionStyle(key)}`}>
                       <RadioGroupItem value={key} id={`${question.question_number}-${key}`} aria-label={`Option ${key}`} className="mt-1" />
                       <Label
                         htmlFor={`${question.question_number}-${key}`}
                         className={`flex-1 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                       >
                         <span className="font-medium mr-2">{key}.</span>
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
