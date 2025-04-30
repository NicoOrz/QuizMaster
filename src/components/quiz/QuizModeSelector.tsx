
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { BookOpenText, Timer, Play, RotateCcw, Settings } from 'lucide-react'; // Added Settings
import { useQuiz } from '@/context/QuizContext';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function QuizModeSelector() {
  const router = useRouter();
  const { questions, practiceProgress, examProgress, clearPracticeProgress, clearExamProgress } = useQuiz();
  const { toast } = useToast();

  // Check if progress exists and has questions
  const hasPracticeProgress = !!practiceProgress && practiceProgress.questions.length > 0;
  const hasExamProgress = !!examProgress && examProgress.questions.length > 0;

  const configureNewPractice = () => {
    if (questions.length === 0) {
      toast({ variant: "destructive", title: "No Questions", description: "Please import a question bank first." });
      return;
    }
    // Navigate to the practice configuration page
    router.push('/practice/config');
  };

  const resumePractice = () => {
    if (!hasPracticeProgress) {
        toast({ variant: "destructive", title: "Error", description: "No valid practice progress found to resume." });
        clearPracticeProgress(); // Clear potentially invalid state
        return;
    }
     router.push('/practice'); // Go directly to practice page, it will load from context
  };

   const discardAndStartNewPractice = () => {
      clearPracticeProgress();
      router.push('/practice/config');
   };


  const startNewExam = () => {
     if (questions.length === 0) {
      toast({ variant: "destructive", title: "No Questions", description: "Please import a question bank first." });
      return;
    }
     // Go to config page, which will handle clearing any old exam progress if user starts new
    router.push('/exam/config');
  };

  const resumeExam = () => {
     if (!hasExamProgress) { // Use the validity check
        toast({ variant: "destructive", title: "Error", description: "No valid exam progress found to resume." });
        clearExamProgress(); // Clear potentially invalid state
        return;
     }
     // Go directly to take page, it will load from context
     router.push('/exam/take');
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg rounded-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Choose Your Mode</CardTitle>
        <CardDescription>Select how you want to test your knowledge.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col space-y-4 p-6">
        {/* Practice Mode */}
        <div className="flex flex-col space-y-2">
           <p className="text-center font-medium">Practice</p>
            {hasPracticeProgress ? (
                <div className="flex gap-2">
                    <Button onClick={resumePractice} size="lg" variant="secondary" className="flex-1">
                      <Play className="mr-2 h-5 w-5" /> Resume Practice
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="lg" variant="outline" title="Configure New Practice">
                                <RotateCcw className="h-5 w-5" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Start New Practice?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Starting a new practice session will discard your current progress and take you to the configuration screen. Are you sure?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={discardAndStartNewPractice}>Start New</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            ) : (
                 <Button onClick={configureNewPractice} size="lg" variant="secondary" disabled={questions.length === 0}>
                   <Settings className="mr-2 h-5 w-5" /> Configure Practice {/* Changed Icon */}
                 </Button>
            )}
        </div>

        {/* Exam Mode */}
         <div className="flex flex-col space-y-2">
             <p className="text-center font-medium">Exam</p>
             {hasExamProgress ? (
                 <div className="flex gap-2">
                    <Button onClick={resumeExam} size="lg" className="flex-1">
                       <Play className="mr-2 h-5 w-5" /> Resume Exam
                    </Button>
                     {/* Button to discard and go to config */}
                     <AlertDialog>
                         <AlertDialogTrigger asChild>
                             <Button size="lg" variant="outline" title="Configure New Exam">
                                <RotateCcw className="h-5 w-5" />
                             </Button>
                         </AlertDialogTrigger>
                         <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Start New Exam?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will discard your current exam progress and take you to the configuration screen. Are you sure?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                {/* Go to config page, which handles clearing */}
                                <AlertDialogAction onClick={startNewExam}>Start New</AlertDialogAction>
                            </AlertDialogFooter>
                         </AlertDialogContent>
                     </AlertDialog>
                 </div>
             ) : (
                 <Button onClick={startNewExam} size="lg" disabled={questions.length === 0}>
                   <Timer className="mr-2 h-5 w-5" /> Configure Exam
                 </Button>
             )}
        </div>

         {questions.length === 0 && (
          <p className="text-center text-sm text-destructive">Please import questions before starting.</p>
        )}
      </CardContent>
       <CardFooter className="flex flex-col items-center text-center text-sm text-muted-foreground space-y-1 pt-4">
           {hasPracticeProgress && <span className="text-blue-600 dark:text-blue-400 block w-full">Practice in progress...</span>}
           {hasExamProgress && <span className="text-blue-600 dark:text-blue-400 block w-full">Exam in progress...</span>}
           <span>Your progress is saved automatically.</span>
       </CardFooter>
    </Card>
  );
}
