
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, PracticeSet, Attempt, QuestionType, Segment, Question, SectionType } from './types';
import { API } from './services/api';
import { Button } from './components/Button';
import { Input, TextArea } from './components/Input';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

const RichTextEditor: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder, className }) => {
  const contentEditableRef = useRef<HTMLDivElement>(null);

  // Initialize content
  useEffect(() => {
    if (contentEditableRef.current && contentEditableRef.current.innerHTML !== value) {
       // Only update if significantly different to avoid cursor jumps, 
       // but for this simple implementation, we assume external updates are rare while editing.
       // We use a simple check to handle the initial load.
       if (contentEditableRef.current.innerHTML === '' && value) {
           contentEditableRef.current.innerHTML = value;
       } else if (value !== contentEditableRef.current.innerHTML) {
           // If the value changed externally (e.g. switching questions), update it
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

// --- SUB-COMPONENTS --- //

// 1. LOGIN / SIGNUP SCREEN (Unchanged)
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

// 2. ADMIN DASHBOARD (Unchanged)
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

// 3. SET EDITOR (With Speaking Support via Segments)
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
      segments: [] // Initialize Segments
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

// 4. SEGMENT EDITOR
const SegmentEditor: React.FC<{
  segment: Segment;
  index: number;
  sectionType: string;
  onChange: (s: Segment) => void;
  onDelete: () => void;
}> = ({ segment, index, sectionType, onChange, onDelete }) => {
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

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 mb-4 relative shadow-sm">
       <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
          <h4 className="font-bold text-slate-700 text-sm">
             {sectionType === 'SPEAKING' ? `Task ${index + 1}` : `Segment ${index + 1}`}
          </h4>
          <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 underline">Delete {sectionType === 'SPEAKING' ? 'Task' : 'Segment'}</button>
       </div>
       
       {/* Configuration Row */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
             <label className="block text-xs font-bold text-slate-500 mb-1">
                {sectionType === 'SPEAKING' ? 'Audio Prompt (Optional)' : 'Audio Track'}
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

       {/* Content Text */}
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

       {/* Questions - Only for Listening */}
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
                        <button onClick={() => deleteQuestion(q.id)} className="text-slate-300 hover:text-red-500 font-bold px-2">&times;</button>
                     </div>
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

// 5. PART EDITOR
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

  // LISTENING OR SPEAKING MODE (Segment Based)
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

  // EXISTING READING/WRITING EDITOR LOGIC
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

  // Logic to calculate numbering for list items
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

// ... existing TestRunner Helpers ... (Unchanged SectionIntro, ClozeRenderer, SectionReview)

// NEW: SECTION INTRO SCREEN
const SectionIntro: React.FC<{
  title: string;
  type: SectionType;
  onStart: () => void;
}> = ({ title, type, onStart }) => {
  const instructions = {
    READING: "This section contains several parts. Read the passages/questions and answer the questions. You can manage your time as you see fit within the section limit.",
    LISTENING: "This section tests your listening comprehension. You will hear each audio clip ONLY ONCE. You will have time to read the questions before the audio begins.",
    WRITING: "Answer the following writing prompts. Pay attention to the word count limits and tone.",
    SPEAKING: "This section tests your speaking ability. You will need a microphone. You will have a short Preparation Time followed by a Recording Time for each prompt."
  };

  return (
    <div className="h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-in zoom-in fade-in duration-300">
         <div className="bg-slate-900 px-8 py-6">
            <h1 className="text-2xl font-bold text-white tracking-wide uppercase">{type} SECTION</h1>
            <p className="text-slate-400 mt-1">{title}</p>
         </div>
         <div className="p-10 space-y-8">
            <div>
               <h3 className="text-lg font-bold text-slate-800 mb-2">Instructions</h3>
               <p className="text-slate-600 leading-relaxed text-lg">
                 {instructions[type] || "Complete the tasks in this section."}
               </p>
            </div>
            
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 text-amber-800 text-sm rounded-r">
               <strong>Note:</strong> Once you start, the timer will begin immediately.
               {type === 'LISTENING' && " Ensure your audio volume is set correctly."}
               {type === 'SPEAKING' && " Please ensure your microphone is connected and allowed in browser settings."}
            </div>

            <div className="flex justify-end pt-4">
               <Button size="lg" onClick={onStart} className="shadow-lg shadow-blue-200 w-full sm:w-auto transform transition hover:-translate-y-1">
                 Start {type} Section &rarr;
               </Button>
            </div>
         </div>
      </div>
    </div>
  );
};

const ClozeRenderer: React.FC<{
  htmlContent: string;
  questions: any[];
  answers: Record<string, string>;
  onAnswer: (id: string, val: string) => void;
}> = ({ htmlContent, questions, answers, onAnswer }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [clozeLocations, setClozeLocations] = useState<{ id: string; element: Element }[]>([]);

  // 1. Prepare HTML: Replace [[id]] with marker spans
  const processedHtml = React.useMemo(() => {
    // If content is just plain text with newlines (legacy data), convert to basic HTML
    let content = htmlContent;
    if (!content.includes('<') && content.includes('\n')) {
       content = content.replace(/\n/g, '<br/>');
    }

    return content.replace(/\[\[\s*(\w+)\s*\]\]/g, (match, id) => {
       return `<span id="cloze-slot-${id}" class="cloze-slot inline-block min-w-[120px] mx-1 align-middle"></span>`;
    });
  }, [htmlContent]);

  // 2. Find markers after render
  useLayoutEffect(() => {
    if (containerRef.current) {
      const slots = containerRef.current.querySelectorAll('.cloze-slot');
      const locs: { id: string; element: Element }[] = [];
      slots.forEach(slot => {
        const id = slot.id.replace('cloze-slot-', '');
        locs.push({ id, element: slot });
      });
      setClozeLocations(locs);
    }
  }, [processedHtml]);

  return (
    <div className="relative">
      <div 
         ref={containerRef}
         className="prose prose-slate max-w-none text-slate-800 leading-relaxed font-serif text-lg bg-slate-50 p-6 rounded-lg border border-slate-200 shadow-sm mb-6"
         dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
      {clozeLocations.map(loc => {
        const question = questions.find(q => q.type === 'CLOZE' && q.text === loc.id);
        if (!question) {
             return createPortal(
                 <span className="text-red-500 font-bold text-xs border border-red-300 bg-red-50 px-1 rounded">[[{loc.id}?]]</span>,
                 loc.element
             );
        }
        return createPortal(
          <Dropdown
            options={question.options || []}
            value={answers[question.id] || ''}
            onChange={(val) => onAnswer(question.id, val)}
            placeholder={`[${loc.id}]`}
            className="w-full font-sans text-sm border-blue-200 bg-white shadow-sm"
          />,
          loc.element
        );
      })}
    </div>
  );
};

// 5. TEST TAKER INTERFACE - REFACTORED FOR REVIEW
const SectionReview: React.FC<{ 
    section: any; 
    answers: Record<string, any>; 
    onContinue: () => void; 
}> = ({ section, answers, onContinue }) => {
   // Calculate metrics
   let correct = 0;
   let total = 0;
   const details: any[] = [];

   section.parts.forEach((part: any, pIdx: number) => {
      // Group details by Part to give context
      const partDetails: any[] = [];
      // Combine direct questions and segment questions for review
      const allQuestions = [...(part.questions || []), ...(part.segments?.flatMap((s: any) => s.questions) || [])];
      
      allQuestions.forEach((q: any) => {
         if (q.type === 'MCQ' || q.type === 'CLOZE') {
            total++;
            const isCorrect = answers[q.id] === q.correctAnswer;
            if (isCorrect) correct++;
            partDetails.push({ ...q, isCorrect, userAnswer: answers[q.id] });
         }
      });
      if (partDetails.length > 0) {
          details.push({ partTitle: `Part ${pIdx+1}`, questions: partDetails });
      }
   });

   const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

   return (
     <div className="h-screen flex flex-col bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shadow-sm z-10">
           <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Section Review: <span className="text-blue-600">{section.type}</span></h2>
              <p className="text-slate-500 mt-1">Review your performance before moving to the next section.</p>
           </div>
           <div className="flex items-center gap-4">
              <div className="text-right">
                  <div className="text-3xl font-bold text-slate-900">{correct}<span className="text-slate-400 text-xl">/{total}</span></div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Score</div>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold border-4 ${percentage >= 80 ? 'border-green-500 text-green-600' : percentage >= 50 ? 'border-amber-500 text-amber-600' : 'border-red-500 text-red-600'}`}>
                 {percentage}%
              </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-5xl mx-auto w-full">
            {details.map((group, idx) => (
                <div key={idx} className="space-y-4">
                    <h3 className="font-bold text-slate-400 uppercase tracking-wider text-xs border-b border-slate-200 pb-2">{group.partTitle}</h3>
                    <div className="grid gap-4">
                        {group.questions.map((item: any) => (
                            <div key={item.id} className={`p-5 rounded-lg border flex justify-between items-start transition-all shadow-sm ${item.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="space-y-2">
                                    <p className="font-bold text-slate-800 text-sm">
                                    {item.type === 'CLOZE' ? `Gap [${item.text}]` : item.text}
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-xs">
                                    <span className={`font-bold flex items-center gap-1 ${item.isCorrect ? "text-green-700" : "text-red-700"}`}>
                                        Your Answer: <span className="bg-white/50 px-1 rounded">{item.userAnswer || '(Skipped)'}</span>
                                    </span>
                                    {!item.isCorrect && (
                                        <span className="text-slate-600 font-medium flex items-center gap-1">
                                            Correct Answer: <span className="bg-slate-200/50 px-1 rounded text-slate-800 font-bold">{item.correctAnswer}</span>
                                        </span>
                                    )}
                                    </div>
                                </div>
                                <div className="shrink-0 ml-4">
                                    {item.isCorrect ? (
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-200 text-green-700">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        </span>
                                    ) : (
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-200 text-red-700">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        <footer className="bg-white border-t border-slate-200 px-8 py-4 flex justify-end sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <Button size="lg" onClick={onContinue} className="shadow-blue-200 shadow-lg">Continue to Next Section &rarr;</Button>
        </footer>
     </div>
   );
};

const TestRunner: React.FC<{ 
  set: PracticeSet; 
  onComplete: (score: any) => void; 
  onExit: () => void 
}> = ({ set, onComplete, onExit }) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0); // For Listening & Speaking
  
  const [viewState, setViewState] = useState<'INTRO' | 'TEST' | 'REVIEW'>('INTRO');
  // Listening & Speaking Phases
  const [phase, setPhase] = useState<'PREP' | 'WORKING' | 'RECORDING'>('PREP');
  const [volume, setVolume] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [writingInputs, setWritingInputs] = useState<Record<string, string>>({});
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const section = set.sections[currentSectionIndex];
  const part = section?.parts[currentPartIndex];
  const segment = (section?.type === 'LISTENING' || section?.type === 'SPEAKING') ? part?.segments?.[currentSegmentIndex] : null;

  // Initialize Timer based on Section Type
  useEffect(() => {
    if (!part || viewState !== 'TEST') return;

    if (section.type === 'LISTENING' && segment) {
        if (phase === 'PREP') {
            setTimeLeft(segment.prepTimeSeconds);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        } else {
            setTimeLeft(segment.timerSeconds);
            if (audioRef.current) {
                audioRef.current.volume = volume;
                audioRef.current.play().catch(e => console.error("Audio play failed (user gesture required?)", e));
            }
        }
    } else if (section.type === 'SPEAKING' && segment) {
        // SPEAKING USES SEGMENTS NOW
        if (phase === 'PREP') {
           setTimeLeft(segment.prepTimeSeconds || 30);
           stopRecording();
        } else {
           setTimeLeft(segment.timerSeconds || 60);
           startRecording();
        }
    } else {
        // Reading/Writing Logic (Simple Part Timer)
        setTimeLeft(part.timerSeconds || 600);
    }
  }, [part, segment, phase, section.type, viewState]);

  // Speaking Recording Logic
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
      // Fallback for demo/dev without mic
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

  // Update volume when slider changes
  useEffect(() => {
     if(audioRef.current) {
         audioRef.current.volume = volume;
     }
  }, [volume]);

  // Timer Tick & Auto-Advance
  useEffect(() => {
    if (viewState !== 'TEST') return;

    if (timeLeft <= 0 && part) {
      handleAutoAdvance();
      return; 
    }
    const timer = setInterval(() => setTimeLeft(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, part, viewState]);

  const handleAutoAdvance = () => {
      if (section.type === 'LISTENING') {
          if (phase === 'PREP') {
              setPhase('WORKING');
          } else {
              // Working phase done, move to next segment
              handleNextSegment();
          }
      } else if (section.type === 'SPEAKING') {
          if (phase === 'PREP') {
              setPhase('RECORDING');
          } else {
              // Recording done
              stopRecording();
              handleNextSegment();
          }
      } else {
          // Standard Reading/Writing
          handleNext();
      }
  };

  const handleNextSegment = () => {
      if (part.segments && currentSegmentIndex < part.segments.length - 1) {
          setCurrentSegmentIndex(prev => prev + 1);
          setPhase('PREP');
      } else {
          // End of Part segments
          handleNext();
      }
  };

  const handleNext = () => {
    // Cleanup Recording if active
    if (isRecording) stopRecording();

    const isLastPart = currentPartIndex === section.parts.length - 1;
    
    // For Listening, we just finished a part.
    // For Reading, check if review needed.
    if (section.type === 'READING' && isLastPart && viewState !== 'REVIEW') {
        setViewState('REVIEW');
        return;
    }

    if (currentPartIndex < section.parts.length - 1) {
      setCurrentPartIndex(prev => prev + 1);
      setCurrentSegmentIndex(0);
      setPhase('PREP');
    } else if (currentSectionIndex < set.sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      setCurrentPartIndex(0);
      setCurrentSegmentIndex(0);
      setPhase('PREP');
      setViewState('INTRO'); // Show intro for next section
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
            // Include Segment questions for Listening
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

  // --- SPEAKING RENDER (SEGMENT BASED) ---
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
                   <div className={`text-xl font-mono font-bold bg-slate-800 px-3 py-1 rounded ${timeLeft < 10 ? 'text-red-400' : 'text-emerald-400'}`}>
                     {formatTime(timeLeft)}
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
                  {/* Prompt Side */}
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 overflow-y-auto">
                      <div className="mb-4">
                         <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Instructions</h3>
                         {/* Show Part instructions or default */}
                         <p className="text-sm font-medium text-slate-800">{part.instructions || "Speak about the topic below."}</p>
                      </div>
                      <div className="prose prose-lg text-slate-900">
                          {renderMainContent(segment.contentText || '')}
                      </div>
                      {/* Show Segment audio if exists */}
                      {segment.audioData && (
                          <div className="mt-4 p-4 bg-slate-50 rounded border border-slate-200">
                              <p className="text-xs font-bold text-slate-500 mb-1 uppercase">Audio Prompt</p>
                              <audio controls src={segment.audioData} className="w-full h-8" />
                          </div>
                      )}
                  </div>

                  {/* Recording Side */}
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
                         {phase === 'PREP' ? 'Prep Time' : 'On Air'}
                     </span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                   {/* Volume Control */}
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

                   <div className={`text-xl font-mono font-bold bg-slate-800 px-3 py-1 rounded ${timeLeft < 10 ? 'text-red-400' : 'text-emerald-400'}`}>
                     {formatTime(timeLeft)}
                   </div>
                   <Button variant="danger" size="sm" onClick={onExit} className="opacity-80 hover:opacity-100">Exit</Button>
                   <Button 
                     variant="primary" 
                     onClick={handleAutoAdvance} // Manual advance functionality
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
                        {/* Part Instructions */}
                        {part.instructions && (
                             <div className="bg-white border border-slate-200 p-4 rounded-lg mb-8 shadow-sm text-slate-700 text-sm font-medium">
                                 {part.instructions}
                             </div>
                        )}

                        {/* Audio Visualization / Status */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col items-center text-center">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${phase === 'WORKING' ? 'bg-amber-100 text-amber-600 scale-110 shadow-lg shadow-amber-100 animate-pulse' : 'bg-slate-100 text-slate-300'}`}>
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">
                                {phase === 'PREP' ? 'Prepare to Listen' : 'Listening in Progress'}
                            </h3>
                            <p className="text-sm text-slate-500 mb-4">
                                {phase === 'PREP' ? 'Read the questions carefully.' : 'Listen to the audio and answer the questions.'}
                            </p>
                            
                            {/* Hidden Audio Player - Auto-controlled */}
                            <audio 
                                ref={audioRef} 
                                src={segment.audioData} 
                                className="w-full h-8 opacity-50 pointer-events-none" 
                                controls={false} // Disable controls
                            />
                        </div>

                        {/* Segment Text Content */}
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
                        {segment.questions.map((q, i) => (
                           <div key={q.id} className={`p-5 rounded-xl border transition-all shadow-sm ${phase === 'PREP' ? 'border-slate-100 bg-slate-50' : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'}`}>
                              <div className="font-semibold text-slate-900 mb-4 flex gap-3 items-start">
                                <span className="bg-slate-800 text-white w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                                <span className="mt-0.5">{q.text}</span>
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
                        ))}
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

  // --- READING / WRITING RENDER (STANDARD) ---
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

const UserDashboard: React.FC<{ user: User; onLogout: () => void; onStartTest: (set: PracticeSet) => void }> = ({ user, onLogout, onStartTest }) => {
  const [sets, setSets] = useState<PracticeSet[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    API.getSets().then(data => setSets(data.filter(s => s.isPublished)));
    API.getAttempts(user.id).then(data => setAttempts(data));
  }, [user.id]);

  // Reverse attempts for the chart (chronological order)
  const chartData = [...attempts].reverse();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
       <header className="flex justify-between items-center mb-8 max-w-6xl mx-auto bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Welcome, {user.name}</h1>
          <p className="text-xs text-slate-500">Candidate Dashboard</p>
        </div>
        <Button variant="outline" size="sm" onClick={onLogout}>Logout</Button>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
         {/* Stats Chart */}
         {attempts.length > 0 && (
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Performance Trend</h2>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                            <YAxis domain={[0, 12]} stroke="#64748b" fontSize={12} tickLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="bandScore" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 6 }} name="Band Score" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </section>
         )}

         {/* Available Tests */}
         <section>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Available Practice Tests</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
               {sets.map(set => (
                 <div key={set.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col">
                    <h3 className="font-bold text-slate-900 mb-2">{set.title}</h3>
                    <p className="text-slate-500 text-xs mb-4 flex-1">{set.description}</p>
                    <div className="flex items-center justify-between mt-4">
                        <span className="text-xs text-slate-400">{set.sections.length} Sections</span>
                        <Button onClick={() => onStartTest(set)} size="sm">Start Test</Button>
                    </div>
                 </div>
               ))}
               {sets.length === 0 && <p className="text-slate-400 text-sm italic col-span-3 text-center py-8">No practice tests available at the moment.</p>}
            </div>
         </section>

         {/* Past Attempts */}
         <section>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Attempt History</h2>
            {attempts.length > 0 ? (
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                           <th className="px-6 py-3">Date</th>
                           <th className="px-6 py-3">Test</th>
                           <th className="px-6 py-3">Scores (Sec)</th>
                           <th className="px-6 py-3">Band</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {attempts.map(att => (
                           <tr key={att.id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-slate-600">{att.date}</td>
                              <td className="px-6 py-3 font-medium text-slate-900">{att.setTitle}</td>
                              <td className="px-6 py-3 text-slate-600">
                                 {att.sectionScores && Object.entries(att.sectionScores).map(([secId, score]) => (
                                    <span key={secId} className="mr-2 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">
                                       {score} pts
                                    </span>
                                 ))}
                              </td>
                              <td className="px-6 py-3 font-bold text-blue-600">{att.bandScore || '-'}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            ) : (
               <p className="text-slate-400 text-sm">No attempts yet.</p>
            )}
         </section>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeSet, setActiveSet] = useState<PracticeSet | null>(null);

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  if (activeSet) {
    return (
      <TestRunner 
        set={activeSet} 
        onExit={() => {
            if (window.confirm("Are you sure you want to exit? Your progress will be lost.")) {
                setActiveSet(null);
            }
        }}
        onComplete={async (results) => {
           // Calculate rough band score (mock logic)
           // CELPIP is roughly: 10-12 points = 10-12 band. 
           // This is just a placeholder calculation.
           const totalCorrect = results.totalCorrect;
           const bandScore = Math.min(12, Math.round(totalCorrect / 5) + 3); // Very rough approximation
           
           const attempt: Attempt = {
              id: `att-${Date.now()}`,
              userId: user.id,
              setId: activeSet.id,
              setTitle: activeSet.title,
              date: new Date().toLocaleDateString(),
              sectionScores: results.sectionScores,
              bandScore
           };
           
           await API.saveAttempt(attempt);
           alert(`Test Completed!\nEstimated Band Score: ${bandScore}`);
           setActiveSet(null);
        }}
      />
    );
  }

  if (user.role === 'admin') {
    return <AdminDashboard user={user} onLogout={() => setUser(null)} />;
  }

  return <UserDashboard user={user} onLogout={() => setUser(null)} onStartTest={setActiveSet} />;
};

export default App;
