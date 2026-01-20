
import React, { useState, useEffect, useRef } from 'react';
import { User, PracticeSet, Attempt, QuestionType, Segment, Question, SectionType, Part } from './types';
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

// 4. SEGMENT EDITOR
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
                         <div className="mb-3 ml-6 p-3 bg-slate-50 rounded border border-slate-200 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
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
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Individual Question Timer (Seconds)</label>
                                <input 
                                    type="number" 
                                    className="border rounded px-2 py-1 text-xs w-full bg-white text-slate-900 focus:ring-1 focus:ring-blue-500"
                                    value={q.timerSeconds || 0}
                                    placeholder="0 (Use Segment Timer)"
                                    onChange={e => updateQuestion(q.id, { timerSeconds: parseInt(e.target.value) || 0 })}
                                />
                                <span className="text-[9px] text-slate-400 block mt-1 leading-tight">Setting this &gt; 0 enables sequential question mode for this item.</span>
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

const ClozeRenderer: React.FC<{
  text: string;
  questions: Question[];
  answers: Record<string, string>;
  onAnswer: (qId: string, val: string) => void;
}> = ({ text, questions, answers, onAnswer }) => {
  const parts = text.split(/(\[\[\d+\]\])/g);
  return (
    <div className="leading-loose font-serif text-lg">
      {parts.map((part, i) => {
        const match = part.match(/\[\[(\d+)\]\]/);
        if (match) {
           const qIndex = parseInt(match[1]);
           const question = questions.find(q => q.type === 'CLOZE' && q.text === String(qIndex)); 
           
           if (question && question.options) {
             return (
               <select
                 key={i}
                 className="mx-1 inline-block border-b-2 border-blue-200 bg-blue-50/50 px-2 py-0.5 text-base focus:border-blue-500 outline-none transition-colors cursor-pointer"
                 value={answers[question.id] || ''}
                 onChange={(e) => onAnswer(question.id, e.target.value)}
                 onClick={e => e.stopPropagation()}
               >
                 <option value="" disabled>Select...</option>
                 {question.options.map((opt, oi) => (
                   <option key={oi} value={opt}>{opt}</option>
                 ))}
               </select>
             );
           }
           return <span key={i} className="text-amber-500 font-bold px-1">[?]</span>;
        }
        return <span key={i} dangerouslySetInnerHTML={{ __html: part }} />;
      })}
    </div>
  );
};

const SectionIntro: React.FC<{
  section: { title: string; type: SectionType };
  onStart: () => void;
}> = ({ section, onStart }) => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-6 animate-in zoom-in duration-300">
    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
       <span className="text-3xl font-bold">{section.type[0]}</span>
    </div>
    <h2 className="text-3xl font-bold text-slate-900">{section.title}</h2>
    <p className="text-slate-500 max-w-md">You are about to start the {section.type.toLowerCase()} section. Please ensure your audio is working if required.</p>
    <Button size="lg" onClick={onStart} className="px-12 shadow-lg shadow-blue-200">Start Section</Button>
  </div>
);

const SectionReview: React.FC<{
  onNext: () => void;
}> = ({ onNext }) => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-6">
     <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
       <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
     </div>
     <h2 className="text-2xl font-bold text-slate-800">Section Complete</h2>
     <p className="text-slate-500">You have completed this section. Ready to move on?</p>
     <Button onClick={onNext}>Continue to Next Section</Button>
  </div>
);

