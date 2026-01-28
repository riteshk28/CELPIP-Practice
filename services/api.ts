
import { PracticeSet, Attempt, User, WritingEvaluation } from '../types';

// On Vercel, the backend is on the same domain, so we use a relative path.
const API_URL = '/api';

export const API = {
  // Login
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

  // Signup
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

  // Get All Sets
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

  // Save Set (Create/Update)
  saveSet: async (set: PracticeSet): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(set),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error("Server error:", err);
        throw new Error(err.error || 'Save failed');
      }
      return true;
    } catch (e) {
      console.error("Save set failed", e);
      return false;
    }
  },

  // Delete Set
  deleteSet: async (setId: string) => {
    try {
      await fetch(`${API_URL}/sets/${setId}`, { method: 'DELETE' });
    } catch (e) {
      console.error("Delete set failed", e);
    }
  },

  // Save Attempt
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

  // Get Attempts
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

  // Evaluate Writing (New)
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
  }
};
