

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import type { Question, UserAnswer, ExamRecord } from '@/types/quiz';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle, Home, List } from 'lucide-react'; // Added List icon
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"; // Added Sheet components
import { QuizOverview } from '@/components/quiz/QuizOverview'; // Added QuizOverview
import { saveExamRecord } from '@/services/firestoreService'; // Import Firestore service
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
  const { questions: allQuestions, addExamRecord } = useQuiz();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const requestedNumQuestions = parseInt(searchParams.get('numQuestions') || '10', 10);

  const examQuestions = useMemo(() => {
     if (allQuestions.length === 0) return [];
    const shuffled = shuffleArray(allQuestions);
    // Ensure requested number doesn't exceed available questions
    const numToTake = Math.min(requestedNumQuestions, allQuestions.length);
    // Ensure we don't try to take 0 questions if the bank is empty or requested num is invalid
    return shuffled.slice(0, Math.max(1, numToTake));
  }, [allQuestions, requestedNumQuestions]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, UserAnswer>>({}); // Store answers by question_number
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examStartTime] = useState(Date.now()); // Record start time
  const [isSheetOpen, setIsSheetOpen] = useState(false); // State for overview sheet


  useEffect(() => {
    // Redirect if no questions loaded initially
    if (allQuestions.length === 0) {
       toast({ title: "No Questions Loaded", description: "Redirecting to import page.", variant: "destructive" });
      router.push('/');
    } else if (examQuestions.length === 0 && allQuestions.length > 0) {
        // This case might happen if requestedNumQuestions is 0 or invalid
        toast({ title: "Exam Configuration Error", description: "Invalid number of questions. Redirecting to config.", variant: "destructive" });
        router.push('/exam/config');
    }
  }, [allQuestions, examQuestions, router, toast]);

   const handleAnswerChange = useCallback((questionNumber: number, answerKey: string, checked: boolean) => {
    setUserAnswers(prev => {
      const currentAnswer = prev[questionNumber] || { question_number: questionNumber, selected_answers: [] };
      const question = examQuestions.find(q => q.question_number === questionNumber);
      if (!question) return prev; // Safeguard

      const isMultipleChoice = question.correct_answer.length > 1;

       let newSelectedAnswers: string[];

      if (isMultipleChoice) {
        // Add or remove for checkboxes
        if (checked) {
          newSelectedAnswers = [...currentAnswer.selected_answers, answerKey];
        } else {
          newSelectedAnswers = currentAnswer.selected_answers.filter(ans => ans !== answerKey);
        }
      } else {
        // Replace for radio buttons
        newSelectedAnswers = [answerKey];
      }
       return {
        ...prev,
        [questionNumber]: { ...currentAnswer, selected_answers: newSelectedAnswers.sort() } // Keep answers sorted for consistency
      };
    });
  }, [examQuestions]); // Depend on examQuestions

  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < examQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex, examQuestions.length]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev + 1); // Corrected typo: should be prev - 1
    }
  }, [currentQuestionIndex]);

   const goToHome = useCallback(() => {
    router.push('/');
   }, [router]);

   const navigateToQuestion = useCallback((index: number) => {
     if (index >= 0 && index < examQuestions.length) {
         setCurrentQuestionIndex(index);
         setIsSheetOpen(false); // Close sheet after navigation
     }
   }, [examQuestions.length]);


  const handleSubmitExam = useCallback(async () => {
     if (isSubmitting) return; // Prevent double submission
     setIsSubmitting(true);
     toast({ title: "Submitting Exam...", description: "Calculating your results." });

    let correctCount = 0;
    const incorrectQuestionsDetail = [];

    for (const question of examQuestions) {
       const userAnswer = userAnswers[question.question_number];
       const selected = userAnswer?.selected_answers || [];
       const correct = [...question.correct_answer].sort(); // Ensure correct answers are sorted for comparison

       // Ensure selected is also sorted (should be handled in handleAnswerChange, but double-check)
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
           user_answer: sortedSelected, // Store the sorted user answer
           correct_answer: correct, // Store the sorted correct answer
           explanation: question.explanation,
           image_url: question.image_url,
         });
       }
    }

     const score = examQuestions.length > 0 ? (correctCount / examQuestions.length) * 100 : 0;
     const examEndTime = Date.now();
     const duration = Math.round((examEndTime - examStartTime) / 1000); // Duration in seconds

     // Prepare record for Firestore (without id, using server timestamp)
     const recordData = {
       userId: 'anonymous', // Replace with actual user ID if auth is implemented
       score: parseFloat(score.toFixed(2)),
       totalQuestions: examQuestions.length,
       correctCount: correctCount,
       // timestamp will be added by Firestore
       incorrectQuestions: incorrectQuestionsDetail,
       duration: duration,
     };


     try {
        // Save to Firestore
        const docId = await saveExamRecord(recordData);

        // Create the full record for local state/context (including ID and client-side timestamp)
        const fullRecord: ExamRecord = {
            ...recordData,
            id: docId,
            timestamp: examStartTime, // Use start time for local display consistency
        };

        // Update local context/state
        addExamRecord(fullRecord);

        toast({ title: "Submission Successful!", description: `Score: ${score.toFixed(1)}%`, variant: "default" });
        router.push(`/exam/results?recordId=${docId}`);

     } catch (error) {
        console.error("Failed to save exam record:", error);
        toast({ title: "Submission Failed", description: "Could not save exam results. Please try again.", variant: "destructive" });
        setIsSubmitting(false); // Re-enable button on error
     }

  }, [examQuestions, userAnswers, examStartTime, addExamRecord, router, toast, isSubmitting]);


  // Loading/Redirect state
  if (examQuestions.length === 0) {
    return <div className="container mx-auto p-4 text-center">Loading exam questions or redirecting...</div>;
  }

  const currentQuestion = examQuestions[currentQuestionIndex];
   // Safeguard in case currentQuestion becomes undefined temporarily
   if (!currentQuestion) {
       return <div className="container mx-auto p-4 text-center">Loading question...</div>;
   }

   const currentQuestionNumber = currentQuestion.question_number;
   const progress = ((currentQuestionIndex + 1) / examQuestions.length) * 100;


  return (
    // Adjust max-width for the overall container if needed
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center pt-10 pb-10 relative">
        <Button onClick={goToHome} variant="outline" className="absolute top-4 left-4 z-20">
            <Home className="mr-2 h-4 w-4" /> Back to Home
        </Button>

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
       {/* Ensure progress bar also uses appropriate width */}
      <div className="w-full max-w-4xl mb-4">
         <Progress value={progress} className="w-full h-2" />
         <p className="text-sm text-muted-foreground text-center mt-1">
           Question {currentQuestionIndex + 1} of {examQuestions.length}
         </p>
      </div>

        {/* Ensure the QuestionCard container takes the correct width */}
       <div className="w-full max-w-4xl">
            <QuestionCard
            key={currentQuestionNumber} // Force re-render on question change
            question={currentQuestion}
            selectedAnswers={userAnswers[currentQuestionNumber]?.selected_answers || []}
            onAnswerChange={(answerKey, checked) => handleAnswerChange(currentQuestionNumber, answerKey, checked)}
            questionIndex={currentQuestionIndex}
            totalQuestions={examQuestions.length}
            isDisabled={isSubmitting} // Disable card when submitting
            />
       </div>


        {/* Navigation/Submit card should also match width */}
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
                      Are you sure you want to submit your exam? You cannot change your answers after submitting.
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
