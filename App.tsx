
import React, { useState, useEffect } from 'react';
import { User, PracticeSet, Attempt, QuestionType } from './types';
import { API } from './services/api';
import { Button } from './components/Button';
import { Input, TextArea } from './components/Input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- HELPER COMPONENTS ---

const Dropdown: React.FC<{
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ options, value, onChange, placeholder, className }) => (
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

const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
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
const LoginScreen: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
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
const AdminDashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
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
              {/* Card Body - Clickable to Edit */}
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
              
              {/* Card Footer - Actions */}
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
const SetEditor: React.FC<{ 
  set: PracticeSet; 
  onChange: (s: PracticeSet) => void; 
  onSave: () => void; 
  onCancel: () => void;
  isSaving: boolean;
}> = ({ set, onChange, onSave, onCancel, isSaving }) => {
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
const PartEditor: React.FC<{ 
  part: any; 
  index: number; 
  sectionType: string;
  onChange: (p: any) => void; 
  onDelete: () => void; 
}> = ({ part, index, sectionType, onChange, onDelete }) => {
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

  // Logic to calculate numbering for list items
  // Passages do NOT get a number.
  // MCQs and Cloze Definitions GET a number.
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
      
        {/* Split Columns */}
        <div className="grid grid-cols-2 gap-8 h-[600px]">
           {/* LEFT COLUMN: Main Passage -> Image */}
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

           {/* RIGHT COLUMN: Flexible List */}
           <div className="flex flex-col h-full overflow-hidden bg-slate-50 rounded-xl border border-slate-200 p-4">
              {sectionType === 'READING' ? (
                <>
                   {/* Item List */}
                   <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar mb-4">
                     {numberedQuestions.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-xs italic">
                           Add Questions, Passages, or Cloze Definitions here.
                        </div>
                     )}
                     {numberedQuestions.map((q: any, qIdx: number) => (
                       <div key={q.id} className="bg-white p-3 rounded-lg border border-slate-200 text-sm shadow-sm hover:shadow-md transition-shadow">
                          {/* Item Header */}
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
                          
                          {/* PASSAGE TYPE */}
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

                          {/* CLOZE TYPE */}
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

                          {/* MCQ TYPE */}
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

                          {/* OPTIONS (For MCQ & CLOZE) */}
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

                   {/* Add Buttons */}
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
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs text-center p-6 border-2 border-dashed border-slate-200 rounded-lg">
                  <p>Writing tasks: User gets a text area.</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

// 5. TEST TAKER INTERFACE
const TestRunner: React.FC<{ 
  set: PracticeSet; 
  onComplete: (score: any) => void; 
  onExit: () => void 
}> = ({ set, onComplete, onExit }) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [writingInputs, setWritingInputs] = useState<Record<string, string>>({});

  const section = set.sections[currentSectionIndex];
  const part = section?.parts[currentPartIndex];

  useEffect(() => {
    if (part) {
      setTimeLeft(part.timerSeconds || 600);
    }
  }, [part]);

  useEffect(() => {
    if (timeLeft <= 0 && part) {
      return; 
    }
    const timer = setInterval(() => setTimeLeft(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, part]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleNext = () => {
    if (currentPartIndex < section.parts.length - 1) {
      setCurrentPartIndex(prev => prev + 1);
    } else if (currentSectionIndex < set.sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      setCurrentPartIndex(0);
    } else {
      finishTest();
    }
  };

  const finishTest = async () => {
    const scores: Record<string, number> = {};
    let totalQuestions = 0;
    let correctQuestions = 0;

    set.sections.forEach(sec => {
      if (sec.type === 'READING') {
        let secScore = 0;
        sec.parts.forEach(p => {
          p.questions.forEach(q => {
            // Only count MCQs and CLOZE definitions as scorable questions
            if (q.type !== 'PASSAGE') {
              totalQuestions++;
              if (answers[q.id] === q.correctAnswer) {
                secScore += q.weight;
                correctQuestions++;
              }
            }
          });
        });
        scores[sec.id] = secScore;
      }
      if (sec.type === 'WRITING') scores[sec.id] = 10; 
    });

    const results = { sectionScores: scores, totalCorrect: correctQuestions, totalPossible: totalQuestions };
    onComplete(results);
  };

  // Logic to calculate numbering for displayed questions (skipping Passages)
  // We need to calculate this once upfront so numbers are consistent
  let questionCounter = 0;
  const numberedQuestions = part ? part.questions.map((q: any) => {
     if (q.type !== 'PASSAGE') {
        questionCounter++;
        return { ...q, displayNum: questionCounter };
     }
     return { ...q, displayNum: null };
  }) : [];

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

  if (!section || !part) return <div>Loading...</div>;

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Test Header */}
      <header className="bg-slate-900 text-white px-6 py-3 flex justify-between items-center shadow-lg z-20">
        <div>
          <h2 className="text-lg font-bold tracking-wide">{section.type} SECTION</h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
             <span>{section.title}</span>
             <span>•</span>
             <span className="text-blue-400">Part {currentPartIndex + 1} of {section.parts.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <div className={`text-xl font-mono font-bold bg-slate-800 px-3 py-1 rounded ${timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
             {formatTime(timeLeft)}
           </div>
           <Button variant="danger" size="sm" onClick={onExit} className="opacity-80 hover:opacity-100">Exit Test</Button>
           <Button variant="primary" onClick={handleNext} className="bg-blue-600 hover:bg-blue-500 font-bold px-6">
             {currentSectionIndex === set.sections.length - 1 && currentPartIndex === section.parts.length - 1 ? 'Finish Test' : 'Next Part →'}
           </Button>
        </div>
      </header>

      {/* Split Pane Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Instructions -> Text -> Image */}
        <div className="w-1/2 p-8 overflow-y-auto border-r border-slate-200 bg-slate-50 scroll-smooth">
           <div className="mb-8">
             {part.instructions && (
                 <div className="bg-blue-50 text-blue-900 p-4 rounded-lg mb-6 text-sm font-medium border border-blue-100 shadow-sm flex items-start gap-3">
                   <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   {part.instructions}
                 </div>
             )}
             
             <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed font-serif text-lg whitespace-pre-line mb-6">
                {part.contentText}
             </div>

             {part.imageData && (
                 <img src={part.imageData} alt="Reference" className="w-full rounded-lg shadow-md border border-slate-200" />
             )}
           </div>
        </div>

        {/* Right Pane: Questions (MCQ) and Passages */}
        <div className="w-1/2 p-8 overflow-y-auto bg-white scroll-smooth relative">
           {section.type === 'READING' ? (
             <div className="space-y-6 pb-12">
                {numberedQuestions.map((q: any) => {
                   if (q.type === 'PASSAGE') {
                      return <React.Fragment key={q.id}>{renderClozeContent(q.text, numberedQuestions)}</React.Fragment>;
                   }
                   if (q.type === 'CLOZE') {
                      return null; // Don't render cloze definitions directly in list
                   }
                   // Standard MCQ
                   return (
                      <div key={q.id} className="p-5 rounded-xl border border-slate-100 hover:border-blue-200 transition-all shadow-sm hover:shadow-md bg-white group">
                        <div className="font-semibold text-slate-900 mb-4 flex gap-3 items-start">
                          <span className="bg-slate-800 text-white w-7 h-7 rounded flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">{q.displayNum}</span>
                          <span className="mt-0.5">{q.text}</span>
                        </div>
                        <div className="space-y-2 ml-10">
                            {q.options?.map((opt: string, oIdx: number) => (
                              <label key={oIdx} className="flex items-start gap-3 cursor-pointer group/opt p-2 rounded hover:bg-slate-50 transition-colors">
                                <div className="relative flex items-center mt-0.5">
                                  <input 
                                    type="radio" 
                                    name={q.id} 
                                    className="peer h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                                    checked={answers[q.id] === opt}
                                    onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                  />
                                </div>
                                <span className="text-slate-700 peer-checked:text-blue-700 font-medium">{opt}</span>
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
                   Word Count: {(writingInputs[section.id] || '').split(/\s+/).filter(w => w.length > 0).length}
                 </span>
               </div>
               <TextArea 
                 className="flex-1 w-full p-6 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-base leading-relaxed bg-white text-slate-900 transition-colors shadow-inner"
                 placeholder="Type your response here..."
                 value={writingInputs[section.id] || ''}
                 onChange={(e) => setWritingInputs(prev => ({ ...prev, [section.id]: e.target.value }))}
               />
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

// 6. USER DASHBOARD
const UserDashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const [view, setView] = useState<'HOME' | 'TEST'>('HOME');
  const [selectedSet, setSelectedSet] = useState<PracticeSet | null>(null);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [sets, setSets] = useState<PracticeSet[]>([]);

  // Selection Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [configSet, setConfigSet] = useState<PracticeSet | null>(null);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    API.getAttempts(user.id).then(setHistory);
    API.getSets().then((data) => {
      setSets(data.filter(s => s.isPublished));
    });
  }, [user.id, view]);

  // Handle clicking "Start Practice"
  const openConfigModal = (set: PracticeSet) => {
    setConfigSet(set);
    // Default: Select all sections
    setSelectedSections(new Set(set.sections.map(s => s.id)));
    setIsModalOpen(true);
  };

  const toggleSection = (sectionId: string) => {
    const newSelection = new Set(selectedSections);
    if (newSelection.has(sectionId)) {
      newSelection.delete(sectionId);
    } else {
      newSelection.add(sectionId);
    }
    setSelectedSections(newSelection);
  };

  const startTest = () => {
    if (!configSet) return;
    
    // Filter the set to only include selected sections
    const filteredSections = configSet.sections.filter(s => selectedSections.has(s.id));
    
    // Create a runtime copy of the set with only selected sections
    const runtimeSet = {
      ...configSet,
      sections: filteredSections
    };

    setSelectedSet(runtimeSet);
    setIsModalOpen(false);
    setView('TEST');
  };

  const handleTestComplete = async (results: any) => {
    // Only happens if selectedSet is not null
    if (!selectedSet) return;

    const newAttempt: Attempt = {
      id: `att-${Date.now()}`,
      userId: user.id,
      setId: selectedSet.id,
      setTitle: selectedSet.title,
      date: new Date().toLocaleDateString(),
      sectionScores: results.sectionScores,
      bandScore: Math.min(12, Math.round((results.totalCorrect / results.totalPossible) * 12) || 0)
    };
    
    await API.saveAttempt(newAttempt);
    setView('HOME');
    setSelectedSet(null);
  };

  if (view === 'TEST' && selectedSet) {
    return <TestRunner set={selectedSet} onComplete={handleTestComplete} onExit={() => setView('HOME')} />;
  }

  // Prepare chart data
  const chartData = history.map((h, i) => ({
    name: `Test ${i + 1}`,
    score: h.bandScore
  }));

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

      <main className="max-w-6xl mx-auto p-6 space-y-10 pb-20">
        {/* Progress Section */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Your Progress</h2>
              <p className="text-slate-500 text-sm mt-1">Track your performance over time</p>
            </div>
            {history.length > 0 && (
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Latest Score</p>
                <p className="text-2xl font-bold text-blue-600">Band {history[history.length-1].bandScore}</p>
              </div>
            )}
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-72">
             {chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="name" tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} dy={10} />
                   <YAxis domain={[0, 12]} tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                   <Tooltip 
                      cursor={{fill: '#f8fafc'}} 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                   />
                   <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={50} />
                 </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-400">
                 <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                 <p>No test history available yet.</p>
                 <p className="text-sm">Complete a test to see your band score trend.</p>
               </div>
             )}
          </div>
        </section>

        {/* Available Tests */}
        <section>
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
                {/* Card Body - Clickable to Start (Opens Modal) */}
                <div 
                  className="p-6 cursor-pointer hover:bg-slate-50 transition-colors flex-1"
                  onClick={() => openConfigModal(set)}
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
                
                {/* Card Footer - Actions */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end items-center z-10">
                   <Button size="sm" onClick={() => openConfigModal(set)}>Start Practice</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Configuration Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Configure Your Practice"
      >
         <div className="space-y-4">
            <p className="text-sm text-slate-500">
               Select the sections you want to practice for <strong>{configSet?.title}</strong>.
            </p>
            <div className="space-y-2 border border-slate-100 bg-slate-50 rounded-lg p-3">
               {configSet?.sections.map(section => (
                  <label key={section.id} className="flex items-center p-3 bg-white border border-slate-200 rounded cursor-pointer hover:border-blue-400 transition-colors">
                     <input 
                        type="checkbox"
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        checked={selectedSections.has(section.id)}
                        onChange={() => toggleSection(section.id)}
                     />
                     <div className="ml-3">
                        <span className="block text-sm font-bold text-slate-700">{section.type}</span>
                        <span className="block text-xs text-slate-400">{section.title}</span>
                     </div>
                  </label>
               ))}
            </div>
            <div className="flex justify-end pt-4 gap-3">
               <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
               <Button onClick={startTest} disabled={selectedSections.size === 0}>
                  Start Test ({selectedSections.size} Sections)
               </Button>
            </div>
         </div>
      </Modal>
    </div>
  );
};

// 7. ROOT COMPONENT
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  if (user.role === 'admin') {
    return <AdminDashboard user={user} onLogout={() => setUser(null)} />;
  }

  return <UserDashboard user={user} onLogout={() => setUser(null)} />;
};

export default App;
