
"use client";

import { FileUpload } from '@/components/quiz/FileUpload';
import { QuizModeSelector } from '@/components/quiz/QuizModeSelector';
import { Button } from "@/components/ui/button";
import { useQuiz } from '@/context/QuizContext';
import { useRouter } from 'next/navigation';
import { History, BookOpenCheck } from 'lucide-react'; // Added BookOpenCheck
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { useEffect, useState } from 'react'; // Import useEffect and useState


export default function Home() {
  // isInitialized indicates if localStorage data has been loaded
  const { questions, isLoading, isInitialized } = useQuiz();
  const router = useRouter();
  const [clientLoaded, setClientLoaded] = useState(false);

  // Track when the component has mounted on the client
  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const goToExamHistory = () => {
    router.push('/history'); // Exam history remains at /history
  };

  const goToPracticeHistory = () => {
    router.push('/history/practice'); // New route for practice history
  };


  // Determine if we should show loading skeletons
  // Show skeletons if:
  // 1. Client hasn't loaded yet OR
  // 2. Client has loaded, but context isn't initialized OR
  // 3. Context is initialized, but still loading data (e.g., from file upload)
  const showLoadingSkeletons = !clientLoaded || !isInitialized || isLoading;

  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center space-y-8">
      <h1 className="text-4xl font-bold text-center mb-6">QuizMaster</h1>

      {/* Only render FileUpload once client is loaded */}
      {clientLoaded && <FileUpload />}

      <Separator className="my-8" />

      {showLoadingSkeletons ? (
        // Display Skeleton loaders while loading questions or initializing
        <div className="w-full max-w-md mx-auto space-y-4">
          <Skeleton className="h-10 w-full" /> {/* Placeholder for Mode Selector */}
          <div className="flex justify-center space-x-4"> {/* Placeholder for History Buttons */}
             <Skeleton className="h-10 w-1/3" />
             <Skeleton className="h-10 w-1/3" />
          </div>
        </div>
      ) : (
        <>
          {/* Render QuizModeSelector only if initialized and questions exist */}
          {questions.length > 0 && <QuizModeSelector />}

          {/* Render History Buttons only if initialized */}
           <div className="flex space-x-4">
              <Button onClick={goToExamHistory} variant="outline">
                <History className="mr-2 h-4 w-4" /> View Exam History
              </Button>
              <Button onClick={goToPracticeHistory} variant="outline">
                 <BookOpenCheck className="mr-2 h-4 w-4" /> View Practice History
              </Button>
           </div>
        </>
      )}
    </div>
  );
}
