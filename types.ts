
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
}

export type SectionType = 'READING' | 'WRITING' | 'LISTENING' | 'SPEAKING';
export type QuestionType = 'MCQ' | 'CLOZE' | 'PASSAGE';

export interface Question {
  id: string;
  partId: string;
  text: string; // For Cloze, this corresponds to the placeholder ID (e.g., "1"). For Passage, this is the content.
  type: QuestionType;
  options?: string[]; // For MCQ/Cloze
  correctAnswer?: string; // For auto-grading
  weight: number;
  audioData?: string; // Base64 audio for spoken questions
}

export interface Part {
  id: string;
  sectionId: string;
  contentText: string; // Main Passage (Left Side) or Transcript
  imageData?: string; // Base64
  audioData?: string; // Base64 audio for Listening parts
  instructions?: string;
  questions: Question[]; // Now contains MCQs, CLOZE definitions, AND PASSAGE blocks mixed
  timerSeconds: number; // Duration for this specific part
}

export interface Section {
  id: string;
  setId: string;
  type: SectionType;
  title: string;
  parts: Part[];
}

export interface PracticeSet {
  id: string;
  title: string;
  description: string;
  isPublished: boolean;
  sections: Section[];
}

export interface WritingEvaluation {
    bandScore: number;
    scores?: {
        content: number;
        vocabulary: number;
        readability: number;
        taskFulfillment: number;
    };
    feedback: string;
    corrections: string;
    error?: string;
}

export interface Attempt {
  id: string;
  userId: string;
  setId: string;
  setTitle: string;
  date: string;
  sectionScores: Record<string, number>; // SectionId -> Score
  bandScore?: number;
  aiFeedback?: Record<string, WritingEvaluation>; // PartID -> Evaluation
}

export interface AppState {
  user: User | null;
  sets: PracticeSet[];
  attempts: Attempt[];
}
