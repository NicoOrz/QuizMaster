
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // Import useSearchParams
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
// import { saveExamRecord } from '@/services/firestoreService'; // Temporarily disable Firestore
import { useToast } from "@/hooks/use-toast";
import { shuffleArray } from '@/lib/utils'; // Make sure shuffleArray is imported
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Helper function to sanitize data for saving (ensure no undefined values)
const sanitizeForStorage = (data: any): any => {
  if (data === undefined) {
    return null; // Replace undefined with null
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeForStorage);
  }
  if (typeof data === 'object' && data !== null) {
    const sanitizedObject: Record<string, any> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
         const value = data[key];
         // Only include the key if the sanitized value is not null
         // (or explicitly allow nulls if needed by your schema)
         const sanitizedValue = sanitizeForStorage(value);
         // Keep nulls, but skip undefined
         if (sanitizedValue !== undefined) {
            sanitizedObject[key] = sanitizedValue;
         }
      }
    }
    return sanitizedObject;
  }
  return data;
};


export default function ExamTakePage(/* Remove props: {searchParams}: {searchParams?: { numQuestions?: string }} */) {
  const { questions: allQuestions, addExamRecord, examProgress, setExamProgress, clearExamProgress, isLoading: isContextLoading, isInitialized: isContextInitialized } = useQuiz();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams(); // Use the hook
  const requestedNumQuestionsParam = searchParams.get('numQuestions'); // Get the value using .get()


  // --- State Initialization ---
  // Initialize with empty/default values, setup will happen in useEffect
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, UserAnswer>>({});
  const [examStartTime, setExamStartTime] = useState<number>(Date.now());
  const [configNumQuestions, setConfigNumQuestions] = useState<number>(0);
  const [examRange, setExamRange] = useState<{ start: number; end: number } | null>(null); // Add state for exam range

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
      const { questions, currentIndex, answers, startTime, configNumQuestions: savedConfigNum, range } = examProgress;
       // Basic validation of progress structure
       if (Array.isArray(questions) && questions.length > 0 && typeof currentIndex === 'number' && typeof answers === 'object' && typeof startTime === 'number') {
            console.log(`ExamTakePage: Loading exam from context with ${questions.length} questions at index ${currentIndex}. Range: ${range ? `${range.start}-${range.end}` : 'N/A'}`);
            setExamQuestions(questions);
            setCurrentQuestionIndex(currentIndex);
            setUserAnswers(answers);
            setExamStartTime(startTime);
            setConfigNumQuestions(savedConfigNum ?? questions.length); // Fallback if configNumQuestions missing
            setExamRange(range ?? null); // Load range
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

         // Get range from query params if present
         const rangeStartParam = searchParams.get('rangeStart');
         const rangeEndParam = searchParams.get('rangeEnd');
         let potentialRange: { start: number; end: number } | null = null;

         if (rangeStartParam && rangeEndParam) {
            const start = parseInt(rangeStartParam, 10);
            const end = parseInt(rangeEndParam, 10);
            if (!isNaN(start) && !isNaN(end) && start <= end) {
                 potentialRange = { start, end };
                 console.log(`ExamTakePage: Exam range specified: ${start}-${end}`);
            } else {
                 console.warn("ExamTakePage: Invalid range parameters provided. Ignoring range.");
            }
         }


        const requestedNum = parseInt(requestedNumQuestionsParam, 10);
        if (isNaN(requestedNum) || requestedNum <= 0) {
            console.error("ExamTakePage: Invalid number of questions requested:", requestedNumQuestionsParam);
            toast({ title: "Exam Configuration Error", description: "Invalid number of questions requested. Redirecting.", variant: "destructive" });
            router.replace('/exam/config');
            return; // Exit effect
        }


         // Determine the pool of questions based on range or all questions
         let questionPool = [...allQuestions];
         if (potentialRange) {
            questionPool = allQuestions.filter(q =>
                q.question_number >= potentialRange!.start && q.question_number <= potentialRange!.end
            );
             console.log(`ExamTakePage: Filtered question pool by range ${potentialRange.start}-${potentialRange.end}. Pool size: ${questionPool.length}`);
             if (questionPool.length === 0) {
                 toast({ title: "Range Error", description: `No questions found in the specified range (${potentialRange.start}-${potentialRange.end}). Please adjust the range.`, variant: "destructive", duration: 7000 });
                 router.replace('/exam/config');
                 return;
             }
         } else {
             console.log("ExamTakePage: Using all available questions as the pool.");
         }


        const numToTake = Math.min(requestedNum, questionPool.length);
        if (numToTake === 0) {
            console.warn("ExamTakePage: Cannot start exam with zero questions.");
            toast({ title: "No Questions Available", description: "Cannot start exam with zero questions (or zero in selected range).", variant: "destructive" });
             router.replace(potentialRange ? '/exam/config' : '/'); // Go back to config if range was used, else home
             return;
        }

        // Clear any old progress before starting new
        if (examProgress) {
            console.log("ExamTakePage: Clearing existing exam progress before starting new one.");
            clearExamProgress();
        }

        const shuffled = shuffleArray(questionPool);
        const selectedQuestions = shuffled.slice(0, numToTake);
        const startTime = Date.now();
        const initialAnswers: Record<number, UserAnswer> = {};
         selectedQuestions.forEach(q => {
           initialAnswers[q.question_number] = { question_number: q.question_number, selected_answers: [] };
         });

        console.log(`ExamTakePage: Initializing new exam with ${numToTake} questions. ${potentialRange ? `(Range: ${potentialRange.start}-${potentialRange.end})` : '(No Range)'}`);
        setExamQuestions(selectedQuestions);
        setCurrentQuestionIndex(0);
        setUserAnswers(initialAnswers);
        setExamStartTime(startTime);
        setConfigNumQuestions(numToTake); // Store the actual number taken
        setExamRange(potentialRange); // Store the selected range (or null)
        setIsLocallyInitialized(true); // Mark local initialization complete

        // Save initial state to context/localStorage immediately
         setExamProgress({
            questions: selectedQuestions,
            currentIndex: 0,
            answers: initialAnswers,
            startTime: startTime,
            configNumQuestions: numToTake,
            range: potentialRange, // Save range to progress
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
      isLocallyInitialized, // Depend on local init state
      searchParams // Add searchParams as dependency
  ]);


   // --- Effect to Save Progress ---
   useEffect(() => {
     // Only save progress if the exam is locally initialized and has questions
     if (isLocallyInitialized && examQuestions.length > 0) {
         // Check if examProgress is actually defined before trying to update
         if (examProgress !== undefined) { // Allow saving even if it's null initially
             setExamProgress(prev => {
                const currentState: ExamProgress = {
                    questions: examQuestions,
                    startTime: examStartTime,
                    configNumQuestions: configNumQuestions,
                    range: examRange, // Save range
                    currentIndex: currentQuestionIndex,
                    answers: userAnswers,
                };

                 // Ensure prev is not null/undefined before spreading/comparing
                 if (!prev) {
                     // console.warn("ExamTakePage: Attempted to save progress, but previous progress state was null/undefined. Saving current state.");
                     return currentState;
                 }

                 // Simple comparison to avoid unnecessary updates if nothing changed
                 if (prev.currentIndex !== currentState.currentIndex ||
                     JSON.stringify(prev.answers) !== JSON.stringify(currentState.answers) ||
                     prev.range?.start !== currentState.range?.start || // Compare range too
                     prev.range?.end !== currentState.range?.end)
                 {
                    // console.log("ExamTakePage: Saving updated exam progress to context.");
                    return currentState;
                 }
                 // console.log("ExamTakePage: Skipping progress save, no change detected.");
                 return prev; // No change needed
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
       examRange, // Include range
       examProgress // Include examProgress to react to it becoming available/null/undefined
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
         console.log("ExamTakePage: [handleSubmitExam] Exam questions:", examQuestions.map(q => q.question_number));
         console.log("ExamTakePage: [handleSubmitExam] User answers:", userAnswers);

         console.log("ExamTakePage: [handleSubmitExam] Calculating score...");
         for (const question of examQuestions) {
            const questionNum = question.question_number;
           const userAnswer = userAnswers[questionNum];
           const selected = userAnswer?.selected_answers || [];
           const correct = [...question.correct_answer].sort();
           const sortedSelected = [...selected].sort();
           const isCorrect = sortedSelected.length === correct.length &&
                             sortedSelected.every((value, index) => value === correct[index]);

           if (isCorrect) {
             correctCount++;
           } else {
                const incorrectDetail = {
                   question_number: questionNum,
                   question_text: question.question_text,
                   options: question.options,
                   user_answer: sortedSelected,
                   correct_answer: correct,
                   explanation: question.explanation,
                   image_url: question.image_url, // Include image_url
                 };
                 incorrectQuestionsDetail.push(incorrectDetail);
                 console.log(`[handleSubmitExam] Incorrect question details for Q#${questionNum}:`, incorrectDetail);
           }
         }
         console.log(`ExamTakePage: [handleSubmitExam] Correct count: ${correctCount}`);

         const score = examQuestions.length > 0 ? (correctCount / examQuestions.length) * 100 : 0;
         const examEndTime = Date.now();
         // Ensure examStartTime is valid before calculating duration
         const duration = examStartTime && examStartTime > 0 ? Math.round((examEndTime - examStartTime) / 1000) : 0; // Duration in seconds
         console.log(`ExamTakePage: [handleSubmitExam] Score calculated: ${score.toFixed(2)}%, Duration: ${duration}s`);

          // Prepare data for saving - crucially, sanitize it first!
          const rawRecordData = {
            userId: 'anonymous', // TODO: Replace with actual user ID if authentication is added
            score: parseFloat(score.toFixed(2)),
            totalQuestions: examQuestions.length,
            correctCount: correctCount,
            incorrectQuestions: incorrectQuestionsDetail,
            duration: duration,
            range: examRange, // Include the range used for the exam
          };

         // **Sanitize the data before saving**
         const recordDataToSave = sanitizeForStorage(rawRecordData);
         console.log("ExamTakePage: [handleSubmitExam] Prepared record data for saving:", recordDataToSave);

         // Temporarily disable Firestore saving
         // console.log("ExamTakePage: [handleSubmitExam] Saving exam record locally...");
         const tempDocId = `local-${Date.now()}`;
         // const docId = await saveExamRecord(recordDataToSave);
         // console.log(`ExamTakePage: [handleSubmitExam] Local save successful. Temporary ID: ${tempDocId}`);
         // console.log(`ExamTakePage: [handleSubmitExam] Firestore save successful. Document ID: ${docId}`);


         const finalTimestamp = Date.now(); // Use final submission time for local record consistency
         const fullRecord: ExamRecord = {
            id: tempDocId, // Use temporary ID
            userId: recordDataToSave.userId,
            score: recordDataToSave.score,
            totalQuestions: recordDataToSave.totalQuestions,
            correctCount: recordDataToSave.correctCount,
            incorrectQuestions: recordDataToSave.incorrectQuestions || [],
            duration: recordDataToSave.duration,
            range: recordDataToSave.range, // Save the range
            timestamp: finalTimestamp,
         };

         // Sanitize one more time before adding to context (belt and suspenders)
          const finalSanitizedRecord = sanitizeForStorage(fullRecord);
          if (!finalSanitizedRecord) {
              throw new Error("Failed to sanitize the final record before adding to context.");
          }


         console.log("ExamTakePage: [handleSubmitExam] Adding exam record to context history:", finalSanitizedRecord);
         addExamRecord(finalSanitizedRecord); // Clears examProgress via context
         console.log("ExamTakePage: [handleSubmitExam] Context updated.");

         toast({ title: "Submission Successful!", description: `Score: ${score.toFixed(1)}%`, variant: "default" });
         console.log("ExamTakePage: [handleSubmitExam] Navigating to results page...");
         router.push(`/exam/results?recordId=${tempDocId}`);

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
      examRange, // Include range
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
            <List className="mr-2 h-4 w-4" /> Overview ({currentQuestionIndex + 1}/{examQuestions.length})
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

      <h1 className="text-3xl font-bold mb-1 mt-12">Exam Mode</h1>
       {examRange && (
           <p className="text-sm text-muted-foreground mb-4">
                (Range: {examRange.start}-{examRange.end})
           </p>
       )}
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

