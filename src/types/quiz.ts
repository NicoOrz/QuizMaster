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
