
// ... (imports)
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, PracticeSet, Attempt, QuestionType, Segment, Question, SectionType } from './types';
import { API } from './services/api';
import { Button } from './components/Button';
import { Input, TextArea } from './components/Input';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// --- HELPER COMPONENTS ---
// ... (Dropdown, Modal, RichTextEditor, LoginScreen, AdminDashboard, SetEditor - No changes to these basics)

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

const RichTextEditor: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder, className }) => {
  const contentEditableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentEditableRef.current && contentEditableRef.current.innerHTML !== value) {
       if (contentEditableRef.current.innerHTML === '' && value) {
           contentEditableRef.current.innerHTML = value;
       } else if (value !== contentEditableRef.current.innerHTML) {
           contentEditableRef.current.innerHTML = value;
       }
    }
  }, [value]);

  const handleCommand = (command: string, arg: string | undefined = undefined) => {
    document.execCommand(command, false, arg);
    if (contentEditableRef.current) {
      onChange(contentEditableRef.current.innerHTML);
      contentEditableRef.current.focus();
    }
  };

  return (
    <div className={`border border-slate-300 rounded-md overflow-hidden bg-white flex flex-col ${className}`}>
      <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 p-1.5 sticky top-0 z-10">
        <button type="button" onClick={() => handleCommand('bold')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 font-bold" title="Bold">B</button>
        <button type="button" onClick={() => handleCommand('italic')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 italic" title="Italic">I</button>
        <button type="button" onClick={() => handleCommand('underline')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 underline" title="Underline">U</button>
        <div className="w-px h-4 bg-slate-300 mx-1"></div>
        <button type="button" onClick={() => handleCommand('insertUnorderedList')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Bullet List">
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16M4 6l-1 0M4 12l-1 0M4 18l-1 0" /></svg>
        </button>
        <button type="button" onClick={() => handleCommand('insertOrderedList')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Numbered List">
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h12M7 13h12M7 19h12M3 7h1M3 13h1M3 19h1" /></svg>
        </button>
      </div>
      <div
        ref={contentEditableRef}
        contentEditable
        className="flex-1 p-4 outline-none prose prose-sm max-w-none min-h-[150px] overflow-y-auto"
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onBlur={(e) => onChange(e.currentTarget.innerHTML)}
        data-placeholder={placeholder}
      />
    </div>
  );
};

// 1. LOGIN
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
const SetEditor: React.FC<{ 
  set: PracticeSet; 
  onChange: (s: PracticeSet) => void; 
  onSave: () => void; 
  onCancel: () => void;
  isSaving: boolean;
}> = ({ set, onChange, onSave, onCancel, isSaving }) => {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(set.sections[0]?.id || null);

  const addSection = (type: 'READING' | 'WRITING' | 'LISTENING' | 'SPEAKING') => {
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
      instructions: 'Instructions...',
      segments: [] 
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
               <button onClick={() => addSection('LISTENING')} disabled={isSaving} className="flex flex-col items-center justify-center p-2 text-xs bg-white border border-slate-200 rounded hover:border-amber-400 hover:text-amber-600 transition-colors shadow-sm disabled:opacity-50">
                  <span className="font-bold">+ Listening</span>
               </button>
               <button onClick={() => addSection('SPEAKING')} disabled={isSaving} className="flex flex-col items-center justify-center p-2 text-xs bg-white border border-slate-200 rounded hover:border-purple-400 hover:text-purple-600 transition-colors shadow-sm disabled:opacity-50">
                  <span className="font-bold">+ Speaking</span>
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
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-50 px-1 transition-opacity disabled:opacity-0"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            {set.sections.length === 0 && <p className="text-xs text-slate-400 p-8 text-center italic">No sections yet.<br/>Add one to begin.</p>}
          </div>
        </aside>

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

// 4. SEGMENT EDITOR (UPDATED for Question Audio & Timers)
const SegmentEditor: React.FC<{
  segment: Segment;
  index: number;
  sectionType: string;
  onChange: (s: Segment) => void;
  onDelete: () => void;
}> = ({ segment, index, sectionType, onChange, onDelete }) => {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ ...segment, audioData: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuestionAudioUpload = (qId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            updateQuestion(qId, { audioData: reader.result as string });
        };
        reader.readAsDataURL(file);
    }
  };

  const addQuestion = () => {
    const newQ: Question = {
      id: `q-${Date.now()}`,
      partId: segment.partId,
      segmentId: segment.id,
      text: '',
      type: 'MCQ',
      options: ['', '', '', ''],
      correctAnswer: '',
      weight: 1
    };
    onChange({ ...segment, questions: [...segment.questions, newQ] });
  };

  const updateQuestion = (qId: string, updates: Partial<Question>) => {
     const newQs = segment.questions.map(q => q.id === qId ? { ...q, ...updates } : q);
     onChange({ ...segment, questions: newQs });
  };

  const deleteQuestion = (qId: string) => {
     onChange({ ...segment, questions: segment.questions.filter(q => q.id !== qId) });
  };

  const toggleExpand = (qId: string) => {
      const newSet = new Set(expandedQuestions);
      if (newSet.has(qId)) newSet.delete(qId);
      else newSet.add(qId);
      setExpandedQuestions(newSet);
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 mb-4 relative shadow-sm">
       <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
          <h4 className="font-bold text-slate-700 text-sm">
             {sectionType === 'SPEAKING' ? `Task ${index + 1}` : `Segment ${index + 1}`}
          </h4>
          <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 underline">Delete {sectionType === 'SPEAKING' ? 'Task' : 'Segment'}</button>
       </div>
       
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
             <label className="block text-xs font-bold text-slate-500 mb-1">
                {sectionType === 'SPEAKING' ? 'Audio Prompt (Optional)' : 'Main Audio Track'}
             </label>
             {!segment.audioData ? (
                <input type="file" accept="audio/*" onChange={handleAudioUpload} className="text-xs w-full text-slate-500" />
             ) : (
                <div className="flex flex-col gap-2">
                   <audio controls src={segment.audioData} className="h-8 w-full" />
                   <button onClick={() => onChange({ ...segment, audioData: undefined })} className="text-red-500 text-xs font-bold self-start">Remove Audio</button>
                </div>
             )}
          </div>
          <div>
             <label className="block text-xs font-bold text-slate-500 mb-1">Prep Time (sec)</label>
             <input 
               type="number" 
               className="border rounded px-2 py-1 text-sm w-full bg-white text-slate-900"
               value={segment.prepTimeSeconds}
               onChange={e => onChange({ ...segment, prepTimeSeconds: parseInt(e.target.value) || 0 })}
             />
          </div>
          <div>
             <label className="block text-xs font-bold text-slate-500 mb-1">
                {sectionType === 'SPEAKING' ? 'Recording Time (sec)' : 'Total Time (sec)'}
             </label>
             <input 
               type="number" 
               className="border rounded px-2 py-1 text-sm w-full bg-white text-slate-900"
               value={segment.timerSeconds}
               onChange={e => onChange({ ...segment, timerSeconds: parseInt(e.target.value) || 0 })}
             />
          </div>
       </div>

       <div className="mb-4">
          <label className="block text-xs font-bold text-slate-500 mb-1">
             {sectionType === 'SPEAKING' ? 'Prompt Text / Instructions' : 'Segment Context'}
          </label>
          <RichTextEditor 
             value={segment.contentText || ''} 
             onChange={val => onChange({ ...segment, contentText: val })} 
             className="bg-white min-h-[80px]"
             placeholder="e.g. Listen to the conversation and answer..."
          />
       </div>

       {sectionType === 'LISTENING' && (
         <div className="bg-white border border-slate-200 rounded p-3">
            <div className="flex justify-between items-center mb-2">
               <label className="text-xs font-bold text-slate-500">Questions ({segment.questions.length})</label>
               <button onClick={addQuestion} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-bold border border-blue-100">+ Add MCQ</button>
            </div>
            <div className="space-y-3">
               {segment.questions.map((q, i) => (
                  <div key={q.id} className="border-b border-slate-100 pb-3 last:border-0">
                     <div className="flex gap-2 mb-2 items-center">
                        <span className="text-xs font-bold text-slate-400 w-4">{i + 1}.</span>
                        <input 
                           className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm bg-white text-slate-900"
                           placeholder="Question Text"
                           value={q.text}
                           onChange={e => updateQuestion(q.id, { text: e.target.value })}
                        />
                        <button onClick={() => toggleExpand(q.id)} className="text-slate-400 hover:text-blue-500 text-xs px-2 font-medium">
                            {expandedQuestions.has(q.id) ? 'Hide Settings' : 'Adv. Settings'}
                        </button>
                        <button onClick={() => deleteQuestion(q.id)} className="text-slate-300 hover:text-red-500 font-bold px-2">&times;</button>
                     </div>
                     
                     {/* Advanced Question Settings */}
                     {expandedQuestions.has(q.id) && (
                         <div className="mb-3 ml-6 p-3 bg-slate-50 rounded border border-slate-200 grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Question Audio (Optional)</label>
                                {!q.audioData ? (
                                    <input type="file" accept="audio/*" onChange={(e) => handleQuestionAudioUpload(q.id, e)} className="text-[10px] w-full text-slate-500" />
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <audio controls src={q.audioData} className="h-6 w-full" />
                                        <button onClick={() => updateQuestion(q.id, { audioData: undefined })} className="text-red-500 text-[10px] font-bold self-start">Remove</button>
                                    </div>
                                )}
                             </div>
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Individual Timer (sec)</label>
                                <input 
                                    type="number" 
                                    className="border rounded px-2 py-1 text-xs w-full bg-white text-slate-900"
                                    value={q.timerSeconds || 0}
                                    placeholder="0 (Inherit Segment Timer)"
                                    onChange={e => updateQuestion(q.id, { timerSeconds: parseInt(e.target.value) || 0 })}
                                />
                                <span className="text-[9px] text-slate-400">If set, questions appear sequentially.</span>
                             </div>
                         </div>
                     )}

                     <div className="pl-6 grid grid-cols-2 gap-2">
                        {q.options?.map((opt, oIdx) => (
                           <div key={oIdx} className="flex items-center gap-1">
                              <input 
                                 type="radio" 
                                 name={`seg-q-${q.id}`}
                                 checked={q.correctAnswer === opt && opt !== ''}
                                 onChange={() => updateQuestion(q.id, { correctAnswer: opt })}
                                 className="cursor-pointer"
                              />
                              <input 
                                 className="flex-1 border border-slate-200 rounded px-2 py-0.5 text-xs bg-white text-slate-900"
                                 value={opt}
                                 placeholder={`Option ${oIdx + 1}`}
                                 onChange={e => {
                                    const newOpts = [...(q.options || [])];
                                    newOpts[oIdx] = e.target.value;
                                    let newCorrect = q.correctAnswer;
                                    if (q.correctAnswer === opt) newCorrect = e.target.value;
                                    updateQuestion(q.id, { options: newOpts, correctAnswer: newCorrect });
                                 }}
                              />
                           </div>
                        ))}
                     </div>
                  </div>
               ))}
               {segment.questions.length === 0 && <p className="text-xs text-slate-400 italic text-center py-2">No questions yet. Add one to begin.</p>}
            </div>
         </div>
       )}
    </div>
  );
};

// ... (PartEditor remains largely the same, mostly used for scaffolding)
const PartEditor: React.FC<{ 
  part: any; 
  index: number; 
  sectionType: string;
  onChange: (p: any) => void; 
  onDelete: () => void; 
}> = ({ part, index, sectionType, onChange, onDelete }) => {
  const [timerMode, setTimerMode] = useState<'sec' | 'mmss'>('sec');

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

  if (sectionType === 'LISTENING' || sectionType === 'SPEAKING') {
     const addSegment = () => {
        const newSeg: Segment = {
           id: `seg-${Date.now()}`,
           partId: part.id,
           title: `Segment ${(part.segments?.length || 0) + 1}`,
           contentText: '',
           prepTimeSeconds: 10,
           timerSeconds: 60,
           questions: []
        };
        onChange({ ...part, segments: [...(part.segments || []), newSeg] });
     };

     const updateSegment = (segId: string, updates: Partial<Segment>) => {
        const newSegs = part.segments?.map((s: Segment) => s.id === segId ? { ...s, ...updates } : s) || [];
        onChange({ ...part, segments: newSegs });
     };

     const deleteSegment = (segId: string) => {
        const newSegs = part.segments?.filter((s: Segment) => s.id !== segId) || [];
        onChange({ ...part, segments: newSegs });
     };

     const colorClass = sectionType === 'LISTENING' ? 'amber' : 'purple';

     return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
           <div className={`bg-${colorClass}-50 px-5 py-3 border-b border-${colorClass}-100 flex justify-between items-center`}>
              <div className="flex items-center gap-2">
                 <span className={`bg-white border border-${colorClass}-200 text-${colorClass}-600 text-xs font-bold px-2 py-0.5 rounded`}>PART {index + 1}</span>
                 <span className={`text-xs text-${colorClass}-700 font-medium`}>{sectionType === 'LISTENING' ? 'Listening Task' : 'Speaking Task'}</span>
              </div>
              <button onClick={onDelete} className={`text-${colorClass}-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors`}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
           </div>
           
           <div className="p-5">
              <div className="mb-6">
                 <label className="block text-xs font-bold text-slate-500 mb-2">General Instructions (Shown at start of Part)</label>
                 <Input 
                   value={part.instructions || ''} 
                   onChange={e => onChange({ ...part, instructions: e.target.value })} 
                   placeholder="e.g. Listen/Speak about..."
                   className="bg-white text-slate-900"
                 />
              </div>

              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-800">
                        {sectionType === 'SPEAKING' ? 'Speaking Prompts Sequence' : 'Segments Sequence'}
                    </h4>
                    <Button size="sm" onClick={addSegment} className={`bg-${colorClass}-600 hover:bg-${colorClass}-700 text-white shadow-sm`}>
                        {sectionType === 'SPEAKING' ? '+ Add Prompt' : '+ Add Segment'}
                    </Button>
                 </div>
                 
                 {part.segments && part.segments.length > 0 ? (
                    part.segments.map((seg: Segment, sIdx: number) => (
                       <SegmentEditor 
                          key={seg.id} 
                          segment={seg} 
                          index={sIdx} 
                          sectionType={sectionType}
                          onChange={(updated) => updateSegment(seg.id, updated)}
                          onDelete={() => deleteSegment(seg.id)}
                       />
                    ))
                 ) : (
                    <div className="text-center p-8 bg-slate-50 rounded border border-dashed border-slate-300 text-slate-400 text-xs">
                       {sectionType === 'SPEAKING' ? 'No prompts yet. Add a speaking prompt.' : 'No segments yet. Add an Audio Segment.'}
                    </div>
                 )}
              </div>
           </div>
        </div>
     );
  }

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
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <span className="bg-white border border-slate-200 text-slate-500 text-xs font-bold px-2 py-0.5 rounded">PART {index + 1}</span>
           <span className="text-xs text-slate-400 font-bold uppercase">
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
      
      <div className="p-5 space-y-4">
         <Input 
          label="Instructions for Student" 
          value={part.instructions} 
          onChange={e => onChange({ ...part, instructions: e.target.value })} 
          placeholder="e.g. Read the following email..."
          className="text-sm bg-white text-slate-900"
        />
      
        <div className="grid grid-cols-2 gap-8 h-[600px]">
           <div className="flex flex-col space-y-4 h-full overflow-hidden">
              <div className="flex-1 flex flex-col min-h-0">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Main Reading Passage</label>
                <RichTextEditor 
                  className="w-full flex-1"
                  value={part.contentText}
                  onChange={val => onChange({ ...part, contentText: val })}
                  placeholder="Paste the main reading passage here..."
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 shrink-0">
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
                               <RichTextEditor
                                  className="w-full h-40"
                                  value={q.text}
                                  onChange={val => {
                                    const newQs = [...part.questions];
                                    newQs[qIdx].text = val;
                                    onChange({ ...part, questions: newQs });
                                  }}
                                  placeholder={"Type passage here... Use [[1]], [[2]] for blanks."}
                                />
                                <div className="absolute bottom-1 right-1 text-[9px] text-slate-400 bg-white/90 px-1 rounded border border-slate-100 z-10 pointer-events-none">
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

// --- HELPER COMPONENTS FOR TEST RUNNER ---

const SectionIntro: React.FC<{ title: string; type: SectionType; onStart: () => void }> = ({ title, type, onStart }) => {
  return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl text-center border border-slate-100">
         <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
         <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold tracking-wide uppercase mb-8">{type} SECTION</span>
         
         <div className="space-y-4 mb-8 text-left text-sm text-slate-600 bg-slate-50 p-6 rounded-lg border border-slate-200">
            <p className="flex items-start gap-2">
               <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               <span>This section is timed. The timer will start automatically.</span>
            </p>
            <p className="flex items-start gap-2">
               <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
               <span>Ensure your audio is working (for Listening/Speaking).</span>
            </p>
            <p className="flex items-start gap-2">
               <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               <span>Answer all questions to the best of your ability.</span>
            </p>
         </div>

         <Button size="lg" onClick={onStart} className="w-full py-4 text-lg shadow-blue-200 shadow-lg font-bold">Start Section</Button>
      </div>
    </div>
  );
};

const SectionReview: React.FC<{
  section: any;
  answers: Record<string, any>;
  onContinue: () => void;
}> = ({ section, answers, onContinue }) => {
   return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-8">
         <div className="max-w-lg w-full bg-white p-8 rounded-2xl shadow-xl text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
               <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{section.title} Completed</h2>
            <p className="text-slate-500 mb-8">You have finished this section. Take a moment to breathe before continuing.</p>
            <Button onClick={onContinue} size="lg" className="w-full">Continue to Next Section</Button>
         </div>
      </div>
   );
};

const ClozeRenderer: React.FC<{ 
  htmlContent: string; 
  questions: any[]; 
  answers: Record<string, any>;
  onAnswer: (id: string, val: any) => void;
}> = ({ htmlContent, questions, answers, onAnswer }) => {
  const parts = htmlContent.split(/(\[\[\d+\]\])/g);

  return (
    <div className="prose prose-slate max-w-none leading-loose text-lg">
       {parts.map((part, i) => {
          const match = part.match(/^\[\[(\d+)\]\]$/);
          if (match) {
             const id = match[1];
             const question = questions.find(q => q.type === 'CLOZE' && q.text === id);
             if (!question) return <span key={i} className="text-red-500 font-bold">[{id}?]</span>;
             
             return (
                <span key={i} className="inline-block mx-1 align-middle">
                   <select 
                      className="border-b-2 border-blue-500 bg-blue-50 text-blue-900 px-2 py-1 rounded-t focus:outline-none focus:bg-blue-100 font-bold text-sm"
                      value={answers[question.id] || ''}
                      onChange={(e) => onAnswer(question.id, e.target.value)}
                   >
                      <option value="" disabled>Select...</option>
                      {question.options?.map((opt: string, idx: number) => (
                         <option key={idx} value={opt}>{opt}</option>
                      ))}
                   </select>
                </span>
             );
          }
          return <span key={i} dangerouslySetInnerHTML={{ __html: part }} />;
       })}
    </div>
  );
};

// TEST RUNNER UPDATE: Listening with Question Timers
const TestRunner: React.FC<{ 
  set: PracticeSet; 
  onComplete: (score: any) => void; 
  onExit: () => void 
}> = ({ set, onComplete, onExit }) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0); 
  
  const [viewState, setViewState] = useState<'INTRO' | 'TEST' | 'REVIEW'>('INTRO');
  const [phase, setPhase] = useState<'PREP' | 'WORKING' | 'RECORDING'>('PREP');
  // New State for Listening Question Sequence
  const [listeningStep, setListeningStep] = useState<'MAIN_AUDIO' | number>('MAIN_AUDIO');

  const [volume, setVolume] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [writingInputs, setWritingInputs] = useState<Record<string, string>>({});
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const section = set.sections[currentSectionIndex];
  const part = section?.parts[currentPartIndex];
  const segment = (section?.type === 'LISTENING' || section?.type === 'SPEAKING') ? part?.segments?.[currentSegmentIndex] : null;

  // Initialize Timer based on Section Type
  useEffect(() => {
    if (!part || viewState !== 'TEST') return;

    let newTime = 0;

    if (section.type === 'LISTENING' && segment) {
        if (phase === 'PREP') {
            newTime = segment.prepTimeSeconds;
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        } else {
            // PHASE WORKING
            if (listeningStep === 'MAIN_AUDIO') {
               newTime = segment.timerSeconds; // Usually length of audio or 0 if audio controls timing
               if (audioRef.current) {
                   audioRef.current.volume = volume;
                   audioRef.current.play().catch(e => console.error("Audio play failed", e));
               }
            } else if (typeof listeningStep === 'number') {
               // We are on a specific question
               const q = segment.questions[listeningStep];
               newTime = q.timerSeconds || 30; // Default if not set, or fall back to segment timer logic?
               // If there's question audio, we play it here too
               if (audioRef.current && q.audioData) {
                   audioRef.current.volume = volume;
                   audioRef.current.play().catch(e => console.error("Question audio play failed", e));
               }
            }
        }
    } else if (section.type === 'SPEAKING' && segment) {
        if (phase === 'PREP') {
           newTime = segment.prepTimeSeconds || 30;
           stopRecording();
        } else {
           newTime = segment.timerSeconds || 60;
           startRecording();
        }
    } else {
        newTime = part.timerSeconds || 600;
    }
    
    setTimeLeft(newTime);
  }, [part, segment, phase, section.type, viewState, listeningStep]); // Added listeningStep dependency

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      console.log("Recording started...");
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setIsRecording(true); 
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      console.log("Recording stopped.");
    }
  };

  useEffect(() => {
     if(audioRef.current) {
         audioRef.current.volume = volume;
     }
  }, [volume]);

  // Timer Tick & Auto-Advance
  useEffect(() => {
    if (viewState !== 'TEST') return;
    if (timeLeft === null) return; 

    if (timeLeft <= 0) {
      handleAutoAdvance();
      return; 
    }
    const timer = setInterval(() => setTimeLeft(prev => (prev !== null ? Math.max(0, prev - 1) : null)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, viewState]);

  const handleAutoAdvance = () => {
      setTimeLeft(null); 
      
      if (section.type === 'LISTENING') {
          if (phase === 'PREP') {
              setPhase('WORKING');
              setListeningStep('MAIN_AUDIO');
          } else {
              // We are in WORKING phase.
              // Check if we are doing sequential questions
              const hasSequential = segment?.questions.some(q => (q.timerSeconds || 0) > 0);
              
              if (hasSequential) {
                  if (listeningStep === 'MAIN_AUDIO') {
                      setListeningStep(0); // Go to first question
                  } else if (typeof listeningStep === 'number') {
                      if (listeningStep < (segment?.questions.length || 0) - 1) {
                          setListeningStep(listeningStep + 1);
                      } else {
                          handleNextSegment();
                      }
                  }
              } else {
                  // Standard mode (all questions shown at once), if time is up, move on
                  handleNextSegment();
              }
          }
      } else if (section.type === 'SPEAKING') {
          if (phase === 'PREP') {
              setPhase('RECORDING');
          } else {
              stopRecording();
              handleNextSegment();
          }
      } else {
          handleNext();
      }
  };

  const handleNextSegment = () => {
      setTimeLeft(null); 
      if (part.segments && currentSegmentIndex < part.segments.length - 1) {
          setCurrentSegmentIndex(prev => prev + 1);
          setPhase('PREP');
          setListeningStep('MAIN_AUDIO'); // Reset listening step
      } else {
          handleNext();
      }
  };

  const handleNext = () => {
    if (isRecording) stopRecording();
    setTimeLeft(null);

    const isLastPart = currentPartIndex === section.parts.length - 1;
    
    if (section.type === 'READING' && isLastPart && viewState !== 'REVIEW') {
        setViewState('REVIEW');
        return;
    }

    if (currentPartIndex < section.parts.length - 1) {
      setCurrentPartIndex(prev => prev + 1);
      setCurrentSegmentIndex(0);
      setPhase('PREP');
      setListeningStep('MAIN_AUDIO');
    } else if (currentSectionIndex < set.sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      setCurrentPartIndex(0);
      setCurrentSegmentIndex(0);
      setPhase('PREP');
      setListeningStep('MAIN_AUDIO');
      setViewState('INTRO'); 
    } else {
      finishTest();
    }
  };

  const finishTest = async () => {
    const scores: Record<string, number> = {};
    let totalQuestions = 0;
    let correctQuestions = 0;

    set.sections.forEach(sec => {
      if (sec.type === 'READING' || sec.type === 'LISTENING') {
        let secScore = 0;
        sec.parts.forEach(p => {
            const allQuestions = [...p.questions, ...(p.segments?.flatMap(s => s.questions) || [])];
            allQuestions.forEach(q => {
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
      if (sec.type === 'SPEAKING') scores[sec.id] = 10; 
    });

    const results = { sectionScores: scores, totalCorrect: correctQuestions, totalPossible: totalQuestions };
    onComplete(results);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const renderMainContent = (content: string) => {
      if (content.includes('<') && content.includes('>')) {
          return <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed font-serif text-lg" dangerouslySetInnerHTML={{ __html: content }} />;
      }
      return <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed font-serif text-lg whitespace-pre-wrap">{content}</div>;
  };

  if (viewState === 'INTRO') {
     return <SectionIntro title={section.title} type={section.type} onStart={() => setViewState('TEST')} />;
  }

  if (viewState === 'REVIEW') {
     return <SectionReview section={section} answers={answers} onContinue={() => {
         if (currentSectionIndex < set.sections.length - 1) {
            setCurrentSectionIndex(prev => prev + 1);
            setCurrentPartIndex(0);
            setViewState('INTRO');
         } else {
            finishTest();
         }
     }} />;
  }

  if (!section || !part) return <div>Loading...</div>;

  // --- SPEAKING RENDER ---
  if (section.type === 'SPEAKING') {
     if (!segment) return <div>Invalid Speaking Segment Data</div>;

     return (
        <div className="h-screen flex flex-col bg-white">
           <header className="bg-slate-900 text-white px-6 py-3 flex justify-between items-center shadow-lg z-20">
                <div>
                  <h2 className="text-lg font-bold tracking-wide">SPEAKING TEST</h2>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                     <span>Part {currentPartIndex + 1}</span>
                     <span>•</span>
                     <span className="text-purple-400 font-bold">Task {currentSegmentIndex + 1} of {part.segments?.length || 0}</span>
                     <span>•</span>
                     <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${phase === 'PREP' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white animate-pulse'}`}>
                         {phase === 'PREP' ? 'Prep Time' : 'Recording'}
                     </span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className={`text-xl font-mono font-bold bg-slate-800 px-3 py-1 rounded ${timeLeft !== null && timeLeft < 10 ? 'text-red-400' : 'text-emerald-400'}`}>
                     {formatTime(timeLeft || 0)}
                   </div>
                   <Button variant="danger" size="sm" onClick={onExit} className="opacity-80 hover:opacity-100">Exit</Button>
                   <Button 
                     variant="primary" 
                     onClick={handleAutoAdvance} 
                     className="bg-blue-600 hover:bg-blue-500 font-bold px-6"
                   >
                     Next &rarr;
                   </Button>
                </div>
            </header>
            
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-8">
               <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 h-full max-h-[600px]">
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 overflow-y-auto">
                      <div className="mb-4">
                         <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Instructions</h3>
                         <p className="text-sm font-medium text-slate-800">{part.instructions || "Speak about the topic below."}</p>
                      </div>
                      <div className="prose prose-lg text-slate-900">
                          {renderMainContent(segment.contentText || '')}
                      </div>
                      {segment.audioData && (
                          <div className="mt-4 p-4 bg-slate-50 rounded border border-slate-200">
                              <p className="text-xs font-bold text-slate-500 mb-1 uppercase">Audio Prompt</p>
                              <audio controls src={segment.audioData} className="w-full h-8" />
                          </div>
                      )}
                  </div>

                  <div className="flex flex-col items-center justify-center bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
                      <div className={`relative w-48 h-48 rounded-full flex items-center justify-center mb-8 transition-all duration-300 ${phase === 'RECORDING' ? 'bg-red-50 border-4 border-red-100' : 'bg-slate-50 border-4 border-slate-100'}`}>
                         {phase === 'RECORDING' && (
                             <div className="absolute inset-0 rounded-full border-4 border-red-500 opacity-20 animate-ping"></div>
                         )}
                         <svg className={`w-20 h-20 transition-colors duration-300 ${phase === 'RECORDING' ? 'text-red-500' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                      </div>

                      <h2 className="text-3xl font-bold text-slate-800 mb-2">
                         {phase === 'PREP' ? 'Prepare Your Response' : 'Recording In Progress'}
                      </h2>
                      <p className="text-slate-500 max-w-xs mx-auto">
                         {phase === 'PREP' ? 'Use this time to think about what you want to say.' : 'Speak clearly into your microphone.'}
                      </p>

                      {phase === 'RECORDING' && (
                         <div className="mt-8 flex gap-1 justify-center h-8 items-end">
                            {[...Array(5)].map((_, i) => (
                               <div key={i} className="w-2 bg-red-400 rounded-full animate-bounce" style={{ height: '20px', animationDelay: `${i * 0.1}s` }}></div>
                            ))}
                         </div>
                      )}
                  </div>
               </div>
            </div>
        </div>
     );
  }

  // --- LISTENING RENDER ---
  if (section.type === 'LISTENING') {
      if (!segment) return <div>Invalid Segment Data</div>;

      const hasSequential = segment.questions.some(q => (q.timerSeconds || 0) > 0);
      const activeQuestion = typeof listeningStep === 'number' ? segment.questions[listeningStep] : null;

      // Determine what to display based on step
      const isMainAudio = listeningStep === 'MAIN_AUDIO';
      const showQuestions = !hasSequential || (typeof listeningStep === 'number');

      return (
        <div className="h-screen flex flex-col bg-white">
            <header className="bg-slate-900 text-white px-6 py-3 flex justify-between items-center shadow-lg z-20">
                <div>
                  <h2 className="text-lg font-bold tracking-wide">LISTENING TEST</h2>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                     <span>Part {currentPartIndex + 1}</span>
                     <span>•</span>
                     <span className="text-amber-400 font-bold">Segment {currentSegmentIndex + 1} of {part.segments?.length || 0}</span>
                     <span>•</span>
                     <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${phase === 'PREP' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white animate-pulse'}`}>
                         {phase === 'PREP' ? 'Prep Time' : (isMainAudio ? 'Listening...' : 'Answering')}
                     </span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="flex items-center gap-2 mr-4">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                      <input 
                         type="range" 
                         min="0" 
                         max="1" 
                         step="0.1" 
                         value={volume} 
                         onChange={(e) => setVolume(parseFloat(e.target.value))}
                         className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                   </div>

                   <div className={`text-xl font-mono font-bold bg-slate-800 px-3 py-1 rounded ${timeLeft !== null && timeLeft < 10 ? 'text-red-400' : 'text-emerald-400'}`}>
                     {formatTime(timeLeft || 0)}
                   </div>
                   <Button variant="danger" size="sm" onClick={onExit} className="opacity-80 hover:opacity-100">Exit</Button>
                   <Button 
                     variant="primary" 
                     onClick={handleAutoAdvance} 
                     className="bg-blue-600 hover:bg-blue-500 font-bold px-6"
                   >
                     Next &rarr;
                   </Button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* LEFT PANE: Instructions & Audio */}
                <div className="w-1/2 p-10 overflow-y-auto bg-slate-50 border-r border-slate-200 flex flex-col items-center">
                    <div className="w-full max-w-xl">
                        {part.instructions && (
                             <div className="bg-white border border-slate-200 p-4 rounded-lg mb-8 shadow-sm text-slate-700 text-sm font-medium">
                                 {part.instructions}
                             </div>
                        )}

                        {/* Main Audio Visualization */}
                        {(phase === 'WORKING' && isMainAudio) || phase === 'PREP' ? (
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col items-center text-center">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${phase === 'WORKING' ? 'bg-amber-100 text-amber-600 scale-110 shadow-lg shadow-amber-100 animate-pulse' : 'bg-slate-100 text-slate-300'}`}>
                                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">
                                    {phase === 'PREP' ? 'Prepare to Listen' : 'Listening...'}
                                </h3>
                                
                                <audio 
                                    ref={isMainAudio ? audioRef : null} 
                                    src={segment.audioData} 
                                    className="w-full h-8 opacity-50 pointer-events-none" 
                                    controls={false} 
                                />
                            </div>
                        ) : null}

                        {/* Question Specific Audio */}
                        {activeQuestion?.audioData && (
                            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-8 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4">
                                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2 animate-pulse">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                </div>
                                <p className="text-sm font-bold text-blue-800 mb-2">Listen to Question {listeningStep as number + 1}</p>
                                <audio 
                                    ref={!isMainAudio ? audioRef : null}
                                    src={activeQuestion.audioData} 
                                    className="w-full h-8"
                                    controls={false}
                                />
                            </div>
                        )}

                        {segment.contentText && (
                            <div className="prose prose-sm prose-slate max-w-none bg-white p-6 rounded-lg border border-slate-200">
                                {renderMainContent(segment.contentText)}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANE: Questions */}
                <div className="w-1/2 p-10 overflow-y-auto bg-white">
                    <div className="max-w-xl mx-auto space-y-6">
                        {/* Only show questions if we are not playing main audio, OR if it's simultaneous mode */}
                        {showQuestions ? (
                            (hasSequential ? [activeQuestion] : segment.questions).map((q, i) => {
                                if (!q) return null;
                                // If sequential, index is fixed to current step. If all at once, index is map index
                                const displayIndex = hasSequential ? (listeningStep as number) : i;
                                
                                return (
                                   <div key={q.id} className={`p-5 rounded-xl border transition-all shadow-sm ${phase === 'PREP' ? 'border-slate-100 bg-slate-50' : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'}`}>
                                      <div className="font-semibold text-slate-900 mb-4 flex gap-3 items-start">
                                        <span className="bg-slate-800 text-white w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{displayIndex + 1}</span>
                                        <span className="mt-0.5">{q.text || "Listen to the audio question..."}</span>
                                      </div>
                                      <div className="space-y-2 ml-9">
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
                                )
                            })
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                <p className="text-sm italic">Listen to the audio clip...</p>
                            </div>
                        )}
                        
                        {segment.questions.length === 0 && (
                            <div className="text-center py-12 text-slate-400 text-sm">
                                No questions for this segment. Just listen.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // --- READING / WRITING RENDER ---
  // (Unchanged logic for Reading/Writing)
  let questionDisplayCounter = 0;
  const numberedQuestions = part ? part.questions.map((q: any) => {
     if (q.type !== 'PASSAGE') {
        questionDisplayCounter++;
        return { ...q, displayNum: questionDisplayCounter };
     }
     return { ...q, displayNum: null };
  }) : [];

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* ... (Header and layout logic for Reading/Writing unchanged) ... */}
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
           <div className={`text-xl font-mono font-bold bg-slate-800 px-3 py-1 rounded ${timeLeft !== null && timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
             {formatTime(timeLeft || 0)}
           </div>
           <Button variant="danger" size="sm" onClick={onExit} className="opacity-80 hover:opacity-100">Exit Test</Button>
           <Button variant="primary" onClick={handleNext} className="bg-blue-600 hover:bg-blue-500 font-bold px-6">
             {currentSectionIndex === set.sections.length - 1 && currentPartIndex === section.parts.length - 1 ? 'Finish Test' : 'Next Part →'}
           </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 p-8 overflow-y-auto border-r border-slate-200 bg-slate-50 scroll-smooth">
           <div className="mb-8">
             {part.instructions && (
                 <div className="bg-blue-50 text-blue-900 p-4 rounded-lg mb-6 text-sm font-medium border border-blue-100 shadow-sm flex items-start gap-3">
                   <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   {part.instructions}
                 </div>
             )}
             
             <div className="mb-6">
                {renderMainContent(part.contentText)}
             </div>

             {part.imageData && (
                 <img src={part.imageData} alt="Reference" className="w-full rounded-lg shadow-md border border-slate-200" />
             )}
           </div>
        </div>

        <div className="w-1/2 p-8 overflow-y-auto bg-white scroll-smooth relative">
           {section.type === 'READING' ? (
             <div className="space-y-6 pb-12">
                {numberedQuestions.map((q: any) => {
                   if (q.type === 'PASSAGE') {
                      return (
                        <React.Fragment key={q.id}>
                          <ClozeRenderer 
                            htmlContent={q.text} 
                            questions={numberedQuestions} 
                            answers={answers}
                            onAnswer={(id, val) => setAnswers(prev => ({ ...prev, [id]: val }))}
                          />
                        </React.Fragment>
                      );
                   }
                   if (q.type === 'CLOZE') {
                      return null;
                   }
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
                 className="flex-1 w-full p-6 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-base leading-relaxed bg-white text-slate-900 transition-colors shadow-inner min-h-[500px]"
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

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeSet, setActiveSet] = useState<PracticeSet | null>(null);
  const [view, setView] = useState<'DASHBOARD' | 'TEST'>('DASHBOARD');
  const [sets, setSets] = useState<PracticeSet[]>([]);

  useEffect(() => {
     // Check for existing session if implemented, or just wait for login
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    if (u.role === 'user') {
       fetchSets();
    }
  };

  const fetchSets = async () => {
     const data = await API.getSets();
     setSets(data.filter(s => s.isPublished));
  };

  const handleTestComplete = async (results: any) => {
     if (user && activeSet) {
        await API.saveAttempt({
           id: `att-${Date.now()}`,
           userId: user.id,
           setId: activeSet.id,
           setTitle: activeSet.title,
           date: new Date().toISOString(),
           sectionScores: results.sectionScores,
           bandScore: 0
        });
        setActiveSet(null);
        setView('DASHBOARD');
        alert("Test submitted successfully!");
     }
  };

  if (!user) {
     return <LoginScreen onLogin={handleLogin} />;
  }

  if (user.role === 'admin') {
     return <AdminDashboard user={user} onLogout={() => setUser(null)} />;
  }

  if (view === 'TEST' && activeSet) {
     return <TestRunner set={activeSet} onComplete={handleTestComplete} onExit={() => { setActiveSet(null); setView('DASHBOARD'); }} />;
  }

  return (
     <div className="min-h-screen bg-slate-50">
        <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4 flex justify-between items-center">
           <h1 className="font-bold text-xl text-slate-800">Student Dashboard</h1>
           <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">{user.name}</span>
              <Button variant="outline" size="sm" onClick={() => setUser(null)}>Logout</Button>
           </div>
        </header>
        <main className="max-w-5xl mx-auto p-8">
           <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Available Practice Tests</h2>
              <p className="text-slate-500">Select a test to begin practicing.</p>
           </div>

           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sets.map(set => (
                 <div key={set.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-6">
                       <h3 className="font-bold text-lg text-slate-900 mb-2">{set.title}</h3>
                       <p className="text-sm text-slate-500 mb-6 line-clamp-2">{set.description || 'No description.'}</p>
                       <div className="flex items-center gap-2 mb-6">
                          {set.sections.map((s, i) => (
                             <div key={i} className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200" title={s.type}>
                                {s.type[0]}
                             </div>
                          ))}
                          <span className="text-xs text-slate-400 ml-1">{set.sections.length} Sections</span>
                       </div>
                       <Button className="w-full" onClick={() => { setActiveSet(set); setView('TEST'); }}>Start Practice</Button>
                    </div>
                 </div>
              ))}
              {sets.length === 0 && (
                 <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    No practice sets available currently.
                 </div>
              )}
           </div>
        </main>
     </div>
  );
};

export default App;
