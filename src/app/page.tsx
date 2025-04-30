"use client";

import { FileUpload } from '@/components/quiz/FileUpload';
import { QuizModeSelector } from '@/components/quiz/QuizModeSelector';
import { Button } from "@/components/ui/button";
import { useQuiz } from '@/context/QuizContext';
import { useRouter } from 'next/navigation';
import { History } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton


export default function Home() {
  const { questions, isLoading } = useQuiz(); // Get isLoading state
  const router = useRouter();

  const goToHistory = () => {
    router.push('/history');
  };

  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center space-y-8">
      <h1 className="text-4xl font-bold text-center mb-6">QuizMaster</h1>

      <FileUpload />

      <Separator className="my-8" />

      {isLoading ? (
        // Display Skeleton loaders while loading questions
        <div className="w-full max-w-md mx-auto space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-1/2 mx-auto" />
        </div>
      ) : (
        <>
          {questions.length > 0 && (
            <QuizModeSelector />
          )}

          <Button onClick={goToHistory} variant="outline">
            <History className="mr-2 h-4 w-4" /> View Exam History
          </Button>
        </>
      )}
    </div>
  );
}
