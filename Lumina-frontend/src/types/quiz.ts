export interface QuizOption {
  id?: string;
  text: string;
  is_correct: boolean;
}

export interface QuizQuestion {
  id: number;
  quiz_id: number;
  type: "mcq_single" | "mcq_multi" | "descriptive";
  prompt: string;
  marks: number;
  negative_marks?: number | null;
  explanation?: string | null;
  order_index: number;
  ai_generated: boolean;
  rubric?: string | null;
  expected_answer?: string | null;
  word_limit?: number | null;
  grading_type?: string | null;
  options?: { id: string; text: string; is_correct: boolean }[] | null;
}

export interface Quiz {
  id: number;
  title: string;
  description?: string | null;
  instructions: string;
  source_type: string;
  source_book_id?: number | null;
  created_by_user_id: number;
  status: "draft" | "published" | "archived";
  duration_minutes: number;
  total_marks: number;
  pass_percentage: number;
  max_attempts: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_result: string;
  show_correct_answers: string;
  negative_marking: boolean;
  negative_marks: number;
  available_from?: string | null;
  available_until?: string | null;
  created_at: string;
  updated_at: string;
  questions: QuizQuestion[];
  group_ids: number[];
  total_questions: number;
}
