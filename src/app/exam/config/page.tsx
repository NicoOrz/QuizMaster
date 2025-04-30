"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Play, Home } from 'lucide-react';


export default function ExamConfigPage() {
  const { questions } = useQuiz();
  const router = useRouter();
  const { toast } = useToast();
  const [numQuestions, setNumQuestions] = useState<number>(10); // Default number of questions
  const maxQuestions = questions.length;

  useEffect(() => {
    if (questions.length === 0) {
      toast({ variant: "destructive", title: "No Questions", description: "Please import a question bank before configuring an exam." });
      router.push('/');
    } else {
      // Set default or max based on available questions
      setNumQuestions(Math.min(10, maxQuestions));
    }
  }, [questions, router, toast, maxQuestions]);


  const handleSliderChange = (value: number[]) => {
    setNumQuestions(value[0]);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseInt(event.target.value, 10);
    if (isNaN(value)) {
      value = 1; // Default to 1 if input is not a number
    }
    setNumQuestions(Math.max(1, Math.min(value, maxQuestions)));
  };

  const startExam = () => {
    if (numQuestions < 1 || numQuestions > maxQuestions) {
       toast({
          variant: "destructive",
          title: "Invalid Number",
          description: `Number of questions must be between 1 and ${maxQuestions}.`,
        });
      return;
    }
    // Pass the number of questions via query params
    router.push(`/exam/take?numQuestions=${numQuestions}`);
  };

   const goToHome = () => {
    router.push('/');
   };


  if (questions.length === 0) {
     return <div className="container mx-auto p-4 text-center">Loading or redirecting...</div>;
  }

  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
       <Button onClick={goToHome} variant="outline" className="absolute top-4 left-4">
          <Home className="mr-2 h-4 w-4" /> Back to Home
       </Button>
      <Card className="w-full max-w-md shadow-lg rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Configure Exam</CardTitle>
          <CardDescription>Select the number of questions for your exam.</CardDescription>
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
                    disabled={maxQuestions <= 1}
                />
                 <Input
                    id="num-questions-input"
                    type="number"
                    min="1"
                    max={maxQuestions}
                    value={numQuestions}
                    onChange={handleInputChange}
                    className="w-20"
                     disabled={maxQuestions <= 1}
                />
            </div>

          </div>
           <p className="text-sm text-muted-foreground text-center">
              Available questions: {maxQuestions}
            </p>
        </CardContent>
        <CardFooter>
          <Button onClick={startExam} className="w-full" size="lg" disabled={maxQuestions === 0}>
            <Play className="mr-2 h-5 w-5" /> Start Exam
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
