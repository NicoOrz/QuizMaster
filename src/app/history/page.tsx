"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import type { ExamRecord } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Home, Eye } from 'lucide-react';
import { format } from 'date-fns';

export default function HistoryPage() {
  const { examHistory, setExamHistory } = useQuiz(); // Assuming setExamHistory might be used for Firestore fetching later
  const router = useRouter();
   const [sortedHistory, setSortedHistory] = useState<ExamRecord[]>([]);

   useEffect(() => {
    // Sort history by timestamp descending (most recent first)
    setSortedHistory([...examHistory].sort((a, b) => b.timestamp - a.timestamp));
    // TODO: Add Firestore fetching logic here when implemented
  }, [examHistory]);


  const viewResults = (recordId: string | undefined) => {
    if (recordId) {
       router.push(`/exam/results?recordId=${recordId}`);
    }
  };

   const goToHome = () => {
    router.push('/');
   };


  return (
    <div className="container mx-auto p-4 min-h-screen pt-10">
       <Button onClick={goToHome} variant="outline" className="absolute top-4 left-4">
          <Home className="mr-2 h-4 w-4" /> Back to Home
       </Button>
      <h1 className="text-3xl font-bold mb-6 text-center">Exam History</h1>

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle>Past Exams</CardTitle>
          <CardDescription>Review your previous exam attempts.</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No exam history found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-center">Correct / Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHistory.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{format(new Date(record.timestamp), 'Pp')}</TableCell>
                    <TableCell className={`text-right font-semibold ${record.score >= 70 ? 'text-green-600' : record.score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {record.score.toFixed(1)}%
                      </TableCell>
                    <TableCell className="text-center">{record.correctCount} / {record.totalQuestions}</TableCell>
                    <TableCell className="text-right">
                      <Button onClick={() => viewResults(record.id)} variant="ghost" size="sm">
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
