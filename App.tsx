
import React, { useState, useEffect } from 'react';
import { User, PracticeSet, Attempt, QuestionType, Section, SectionResult } from './types';
import { API } from './services/api';
import { Button } from './components/Button';
import { Input, TextArea } from './components/Input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';

// --- HELPER COMPONENTS ---

interface DropdownProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ options, value, onChange, placeholder, className }) => (
  <select 
    className={`rounded border border-slate-300 px-3 py-1.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm ${className}`}
    value={value}
    onChange={e => onChange(e.target.value)}
    onClick={e => e.stopPropagation()}
  >
    <option value="" disabled>{placeholder || 'Select...'}</option>
    {options.map((opt, i) => (
      <option key={i} value={opt}>{opt}</option>
    ))}
  </select>
);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS --- //

// 1. LOGIN / SIGNUP SCREEN
interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    let user: User | null = null;

    if (isSignUp) {
      if (!name.trim()) {
        setError('Name is required.');
        setLoading(false);
        return;
      }
      user = await API.signup(email, password, name);
      if (!user) setError('Registration failed. Email might be taken.');
    } else {
      user = await API.login(email, password);
      if (!user) setError('Invalid credentials.');
    }

    setLoading(false);
    if (user) onLogin(user);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-slate-100">
        <div className="text-center mb-8">
           <h1 className="text-3xl font-bold text-slate-900 tracking-tight">CELPrep<span className="text-blue-600">Master</span></h1>
           <p className="text-slate-500 mt-2">Professional CELPIP Preparation</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <Input 
              label="Full Name" 
              type="text" 
              placeholder="John Doe" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required={isSignUp}
              className="bg-white text-slate-900"
            />
          )}
          <Input 
            label="Email Address" 
            type="email" 
            placeholder="name@example.com" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            className="bg-white text-slate-900"
          />
          <Input 
            label="Password" 
            type="password" 
            placeholder="••••••••" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            className="bg-white text-slate-900"
          />
          <Button type="submit" className="w-full py-3 text-base shadow-blue-200 shadow-lg" disabled={loading}>
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button 
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }} 
              className="font-bold text-blue-600 hover:text-blue-700 hover:underline focus:outline-none"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// 2. ADMIN DASHBOARD
interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [sets, setSets] = useState<PracticeSet[]>([]);
  const [editingSet, setEditingSet] = useState<PracticeSet | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const refreshSets = async () => {
    const updatedSets = await API.getSets();
    setSets([...updatedSets]);
  };

  useEffect(() => {
    refreshSets();
  }, []);

  const handleCreateSet = () => {
    const newSet: PracticeSet = {
      id: `set-${Date.now()}`,
      title: 'New Practice Set',
      description: '',
      isPublished: false,
      sections: []
    };
    setEditingSet(newSet);
  };

  const handleDeleteSet = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    if (window.confirm('Are you sure you want to delete this Practice Set? This cannot be undone.')) {
      await API.deleteSet(id);
      refreshSets();
    }
  };

  const handleSaveSet = async () => {
    if (editingSet) {
      setIsSaving(true);
      const success = await API.saveSet(editingSet);
      setIsSaving(false);
      
      if (success) {
        await refreshSets();
        setEditingSet(null);
      } else {
        alert("Failed to save the practice set. Please check the following:\n1. Your internet connection.\n2. That images aren't too large.\n3. The database schema is up to date.");
      }
    }
  };

  if (editingSet) {
    return (
      <SetEditor 
        set={editingSet} 
        onChange={setEditingSet} 
        onSave={handleSaveSet} 
        onCancel={() => {
          if (window.confirm("Discard unsaved changes?")) {
            setEditingSet(null);
          }
        }}
        isSaving={isSaving}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="flex justify-between items-center mb-8 max-w-6xl mx-auto bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-xs text-slate-500">Content Management System</p>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">{user.email}</span>
           <Button variant="outline" size="sm" onClick={onLogout}>Logout</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-slate-800">Practice Sets</h2>
          <Button onClick={handleCreateSet} className="shadow-sm">+ Create New Set</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sets.map(set => (
            <div 
              key={set.id} 
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow"
            >
              <div 
                className="p-6 cursor-pointer hover:bg-slate-50 transition-colors flex-1"
                onClick={() => setEditingSet(set)}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full ${set.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {set.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 mb-2 truncate">{set.title}</h3>
                <p className="text-slate-500 text-xs mb-4 h-10 overflow-hidden">{set.description || 'No description provided.'}</p>
                <div className="flex items-center gap-2 pt-2 mt-auto">
                  <div className="flex -space-x-1 overflow-hidden">
                     {set.sections.slice(0,4).map((s, i) => (
                       <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">
                         {s.type[0]}
                       </div>
                     ))}
                  </div>
                  <span className="text-xs text-slate-400">{set.sections.length} Sections</span>
                </div>
              </div>
              
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center z-10 relative">
                 <button onClick={() => setEditingSet(set)} className="text-xs font-bold text-blue-600 hover:text-blue-700">Edit</button>
                 <button 
                    onClick={(e) => handleDeleteSet(e, set.id)} 
                    className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors z-20 cursor-pointer"
                    type="button"
                 >
                    <svg className="w-3 h-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Delete
                 </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

// 3. SET EDITOR
interface SetEditorProps {
  set: PracticeSet;
  onChange: (s: PracticeSet) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

const SetEditor: React.FC<SetEditorProps> = ({ set, onChange, onSave, onCancel, isSaving }) => {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(set.sections[0]?.id || null);

  const addSection = (type: 'READING' | 'WRITING') => {
    const newSection = {
      id: `sec-${Date.now()}`,
      setId: set.id,
      type,
      title: `New ${type} Section`,
      parts: []
    };
    onChange({ ...set, sections: [...set.sections, newSection] });
    setActiveSectionId(newSection.id);
  };

  const updateSection = (sectionId: string, updates: Partial<any>) => {
    const newSections = set.sections.map(s => s.id === sectionId ? { ...s, ...updates } : s);
    onChange({ ...set, sections: newSections });
  };

  const deleteSection = (sectionId: string) => {
    const newSections = set.sections.filter(s => s.id !== sectionId);
    onChange({ ...set, sections: newSections });
    if (activeSectionId === sectionId) setActiveSectionId(null);
  };

  const addPart = (sectionId: string) => {
    const section = set.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const newPart = {
      id: `part-${Date.now()}`,
      sectionId,
      timerSeconds: 600,
      contentText: '',
      questions: [],
      instructions: 'Read the text and answer the questions.'
    };
    
    const updatedSection = { ...section, parts: [...section.parts, newPart] };
    updateSection(sectionId, updatedSection);
  };

  const activeSection = set.sections.find(s => s.id === activeSectionId);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>&larr; Back</Button>
          <div className="h-6 w-px bg-slate-300"></div>
          <div className="flex flex-col">
             <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Set Title</label>
             <input 
               value={set.title} 
               onChange={e => onChange({ ...set, title: e.target.value })}
               className="font-bold text-lg border border-slate-300 rounded px-2 py-1 text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-96"
               placeholder="e.g. CELPIP Mock Test 1"
               disabled={isSaving}
             />
          </div>
        </div>
        <div className="flex gap-4 items-center">
           <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
             <input 
               type="checkbox" 
               checked={set.isPublished} 
               onChange={e => onChange({ ...set, isPublished: e.target.checked })} 
               className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
               disabled={isSaving}
             />
             Published
           </label>
           <Button onClick={onSave} className="shadow-blue-200 shadow-md min-w-[120px]" disabled={isSaving}>
             {isSaving ? 'Saving...' : 'Save Changes'}
           </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: Sections List */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col overflow-y-auto z-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-700 text-xs uppercase tracking-wider mb-3">Test Sections</h3>
            <div className="grid grid-cols-2 gap-2">
               <button onClick={() => addSection('READING')} disabled={isSaving} className="flex flex-col items-center justify-center p-2 text-xs bg-white border border-slate-200 rounded hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm disabled:opacity-50">
                  <span className="font-bold">+ Reading</span>
               </button>
               <button onClick={() => addSection('WRITING')} disabled={isSaving} className="flex flex-col items-center justify-center p-2 text-xs bg-white border border-slate-200 rounded hover:border-green-400 hover:text-green-600 transition-colors shadow-sm disabled:opacity-50">
                  <span className="font-bold">+ Writing</span>
               </button>
            </div>
          </div>
          <div className="p-2 space-y-1">
            {set.sections.map((section, idx) => (
              <div 
                key={section.id} 
                className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-all ${activeSectionId === section.id ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'hover:bg-slate-50 text-slate-600 border border-transparent'}`}
                onClick={() => !isSaving && setActiveSectionId(section.id)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                   <span className="text-[10px] font-bold opacity-50 w-4">{idx + 1}.</span>
                   <span className="text-sm font-medium truncate">{section.title}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                  disabled={isSaving}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 px-1 transition-opacity disabled:opacity-0"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            {set.sections.length === 0 && <p className="text-xs text-slate-400 p-8 text-center italic">No sections yet.<br/>Add one to begin.</p>}
          </div>
        </aside>

        {/* Main Content: Section Editor */}
        <main className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
          {activeSection ? (
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Section Configuration</h3>
                <Input 
                  label="Section Title" 
                  value={activeSection.title} 
                  onChange={e => updateSection(activeSection.id, { title: e.target.value })} 
                  className="bg-white text-slate-900"
                  disabled={isSaving}
                />
              </div>

              {/* Parts Editor */}
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                   <h3 className="text-lg font-bold text-slate-800">Content Parts & Timers</h3>
                   <Button size="sm" variant="secondary" onClick={() => addPart(activeSection.id)} disabled={isSaving}>+ Add Content</Button>
                </div>
                
                {activeSection.parts.map((part, index) => (
                  <PartEditor 
                    key={part.id} 
                    part={part} 
                    index={index} 
                    sectionType={activeSection.type}
                    onChange={(updatedPart) => {
                      const newParts = [...activeSection.parts];
                      newParts[index] = updatedPart;
                      updateSection(activeSection.id, { parts: newParts });
                    }}
                    onDelete={() => {
                      const newParts = activeSection.parts.filter(p => p.id !== part.id);
                      updateSection(activeSection.id, { parts: newParts });
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
             <div className="flex h-full flex-col items-center justify-center text-slate-400">
                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                <p>Select a section to edit content</p>
             </div>
          )}
        </main>
      </div>
    </div>
  );
};

// 4. PART EDITOR (Inner component for SetEditor)
interface PartEditorProps {
  part: any;
  index: number;
  sectionType: string;
  onChange: (p: any) => void;
  onDelete: () => void;
}

const PartEditor: React.FC<PartEditorProps> = ({ part, index, sectionType, onChange, onDelete }) => {
  const [timerMode, setTimerMode] = useState<'sec' | 'mmss'>('sec');

  const addItem = (type: QuestionType) => {
    const newItem = {
      id: `item-${Date.now()}`,
      partId: part.id,
      text: type === 'MCQ' ? '' : type === 'CLOZE' ? '' : '',
      type,
      options: type !== 'PASSAGE' ? ['', '', '', ''] : undefined,
      correctAnswer: type !== 'PASSAGE' ? '' : undefined,
      weight: 1
    };
    onChange({ ...part, questions: [...part.questions, newItem] });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ ...part, imageData: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const formatMMSS = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const parseMMSS = (val: string) => {
    if (val.includes(':')) {
      const [m, s] = val.split(':').map(Number);
      return (m || 0) * 60 + (s || 0);
    }
    return parseInt(val) || 0;
  };

  let questionCounter = 0;
  const numberedQuestions = part.questions.map((q: any) => {
    if (q.type !== 'PASSAGE') {
      questionCounter++;
      return { ...q, displayNum: questionCounter };
    }
    return { ...q, displayNum: null };
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
      {/* Header */}
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <span className="bg-white border border-slate-200 text-slate-500 text-xs font-bold px-2 py-0.5 rounded">PART {index + 1}</span>
           <span className="text-xs text-slate-400">
             {sectionType === 'READING' ? 'Passage & Questions' : 'Writing Prompt'}
           </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
            <div className="bg-slate-100 px-2 py-1 border-r border-slate-200">
               <span className="text-[10px] uppercase font-bold text-slate-500">Timer</span>
            </div>
            <input 
              type="text" 
              className="w-16 text-sm font-bold text-slate-700 outline-none text-center bg-white" 
              value={timerMode === 'sec' ? part.timerSeconds : formatMMSS(part.timerSeconds)}
              onChange={(e) => {
                const val = e.target.value;
                if (timerMode === 'sec') {
                  onChange({ ...part, timerSeconds: parseInt(val) || 0 });
                }
              }}
              onBlur={(e) => {
                 if (timerMode === 'mmss') {
                    onChange({ ...part, timerSeconds: parseMMSS(e.target.value) });
                 }
              }}
              placeholder={timerMode === 'mmss' ? "MM:SS" : "Seconds"}
            />
            <button 
              onClick={() => setTimerMode(m => m === 'sec' ? 'mmss' : 'sec')}
              className="px-2 py-1 text-[10px] bg-slate-50 hover:bg-slate-100 border-l border-slate-200 text-slate-500 font-medium transition-colors"
              title="Toggle format"
            >
              {timerMode === 'sec' ? 'sec' : 'm:s'}
            </button>
          </div>
          <button onClick={onDelete} className="text-slate-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors ml-2">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
      
      {/* Editor Body */}
      <div className="p-5 space-y-4">
         <Input 
          label="Instructions for Student" 
          value={part.instructions} 
          onChange={e => onChange({ ...part, instructions: e.target.value })} 
          placeholder="e.g. Read the following email..."
          className="text-sm bg-white text-slate-900"
        />
      
        <div className="grid grid-cols-2 gap-8 h-[600px]">
           {/* LEFT COLUMN */}
           <div className="flex flex-col space-y-4 h-full overflow-hidden">
              <div className="flex-1 flex flex-col">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Main Reading Passage</label>
                <textarea 
                  className="w-full flex-1 rounded-lg border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono bg-white text-slate-900 leading-relaxed resize-none"
                  value={part.contentText}
                  onChange={e => onChange({ ...part, contentText: e.target.value })}
                  placeholder="Paste the main reading passage here..."
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Reference Image (Optional)</label>
                  {part.imageData && (
                    <button 
                      onClick={() => onChange({ ...part, imageData: undefined })}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {!part.imageData ? (
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                ) : (
                  <div className="relative group">
                    <img src={part.imageData} alt="Preview" className="h-32 w-auto rounded border shadow-sm object-contain bg-white" />
                  </div>
                )}
              </div>
           </div>

           {/* RIGHT COLUMN */}
           <div className="flex flex-col h-full overflow-hidden bg-slate-50 rounded-xl border border-slate-200 p-4">
              {sectionType === 'READING' ? (
                <>
                   <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar mb-4">
                     {numberedQuestions.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-xs italic">
                           Add Questions, Passages, or Cloze Definitions here.
                        </div>
                     )}
                     {numberedQuestions.map((q: any, qIdx: number) => (
                       <div key={q.id} className="bg-white p-3 rounded-lg border border-slate-200 text-sm shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center mb-2">
                             <div className="flex items-center gap-2">
                               {q.displayNum && (
                                 <span className="bg-slate-800 text-white w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold">{q.displayNum}</span>
                               )}
                               <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                 {q.type === 'MCQ' ? 'Question (MCQ)' : q.type === 'PASSAGE' ? 'Passage Block' : 'Cloze Definition'}
                               </span>
                             </div>
                             <button onClick={() => {
                                const newQs = part.questions.filter((item: any) => item.id !== q.id);
                                onChange({ ...part, questions: newQs });
                             }} className="text-slate-300 hover:text-red-500 text-lg font-bold leading-none">&times;</button>
                          </div>
                          
                          {q.type === 'PASSAGE' && (
                             <div className="relative">
                               <textarea 
                                  className="w-full h-32 rounded border border-slate-300 p-2 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono bg-white text-slate-900 leading-relaxed resize-none"
                                  value={q.text}
                                  onChange={e => {
                                    const newQs = [...part.questions];
                                    newQs[qIdx].text = e.target.value;
                                    onChange({ ...part, questions: newQs });
                                  }}
                                  placeholder={"Type passage here... Use [[1]], [[2]] for blanks."}
                                />
                                <div className="absolute bottom-1 right-1 text-[9px] text-slate-400 bg-white/90 px-1 rounded border border-slate-100">
                                  Use <strong>[[ID]]</strong> for blanks
                                </div>
                             </div>
                          )}

                          {q.type === 'CLOZE' && (
                            <div>
                               <div className="flex items-center gap-2 mb-2">
                                  <label className="text-xs font-semibold text-slate-600">ID:</label>
                                  <input 
                                    className="w-20 border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-900 focus:ring-1 focus:ring-blue-500"
                                    placeholder="e.g. 1"
                                    value={q.text}
                                    onChange={e => {
                                      const newQs = [...part.questions];
                                      newQs[qIdx].text = e.target.value;
                                      onChange({ ...part, questions: newQs });
                                    }}
                                  />
                                  <span className="text-[10px] text-slate-400">Matches [[ID]] in passage</span>
                                </div>
                            </div>
                          )}

                          {q.type === 'MCQ' && (
                            <div className="mb-2">
                              <input 
                                className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 mb-2"
                                placeholder="Question Text"
                                value={q.text}
                                onChange={e => {
                                  const newQs = [...part.questions];
                                  newQs[qIdx].text = e.target.value;
                                  onChange({ ...part, questions: newQs });
                                }}
                              />
                            </div>
                          )}

                          {(q.type === 'MCQ' || q.type === 'CLOZE') && (
                            <div className="space-y-1 pl-1">
                               {q.options.map((opt: string, oIdx: number) => (
                                 <div key={oIdx} className="flex items-center gap-2">
                                   <input 
                                     type="radio" 
                                     name={`correct-${q.id}`}
                                     checked={q.correctAnswer === opt && opt !== ''}
                                     onChange={() => {
                                       const newQs = [...part.questions];
                                       newQs[qIdx].correctAnswer = opt;
                                       onChange({ ...part, questions: newQs });
                                     }}
                                     className="h-3 w-3 text-blue-600 cursor-pointer"
                                     title="Mark as correct"
                                   />
                                   <input 
                                     className="flex-1 border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-900 focus:border-blue-500 outline-none"
                                     value={opt}
                                     placeholder={`Option ${oIdx + 1}`}
                                     onChange={e => {
                                       const newQs = [...part.questions];
                                       newQs[qIdx].options[oIdx] = e.target.value;
                                       if (q.correctAnswer === opt) newQs[qIdx].correctAnswer = e.target.value;
                                       onChange({ ...part, questions: newQs });
                                     }}
                                   />
                                 </div>
                               ))}
                               <button 
                                 onClick={() => {
                                    const newQs = [...part.questions];
                                    newQs[qIdx].options.push('');
                                    onChange({ ...part, questions: newQs });
                                 }}
                                 className="text-[10px] text-blue-600 hover:underline pl-5 font-medium"
                               >
                                 + Add Option
                               </button>
                            </div>
                          )}
                       </div>
                     ))}
                   </div>

                   <div className="grid grid-cols-3 gap-2 mt-auto pt-2 border-t border-slate-200">
                     <button onClick={() => addItem('MCQ')} className="py-2 text-[10px] font-bold bg-white border border-slate-300 rounded hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm text-slate-700">
                       + MCQ
                     </button>
                     <button onClick={() => addItem('PASSAGE')} className="py-2 text-[10px] font-bold bg-white border border-slate-300 rounded hover:bg-slate-50 hover:text-purple-600 transition-colors shadow-sm text-slate-700">
                       + Passage
                     </button>
                     <button onClick={() => addItem('CLOZE')} className="py-2 text-[10px] font-bold bg-white border border-slate-300 rounded hover:bg-slate-50 hover:text-amber-600 transition-colors shadow-sm text-slate-700">
                       + Cloze Def
                     </button>
                   </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col h-full min-h-[500px]">
                   <div className="flex justify-between items-center mb-2">
                     <label className="font-bold text-slate-700 uppercase text-xs tracking-wider">Student Response Area (Preview)</label>
                   </div>
                   <TextArea 
                     className="flex-1 w-full p-6 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 resize-none font-mono text-base leading-relaxed cursor-not-allowed min-h-[500px]"
                     placeholder="Students will type their response here..."
                     disabled
                     value=""
                   />
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

// 5. TEST RUNNER
interface TestRunnerProps {
  set: PracticeSet;
  sections: Section[];
  onComplete: (results: { sectionScores: Record<string, SectionResult> }) => void;
  onExit: () => void;
}

const TestRunner: React.FC<TestRunnerProps> = ({ set, sections, onComplete, onExit }) => {
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentPartIdx, setCurrentPartIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [writingInputs, setWritingInputs] = useState<Record<string, string>>({});
  
  const currentSection = sections[currentSectionIdx];
  const currentPart = currentSection?.parts[currentPartIdx];

  const [timeLeft, setTimeLeft] = useState(currentPart?.timerSeconds || 0);

  useEffect(() => {
    setTimeLeft(currentPart?.timerSeconds || 0);
  }, [currentPart]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentPart, currentSection]);

  const handleNext = () => {
    if (currentPartIdx < currentSection.parts.length - 1) {
      setCurrentPartIdx(p => p + 1);
    } else if (currentSectionIdx < sections.length - 1) {
      setCurrentSectionIdx(s => s + 1);
      setCurrentPartIdx(0);
    } else {
      finishTest();
    }
  };

  const finishTest = () => {
    // Grading Logic
    const sectionScores: Record<string, SectionResult> = {};
    
    sections.forEach(sec => {
      let score = 0;
      let max = 0;
      
      if (sec.type === 'READING' || sec.type === 'LISTENING') {
        sec.parts.forEach(part => {
          part.questions.forEach(q => {
            if (q.type !== 'PASSAGE') {
              max += q.weight;
              if (answers[q.id] === q.correctAnswer) {
                score += q.weight;
              }
            }
          });
        });
        // Mock Band calculation (simple percentage mapping)
        const percentage = max === 0 ? 0 : (score / max) * 100;
        let band = 0;
        if (percentage > 90) band = 12;
        else if (percentage > 80) band = 10;
        else if (percentage > 70) band = 8;
        else if (percentage > 60) band = 7;
        else band = 5;
        
        sectionScores[sec.id] = { score, max, band, type: sec.type };
      } else {
        // Writing/Speaking - Mock grading based on input length
        const input = writingInputs[sec.id] || '';
        const wordCount = input.split(/\s+/).length;
        let band = 5;
        if (wordCount > 150) band = 9;
        else if (wordCount > 100) band = 7;
        
        sectionScores[sec.id] = { score: 0, max: 0, band, type: sec.type };
      }
    });
    
    onComplete({ sectionScores });
  };

  // Inline Cloze Parser Component
  const renderClozeContent = (text: string, questions: any[]) => {
    const parts = text.split(/(\[\[\s*\w+\s*\]\])/g);
    return (
      <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed font-serif text-lg bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm mb-6">
        {parts.map((chunk, i) => {
          const match = chunk.match(/\[\[\s*(\w+)\s*\]\]/);
          if (match) {
            const placeholderId = match[1];
            // Find question with text matching the placeholder ID
            const question = questions.find(q => q.type === 'CLOZE' && q.text === placeholderId);
            if (question) {
               return (
                 <span key={i} className="inline-block mx-1 align-middle">
                   <Dropdown 
                     options={question.options || []}
                     value={answers[question.id] || ''}
                     onChange={(val) => setAnswers(prev => ({ ...prev, [question.id]: val }))}
                     placeholder={`[${placeholderId}]`}
                     className="min-w-[120px] font-sans text-sm border-blue-200 bg-white"
                   />
                 </span>
               );
            }
            return <span key={i} className="text-red-500 font-bold font-mono text-sm bg-red-50 px-1 rounded border border-red-200" title="Missing Question Definition">[[{placeholderId}?]]</span>;
          }
          return <span key={i}>{chunk}</span>;
        })}
      </div>
    );
  };

  if (!currentPart) return <div>Loading...</div>;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Pre-calculate questions for rendering
  let questionCounter = 0;
  const numberedQuestions = currentPart.questions.map((q: any) => {
     if (q.type !== 'PASSAGE') {
        questionCounter++;
        return { ...q, displayNum: questionCounter };
     }
     return { ...q, displayNum: null };
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-md z-10">
        <div>
          <h2 className="font-bold text-lg">{currentSection.title}</h2>
          <p className="text-xs text-slate-400">Part {currentPartIdx + 1} of {currentSection.parts.length}</p>
        </div>
        <div className="font-mono text-xl font-bold bg-slate-800 px-4 py-2 rounded text-yellow-400 shadow-inner">
          {formatTime(timeLeft)}
        </div>
        <Button variant="secondary" size="sm" onClick={onExit} className="opacity-80 hover:opacity-100">Exit Test</Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Content/Prompt */}
        <div className="w-1/2 p-8 overflow-y-auto border-r border-slate-200 bg-white">
          <div className="prose max-w-none text-slate-800">
             {currentPart.instructions && (
               <div className="bg-blue-50 p-4 rounded-lg mb-6 text-sm text-blue-800 font-medium border border-blue-100 shadow-sm">
                 {currentPart.instructions}
               </div>
             )}
             {currentPart.imageData && (
                <img src={currentPart.imageData} alt="Reference" className="mb-6 rounded-lg shadow-sm max-h-64 object-contain" />
             )}
             <div className="whitespace-pre-wrap font-serif text-lg leading-loose">
               {currentPart.contentText}
             </div>
          </div>
        </div>

        {/* Right: Questions/Input */}
        <div className="w-1/2 p-8 overflow-y-auto bg-slate-50">
           {currentSection.type === 'READING' || currentSection.type === 'LISTENING' ? (
             <div className="space-y-6 max-w-xl mx-auto">
               {numberedQuestions.map((q: any) => {
                 if (q.type === 'PASSAGE') {
                    return <React.Fragment key={q.id}>{renderClozeContent(q.text, numberedQuestions)}</React.Fragment>;
                 }
                 if (q.type === 'CLOZE') return null;
                 
                 return (
                    <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
                       <p className="font-bold text-slate-900 mb-4 flex gap-2">
                         <span className="bg-slate-800 text-white w-6 h-6 flex items-center justify-center rounded text-xs">{q.displayNum}</span>
                         {q.text}
                       </p>
                       <div className="space-y-2">
                          {q.options?.map((opt: string) => (
                            <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${answers[q.id] === opt ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'hover:bg-slate-50 border-slate-200'}`}>
                               <input 
                                 type="radio" 
                                 name={q.id} 
                                 value={opt}
                                 checked={answers[q.id] === opt}
                                 onChange={() => setAnswers(prev => ({...prev, [q.id]: opt}))}
                                 className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                               />
                               <span className="text-sm text-slate-700">{opt}</span>
                            </label>
                          ))}
                       </div>
                    </div>
                 );
               })}
             </div>
           ) : (
             <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-2">
                     <label className="font-bold text-slate-700 uppercase text-xs tracking-wider">Your Response</label>
                     <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                       Word Count: {(writingInputs[currentSection.id] || '').split(/\s+/).filter(w => w).length}
                     </span>
                </div>
                <TextArea 
                  className="flex-1 w-full p-6 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-base leading-relaxed bg-white text-slate-900 transition-colors shadow-inner min-h-[500px]"
                  placeholder="Type your response here..."
                  value={writingInputs[currentSection.id] || ''}
                  onChange={e => setWritingInputs(prev => ({...prev, [currentSection.id]: e.target.value}))}
                />
             </div>
           )}
        </div>
      </div>

      <footer className="bg-white border-t border-slate-200 p-4 flex justify-end shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
         <Button onClick={handleNext} size="lg" className="px-8 shadow-blue-200 shadow-lg">
           {currentPartIdx === currentSection.parts.length - 1 && currentSectionIdx === sections.length - 1 ? 'Finish Test' : 'Next'}
         </Button>
      </footer>
    </div>
  );
};

