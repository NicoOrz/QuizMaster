"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { BookOpenText, Timer } from 'lucide-react';
import { useQuiz } from '@/context/QuizContext';
import { useToast } from "@/hooks/use-toast";


export function QuizModeSelector() {
  const router = useRouter();
  const { questions } = useQuiz();
   const { toast } = useToast();

  const startPractice = () => {
     if (questions.length === 0) {
      toast({ variant: "destructive", title: "No Questions", description: "Please import a question bank first." });
      return;
    }
    router.push('/practice');
  };

  const startExam = () => {
     if (questions.length === 0) {
      toast({ variant: "destructive", title: "No Questions", description: "Please import a question bank first." });
      return;
    }
    // Navigate to exam config or directly to exam if config is simple/defaulted
    router.push('/exam/config');
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg rounded-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Choose Your Mode</CardTitle>
        <CardDescription>Select how you want to test your knowledge.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col space-y-4 p-6">
        <Button onClick={startPractice} size="lg" variant="secondary" disabled={questions.length === 0}>
          <BookOpenText className="mr-2 h-5 w-5" /> Practice Mode
        </Button>
        <Button onClick={startExam} size="lg" disabled={questions.length === 0}>
          <Timer className="mr-2 h-5 w-5" /> Exam Mode
        </Button>
         {questions.length === 0 && (
          <p className="text-center text-sm text-destructive">Please import questions before starting.</p>
        )}
      </CardContent>
      <CardFooter className="text-center text-sm text-muted-foreground">
        Practice mode allows you to go through all questions sequentially. Exam mode presents a random selection under timed conditions.
      </CardFooter>
    </Card>
  );
}
