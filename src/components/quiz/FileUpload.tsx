
"use client";

import React, { useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuiz } from '@/context/QuizContext';
import type { Question } from '@/types/quiz';
import { useToast } from "@/hooks/use-toast";
import { Upload } from 'lucide-react';

export function FileUpload() {
  const { setQuestions, setIsLoading, clearPracticeProgress, clearExamProgress } = useQuiz(); // Get clear functions
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text === 'string') {
            const parsedQuestions: Question[] = JSON.parse(text);
            // Basic validation (can be more thorough)
            if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0 && parsedQuestions[0].question_text) {
              setQuestions(parsedQuestions);
              // Clear progress on successful import
              clearPracticeProgress();
              clearExamProgress();
              toast({
                title: "Success",
                description: `Successfully imported ${parsedQuestions.length} questions. Any previous progress has been cleared.`,
              });
            } else {
              throw new Error('Invalid JSON format for questions.');
            }
          }
        } catch (error) {
          console.error('Error parsing JSON file:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: `Failed to parse JSON file. Please ensure it's valid. ${error instanceof Error ? error.message : ''}`,
          });
          setQuestions([]); // Clear questions on error
          // Optionally clear progress on error too, or leave it
          // clearPracticeProgress();
          // clearExamProgress();
        } finally {
           setIsLoading(false);
           // Reset file input value to allow re-uploading the same file
           if (fileInputRef.current) {
             fileInputRef.current.value = '';
           }
        }
      };
      reader.onerror = () => {
        console.error('Error reading file');
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to read the file.",
        });
        setIsLoading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
      };
      reader.readAsText(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
       <Input
        type="file"
        accept=".json"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden" // Hide the default input
        id="json-upload"
      />
      <Button onClick={triggerFileInput}>
        <Upload className="mr-2 h-4 w-4" /> Import Question Bank (JSON)
      </Button>
      <label htmlFor="json-upload" className="text-sm text-muted-foreground cursor-pointer">
        Click the button or drag & drop a JSON file here.
      </label>
    </div>
  );
}