const PartEditor: React.FC<{
  part: Part;
  index: number;
  sectionType: string;
  onChange: (p: Part) => void;
  onDelete: () => void;
}> = ({ part, index, sectionType, onChange, onDelete }) => {
  const [expanded, setExpanded] = useState(true);

  // Helper to update part
  const update = (updates: Partial<Part>) => onChange({ ...part, ...updates });
  const isSegmented = sectionType === 'LISTENING' || sectionType === 'SPEAKING';

  const addSegment = () => {
    const newSeg: Segment = {
      id: `seg-${Date.now()}`,
      partId: part.id,
      title: `${sectionType === 'SPEAKING' ? 'Task' : 'Segment'} ${part.segments?.length ? part.segments.length + 1 : 1}`,
      contentText: '',
      prepTimeSeconds: 0,
      timerSeconds: 60,
      questions: []
    };
    update({ segments: [...(part.segments || []), newSeg] });
  };

  const updateSegment = (segId: string, updates: Segment) => {
      const newSegs = part.segments?.map(s => s.id === segId ? updates : s);
      update({ segments: newSegs });
  };

  const deleteSegment = (segId: string) => {
      update({ segments: part.segments?.filter(s => s.id !== segId) });
  };

  const addItem = (type: QuestionType) => {
    const newQ: Question = {
      id: `q-${Date.now()}`,
      partId: part.id,
      text: type === 'CLOZE' ? '1' : '',
      type,
      options: type === 'PASSAGE' ? undefined : ['', '', '', ''],
      correctAnswer: '',
      weight: 1
    };
    update({ questions: [...part.questions, newQ] });
  };

  const updateQuestion = (qId: string, updates: Partial<Question>) => {
      update({ questions: part.questions.map(q => q.id === qId ? { ...q, ...updates } : q) });
  };

  const deleteQuestion = (qId: string) => {
      update({ questions: part.questions.filter(q => q.id !== qId) });
  };

  const addOption = (qId: string) => {
      const q = part.questions.find(x => x.id === qId);
      if(q && q.options) {
          updateQuestion(qId, { options: [...q.options, ''] });
      }
  };
  
  const removeOption = (qId: string, idx: number) => {
       const q = part.questions.find(x => x.id === qId);
       if(q && q.options) {
           const newOpts = [...q.options];
           newOpts.splice(idx, 1);
           updateQuestion(qId, { options: newOpts });
       }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => update({ imageData: reader.result as string });
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-6">
       <div 
          className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center cursor-pointer select-none"
          onClick={() => setExpanded(!expanded)}
       >
          <div className="flex items-center gap-3">
             <div className={`transform transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</div>
             <h4 className="font-bold text-slate-700">Part {index + 1}</h4>
             <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{isSegmented ? `${part.segments?.length || 0} Segments` : `${part.questions.length} Items`}</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-500 hover:text-red-700 text-sm font-medium">Delete Part</button>
       </div>

       {expanded && (
         <div className="p-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                   label="Part Instructions" 
                   value={part.instructions || ''} 
                   onChange={e => update({ instructions: e.target.value })} 
                />
                <Input 
                   label="Part Timer (seconds)" 
                   type="number"
                   value={part.timerSeconds} 
                   onChange={e => update({ timerSeconds: parseInt(e.target.value) || 0 })} 
                />
            </div>

            {/* Main Content Area - Optional if user prefers item-based Passages */}
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Main Context / Reading Text (Optional)</label>
               <RichTextEditor 
                  value={part.contentText || ''} 
                  onChange={val => update({ contentText: val })} 
                  placeholder="Paste main reading passage here (if not using Passage items)..."
               />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Image (Optional)</label>
                {!part.imageData ? (
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm text-slate-500" />
                ) : (
                    <div className="relative inline-block">
                        <img src={part.imageData} alt="Part Context" className="h-32 rounded border border-slate-200" />
                        <button onClick={() => update({ imageData: undefined })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-sm">&times;</button>
                    </div>
                )}
            </div>

            {isSegmented ? (
                <div className="space-y-4 border-t border-slate-100 pt-4">
                    <div className="flex justify-between items-center">
                        <h5 className="font-bold text-slate-800">Segments</h5>
                        <Button size="sm" onClick={addSegment}>+ Add Segment</Button>
                    </div>
                    {part.segments?.map((seg, i) => (
                        <SegmentEditor 
                            key={seg.id} 
                            segment={seg} 
                            index={i} 
                            sectionType={sectionType}
                            onChange={updated => updateSegment(seg.id, updated)} 
                            onDelete={() => deleteSegment(seg.id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="space-y-4 border-t border-slate-100 pt-4">
                    <div className="flex justify-between items-center">
                        <h5 className="font-bold text-slate-800">Questions & Passages</h5>
                        <div className="flex gap-2">
                           <Button size="sm" onClick={() => addItem('PASSAGE')}>+ Passage</Button>
                           <Button size="sm" onClick={() => addItem('MCQ')}>+ MCQ</Button>
                           <Button size="sm" onClick={() => addItem('CLOZE')}>+ Cloze</Button>
                        </div>
                    </div>
                    {part.questions.map((q, i) => (
                         <div key={q.id} className="border border-slate-200 rounded p-4 bg-slate-50 relative group">
                             <div className="flex justify-between mb-2">
                                 <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-white bg-slate-400 px-2 py-0.5 rounded">{q.type}</span>
                                    {q.type !== 'PASSAGE' && <span className="font-bold text-xs text-slate-500">Item {i+1}</span>}
                                 </div>
                                 <button onClick={() => deleteQuestion(q.id)} className="text-red-500 text-xs hover:underline">Remove</button>
                             </div>

                             {q.type === 'PASSAGE' && (
                                 <RichTextEditor 
                                    value={q.text} 
                                    onChange={val => updateQuestion(q.id, { text: val })}
                                    placeholder="Enter passage text... Use [[1]] for cloze gaps." 
                                 />
                             )}

                             {q.type === 'CLOZE' && (
                                 <div className="grid gap-2">
                                     <div className="flex items-center gap-2">
                                         <label className="text-xs font-bold text-slate-600">Gap ID:</label>
                                         <input 
                                             className="w-16 border rounded px-2 py-1 text-sm font-bold text-center"
                                             value={q.text}
                                             onChange={e => updateQuestion(q.id, { text: e.target.value })}
                                             placeholder="1"
                                         />
                                         <span className="text-xs text-slate-400">Matches [[1]] in passage</span>
                                     </div>
                                     {/* Options for Cloze are handled same as MCQ below */}
                                 </div>
                             )}

                             {(q.type === 'MCQ' || q.type === 'CLOZE') && (
                                 <div className="space-y-2 mt-2">
                                     {q.type === 'MCQ' && (
                                         <Input 
                                            placeholder="Question Text" 
                                            value={q.text} 
                                            onChange={e => updateQuestion(q.id, { text: e.target.value })} 
                                         />
                                     )}
                                     <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                                        {q.options?.map((opt, oi) => (
                                            <div key={oi} className="flex items-center gap-2">
                                                <input 
                                                    type="radio" 
                                                    checked={q.correctAnswer === opt && opt !== ''} 
                                                    onChange={() => updateQuestion(q.id, { correctAnswer: opt })} 
                                                    title="Mark as correct answer"
                                                />
                                                <input 
                                                    className="flex-1 border rounded px-2 py-1 text-sm"
                                                    value={opt}
                                                    placeholder={`Option ${oi + 1}`}
                                                    onChange={e => {
                                                        const newOpts = [...(q.options||[])];
                                                        newOpts[oi] = e.target.value;
                                                        let nc = q.correctAnswer;
                                                        if(nc === opt) nc = e.target.value;
                                                        updateQuestion(q.id, { options: newOpts, correctAnswer: nc });
                                                    }}
                                                />
                                                <button onClick={() => removeOption(q.id, oi)} className="text-slate-400 hover:text-red-500 font-bold px-1">&times;</button>
                                            </div>
                                        ))}
                                        <button onClick={() => addOption(q.id)} className="text-xs text-blue-600 hover:underline font-medium">+ Add Option</button>
                                     </div>
                                 </div>
                             )}
                         </div>
                    ))}
                    {part.questions.length === 0 && <p className="text-center text-slate-400 text-sm italic py-4">No content items added yet.</p>}
                </div>
            )}
         </div>
       )}
    </div>
  );
};

const TestRunner: React.FC<{
  set: PracticeSet;
  onExit: () => void;
  onComplete: (results: any) => void;
}> = ({ set, onExit, onComplete }) => {
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentPartIdx, setCurrentPartIdx] = useState(0);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0); // For Listening/Speaking
  const [mode, setMode] = useState<'INTRO' | 'TEST' | 'REVIEW'>('INTRO');
  
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);

  const currentSection = set.sections[currentSectionIdx];
  const currentPart = currentSection?.parts[currentPartIdx];
  
  // Logic to determine if we are in a segment
  const isSegmented = currentSection?.type === 'LISTENING' || currentSection?.type === 'SPEAKING';
  const currentSegment = isSegmented ? currentPart?.segments?.[currentSegmentIdx] : undefined;

  useEffect(() => {
    if (mode === 'TEST') {
        let time = 60; // Default
        if (isSegmented && currentSegment) {
            time = currentSegment.timerSeconds;
        } else if (currentPart) {
            time = currentPart.timerSeconds;
        }
        setTimeLeft(time);
    }
  }, [mode, currentSectionIdx, currentPartIdx, currentSegmentIdx]);

  useEffect(() => {
    if (mode === 'TEST' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (mode === 'TEST' && timeLeft === 0) {
      handleNext();
    }
  }, [timeLeft, mode]);

  const handleNext = () => {
    // Logic to move to next part/segment/section
    if (isSegmented) {
        if (currentPart && currentPart.segments && currentSegmentIdx < currentPart.segments.length - 1) {
            setCurrentSegmentIdx(prev => prev + 1);
        } else if (currentPartIdx < currentSection.parts.length - 1) {
            setCurrentPartIdx(prev => prev + 1);
            setCurrentSegmentIdx(0);
        } else {
            setMode('REVIEW');
        }
    } else {
        if (currentPartIdx < currentSection.parts.length - 1) {
            setCurrentPartIdx(prev => prev + 1);
        } else {
            setMode('REVIEW');
        }
    }
  };

  const nextSection = () => {
    if (currentSectionIdx < set.sections.length - 1) {
        setCurrentSectionIdx(prev => prev + 1);
        setCurrentPartIdx(0);
        setCurrentSegmentIdx(0);
        setMode('INTRO');
    } else {
        finishTest();
    }
  };

  const finishTest = () => {
      // Calculate results
      let totalCorrect = 0;
      let sectionScores: Record<string, number> = {};
      
      set.sections.forEach(sec => {
          let score = 0;
          sec.parts.forEach(part => {
              if (part.segments) {
                  part.segments.forEach(seg => {
                      seg.questions.forEach(q => {
                          if (answers[q.id] === q.correctAnswer) score += q.weight;
                      });
                  });
              }
              part.questions.forEach(q => {
                  if (answers[q.id] === q.correctAnswer) score += q.weight;
              });
          });
          sectionScores[sec.id] = score;
          totalCorrect += score;
      });

      onComplete({ totalCorrect, sectionScores });
  };

  if (!currentSection) return <div>Test Error</div>;

  if (mode === 'INTRO') {
      return <SectionIntro section={currentSection} onStart={() => setMode('TEST')} />;
  }

  if (mode === 'REVIEW') {
      return <SectionReview onNext={nextSection} />;
  }

  const formatTime = (s: number) => {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
       <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <h1 className="font-bold text-slate-800">{set.title}</h1>
          <div className="flex items-center gap-6">
              <div className="text-2xl font-mono font-bold text-blue-600">{formatTime(timeLeft)}</div>
              <Button variant="outline" size="sm" onClick={onExit}>Exit Test</Button>
          </div>
       </header>

       <main className="flex-1 max-w-5xl mx-auto w-full p-6">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
             {isSegmented && currentSegment ? (
                 <div className="p-8 space-y-8">
                     <div className="flex justify-between items-start">
                         <h2 className="text-xl font-bold text-slate-800">{currentSegment.title}</h2>
                         <span className="text-sm text-slate-400">{currentSection.type}</span>
                     </div>
                     
                     {currentSegment.audioData && (
                         <div className="bg-slate-100 p-4 rounded-lg">
                            <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Audio Track</p>
                            <audio controls src={currentSegment.audioData} className="w-full" autoPlay />
                         </div>
                     )}

                     <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: currentSegment.contentText || '' }} />

                     <div className="space-y-6">
                         {currentSegment.questions.map(q => (
                             <div key={q.id} className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                                 <p className="font-medium text-slate-800 mb-3">{q.text}</p>
                                 <div className="space-y-2">
                                     {q.options?.map((opt, i) => (
                                         <label key={i} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded transition-colors">
                                             <input 
                                                type="radio" 
                                                name={q.id} 
                                                checked={answers[q.id] === opt}
                                                onChange={() => setAnswers({...answers, [q.id]: opt})}
                                                className="w-4 h-4 text-blue-600"
                                             />
                                             <span className="text-sm text-slate-700">{opt}</span>
                                         </label>
                                     ))}
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             ) : currentPart ? (
                 <div className="flex h-full flex-col md:flex-row">
                     {/* Check for mixed content questions (Passage/Cloze/MCQ) */}
                     {/* If any PASSAGE type exists in questions, we treat it as a mixed flow, otherwise standard split */}
                     {currentPart.questions.some(q => q.type === 'PASSAGE') || currentPart.questions.some(q => q.type === 'CLOZE' && !currentPart.questions.some(x => x.type === 'MCQ')) ? (
                         <div className="w-full p-8 overflow-y-auto">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Reading / Cloze Task</h3>
                            {/* Render Main Context if it exists */}
                            {currentPart.contentText && (
                                <div className="prose prose-lg max-w-none bg-white p-6 rounded-lg border border-slate-200 shadow-sm mb-6">
                                    <div dangerouslySetInnerHTML={{ __html: currentPart.contentText }} />
                                </div>
                            )}

                            <div className="space-y-6">
                                {currentPart.questions.map(q => {
                                    if (q.type === 'PASSAGE') {
                                        return (
                                            <div key={q.id} className="prose prose-lg max-w-none bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                                                <ClozeRenderer 
                                                    text={q.text} 
                                                    questions={currentPart.questions} 
                                                    answers={answers} 
                                                    onAnswer={(qId, val) => setAnswers(prev => ({ ...prev, [qId]: val }))} 
                                                />
                                            </div>
                                        );
                                    } else if (q.type === 'MCQ') {
                                        return (
                                            <div key={q.id} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                                                <p className="font-bold text-slate-800 mb-3">{q.text}</p>
                                                <div className="space-y-2">
                                                    {q.options?.map((opt, i) => (
                                                        <label key={i} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-100 transition-colors">
                                                            <input 
                                                                type="radio" 
                                                                name={q.id} 
                                                                checked={answers[q.id] === opt}
                                                                onChange={() => setAnswers({...answers, [q.id]: opt})}
                                                                className="w-4 h-4 text-blue-600"
                                                            />
                                                            <span className="text-sm text-slate-700">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null; // Cloze definitions are rendered by ClozeRenderer via the Passage
                                })}
                            </div>
                         </div>
                     ) : (
                        <>
                             {/* Standard Split View for pure MCQs with one Context */}
                             <div className="w-full md:w-1/2 p-8 border-r border-slate-100 overflow-y-auto max-h-[80vh]">
                                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Reading Text</h3>
                                 {currentPart.imageData && (
                                     <img src={currentPart.imageData} alt="Context" className="w-full rounded-lg mb-6 border border-slate-200" />
                                 )}
                                 <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: currentPart.contentText || '' }} />
                             </div>
                             
                             {/* Right: Questions */}
                             <div className="w-full md:w-1/2 p-8 overflow-y-auto max-h-[80vh] bg-slate-50/50">
                                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Questions</h3>
                                 <div className="space-y-6">
                                    {currentPart.questions.map(q => (
                                        <div key={q.id} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                                            {/* Standard MCQ */}
                                            <p className="font-bold text-slate-800 mb-3">{q.text}</p>
                                            <div className="space-y-2">
                                                {q.options?.map((opt, i) => (
                                                    <label key={i} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-100 transition-colors">
                                                        <input 
                                                            type="radio" 
                                                            name={q.id} 
                                                            checked={answers[q.id] === opt}
                                                            onChange={() => setAnswers({...answers, [q.id]: opt})}
                                                            className="w-4 h-4 text-blue-600"
                                                        />
                                                        <span className="text-sm text-slate-700">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                 </div>
                             </div>
                        </>
                     )}
                 </div>
             ) : null}
          </div>
          
          <div className="mt-6 flex justify-end">
             <Button size="lg" onClick={handleNext} className="px-8 shadow-lg shadow-blue-200">
                {isSegmented && currentPart && currentPart.segments && currentSegmentIdx < currentPart.segments.length - 1 ? 'Next Segment' : 'Next Part'} &rarr;
             </Button>
          </div>
       </main>
    </div>
  );
};

// ... (Rest of UserDashboard and App remain the same)
// RESTORED USER DASHBOARD
const UserDashboard: React.FC<{ user: User; onLogout: () => void; onStartTest: (set: PracticeSet) => void }> = ({ user, onLogout, onStartTest }) => {
  const [sets, setSets] = useState<PracticeSet[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    API.getSets().then(data => setSets(data.filter(s => s.isPublished)));
    API.getAttempts(user.id).then(data => setAttempts(data));
  }, [user.id]);

  const chartData = [...attempts].reverse().map(att => ({
      name: att.date.split('T')[0],
      score: att.bandScore || 0,
      fullDate: new Date(att.date).toLocaleDateString()
  }));

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
         {/* Performance Chart */}
         {attempts.length > 0 && (
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Performance Trend (Band Score)</h2>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                            <YAxis domain={[0, 12]} stroke="#64748b" fontSize={12} tickLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 6 }} name="Band Score" />
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
                    <p className="text-slate-500 text-xs mb-4 flex-1 line-clamp-2">{set.description || 'No description provided.'}</p>
                    <div className="flex items-center justify-between mt-4">
                        <div className="flex -space-x-1">
                            {set.sections.map((s, i) => (
                                <div key={i} className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500" title={s.type}>{s.type[0]}</div>
                            ))}
                        </div>
                        <Button onClick={() => onStartTest(set)} size="sm">Start Test</Button>
                    </div>
                 </div>
               ))}
               {sets.length === 0 && <p className="text-slate-400 text-sm italic col-span-3 text-center py-8">No practice tests available at the moment.</p>}
            </div>
         </section>

         {/* History Table */}
         <section>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Attempt History</h2>
            {attempts.length > 0 ? (
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                           <th className="px-6 py-3">Date</th>
                           <th className="px-6 py-3">Test</th>
                           <th className="px-6 py-3">Scores (Raw)</th>
                           <th className="px-6 py-3">Band</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {attempts.map(att => (
                           <tr key={att.id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-3 text-slate-600">{new Date(att.date).toLocaleDateString()}</td>
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

  useEffect(() => {
     // Optional: Check for existing session here
  }, []);

  const handleTestComplete = async (results: any) => {
     if (user && activeSet) {
        // Simple band score calculation (mock logic)
        const bandScore = Math.min(12, Math.round(results.totalCorrect / 5) + 3); 

        await API.saveAttempt({
           id: `att-${Date.now()}`,
           userId: user.id,
           setId: activeSet.id,
           setTitle: activeSet.title,
           date: new Date().toISOString(),
           sectionScores: results.sectionScores,
           bandScore
        });
        
        alert(`Test Completed!\nEstimated Band Score: ${bandScore}`);
        setActiveSet(null);
     }
  };

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
        onComplete={handleTestComplete}
      />
    );
  }

  if (user.role === 'admin') {
    return <AdminDashboard user={user} onLogout={() => setUser(null)} />;
  }

  return <UserDashboard user={user} onLogout={() => setUser(null)} onStartTest={setActiveSet} />;
};

export default App;
