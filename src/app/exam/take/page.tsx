
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import type { Question, UserAnswer, ExamRecord, ExamProgress } from '@/types/quiz';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle, Home, List, LogOut } from 'lucide-react'; // Added LogOut for Exit
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { QuizOverview } from '@/components/quiz/QuizOverview';
import { saveExamRecord } from '@/services/firestoreService';
import { useToast } from "@/hooks/use-toast";
import { shuffleArray } from '@/lib/utils'; // Make sure shuffleArray is imported
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

export default function ExamTakePage({searchParams}: {searchParams: { numQuestions?: string }}) { // Added type for searchParams
  const { questions: allQuestions, addExamRecord, examProgress, setExamProgress, clearExamProgress, isLoading: isContextLoading, isInitialized: isContextInitialized } = useQuiz();
  const router = useRouter();
  const { toast } = useToast();
  const requestedNumQuestionsParam = searchParams?.numQuestions; // Use optional chaining

  // --- State Initialization ---
  // Initialize with empty/default values, setup will happen in useEffect
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, UserAnswer>>({});
  const [examStartTime, setExamStartTime] = useState<number>(Date.now());
  const [configNumQuestions, setConfigNumQuestions] = useState<number>(0);

  // Track if setup has run *in this component instance* to prevent duplicate setup
  const [isLocallyInitialized, setIsLocallyInitialized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);


  // --- Initialization & Validation Effect ---
  useEffect(() => {
      // Wait until context is ready and local init hasn't run
    if (isContextLoading || !isContextInitialized || isLocallyInitialized) {
         return;
    }

     console.log("ExamTakePage: Context initialized, attempting to load or start exam.");
     console.log("ExamTakePage: Existing examProgress:", examProgress);
     console.log("ExamTakePage: Requested numQuestions:", requestedNumQuestionsParam);

    // Check if we should RESUME an exam
    if (examProgress && !requestedNumQuestionsParam) {
      const { questions, currentIndex, answers, startTime, configNumQuestions: savedConfigNum } = examProgress;
       // Basic validation of progress structure
       if (Array.isArray(questions) && questions.length > 0 && typeof currentIndex === 'number' && typeof answers === 'object' && typeof startTime === 'number') {
            console.log(`ExamTakePage: Resuming exam with ${questions.length} questions at index ${currentIndex}.`);
            setExamQuestions(questions);
            setCurrentQuestionIndex(currentIndex);
            setUserAnswers(answers);
            setExamStartTime(startTime);
            setConfigNumQuestions(savedConfigNum ?? questions.length); // Fallback if configNumQuestions missing
            setIsLocallyInitialized(true); // Mark local initialization complete
       } else {
            // Invalid progress structure found
            console.warn("ExamTakePage: Invalid exam progress structure found. Clearing and redirecting.");
            toast({ title: "Invalid Progress", description: "Clearing invalid session data and returning to configuration.", variant: "destructive" });
            clearExamProgress();
            router.replace('/exam/config'); // Use replace to prevent back navigation to broken state
       }
    }
    // Check if we should START a NEW exam (explicitly requested via query param)
    else if (requestedNumQuestionsParam && allQuestions.length > 0) {
         console.log("ExamTakePage: Starting new exam based on query parameter.");
        const requestedNum = parseInt(requestedNumQuestionsParam, 10);
        if (isNaN(requestedNum) || requestedNum <= 0) {
            console.error("ExamTakePage: Invalid number of questions requested:", requestedNumQuestionsParam);
            toast({ title: "Exam Configuration Error", description: "Invalid number of questions requested. Redirecting.", variant: "destructive" });
            router.replace('/exam/config');
            return; // Exit effect
        }

        const numToTake = Math.min(requestedNum, allQuestions.length);
        if (numToTake === 0) {
            console.warn("ExamTakePage: Cannot start exam with zero questions.");
            toast({ title: "No Questions Available", description: "Cannot start exam with zero questions.", variant: "destructive" });
             router.replace('/'); // Redirect home if no questions
             return;
        }

        // Clear any old progress before starting new
        // Note: Config page might have already done this, but ensures clean state here
        if (examProgress) {
            console.log("ExamTakePage: Clearing existing exam progress before starting new one.");
            clearExamProgress();
        }

        const shuffled = shuffleArray(allQuestions);
        const selectedQuestions = shuffled.slice(0, numToTake);
        const startTime = Date.now();
        const initialAnswers: Record<number, UserAnswer> = {};
         selectedQuestions.forEach(q => {
           initialAnswers[q.question_number] = { question_number: q.question_number, selected_answers: [] };
         });

        console.log(`ExamTakePage: Initializing new exam with ${numToTake} questions.`);
        setExamQuestions(selectedQuestions);
        setCurrentQuestionIndex(0);
        setUserAnswers(initialAnswers);
        setExamStartTime(startTime);
        setConfigNumQuestions(numToTake); // Store the actual number taken
        setIsLocallyInitialized(true); // Mark local initialization complete

        // Save initial state to context/localStorage immediately
         setExamProgress({
            questions: selectedQuestions,
            currentIndex: 0,
            answers: initialAnswers,
            startTime: startTime,
            configNumQuestions: numToTake,
         });
         console.log("ExamTakePage: New exam progress saved to context.");

    }
     // If no query param, no existing progress, and no questions loaded yet (but context initialized)
     else if (!requestedNumQuestionsParam && !examProgress && allQuestions.length === 0 && isContextInitialized && !isContextLoading) {
         console.warn("ExamTakePage: No questions loaded and no progress. Redirecting to import.");
        toast({ title: "No Questions Loaded", description: "Please import a question bank first.", variant: "destructive" });
        router.replace('/');
     }
     // If no query param and no existing progress, but questions ARE loaded -> redirect to config
     else if (!requestedNumQuestionsParam && !examProgress && allQuestions.length > 0) {
         console.log("ExamTakePage: Questions loaded, but no specific exam requested/resumed. Redirecting to config.");
         router.replace('/exam/config');
     }
     // Catch-all for unexpected states after initialization attempt
     else if (isLocallyInitialized && examQuestions.length === 0) {
         // This shouldn't happen if logic above is correct, but as a safeguard
         console.error("ExamTakePage: State Error - Locally initialized but no exam questions set. Redirecting.");
         toast({ title: "Exam State Error", description: "Inconsistent exam state detected. Returning to configuration.", variant: "destructive" });
         clearExamProgress(); // Clear potentially inconsistent state
         router.replace('/exam/config');
     }

  }, [
      allQuestions,
      requestedNumQuestionsParam,
      router,
      toast,
      examProgress,
      setExamProgress,
      clearExamProgress,
      isContextLoading,
      isContextInitialized,
      isLocallyInitialized // Depend on local init state
  ]);


   // --- Effect to Save Progress ---
   useEffect(() => {
     // Only save progress if the exam is locally initialized and has questions
     if (isLocallyInitialized && examQuestions.length > 0) {
         // Check if examProgress is actually defined before trying to update
         if (examProgress) {
             setExamProgress(prev => {
                // Ensure prev is not null/undefined before spreading
                 if (!prev) {
                     console.warn("ExamTakePage: Attempted to save progress, but previous progress state was null. Re-initializing.");
                     // This might indicate a race condition or error, re-save the full current state
                     return {
                         questions: examQuestions,
                         startTime: examStartTime,
                         configNumQuestions: configNumQuestions,
                         currentIndex: currentQuestionIndex,
                         answers: userAnswers,
                     };
                 }

                 const newState: ExamProgress = {
                     ...prev, // Keep potentially other fields from prev if any
                     questions: examQuestions, // Always save current questions
                     startTime: examStartTime, // Always save current start time
                     configNumQuestions: configNumQuestions, // Always save current config
                     currentIndex: currentQuestionIndex,
                     answers: userAnswers,
                 };

                 // Simple comparison to avoid unnecessary updates if nothing changed
                 if (prev.currentIndex !== newState.currentIndex || JSON.stringify(prev.answers) !== JSON.stringify(newState.answers)) {
                    // console.log("ExamTakePage: Saving updated exam progress to context.");
                    return newState;
                 }
                 // console.log("ExamTakePage: Skipping progress save, no change detected.");
                 return prev; // No change needed
             });
         } else {
             // If examProgress is null, save the initial state again (should have happened in init effect, but safeguard)
              console.warn("ExamTakePage: examProgress was null during save attempt. Saving current state.");
              setExamProgress({
                  questions: examQuestions,
                  startTime: examStartTime,
                  configNumQuestions: configNumQuestions,
                  currentIndex: currentQuestionIndex,
                  answers: userAnswers,
              });
         }
     }
   }, [
       currentQuestionIndex,
       userAnswers,
       setExamProgress,
       isLocallyInitialized,
       examQuestions, // Include as dependency
       examStartTime, // Include as dependency
       configNumQuestions, // Include as dependency
       examProgress // Include examProgress to react to it becoming available/null
   ]);


  // --- Event Handlers ---
  const handleAnswerChange = useCallback((questionNumber: number, answerKey: string, checked: boolean) => {
    setUserAnswers(prev => {
      const currentAnswer = prev[questionNumber] || { question_number: questionNumber, selected_answers: [] };
      const question = examQuestions.find(q => q.question_number === questionNumber);
      if (!question) return prev;

      const isMultipleChoice = question.correct_answer.length > 1;
      let newSelectedAnswers: string[];

      if (isMultipleChoice) {
        if (checked) {
          newSelectedAnswers = [...currentAnswer.selected_answers, answerKey];
        } else {
          newSelectedAnswers = currentAnswer.selected_answers.filter(ans => ans !== answerKey);
        }
      } else {
        // For RadioGroup, replace the selection
        newSelectedAnswers = [answerKey];
      }
      return {
        ...prev,
        [questionNumber]: { ...currentAnswer, selected_answers: newSelectedAnswers.sort() }
      };
    });
  }, [examQuestions]); // Only depends on the loaded exam questions

  const goToNextQuestion = useCallback(() => {
    // Use the state directly, no need for functional update if dependencies are correct
    if (currentQuestionIndex < examQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }, [currentQuestionIndex, examQuestions.length]);

  const goToPreviousQuestion = useCallback(() => {
     // Use the state directly
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex]);

  const goToHome = useCallback(() => {
    // Decide if progress should be cleared when manually going home
    // Currently progress persists unless submitted or explicitly cleared
    router.push('/');
  }, [router]);

  const navigateToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < examQuestions.length) {
      setCurrentQuestionIndex(index);
      setIsSheetOpen(false);
    }
  }, [examQuestions.length]);

  const handleSubmitExam = useCallback(async () => {
     console.log("ExamTakePage: [handleSubmitExam] Called.");
     if (isSubmitting || !isLocallyInitialized || examQuestions.length === 0) {
         console.warn("ExamTakePage: [handleSubmitExam] Submission prevented. Conditions:", { isSubmitting, isLocallyInitialized, hasQuestions: examQuestions.length > 0 });
         return;
     }
     setIsSubmitting(true);
     toast({ title: "Submitting Exam...", description: "Calculating your results." });
     console.log("ExamTakePage: [handleSubmitExam] Starting submission process...");

     try {
         let correctCount = 0;
         const incorrectQuestionsDetail = [];

         console.log("ExamTakePage: [handleSubmitExam] Calculating score...");
         for (const question of examQuestions) {
           const userAnswer = userAnswers[question.question_number];
           const selected = userAnswer?.selected_answers || [];
           const correct = [...question.correct_answer].sort();
           const sortedSelected = [...selected].sort();
           const isCorrect = sortedSelected.length === correct.length &&
                             sortedSelected.every((value, index) => value === correct[index]);

           if (isCorrect) {
             correctCount++;
           } else {
             incorrectQuestionsDetail.push({
               question_number: question.question_number,
               question_text: question.question_text,
               options: question.options,
               user_answer: sortedSelected,
               correct_answer: correct,
               explanation: question.explanation,
               image_url: question.image_url,
             });
           }
         }
         console.log(`ExamTakePage: [handleSubmitExam] Correct count: ${correctCount}`);

         const score = examQuestions.length > 0 ? (correctCount / examQuestions.length) * 100 : 0;
         const examEndTime = Date.now();
         // Ensure examStartTime is valid before calculating duration
         const duration = examStartTime && examStartTime > 0 ? Math.round((examEndTime - examStartTime) / 1000) : 0; // Duration in seconds
         console.log(`ExamTakePage: [handleSubmitExam] Score calculated: ${score.toFixed(2)}%, Duration: ${duration}s`);

         const recordData = {
           userId: 'anonymous', // TODO: Replace with actual user ID if authentication is added
           score: parseFloat(score.toFixed(2)),
           totalQuestions: examQuestions.length,
           correctCount: correctCount,
           incorrectQuestions: incorrectQuestionsDetail,
           duration: duration,
           // timestamp is handled by Firestore or context.addExamRecord
         };

         console.log("ExamTakePage: [handleSubmitExam] Prepared record data:", recordData);
         console.log("ExamTakePage: [handleSubmitExam] Saving exam record to Firestore...");
         const docId = await saveExamRecord(recordData);
         console.log(`ExamTakePage: [handleSubmitExam] Firestore save successful. Document ID: ${docId}`);

         const finalTimestamp = Date.now(); // Use final submission time for local record consistency
         const fullRecord: ExamRecord = {
           ...recordData,
           id: docId,
           timestamp: finalTimestamp,
         };
         console.log("ExamTakePage: [handleSubmitExam] Adding exam record to context history:", fullRecord);
         addExamRecord(fullRecord); // This should also clear examProgress via context
         console.log("ExamTakePage: [handleSubmitExam] Context updated.");

         toast({ title: "Submission Successful!", description: `Score: ${score.toFixed(1)}%`, variant: "default" });
         console.log("ExamTakePage: [handleSubmitExam] Navigating to results page...");
         router.push(`/exam/results?recordId=${docId}`);

     } catch (error) {
         console.error("ExamTakePage: [handleSubmitExam] Failed to save exam record during submission:", error);
         if (error instanceof Error) {
             console.error("ExamTakePage: [handleSubmitExam] Error details:", error.message, error.stack);
             toast({ title: "Submission Failed", description: `Could not save exam results: ${error.message}`, variant: "destructive", duration: 10000 });
         } else {
             toast({ title: "Submission Failed", description: "An unknown error occurred while saving exam results.", variant: "destructive", duration: 10000 });
         }
         setIsSubmitting(false); // Allow retry on failure
     }
     // Note: No finally block needed to set isSubmitting false, success navigates away. If it fails, catch block handles it.
  }, [
      isSubmitting,
      isLocallyInitialized, // Depend on local init
      examQuestions,
      userAnswers,
      examStartTime,
      addExamRecord,
      router,
      toast,
      // clearExamProgress is implicitly called by addExamRecord, so not needed here
  ]);


   // --- Render Logic ---
   // Loading state: wait for context AND local initialization
  if (isContextLoading || !isContextInitialized || !isLocallyInitialized) {
     return (
       <div className="container mx-auto p-4 min-h-screen flex flex-col items-center pt-10 pb-10 space-y-6">
           <div className="absolute top-4 left-4 z-20 flex space-x-2">
                <Skeleton className="h-9 w-24" /> {/* Exit Button */}
           </div>
           <Skeleton className="h-9 w-36 absolute top-4 right-4 z-20" /> {/* Overview Button */}
           <Skeleton className="h-8 w-32 mt-12" /> {/* Title */}
           <Skeleton className="w-full max-w-4xl h-4 mb-1" /> {/* Progress Bar */}
            <Skeleton className="h-4 w-40 mb-4" /> {/* Progress Text */}
           <div className="w-full max-w-4xl space-y-4">
                <Skeleton className="h-60 w-full" /> {/* Question Card Skeleton */}
           </div>
           <Skeleton className="w-full max-w-4xl h-16 mt-6" /> {/* Navigation Card Skeleton */}
       </div>
     );
  }

  // If initialization finished but somehow no questions are loaded (should be caught by redirect earlier)
  if (examQuestions.length === 0) {
      console.error("ExamTakePage: Render reached with zero questions after initialization.");
      return <div className="container mx-auto p-4 text-center">Error: No exam questions loaded. Redirecting...</div>;
  }

   // Validate currentQuestionIndex before accessing examQuestions
   if (currentQuestionIndex < 0 || currentQuestionIndex >= examQuestions.length) {
        console.error(`ExamTakePage: Invalid currentQuestionIndex (${currentQuestionIndex}) for ${examQuestions.length} questions. Resetting.`);
        // Attempt to recover by setting index to 0, but this indicates a state issue.
        setCurrentQuestionIndex(0);
        // Show a loading/error state momentarily while index resets
        return <div className="container mx-auto p-4 text-center">Correcting question index...</div>;
   }


  const currentQuestion = examQuestions[currentQuestionIndex];
  // This check should ideally not be needed if index validation above works, but as a safeguard:
  if (!currentQuestion) {
     console.error(`ExamTakePage: currentQuestion is null/undefined at index ${currentQuestionIndex}. Redirecting...`);
     // Redirect back to config if state is broken
     router.replace('/exam/config');
     return <div className="container mx-auto p-4 text-center">Error loading current question data. Redirecting...</div>;
  }

  const currentQuestionNumber = currentQuestion.question_number;
  const progress = ((currentQuestionIndex + 1) / examQuestions.length) * 100;
  // Get current selection for the card, ensuring safety
  const currentSelection = userAnswers[currentQuestionNumber]?.selected_answers || [];

  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center pt-10 pb-10 relative">
        {/* Header Buttons */}
        <div className="absolute top-4 left-4 z-20 flex space-x-2">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={isSubmitting}>
                        <LogOut className="mr-2 h-4 w-4" /> Exit Exam
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Exit Exam?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your progress will be saved, and you can resume later from the Exam Configuration page.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={goToHome}>Exit</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>


      {/* Overview Sheet Trigger */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="absolute top-4 right-4 z-20" disabled={isSubmitting}>
            <List className="mr-2 h-4 w-4" /> Overview
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle>Exam Overview ({currentQuestionIndex + 1}/{examQuestions.length})</SheetTitle>
          </SheetHeader>
          <QuizOverview
            questions={examQuestions}
            userAnswers={userAnswers} // Pass answers keyed by question_number
            currentQuestionIndex={currentQuestionIndex}
            navigateToQuestion={navigateToQuestion}
            mode="exam"
          />
        </SheetContent>
      </Sheet>

      <h1 className="text-3xl font-bold mb-4 mt-12">Exam Mode</h1>
      <div className="w-full max-w-4xl mb-4">
        <Progress value={progress} className="w-full h-2" />
        <p className="text-sm text-muted-foreground text-center mt-1">
          Question {currentQuestionIndex + 1} of {examQuestions.length}
        </p>
      </div>

      <div className="w-full max-w-4xl">
        {/* Ensure currentQuestion is valid before rendering QuestionCard */}
         {currentQuestion && (
             <QuestionCard
               key={currentQuestionNumber} // Use question_number as key
               question={currentQuestion}
               selectedAnswers={currentSelection} // Pass validated selection
               onAnswerChange={handleAnswerChange}
               questionIndex={currentQuestionIndex}
               totalQuestions={examQuestions.length}
               isDisabled={isSubmitting}
               // Pass original number for consistency, though it's same as question.question_number in exam
               practiceQuestionNumber={currentQuestion.question_number}
               // revealAnswers and userAnswer are not used in exam mode before submission
             />
         )}
      </div>

      <Card className="w-full max-w-4xl mx-auto mt-6 shadow-md rounded-lg">
        <CardContent className="flex justify-between p-4 items-center">
          <Button onClick={goToPreviousQuestion} disabled={currentQuestionIndex === 0 || isSubmitting} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>

          {currentQuestionIndex === examQuestions.length - 1 ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isSubmitting}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Submit Exam
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to submit your exam? You cannot change your answers after submitting. Your progress will be cleared.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmitExam} disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button onClick={goToNextQuestion} disabled={isSubmitting}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
