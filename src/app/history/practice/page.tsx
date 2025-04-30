
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import type { PracticeResult } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Home, Eye } from 'lucide-react';
import { format } from 'date-fns';

export default function PracticeHistoryPage() {
  const { practiceHistory } = useQuiz();
  const router = useRouter();
  const [sortedHistory, setSortedHistory] = useState<PracticeResult[]>([]);

  useEffect(() => {
    // Sort history by timestamp descending (most recent first)
    setSortedHistory([...practiceHistory].sort((a, b) => b.timestamp - a.timestamp));
  }, [practiceHistory]);

  const viewResults = (resultId: string | undefined) => {
    if (resultId) {
      router.push(`/practice/results?resultId=${resultId}`);
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
      <h1 className="text-3xl font-bold mb-6 text-center">Practice History</h1>

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle>Past Practice Sessions</CardTitle>
          <CardDescription>Review your previous practice attempts.</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No practice history found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-center">Correct / Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHistory.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>{format(new Date(result.timestamp), 'Pp')}</TableCell>
                    <TableCell>
                      {result.range ? `${result.range.start} - ${result.range.end}` : 'N/A'}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${result.score >= 70 ? 'text-green-600' : result.score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {result.score.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center">{result.correctCount} / {result.totalQuestions}</TableCell>
                    <TableCell className="text-right">
                      <Button onClick={() => viewResults(result.id)} variant="ghost" size="sm">
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
