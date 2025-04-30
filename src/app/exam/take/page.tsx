
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import type { Question, UserAnswer, ExamRecord } from '@/types/quiz';
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

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function ExamTakePage() {
  const { questions: allQuestions, addExamRecord, examProgress, setExamProgress, clearExamProgress } = useQuiz();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const requestedNumQuestionsParam = searchParams.get('numQuestions');

  // --- State Initialization ---
  // Attempt to load from context first, then generate new if needed
  const [examQuestions, setExamQuestions] = useState<Question[]>(examProgress?.questions ?? []);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(examProgress?.currentIndex ?? 0);
  const [userAnswers, setUserAnswers] = useState<Record<number, UserAnswer>>(examProgress?.answers ?? {});
  const [examStartTime, setExamStartTime] = useState<number>(examProgress?.startTime ?? Date.now());
  const [configNumQuestions, setConfigNumQuestions] = useState<number>(examProgress?.configNumQuestions ?? 0); // Store the requested number for saving

  const [isInitialized, setIsInitialized] = useState(!!examProgress); // Track if loaded from progress
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // --- Initialization Effect ---
  useEffect(() => {
    // If not loaded from existing progress and have questions, initialize a new exam
    if (!isInitialized && allQuestions.length > 0) {
        const requestedNum = parseInt(requestedNumQuestionsParam || '10', 10);
        if (requestedNum <= 0) {
            toast({ title: "Exam Configuration Error", description: "Invalid number of questions requested. Redirecting.", variant: "destructive" });
            router.push('/exam/config');
            return;
        }

        const numToTake = Math.min(requestedNum, allQuestions.length);
        if (numToTake === 0) {
             toast({ title: "No Questions Available", description: "Cannot start exam with zero questions.", variant: "destructive" });
             router.push('/');
             return;
        }

        const shuffled = shuffleArray(allQuestions);
        const selectedQuestions = shuffled.slice(0, numToTake);
        const startTime = Date.now();

        setExamQuestions(selectedQuestions);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setExamStartTime(startTime);
        setConfigNumQuestions(numToTake); // Store the actual number taken
        setIsInitialized(true); // Mark as initialized

         console.log("Initialized new exam with", numToTake, "questions.");

         // Save initial state to context/localStorage
         setExamProgress({
            questions: selectedQuestions,
            currentIndex: 0,
            answers: {},
            startTime: startTime,
            configNumQuestions: numToTake,
         });

    } else if (allQuestions.length === 0 && !examProgress) {
      // If no questions and no progress, redirect
      toast({ title: "No Questions Loaded", description: "Redirecting to import page.", variant: "destructive" });
      router.push('/');
    } else if (isInitialized && examProgress && examQuestions.length === 0) {
        // This case might mean invalid progress was loaded
        toast({ title: "Exam State Error", description: "Invalid exam progress detected. Clearing and redirecting.", variant: "destructive" });
        clearExamProgress();
        router.push('/exam/config');
    }

  }, [allQuestions, requestedNumQuestionsParam, router, toast, isInitialized, examProgress, setExamProgress, clearExamProgress, examQuestions.length]); // Added examProgress dependencies


   // --- Effect to Save Progress ---
   useEffect(() => {
     // Only save progress if the exam is initialized and has questions
     if (isInitialized && examQuestions.length > 0) {
        setExamProgress(prev => ({
            // Use existing questions/startTime/configNum if available, otherwise update
            questions: prev?.questions ?? examQuestions,
            startTime: prev?.startTime ?? examStartTime,
            configNumQuestions: prev?.configNumQuestions ?? configNumQuestions,
            // Update current index and answers
            currentIndex: currentQuestionIndex,
            answers: userAnswers,
        }));
     }
   }, [currentQuestionIndex, userAnswers, setExamProgress, isInitialized, examQuestions, examStartTime, configNumQuestions]);


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
        newSelectedAnswers = [answerKey];
      }
      return {
        ...prev,
        [questionNumber]: { ...currentAnswer, selected_answers: newSelectedAnswers.sort() }
      };
    });
  }, [examQuestions]);

  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < examQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex, examQuestions.length]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const goToHome = useCallback(() => {
    // Decide if progress should be cleared when manually going home
    // clearExamProgress(); // Currently progress persists unless submitted or explicitly cleared
    router.push('/');
  }, [router]);

  const navigateToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < examQuestions.length) {
      setCurrentQuestionIndex(index);
      setIsSheetOpen(false);
    }
  }, [examQuestions.length]);

  const handleSubmitExam = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    toast({ title: "Submitting Exam...", description: "Calculating your results." });

    let correctCount = 0;
    const incorrectQuestionsDetail = [];

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

    const score = examQuestions.length > 0 ? (correctCount / examQuestions.length) * 100 : 0;
    const examEndTime = Date.now();
    const duration = Math.round((examEndTime - examStartTime) / 1000); // Duration in seconds

    const recordData = {
      userId: 'anonymous',
      score: parseFloat(score.toFixed(2)),
      totalQuestions: examQuestions.length,
      correctCount: correctCount,
      incorrectQuestions: incorrectQuestionsDetail,
      duration: duration,
    };

    try {
      const docId = await saveExamRecord(recordData);
      const fullRecord: ExamRecord = {
        ...recordData,
        id: docId,
        timestamp: examStartTime, // Use start time for local display consistency
      };
      addExamRecord(fullRecord); // This also clears examProgress via context
      toast({ title: "Submission Successful!", description: `Score: ${score.toFixed(1)}%`, variant: "default" });
      router.push(`/exam/results?recordId=${docId}`);
    } catch (error) {
      console.error("Failed to save exam record:", error);
      toast({ title: "Submission Failed", description: "Could not save exam results. Please try again.", variant: "destructive" });
      setIsSubmitting(false);
    }
  }, [examQuestions, userAnswers, examStartTime, addExamRecord, router, toast, isSubmitting]);


   // --- Render Logic ---
  if (!isInitialized || examQuestions.length === 0) {
    return <div className="container mx-auto p-4 text-center">Loading exam...</div>;
  }

  const currentQuestion = examQuestions[currentQuestionIndex];
  if (!currentQuestion) {
    return <div className="container mx-auto p-4 text-center">Loading question...</div>;
  }

  const currentQuestionNumber = currentQuestion.question_number;
  const progress = ((currentQuestionIndex + 1) / examQuestions.length) * 100;

  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center pt-10 pb-10 relative">
        {/* Header Buttons */}
        <div className="absolute top-4 left-4 z-20 flex space-x-2">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline">
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
          <Button variant="outline" className="absolute top-4 right-4 z-20">
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
        <QuestionCard
          key={currentQuestionNumber}
          question={currentQuestion}
          selectedAnswers={userAnswers[currentQuestionNumber]?.selected_answers || []}
          onAnswerChange={(answerKey, checked) => handleAnswerChange(currentQuestionNumber, answerKey, checked)}
          questionIndex={currentQuestionIndex}
          totalQuestions={examQuestions.length}
          isDisabled={isSubmitting}
        />
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