// 6. USER DASHBOARD
interface UserDashboardProps {
  user: User;
  onLogout: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'PRACTICE' | 'HISTORY'>('PRACTICE');
  const [view, setView] = useState<'HOME' | 'TEST'>('HOME');
  const [selectedSet, setSelectedSet] = useState<PracticeSet | null>(null);
  const [attemptHistory, setAttemptHistory] = useState<Attempt[]>([]);
  const [sets, setSets] = useState<PracticeSet[]>([]);
  
  // Modal State for Selection
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSet, setModalSet] = useState<PracticeSet | null>(null);
  // Avoid using useState<Set<string>> directly inside component body to prevent parser confusion
  const [selectedSectionIds, setSelectedSectionIds] = useState(new Set<string>());

  const fetchData = () => {
     API.getAttempts(user.id).then(setAttemptHistory);
     API.getSets().then((data) => {
       setSets(data.filter(s => s.isPublished));
     });
  };

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const openStartModal = (set: PracticeSet) => {
    setModalSet(set);
    // Default select all
    setSelectedSectionIds(new Set(set.sections.map(s => s.id)));
    setIsModalOpen(true);
  };

  const handleStartTest = () => {
    if (!modalSet) return;
    // Filter sections
    const sectionsToTake = modalSet.sections.filter(s => selectedSectionIds.has(s.id));
    if (sectionsToTake.length === 0) {
      alert("Please select at least one section.");
      return;
    }
    
    setSelectedSet(modalSet);
    setIsModalOpen(false);
    setView('TEST');
  };

  const handleTestComplete = async (results: any) => {
    if (!selectedSet) return;
    
    // Calculate Overall Band (Average of selected sections)
    const sectionIds = Object.keys(results.sectionScores);
    const totalBands = sectionIds.reduce((sum, id) => sum + results.sectionScores[id].band, 0);
    const avgBand = sectionIds.length > 0 ? parseFloat((totalBands / sectionIds.length).toFixed(1)) : 0;

    const newAttempt: Attempt = {
      id: `att-${Date.now()}`,
      userId: user.id,
      setId: selectedSet.id,
      setTitle: selectedSet.title,
      date: new Date().toLocaleDateString(),
      sectionScores: results.sectionScores,
      bandScore: avgBand
    };
    
    await API.saveAttempt(newAttempt);
    fetchData(); // Refresh history
    setView('HOME');
    setActiveTab('HISTORY'); // Switch to history tab to show results
    setSelectedSet(null);
  };

  const toggleSectionSelection = (id: string) => {
    const newSet = new Set(selectedSectionIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSectionIds(newSet);
  };

  if (view === 'TEST' && selectedSet) {
    // Pass filtered sections to TestRunner
    const filteredSections = selectedSet.sections.filter(s => selectedSectionIds.has(s.id));
    return <TestRunner set={selectedSet} sections={filteredSections} onComplete={handleTestComplete} onExit={() => setView('HOME')} />;
  }

  // Parse History Data for Chart
  const chartData = attemptHistory.map((h, i) => {
    const dataPoint: any = { name: `Test ${i + 1}`, date: h.date };
    // Check if sectionScores is the new detailed object format
    Object.values(h.sectionScores).forEach((score: any) => {
       if (typeof score === 'object' && score.type) {
         dataPoint[score.type] = score.band;
       }
    });
    return dataPoint;
  }).slice(-10); // Last 10 attempts

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white shadow-sm border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">CP</div>
            <h1 className="font-bold text-xl text-slate-900 tracking-tight">CELPrep Master</h1>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-sm font-medium text-slate-600 hidden sm:block">Welcome, {user.name}</span>
             <Button variant="outline" size="sm" onClick={onLogout}>Sign Out</Button>
          </div>
        </div>
      </nav>

      {/* TABS HEADER */}
      <div className="bg-white border-b border-slate-200">
         <div className="max-w-6xl mx-auto flex gap-8 px-6">
            <button 
              onClick={() => setActiveTab('PRACTICE')}
              className={`py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'PRACTICE' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Practice Sets
            </button>
            <button 
              onClick={() => setActiveTab('HISTORY')}
              className={`py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'HISTORY' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              My History & Progress
            </button>
         </div>
      </div>

      <main className="max-w-6xl mx-auto p-6 space-y-10 pb-20">
        
        {/* PRACTICE TAB */}
        {activeTab === 'PRACTICE' && (
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              Available Practice Sets
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{sets.length}</span>
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sets.map(set => (
                <div 
                  key={set.id} 
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-lg transition-all"
                >
                  <div className="h-1.5 bg-gradient-to-r from-blue-500 to-purple-500 w-full"></div>
                  <div 
                    className="p-6 cursor-pointer hover:bg-slate-50 transition-colors flex-1"
                    onClick={() => openStartModal(set)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full bg-green-100 text-green-700">
                        Ready
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2 truncate">{set.title}</h3>
                    <p className="text-slate-500 text-xs mb-4 h-10 overflow-hidden">{set.description || 'No description provided.'}</p>
                    <div className="flex items-center gap-2 pt-2 mt-auto">
                      <div className="flex -space-x-1 overflow-hidden">
                        {set.sections.slice(0,4).map((s, i) => (
                          <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">
                            {s.type[0]}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-slate-400">{set.sections.length} Sections</span>
                    </div>
                  </div>
                  <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end items-center z-10">
                    <Button size="sm" onClick={() => openStartModal(set)}>Start Practice</Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'HISTORY' && (
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="text-lg font-bold text-slate-800">Band Score Trends</h3>
                   <p className="text-sm text-slate-500">Performance over last 10 attempts</p>
                 </div>
                 {attemptHistory.length > 0 && (
                   <div className="text-right">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Latest Overall</span>
                      <div className="text-2xl font-bold text-blue-600">Band {attemptHistory[0].bandScore}</div>
                   </div>
                 )}
               </div>
               
               <div className="h-80 w-full">
                 {chartData.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="name" tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} dy={10} />
                       <YAxis domain={[0, 12]} tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                       <Tooltip 
                          contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                       />
                       <Legend wrapperStyle={{paddingTop: '20px'}} />
                       <Line type="monotone" dataKey="READING" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                       <Line type="monotone" dataKey="WRITING" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                       <Line type="monotone" dataKey="LISTENING" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                       <Line type="monotone" dataKey="SPEAKING" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                     </LineChart>
                   </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 flex-col">
                       <svg className="w-12 h-12 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                       <p>No test history available.</p>
                    </div>
                 )}
               </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                     <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Set Title</th>
                        <th className="px-6 py-4">Sections Attempted</th>
                        <th className="px-6 py-4">Results (Band)</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {attemptHistory.map(h => (
                        <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-6 py-4 text-slate-600">{h.date}</td>
                           <td className="px-6 py-4 font-medium text-slate-900">{h.setTitle}</td>
                           <td className="px-6 py-4">
                              <div className="flex gap-1">
                                 {Object.values(h.sectionScores).map((s: any, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-bold border border-slate-200">{s.type ? s.type[0] : '?'}</span>
                                 ))}
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex gap-3 flex-wrap">
                                 {Object.values(h.sectionScores).map((s: any, i) => (
                                    <div key={i} className="text-xs bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                       <span className="text-slate-400 mr-1 font-bold">{s.type ? s.type.substring(0,1) : '?'}:</span>
                                       <span className={`font-bold ${s.band >= 9 ? 'text-green-600' : s.band >= 7 ? 'text-blue-600' : 'text-slate-700'}`}>{s.band}</span>
                                    </div>
                                 ))}
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          </section>
        )}
      </main>
      
      {/* SECTION SELECTION MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Configure Your Practice Test"
      >
         <div className="space-y-4">
            <p className="text-sm text-slate-500">Select which sections you want to practice. The standard CELPIP test includes all sections.</p>
            
            <div className="space-y-2 border border-slate-200 rounded-lg p-4 bg-slate-50">
               {modalSet?.sections.map(sec => (
                  <label key={sec.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded cursor-pointer hover:border-blue-400 transition-colors">
                     <input 
                        type="checkbox" 
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                        checked={selectedSectionIds.has(sec.id)}
                        onChange={() => toggleSectionSelection(sec.id)}
                     />
                     <div>
                        <div className="font-bold text-slate-800 text-sm">{sec.title}</div>
                        <div className="text-xs text-slate-400 font-medium tracking-wide">{sec.type}</div>
                     </div>
                  </label>
               ))}
            </div>

            <div className="flex justify-end pt-4 gap-3">
               <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
               <Button onClick={handleStartTest} disabled={selectedSectionIds.size === 0}>Start Test</Button>
            </div>
         </div>
      </Modal>

    </div>
  );
};

// 7. APP ROOT
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  // Load user from local storage if available (mock implementation)
  useEffect(() => {
     const storedUser = localStorage.getItem('celprep_user');
     if (storedUser) {
        setUser(JSON.parse(storedUser));
     }
  }, []);

  const handleLogin = (u: User) => {
     setUser(u);
     localStorage.setItem('celprep_user', JSON.stringify(u));
  };

  const handleLogout = () => {
     setUser(null);
     localStorage.removeItem('celprep_user');
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;
  
  if (user.role === 'admin') {
     return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  return <UserDashboard user={user} onLogout={handleLogout} />;
};

export default App;
