import { PracticeSet, Attempt, User, WritingEvaluation } from '../types';

const API_URL = '/api';

export const API = {
  login: async (email: string, password: string): Promise<User | null> => {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error("Login failed", e);
      return null;
    }
  },

  signup: async (email: string, password: string, name: string): Promise<User | null> => {
    try {
      const res = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error("Signup failed", e);
      return null;
    }
  },

  getSets: async (): Promise<PracticeSet[]> => {
    try {
      const res = await fetch(`${API_URL}/sets`);
      if (!res.ok) throw new Error('Failed to fetch sets');
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  saveSet: async (set: PracticeSet): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(set),
      });
      if (!res.ok) return false;
      return true;
    } catch (e) {
      console.error("Save set failed", e);
      return false;
    }
  },

  deleteSet: async (setId: string) => {
    try {
      await fetch(`${API_URL}/sets/${setId}`, { method: 'DELETE' });
    } catch (e) {
      console.error("Delete set failed", e);
    }
  },

  saveAttempt: async (attempt: Attempt) => {
    try {
      await fetch(`${API_URL}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attempt),
      });
    } catch (e) {
      console.error("Save attempt failed", e);
    }
  },

  getAttempts: async (userId: string): Promise<Attempt[]> => {
    try {
      const res = await fetch(`${API_URL}/attempts/${userId}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  evaluateWriting: async (questionText: string, userResponse: string): Promise<WritingEvaluation | null> => {
    try {
        const res = await fetch(`${API_URL}/evaluate-writing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questionText, userResponse }),
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error("Evaluation failed", e);
        return null;
    }
  },

  // NEW: Generate Speech for Listening Module
  generateSpeech: async (text: string): Promise<{ audioData: string } | null> => {
      try {
          const res = await fetch(`${API_URL}/generate-speech`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text }),
          });
          if (!res.ok) return null;
          return await res.json();
      } catch (e) {
          console.error("TTS failed", e);
          return null;
      }
  }
};