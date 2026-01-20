
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
  segmentId?: string; // NEW: For questions belonging to a specific segment (Listening)
  text: string; 
  type: QuestionType;
  options?: string[]; 
  correctAnswer?: string; 
  weight: number;
}

// NEW: A Segment is a sub-unit of a Part (e.g., one audio track + questions)
export interface Segment {
  id: string;
  partId: string;
  title?: string;
  contentText?: string; // Instructions or text prompt
  audioData?: string; // Base64 or URL
  prepTimeSeconds: number; // Time to read questions before audio
  timerSeconds: number; // Time for audio + answering
  questions: Question[];
}

export interface Part {
  id: string;
  sectionId: string;
  contentText: string; 
  imageData?: string; 
  instructions?: string;
  // Reading/Writing use 'questions' directly. Listening uses 'segments'.
  questions: Question[]; 
  segments?: Segment[]; // NEW: Container for Listening segments
  prepTimeSeconds?: number; // NEW: Specific for Speaking Parts
  timerSeconds: number; 
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

export interface Attempt {
  id: string;
  userId: string;
  setId: string;
  setTitle: string;
  date: string;
  sectionScores: Record<string, number>; 
  bandScore?: number;
}

export interface AppState {
  user: User | null;
  sets: PracticeSet[];
  attempts: Attempt[];
}
