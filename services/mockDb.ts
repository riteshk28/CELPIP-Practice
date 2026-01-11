
import { PracticeSet, Attempt, User, SectionType } from '../types';

// Initial Mock Data
const INITIAL_SETS: PracticeSet[] = [
  {
    id: 'set-1',
    title: 'CELPIP Practice Test 1',
    description: 'A complete practice test focusing on Reading and Writing.',
    isPublished: true,
    sections: [
      {
        id: 'sec-1',
        setId: 'set-1',
        type: 'READING',
        title: 'Reading Section',
        parts: [
          {
            id: 'part-1',
            sectionId: 'sec-1',
            timerSeconds: 600,
            instructions: 'Read the following email and answer the questions.',
            contentText: "Dear Mr. Henderson,\n\nI am writing to express my dissatisfaction with the service I received at your downtown branch yesterday. I had an appointment scheduled for 2:00 PM with one of your mortgage advisors, Sarah Jenkins. I arrived ten minutes early, as requested in the confirmation email.\n\nHowever, I was kept waiting for over 45 minutes. When I finally saw Ms. Jenkins, she seemed rushed and unprepared for our meeting. She did not have my file on hand and asked me to provide documents I had already uploaded to your secure portal last week.\n\nI have been a loyal customer of your bank for over 15 years, and this level of service is not what I expect. I hope you can look into this matter and ensure it does not happen to other customers.\n\nSincerely,\nJames Peterson",
            questions: [
              {
                id: 'q-1',
                partId: 'part-1',
                text: 'Why did James write the email?',
                type: 'MCQ',
                options: [
                  'To apply for a mortgage',
                  'To complain about poor service',
                  'To reschedule an appointment',
                  'To compliment Sarah Jenkins'
                ],
                correctAnswer: 'To complain about poor service',
                weight: 1
              },
              {
                id: 'q-2',
                partId: 'part-1',
                text: 'How long did James wait?',
                type: 'MCQ',
                options: [
                  '10 minutes',
                  '15 minutes',
                  'Over 45 minutes',
                  '2 hours'
                ],
                correctAnswer: 'Over 45 minutes',
                weight: 1
              }
            ]
          },
          {
            id: 'part-1b',
            sectionId: 'sec-1',
            timerSeconds: 400,
            instructions: 'Read the text and choose the best option for each blank.',
            contentText: "The Honey Badger is known for its [[1]] and ferocity. It has been called the world's most [[2]] animal by the Guinness Book of World Records. Despite its small size, it will attack animals much larger than itself, including lions.",
            questions: [
              {
                id: 'q-3',
                partId: 'part-1b',
                text: '1',
                type: 'CLOZE',
                options: ['strength', 'fear', 'kindness', 'color'],
                correctAnswer: 'strength',
                weight: 1
              },
              {
                id: 'q-4',
                partId: 'part-1b',
                text: '2',
                type: 'CLOZE',
                options: ['peaceful', 'fearless', 'lazy', 'slow'],
                correctAnswer: 'fearless',
                weight: 1
              }
            ]
          }
        ]
      },
      {
        id: 'sec-2',
        setId: 'set-1',
        type: 'WRITING',
        title: 'Writing Section',
        parts: [
          {
            id: 'part-2',
            sectionId: 'sec-2',
            timerSeconds: 1200,
            instructions: 'Write an email of about 150-200 words.',
            contentText: "You recently bought a piece of furniture which was damaged during delivery. Write an email to the manager of the furniture company.\n\nIn your email:\n- Describe the furniture you bought\n- Explain the damage\n- Say what you want the company to do",
            questions: [] 
          }
        ]
      }
    ]
  }
];

const STORAGE_KEY = 'celprep_db_v2';

const loadData = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  return { sets: INITIAL_SETS, attempts: [], users: [] };
};

const saveData = (data: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const MockDB = {
  getSets: (): PracticeSet[] => loadData().sets,
  
  saveSet: (set: PracticeSet) => {
    const data = loadData();
    const existingIndex = data.sets.findIndex((s: PracticeSet) => s.id === set.id);
    if (existingIndex >= 0) {
      data.sets[existingIndex] = set;
    } else {
      data.sets.push(set);
    }
    saveData(data);
  },

  deleteSet: (setId: string) => {
    const data = loadData();
    data.sets = data.sets.filter((s: PracticeSet) => s.id !== setId);
    saveData(data);
  },

  saveAttempt: (attempt: Attempt) => {
    const data = loadData();
    data.attempts.push(attempt);
    saveData(data);
  },

  getAttempts: (userId: string): Attempt[] => {
    const data = loadData();
    return data.attempts.filter((a: Attempt) => a.userId === userId);
  },

  login: async (email: string, password: string): Promise<User | null> => {
    // Mock login logic
    if (email === 'admin@celprep.com' && password === 'admin123') {
      return { id: 'admin-1', email, role: 'admin', name: 'Admin User' };
    }
    return { id: 'user-1', email, role: 'user', name: 'Test Candidate' };
  }
};
