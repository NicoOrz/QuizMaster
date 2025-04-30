
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Slider } from "@/components/ui/slider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Play, Home, AlertTriangle, RotateCcw } from 'lucide-react'; // Added AlertTriangle, RotateCcw
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

export default function ExamConfigPage() {
  const { questions, examProgress, clearExamProgress, setExamProgress, isLoading, isInitialized: isContextInitialized } = useQuiz();
  const router = useRouter();
  const { toast } = useToast();

  // State initialization - Use defaults, useEffect will handle loading saved/context state
  const [numQuestions, setNumQuestions] = useState<number>(10); // Default to 10 initially
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [isComponentInitialized, setIsComponentInitialized] = useState(false); // Track component mount
  const maxQuestions = questions.length;

  // Effect for Client-Side Initialization and Resume Dialog Logic
  useEffect(() => {
     // Wait for context and ensure this runs only once on the client
     if (isLoading || !isContextInitialized || isComponentInitialized) {
         return;
     }

     const currentMaxQuestions = questions.length; // Use current length from context

     if (currentMaxQuestions === 0) {
         // Only show toast if not loading and no questions
         if (!isLoading) {
             toast({ variant: "destructive", title: "No Questions", description: "Please import a question bank before configuring an exam." });
             router.push('/');
         }
         setIsComponentInitialized(true); // Mark as initialized even if redirecting
         return; // Stop further processing in this effect run
     }

     // Check for existing progress
     if (examProgress && Array.isArray(examProgress.questions) && examProgress.questions.length > 0) {
         console.log("Existing exam progress found:", examProgress);
         // Set numQuestions based on the saved progress for display consistency, but it's disabled anyway
         setNumQuestions(examProgress.configNumQuestions ?? examProgress.questions.length);
         setShowResumeDialog(true); // Show the dialog
     } else {
         // No valid progress, set default number of questions
         const defaultNum = Math.min(10, currentMaxQuestions);
         setNumQuestions(defaultNum);
         // Ensure any potentially invalid progress is cleared if found without valid questions
         if (examProgress) {
             clearExamProgress();
             console.log("Cleared potentially invalid exam progress during init.");
         }
     }

     setIsComponentInitialized(true); // Mark component as initialized

  }, [isLoading, isContextInitialized, isComponentInitialized, questions, examProgress, clearExamProgress, router, toast]);


  const handleSliderChange = (value: number[]) => {
    setNumQuestions(value[0]);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseInt(event.target.value, 10);
    if (isNaN(value)) {
      value = 1; // Default to 1 if input is not a number
    }
    // Clamp the value between 1 and maxQuestions
    value = Math.max(1, Math.min(value, maxQuestions));
    setNumQuestions(value);
  };

  const startNewExam = () => {
    if (numQuestions < 1 || numQuestions > maxQuestions) {
       toast({
          variant: "destructive",
          title: "Invalid Number",
          description: `Number of questions must be between 1 and ${maxQuestions}.`,
        });
      return;
    }
    // IMPORTANT: Explicitly clear any existing progress *before* navigating
    console.log("Clearing exam progress before starting new exam.");
    clearExamProgress();
    // Pass the number of questions via query params to signal a new exam start
    router.push(`/exam/take?numQuestions=${numQuestions}`);
  };

  const resumeExam = () => {
    if (examProgress && examProgress.questions.length > 0) {
        // Don't modify startTime here, let the take page handle it if needed
        // setExamProgress(prev => prev ? {...prev, startTime: Date.now()} : null);
        console.log("Resuming exam, navigating to take page without query params.");
        router.push(`/exam/take`); // Go to take page without query params (it will use context)
        setShowResumeDialog(false);
    } else {
        toast({ variant: "destructive", title: "Resume Failed", description: "Could not find valid exam progress to resume." });
        clearExamProgress(); // Clear invalid state
        setShowResumeDialog(false);
        // Reset numQuestions to default if needed
        setNumQuestions(Math.min(10, maxQuestions));
    }
  };

   const discardAndStartNew = () => {
     console.log("Discarding existing exam progress.");
     clearExamProgress();
     setShowResumeDialog(false);
     // Reset numQuestions to default after discarding
     const defaultNum = Math.min(10, maxQuestions);
     setNumQuestions(defaultNum);
     toast({ title: "Progress Discarded", description: "Previous exam progress cleared. Configure your new exam." });
   };


   const goToHome = () => {
    // Decide whether to clear progress when going home from config
    // clearExamProgress(); // Uncomment if progress should be cleared here
    router.push('/');
   };

  // --- Render Logic ---

  // Loading State: Show skeleton while context/component initializes
  if (!isComponentInitialized || isLoading) {
     return (
       <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center space-y-6">
         <Skeleton className="h-10 w-32 absolute top-4 left-4" />
         <Skeleton className="h-8 w-64 mt-12" /> {/* Title */}
         <Skeleton className="w-full max-w-md h-80" /> {/* Card */}
       </div>
     );
  }


  // If initialized but no questions available (e.g., after import error or empty bank)
  if (maxQuestions === 0) {
     return (
        <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center text-center">
            <Button onClick={goToHome} variant="outline" className="absolute top-4 left-4">
                <Home className="mr-2 h-4 w-4" /> Back to Home
            </Button>
            <Card className="w-full max-w-md shadow-lg rounded-lg">
                 <CardHeader>
                      <CardTitle className="text-2xl font-bold">No Questions Available</CardTitle>
                      <CardDescription>Please import a valid question bank JSON file first.</CardDescription>
                 </CardHeader>
                 <CardContent>
                     <Button onClick={() => router.push('/')} className="w-full">
                         Go to Import Page
                     </Button>
                 </CardContent>
            </Card>
        </div>
     );
  }


  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
       {/* Resume Dialog */}
        <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
            {/* No Trigger needed, controlled by state */}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center"><AlertTriangle className="mr-2 text-yellow-500"/> Incomplete Exam Found</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have an exam in progress with {examProgress?.questions.length ?? '?'} questions
                        (configured for {examProgress?.configNumQuestions ?? '?'}).
                        Would you like to resume it or discard it and start a new one?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button variant="outline" onClick={discardAndStartNew}><RotateCcw className="mr-2 h-4 w-4" /> Discard & Start New</Button>
                    <AlertDialogAction onClick={resumeExam}><Play className="mr-2 h-4 w-4" /> Resume Exam</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>


       <Button onClick={goToHome} variant="outline" className="absolute top-4 left-4">
          <Home className="mr-2 h-4 w-4" /> Back to Home
       </Button>
      <Card className="w-full max-w-md shadow-lg rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Configure New Exam</CardTitle>
          <CardDescription>Select the number of questions for your new exam.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-2">
             {/* Display label and controls only if NOT showing the resume dialog */}
             {!showResumeDialog && (
                <>
                    <Label htmlFor="num-questions-input" className="text-center block">Number of Questions: {numQuestions}</Label>
                    <div className="flex items-center space-x-4 pt-2">
                         <Slider
                             id="num-questions-slider"
                             min={1}
                             max={maxQuestions}
                             step={1}
                             value={[numQuestions]}
                             onValueChange={handleSliderChange}
                             className="flex-grow"
                             disabled={maxQuestions <= 1} // Only disable slider if max is 1
                         />
                          <Input
                             id="num-questions-input"
                             type="number"
                             min="1"
                             max={maxQuestions}
                             value={numQuestions}
                             onChange={handleInputChange}
                             className="w-20"
                             disabled={maxQuestions <= 1} // Only disable input if max is 1
                         />
                    </div>
                 </>
             )}
              {/* Show a message if resume dialog is active */}
              {showResumeDialog && (
                 <p className="text-center text-muted-foreground p-4 border rounded-md">
                      An exam is currently in progress. Please choose to resume or discard it.
                 </p>
              )}
          </div>
           <p className="text-sm text-muted-foreground text-center">
              Available questions: {maxQuestions}
            </p>
        </CardContent>
        <CardFooter>
          {/* Disable Start New Exam button if resume dialog is shown */}
          <Button onClick={startNewExam} className="w-full" size="lg" disabled={maxQuestions === 0 || showResumeDialog || numQuestions < 1}>
            <Play className="mr-2 h-5 w-5" /> Start New Exam
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
