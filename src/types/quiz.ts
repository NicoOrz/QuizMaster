export interface Question {
  question_number: number;
  question_text: string;
  options: Record<string, string>;
  correct_answer: string[]; // Can be multiple correct answers
  explanation: string;
  image_url?: string; // Optional image URL
}

export interface UserAnswer {
  question_number: number;
  selected_answers: string[];
}

export interface IncorrectQuestionDetail {
  question_number: number;
  question_text: string;
  options: Record<string, string>;
  user_answer: string[];
  correct_answer: string[];
  explanation: string;
  image_url?: string;
}

export interface ExamRecord {
  id?: string; // Firestore document ID
  userId: string; // Identifier for the user (e.g., anonymous ID or logged-in user ID)
  score: number; // Percentage or number of correct answers
  totalQuestions: number;
  correctCount: number;
  timestamp: number; // Unix timestamp
  incorrectQuestions: IncorrectQuestionDetail[];
  duration?: number; // Optional: time taken in seconds
}


// --- Progress Interfaces ---

export interface PracticeProgress {
  questions: Question[]; // The specific subset of questions being practiced (shuffled)
  currentIndex: number;
  selections: Record<number, string[]>; // question_number -> selected options
  // Optional: Store the original range for context, if needed later
  range?: { start: number; end: number };
}

export interface ExamProgress {
  questions: Question[]; // The specific questions for the current exam attempt
  currentIndex: number;
  answers: Record<number, UserAnswer>; // question_number -> UserAnswer
  startTime: number; // Timestamp when the exam was started/resumed
  configNumQuestions: number; // Store the number of questions requested for this exam
}


// --- Result Interfaces ---

// Simplified structure for displaying incorrect answers in practice results
export interface PracticeIncorrectQuestion extends IncorrectQuestionDetail {
   // Inherits all fields from IncorrectQuestionDetail
}

export interface PracticeResult {
    id?: string; // Added optional ID for history tracking
    score: number;
    totalQuestions: number;
    correctCount: number;
    incorrectQuestions: PracticeIncorrectQuestion[];
    timestamp: number; // When the practice session was finished
    duration?: number; // Optional: time taken in seconds
    range?: { start: number; end: number }; // The range practiced
}
