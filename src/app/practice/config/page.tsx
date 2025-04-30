
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Slider } from "@/components/ui/slider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Play, Home, AlertTriangle, RotateCcw } from 'lucide-react';
import type { Question, PracticeProgress } from '@/types/quiz';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Helper to sort questions by question_number numerically
const sortQuestions = (questions: Question[]) => {
  return [...questions].sort((a, b) => a.question_number - b.question_number);
};

export default function PracticeConfigPage() {
  const { questions: allQuestions, practiceProgress, clearPracticeProgress, setPracticeProgress, isLoading } = useQuiz();
  const router = useRouter();
  const { toast } = useToast();

  // Sort questions initially and whenever allQuestions changes
   const sortedQuestions = useMemo(() => sortQuestions(allQuestions), [allQuestions]);
   const maxQuestions = sortedQuestions.length;

  // Safe initial states that don't rely on localStorage
  const [range, setRange] = useState<[number, number]>([1, Math.min(10, maxQuestions > 0 ? maxQuestions : 10)]); // Default range
  const [showResumeDialog, setShowResumeDialog] = useState(false); // Default to false
  const [isInitialized, setIsInitialized] = useState(false); // Track client-side initialization

  // Get min/max question numbers from the sorted list
   const minQuestionNumber = sortedQuestions[0]?.question_number ?? 1;
   const maxQuestionNumber = sortedQuestions[maxQuestions - 1]?.question_number ?? (maxQuestions > 0 ? maxQuestions : 1);

   // Memoize maps for performance
   const questionNumberMap = useMemo(() => {
       const map = new Map<number, number>(); // Map index to question_number
       sortedQuestions.forEach((q, index) => map.set(index + 1, q.question_number));
       return map;
   }, [sortedQuestions]);
   const questionIndexMap = useMemo(() => {
        const map = new Map<number, number>(); // Map question_number to index
        sortedQuestions.forEach((q, index) => map.set(q.question_number, index + 1));
        return map;
   }, [sortedQuestions]);


   // Client-side initialization effect
   useEffect(() => {
    // This effect runs only on the client after hydration
    if (isLoading || isInitialized) return; // Don't run if loading or already initialized

    const defaultStart = 1;
    // Calculate default end based on potentially updated maxQuestions
    const currentMaxQuestions = sortQuestions(allQuestions).length;
    const defaultEnd = Math.min(10, currentMaxQuestions > 0 ? currentMaxQuestions : 10);

    if (currentMaxQuestions > 0) {
        if (practiceProgress?.range) {
            // Re-calculate map inside effect if needed, though useMemo might be sufficient if `sortedQuestions` updates correctly
            const currentQuestionIndexMap = new Map<number, number>();
            sortQuestions(allQuestions).forEach((q, index) => currentQuestionIndexMap.set(q.question_number, index + 1));

            const savedStartIndex = currentQuestionIndexMap.get(practiceProgress.range.start) ?? defaultStart;
            const savedEndIndex = currentQuestionIndexMap.get(practiceProgress.range.end) ?? defaultEnd;
            // Ensure indices are within current bounds
            const validStartIndex = Math.max(1, Math.min(savedStartIndex, currentMaxQuestions));
            const validEndIndex = Math.max(validStartIndex, Math.min(savedEndIndex, currentMaxQuestions));
            setRange([validStartIndex, validEndIndex]);
            setShowResumeDialog(true);
        } else if (practiceProgress && !practiceProgress.range && practiceProgress.questions.length > 0) {
             // Re-calculate map inside effect
            const currentQuestionIndexMap = new Map<number, number>();
             sortQuestions(allQuestions).forEach((q, index) => currentQuestionIndexMap.set(q.question_number, index + 1));

            const savedQuestionNumbers = practiceProgress.questions.map(q => q.question_number).sort((a, b) => a - b);
            const startIndex = currentQuestionIndexMap.get(savedQuestionNumbers[0]) ?? defaultStart;
            const endIndex = currentQuestionIndexMap.get(savedQuestionNumbers[savedQuestionNumbers.length - 1]) ?? defaultEnd;
             // Ensure indices are within current bounds
            const validStartIndex = Math.max(1, Math.min(startIndex, currentMaxQuestions));
            const validEndIndex = Math.max(validStartIndex, Math.min(endIndex, currentMaxQuestions));

            setPracticeProgress(prev => prev ? { ...prev, range: { start: savedQuestionNumbers[0], end: savedQuestionNumbers[savedQuestionNumbers.length - 1] } } : null);
            setRange([validStartIndex, validEndIndex]);
            setShowResumeDialog(true);
        } else {
            // No progress, set default range based on actual maxQuestions
             const validDefaultEnd = Math.min(10, currentMaxQuestions);
             setRange([defaultStart, validDefaultEnd]);
             if (practiceProgress) { // Clear any potentially invalid progress found
                 clearPracticeProgress();
                 console.log("Cleared potentially invalid practice progress during init.");
             }
        }
    } else if (allQuestions.length === 0 && !isLoading) { // Check !isLoading here too
        toast({ variant: "destructive", title: "No Questions", description: "Please import a question bank first." });
        router.push('/');
    } else {
         // Case where maxQuestions is 0 but still loading or some other edge case
         setRange([defaultStart, defaultEnd]); // Set a fallback default
    }

    setIsInitialized(true); // Mark client-side initialization complete

   }, [isLoading, isInitialized, allQuestions, practiceProgress, setPracticeProgress, clearPracticeProgress, router, toast]); // Use allQuestions as dep


  const handleSliderChange = useCallback((value: number[]) => {
    // Ensure start is always less than or equal to end
    const newStart = Math.min(value[0], value[1]);
    const newEnd = Math.max(value[0], value[1]);
    setRange([newStart, newEnd]);
  }, []);

  // Handles input changes for start/end numbers
   const handleInputChange = useCallback((type: 'start' | 'end', event: React.ChangeEvent<HTMLInputElement>) => {
     let value = parseInt(event.target.value, 10);
     const currentMax = sortedQuestions.length; // Use current length

     if (isNaN(value)) {
       value = type === 'start' ? 1 : range[0]; // Default smartly
     }

     // Clamp value to bounds [1, currentMax]
     value = Math.max(1, Math.min(value, currentMax));

     let newStart = range[0];
     let newEnd = range[1];

     if (type === 'start') {
       newStart = value;
       if (newStart > newEnd) {
           newEnd = newStart; // Ensure end is not less than start
       }
     } else { // type === 'end'
       newEnd = value;
       if (newEnd < newStart) {
           newStart = newEnd; // Ensure start is not more than end
       }
     }
     setRange([newStart, newEnd]);
   }, [range, sortedQuestions.length]); // Depend on current length

  const startNewPractice = useCallback(() => {
    const [startIndex, endIndex] = range;
    const currentMax = sortedQuestions.length; // Use current length

    if (startIndex < 1 || endIndex > currentMax || startIndex > endIndex) {
      toast({
        variant: "destructive",
        title: "Invalid Range",
        description: `Selected range (${startIndex}-${endIndex}) is invalid. Max questions: ${currentMax}.`,
      });
      return;
    }

    // Ensure maps are up-to-date if sortedQuestions could change
    const currentQuestionNumberMap = new Map<number, number>();
    sortedQuestions.forEach((q, index) => currentQuestionNumberMap.set(index + 1, q.question_number));

    // Get the actual question numbers for the selected range
    const startQuestionNum = currentQuestionNumberMap.get(startIndex) ?? (sortedQuestions[startIndex - 1]?.question_number ?? 0);
    const endQuestionNum = currentQuestionNumberMap.get(endIndex) ?? (sortedQuestions[endIndex - 1]?.question_number ?? 0);

    // Filter sorted questions based on the *index* range
    const selectedQuestions = sortedQuestions.slice(startIndex - 1, endIndex);

    if (selectedQuestions.length === 0) {
         toast({ variant: "destructive", title: "No Questions Selected", description: "The selected range resulted in zero questions." });
         return;
    }

    // Clear previous progress and set new progress
    clearPracticeProgress();
    const newProgress: PracticeProgress = {
      questions: selectedQuestions,
      currentIndex: 0,
      selections: {},
      range: { start: startQuestionNum, end: endQuestionNum } // Store the actual question numbers
    };
    setPracticeProgress(newProgress);
    console.log("Starting new practice with range:", newProgress.range, "Questions:", selectedQuestions.map(q=>q.question_number));

    router.push(`/practice`); // Navigate to the practice page
  }, [range, sortedQuestions, clearPracticeProgress, setPracticeProgress, toast, router]);


  const resumePractice = useCallback(() => {
    if (practiceProgress && practiceProgress.questions.length > 0) {
        router.push(`/practice`); // Go to practice page, it will load from context
        setShowResumeDialog(false);
    } else {
        toast({ variant: "destructive", title: "Resume Failed", description: "Could not find valid practice progress to resume." });
        clearPracticeProgress(); // Clear invalid state
        setShowResumeDialog(false);
        // Reset range to default if needed
        const currentMax = sortedQuestions.length;
        setRange([1, Math.min(10, currentMax > 0 ? currentMax : 10)]);
    }
  }, [practiceProgress, router, toast, clearPracticeProgress, sortedQuestions.length]);


  const discardAndStartNew = useCallback(() => {
     clearPracticeProgress();
     setShowResumeDialog(false);
     // Reset range to default
     const currentMax = sortedQuestions.length;
     setRange([1, Math.min(10, currentMax > 0 ? currentMax : 10)]);
     toast({ title: "Progress Discarded", description: "Previous practice progress cleared. Configure your new practice session." });
   }, [clearPracticeProgress, sortedQuestions.length, toast]);

   const goToHome = useCallback(() => {
     router.push('/');
   }, [router]);

   // --- Render Logic ---

   // Display Skeleton or loading message until client-side initialization is complete
  if (!isInitialized || isLoading) {
     return (
       <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center space-y-6">
         <Skeleton className="h-10 w-32 absolute top-4 left-4" />
         <Skeleton className="h-8 w-64" /> {/* Title */}
         <Skeleton className="w-full max-w-lg h-80" /> {/* Card */}
       </div>
     );
  }

  // After initialization, check if there are questions
  if (maxQuestions === 0) {
    return (
        <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center text-center">
             <Button onClick={goToHome} variant="outline" className="absolute top-4 left-4">
                  <Home className="mr-2 h-4 w-4" /> Back to Home
             </Button>
             <h1 className="text-2xl font-bold mb-4">No Questions Loaded</h1>
             <p className="text-muted-foreground">Please import a question bank before configuring practice.</p>
        </div>
    );
  }

  // Calculate display values based on current state
  const numSelectedQuestions = Math.max(0, range[1] - range[0] + 1);
  const startDisplayNum = questionNumberMap.get(range[0]) ?? (sortedQuestions[range[0]-1]?.question_number ?? '?');
  const endDisplayNum = questionNumberMap.get(range[1]) ?? (sortedQuestions[range[1]-1]?.question_number ?? '?');


  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
       {/* Resume Dialog - Render based on client-side state */}
        <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center"><AlertTriangle className="mr-2 text-yellow-500"/> Practice Session Found</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have a practice session in progress
                        {practiceProgress?.range ? ` (questions ${practiceProgress.range.start} - ${practiceProgress.range.end})` : ''}
                        {' '}with {practiceProgress?.questions?.length ?? '?'} questions.
                        Would you like to resume it or start a new one?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button variant="outline" onClick={discardAndStartNew}><RotateCcw className="mr-2 h-4 w-4" /> Discard & Start New</Button>
                    <AlertDialogAction onClick={resumePractice}><Play className="mr-2 h-4 w-4" /> Resume Practice</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

       <Button onClick={goToHome} variant="outline" className="absolute top-4 left-4">
          <Home className="mr-2 h-4 w-4" /> Back to Home
       </Button>
      <Card className="w-full max-w-lg shadow-lg rounded-lg"> {/* Increased max-width */}
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Configure Practice Session</CardTitle>
          <CardDescription>Select the range of questions (by order) you want to practice.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-2">
            <Label htmlFor="range-slider" className="text-center block">
                Question Range: {range[0]} - {range[1]} ({numSelectedQuestions} questions)
            </Label>
             <p className="text-sm text-muted-foreground text-center">
                (Covers question numbers: {startDisplayNum} - {endDisplayNum})
             </p>
            <Slider
              id="range-slider"
              min={1}
              max={maxQuestions}
              step={1}
              value={range}
              onValueChange={handleSliderChange}
              className="flex-grow my-4"
              disabled={maxQuestions <= 1 || showResumeDialog}
              minStepsBetweenThumbs={0} // Allow thumbs to be at the same position
            />
            <div className="flex justify-between items-center space-x-4">
              <div className='flex-1'>
                <Label htmlFor="start-input" className="text-sm">Start Index</Label>
                <Input
                  id="start-input"
                  type="number"
                  min="1"
                  max={maxQuestions}
                  value={range[0]}
                  onChange={(e) => handleInputChange('start', e)}
                  className="w-full"
                  disabled={maxQuestions <= 1 || showResumeDialog}
                />
              </div>
              <div className='flex-1'>
                <Label htmlFor="end-input" className="text-sm">End Index</Label>
                <Input
                  id="end-input"
                  type="number"
                  min="1"
                  max={maxQuestions} // Use maxQuestions here for the input max attribute
                  value={range[1]}
                  onChange={(e) => handleInputChange('end', e)}
                  className="w-full"
                  disabled={maxQuestions <= 1 || showResumeDialog}
                />
              </div>
            </div>
          </div>
           <p className="text-sm text-muted-foreground text-center">
              Total available questions: {maxQuestions} (Numbers {minQuestionNumber} to {maxQuestionNumber})
            </p>
        </CardContent>
        <CardFooter>
          <Button onClick={startNewPractice} className="w-full" size="lg" disabled={maxQuestions === 0 || showResumeDialog || numSelectedQuestions === 0}>
            <Play className="mr-2 h-5 w-5" /> Start New Practice Session
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

