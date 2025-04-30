
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

export default function ExamConfigPage() {
  const { questions, examProgress, clearExamProgress, setExamProgress } = useQuiz();
  const router = useRouter();
  const { toast } = useToast();
  const [numQuestions, setNumQuestions] = useState<number>(examProgress?.configNumQuestions ?? 10); // Default to saved progress or 10
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const maxQuestions = questions.length;

  useEffect(() => {
    if (questions.length === 0) {
      toast({ variant: "destructive", title: "No Questions", description: "Please import a question bank before configuring an exam." });
      router.push('/');
    } else {
        // If there's existing progress, show the resume dialog
        if (examProgress && examProgress.questions.length > 0) {
             console.log("Existing exam progress found:", examProgress);
            setShowResumeDialog(true);
        } else {
            // No progress or invalid progress, set default/max questions
            const defaultNum = Math.min(10, maxQuestions);
            setNumQuestions(defaultNum);
             // Clear any potentially invalid progress
             if (examProgress) {
                 clearExamProgress();
                 console.log("Cleared potentially invalid exam progress.");
             }
        }
    }
  }, [questions, router, toast, maxQuestions, examProgress, clearExamProgress]); // Add examProgress and clearExamProgress


  const handleSliderChange = (value: number[]) => {
    setNumQuestions(value[0]);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseInt(event.target.value, 10);
    if (isNaN(value)) {
      value = 1;
    }
    setNumQuestions(Math.max(1, Math.min(value, maxQuestions)));
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
    // Clear any existing progress before starting a new one
    clearExamProgress();
    // Pass the number of questions via query params
    router.push(`/exam/take?numQuestions=${numQuestions}`);
  };

  const resumeExam = () => {
    if (examProgress && examProgress.questions.length > 0) {
        // Make sure start time reflects resumption
        setExamProgress(prev => prev ? {...prev, startTime: Date.now()} : null);
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
     clearExamProgress();
     setShowResumeDialog(false);
     // Now the user can configure and start a new exam
     toast({ title: "Progress Discarded", description: "Previous exam progress cleared. Configure your new exam." });
   };


   const goToHome = () => {
    // Decide whether to clear progress when going home from config
    // clearExamProgress(); // Uncomment if progress should be cleared here
    router.push('/');
   };


  if (questions.length === 0) {
     return <div className="container mx-auto p-4 text-center">Loading or redirecting...</div>;
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
                        You have an exam in progress with {examProgress?.questions.length ?? '?'} questions. Would you like to resume it or start a new one?
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
            <Label htmlFor="num-questions-input" className="text-center block">Number of Questions: {numQuestions}</Label>
            <div className="flex items-center space-x-4">
                <Slider
                    id="num-questions-slider"
                    min={1}
                    max={maxQuestions}
                    step={1}
                    value={[numQuestions]}
                    onValueChange={handleSliderChange}
                    className="flex-grow"
                    disabled={maxQuestions <= 1 || showResumeDialog} // Disable if resume dialog is shown
                />
                 <Input
                    id="num-questions-input"
                    type="number"
                    min="1"
                    max={maxQuestions}
                    value={numQuestions}
                    onChange={handleInputChange}
                    className="w-20"
                     disabled={maxQuestions <= 1 || showResumeDialog} // Disable if resume dialog is shown
                />
            </div>

          </div>
           <p className="text-sm text-muted-foreground text-center">
              Available questions: {maxQuestions}
            </p>
        </CardContent>
        <CardFooter>
          <Button onClick={startNewExam} className="w-full" size="lg" disabled={maxQuestions === 0 || showResumeDialog}>
            <Play className="mr-2 h-5 w-5" /> Start New Exam
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
