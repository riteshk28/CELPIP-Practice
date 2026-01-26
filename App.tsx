import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, PracticeSet, Attempt, QuestionType, WritingEvaluation } from './types';
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

// Strict Audio Player for Test Takers (Play Once, No Seek)
const StrictAudioPlayer: React.FC<{
  src: string;
  onEnded?: () => void;
  autoPlay?: boolean;
  disabled?: boolean;
}> = ({ src, onEnded, autoPlay = true, disabled = false }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Reset state when src changes
    setHasEnded(false);
    setProgress(0);
    setIsPlaying(false);

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setHasEnded(true);
      if (onEnded) onEnded();
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    // Initial autoplay
    if (autoPlay && !disabled) {
      audio.play().catch(e => console.log("Autoplay prevented:", e));
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [src, autoPlay, disabled]);

  return (
    <div className={`bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700 ${disabled ? 'opacity-60 grayscale' : ''}`}>
      <audio ref={audioRef} src={src} className="hidden" />
      
      <div className="flex items-center gap-4 mb-3">
        {/* Status Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPlaying ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`}>
          {isPlaying ? (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
          ) : hasEnded || disabled ? (
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : (
             <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
          )}
        </div>
        
        <div className="flex-1">
          <div className="text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
             {disabled ? 'Audio Finished' : isPlaying ? 'Playing Audio...' : hasEnded ? 'Audio Completed' : 'Ready to Play'}
          </div>
          {/* Progress Bar (Non-interactive) */}
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
             <div 
               className={`h-full transition-all duration-300 ease-linear ${hasEnded || disabled ? 'bg-green-500' : 'bg-blue-500'}`} 
               style={{ width: `${disabled ? 100 : progress}%` }}
             ></div>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 text-center italic">
         {disabled ? "You have already listened to this recording." : "Audio plays once automatically."}
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
      id: `set-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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

  const addSection = (type: 'READING' | 'WRITING' | 'LISTENING') => {
    const newSection = {
      id: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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
    
    // Default timer for listening audio parts can be small, user can adjust
    // ADDED RANDOM STRING TO ID TO PREVENT COLLISION
    const newPart = {
      id: `part-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sectionId,
      timerSeconds: section.type === 'LISTENING' ? 0 : 600, 
      contentText: '',
      questions: [],
      instructions: section.type === 'LISTENING' ? 'Listen to the audio clip.' : 'Read the text and answer the questions.'
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
                   <h3 className="text-lg font-bold text-slate-800">
                     {activeSection.type === 'LISTENING' ? 'Listening Screens (Tasks)' : 'Content Parts & Timers'}
                   </h3>
                   <Button size="sm" variant="secondary" onClick={() => addPart(activeSection.id)} disabled={isSaving}>
                     {activeSection.type === 'LISTENING' ? '+ Add Screen' : '+ Add Content'}
                   </Button>
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
  
  // For Listening: Decide if this "Part" is currently acting as Audio Only or Questions
  // Default to 'AUDIO' if audioData exists and no questions, otherwise 'QUESTIONS'
  const [listeningScreenType, setListeningScreenType] = useState<'AUDIO' | 'QUESTIONS'>(
    (sectionType === 'LISTENING' && !part.audioData && part.questions.length > 0) ? 'QUESTIONS' : 'AUDIO'
  );

  const addItem = (type: QuestionType) => {
    // Unique ID for items
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ ...part, audioData: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuestionAudioUpload = (qId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newQs = part.questions.map((q: any) => 
            q.id === qId ? { ...q, audioData: reader.result as string } : q
        );
        onChange({ ...part, questions: newQs });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOptionImageUpload = (qId: string, optIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newQs = part.questions.map((q: any) => {
            if (q.id !== qId) return q;
            const newOptions = [...q.options];
            newOptions[optIdx] = reader.result as string; // Store base64 image
            // If this option was correct, update answer
            let newCorrect = q.correctAnswer;
            return { ...q, options: newOptions, correctAnswer: newCorrect === q.options[optIdx] ? reader.result : newCorrect };
        });
        onChange({ ...part, questions: newQs });
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
           <span className="bg-white border border-slate-200 text-slate-500 text-xs font-bold px-2 py-0.5 rounded">
             {sectionType === 'LISTENING' ? 'SCREEN ' : 'PART '} {index + 1}
           </span>
           <span className="text-xs text-slate-400">
             {sectionType === 'READING' ? 'Passage & Questions' : sectionType === 'WRITING' ? 'Writing Prompt' : 'Listening Task'}
           </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Timer is relevant for Question Screens in Listening, or all screens in Reading/Writing */}
          {(sectionType !== 'LISTENING' || listeningScreenType === 'QUESTIONS') && (
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
          )}
          <button onClick={onDelete} className="text-slate-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors ml-2">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
      
      {/* Editor Body */}
      <div className="p-5 space-y-4">
        {/* LISTENING SPECIFIC: Screen Type Selector */}
        {sectionType === 'LISTENING' && (
           <div className="flex gap-4 border-b border-slate-100 pb-4 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                 <input 
                    type="radio" 
                    name={`screenType-${part.id}`} 
                    checked={listeningScreenType === 'AUDIO'} 
                    onChange={() => {
                        setListeningScreenType('AUDIO');
                        // Clear questions if switching to Audio mode to avoid confusion? 
                        // No, let's keep data just in case, but hide UI.
                        onChange({ ...part, timerSeconds: 0 }); // Usually no timer for listening part
                    }}
                    className="text-blue-600 focus:ring-blue-500"
                 />
                 <span className="text-sm font-bold text-slate-700">Audio Clip Screen</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                 <input 
                    type="radio" 
                    name={`screenType-${part.id}`} 
                    checked={listeningScreenType === 'QUESTIONS'} 
                    onChange={() => {
                        setListeningScreenType('QUESTIONS');
                        onChange({ ...part, audioData: undefined }); // Clear main audio if switching to Questions mode
                    }}
                    className="text-blue-600 focus:ring-blue-500"
                 />
                 <span className="text-sm font-bold text-slate-700">Question Set Screen</span>
              </label>
           </div>
        )}

         <Input 
          label="Instructions for Student" 
          value={part.instructions} 
          onChange={e => onChange({ ...part, instructions: e.target.value })} 
          placeholder={sectionType === 'LISTENING' ? "e.g. Listen to the conversation..." : "e.g. Read the following email..."}
          className="text-sm bg-white text-slate-900"
        />
      
        {/* Split Columns */}
        <div className="grid grid-cols-2 gap-8 h-[600px]">
           {/* LEFT COLUMN */}
           <div className="flex flex-col space-y-4 h-full overflow-hidden">
              {/* Only show Text Editor if NOT Listening (or if needed for Listening instructions context) */}
              {sectionType !== 'LISTENING' && (
                <div className="flex-1 flex flex-col min-h-0">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Main Reading Passage</label>
                    <RichTextEditor 
                    className="w-full flex-1"
                    value={part.contentText}
                    onChange={val => onChange({ ...part, contentText: val })}
                    placeholder="Paste the main reading passage here..."
                    />
                </div>
              )}

              {/* Listening Audio Upload - Only for 'AUDIO' screens */}
              {sectionType === 'LISTENING' && listeningScreenType === 'AUDIO' && (
                  <div className="bg-amber-50 p-6 rounded-lg border border-amber-100 shrink-0 flex flex-col justify-center items-center h-64 border-dashed border-2 border-amber-200">
                    <div className="mb-4 text-center">
                        <label className="block text-sm font-bold text-amber-600 uppercase tracking-wider mb-1">Main Audio Track</label>
                        <p className="text-xs text-slate-500">This will play automatically when the screen loads.</p>
                    </div>
                    
                    {!part.audioData ? (
                        <input type="file" accept="audio/*" onChange={handleAudioUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 text-center"/>
                    ) : (
                        <div className="w-full max-w-xs text-center">
                           <audio controls src={part.audioData} className="w-full h-10 mb-2" />
                           <button 
                            onClick={() => onChange({ ...part, audioData: undefined })}
                            className="text-xs text-red-500 hover:text-red-700 font-bold underline"
                            >
                            Remove Audio
                            </button>
                        </div>
                    )}
                  </div>
              )}

              {/* Optional Reference Image */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 shrink-0 mt-auto">
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

           {/* RIGHT COLUMN: Question List */}
           <div className={`flex flex-col h-full overflow-hidden bg-slate-50 rounded-xl border border-slate-200 p-4 ${sectionType === 'LISTENING' && listeningScreenType === 'AUDIO' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
              {/* Only enable questions if NOT Listening Audio Mode */}
              {(sectionType === 'READING' || (sectionType === 'LISTENING' && listeningScreenType === 'QUESTIONS')) ? (
                <>
                   {/* Item List */}
                   <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar mb-4">
                     {numberedQuestions.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-xs italic">
                           Add Questions here.
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
                              {/* Audio Upload for specific question */}
                              {sectionType === 'LISTENING' && (
                                  <div className="mb-2">
                                      <div className="flex items-center gap-2 mb-1">
                                         <label className="text-[10px] font-bold text-slate-400 uppercase">Spoken Question (Optional)</label>
                                         {q.audioData && (
                                             <button onClick={() => {
                                                 const newQs = [...part.questions];
                                                 newQs[qIdx].audioData = undefined;
                                                 onChange({ ...part, questions: newQs });
                                             }} className="text-[10px] text-red-500 hover:underline">Remove</button>
                                         )}
                                      </div>
                                      {!q.audioData ? (
                                          <input type="file" accept="audio/*" onChange={(e) => handleQuestionAudioUpload(q.id, e)} className="text-[10px] w-full text-slate-500" />
                                      ) : (
                                          <audio controls src={q.audioData} className="h-6 w-full" />
                                      )}
                                  </div>
                              )}
                              <input 
                                className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 mb-2"
                                placeholder="Question Text (can be empty if audio is provided)"
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
                               {q.options.map((opt: string, oIdx: number) => {
                                 const isImageOption = opt.startsWith('data:image') || opt.startsWith('http');
                                 return (
                                 <div key={oIdx} className="flex items-center gap-2 mb-1">
                                   <input 
                                     type="radio" 
                                     name={`correct-${q.id}`}
                                     checked={q.correctAnswer === opt && opt !== ''}
                                     onChange={() => {
                                       const newQs = [...part.questions];
                                       newQs[qIdx].correctAnswer = opt;
                                       onChange({ ...part, questions: newQs });
                                     }}
                                     className="h-3 w-3 text-blue-600 cursor-pointer shrink-0"
                                     title="Mark as correct"
                                   />
                                   
                                   {/* Input or Image Preview */}
                                   <div className="flex-1 flex gap-2">
                                      {isImageOption ? (
                                          <div className="relative group/img w-full">
                                            <img src={opt} className="h-10 border rounded bg-slate-50 object-contain" alt="Option" />
                                            <button 
                                              onClick={() => {
                                                const newQs = [...part.questions];
                                                newQs[qIdx].options[oIdx] = '';
                                                // Reset correct answer if it was this one
                                                if (newQs[qIdx].correctAnswer === opt) newQs[qIdx].correctAnswer = '';
                                                onChange({ ...part, questions: newQs });
                                              }}
                                              className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover/img:opacity-100 transition-opacity"
                                            >
                                              &times;
                                            </button>
                                          </div>
                                      ) : (
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
                                      )}
                                      
                                      {/* Image Upload Button for Option */}
                                      <label className="cursor-pointer text-slate-400 hover:text-blue-500">
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleOptionImageUpload(q.id, oIdx, e)} />
                                      </label>
                                   </div>
                                 </div>
                                )
                               })}
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
                  <p>
                    {sectionType === 'WRITING' ? 'Writing tasks: User gets a text area.' : 'Questions Disabled in Audio Mode'}
                  </p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

// --- TestRunner Helpers ---

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
       // It's likely plain text. Convert newlines to breaks/paragraphs.
       // But to avoid double wrapping if we have mixed content, we do a simple check.
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
      part.questions.forEach((q: any) => {
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

// --- NEW COMPONENT: WRITING EVALUATION VIEW ---
const WritingEvaluationView: React.FC<{
    section: any;
    aiFeedback: Record<string, WritingEvaluation>;
    onExit: () => void;
}> = ({ section, aiFeedback, onExit }) => {
    // Calculate average band score
    const scores = Object.values(aiFeedback).map((f: WritingEvaluation) => f.bandScore);
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // Helper to render simple text with bold markers (**text**) and headers (### text)
    const renderFormattedText = (text: string) => {
        if (!text) return null;
        return text.split('\n').map((line, i) => {
            let cleanLine = line.trim();
            if (!cleanLine) return <div key={i} className="h-2"></div>; // Preserve some spacing for empty lines

            // Header detection: ### Header OR **Header** (short, no colons)
            const isHeader = cleanLine.startsWith('###') || (cleanLine.startsWith('**') && cleanLine.endsWith('**') && cleanLine.length < 50 && !cleanLine.includes(':'));
            
            if (isHeader) {
                const content = cleanLine.replace(/^###\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '');
                return <h5 key={i} className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-4 mb-2">{content}</h5>;
            }

            // List item detection
            const isListItem = cleanLine.startsWith('- ') || cleanLine.startsWith('* ');
            if (isListItem) {
                cleanLine = cleanLine.replace(/^[-*]\s+/, '');
            }

            // Parse bold: **text**
            const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
            const content = parts.map((part, j) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={j} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
                }
                return <span key={j}>{part}</span>;
            });

            if (isListItem) {
                return (
                    <div key={i} className="flex gap-2 mb-1 text-sm leading-relaxed text-slate-700 pl-2">
                        <span className="text-blue-400 font-bold">•</span>
                        <p>{content}</p>
                    </div>
                );
            }

            return (
                <p key={i} className="mb-2 text-sm leading-relaxed text-slate-700">
                    {content}
                </p>
            );
        });
    };

    return (
        <div className="h-screen flex flex-col bg-slate-50">
             <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shadow-sm z-10">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">AI Writing Evaluation</h2>
                    <p className="text-slate-500 mt-1">Detailed analysis of your writing performance.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-3xl font-bold text-slate-900">CLB {averageScore}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Estimated Band</div>
                    </div>
                    <div className="h-12 w-12 rounded-full flex items-center justify-center font-bold border-4 border-blue-500 text-blue-600 bg-blue-50">
                        {averageScore}
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full space-y-8">
                {section.parts.map((part: any, idx: number) => {
                    const feedback = aiFeedback[part.id];
                    if (!feedback) return null;

                    return (
                        <div key={part.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700">Task {idx + 1}: {part.instructions ? part.instructions.substring(0, 50) + "..." : "Writing Response"}</h3>
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">Score: {feedback.bandScore}</span>
                            </div>
                            <div className="p-6 grid md:grid-cols-2 gap-8">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">Examiner Feedback</h4>
                                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-100 h-full">
                                        {renderFormattedText(feedback.feedback)}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">Corrections & Improvements</h4>
                                    <div className="bg-amber-50 p-5 rounded-lg border border-amber-100 h-full text-amber-900">
                                        {renderFormattedText(feedback.corrections)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <footer className="bg-white border-t border-slate-200 px-8 py-4 flex justify-end sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <Button size="lg" onClick={onExit} className="shadow-blue-200 shadow-lg">Save Result & Exit</Button>
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
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [writingInputs, setWritingInputs] = useState<Record<string, string>>({});
  const [showReview, setShowReview] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<Record<string, WritingEvaluation>>({});
  const [showEvaluation, setShowEvaluation] = useState(false);
  
  // Derived state to identify if current screen is "Audio Only" or "Question Set"
  const section = set.sections[currentSectionIndex];
  const part = section?.parts[currentPartIndex];
  const isAudioScreen = section?.type === 'LISTENING' && part?.audioData && (!part.questions || part.questions.length === 0);

  // Initialize timer
  useEffect(() => {
    if (part) {
      setTimeLeft(part.timerSeconds || 0);
    }
  }, [part]);

  useEffect(() => {
    // Timer logic: 
    // If it's an Audio Screen, we generally pause timer or let audio duration dictate flow (infinite time).
    // If it's a Question Screen, we countdown.
    if (isAudioScreen || showReview || showEvaluation || isAnalyzing || timeLeft <= 0) {
       return; 
    }

    let timer: any;
    if (timeLeft > 0) {
        timer = setInterval(() => setTimeLeft(prev => Math.max(0, prev - 1)), 1000);
    }
    return () => clearInterval(timer);
  }, [timeLeft, showReview, showEvaluation, isAnalyzing, isAudioScreen]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleNext = () => {
    // If on Audio screen, Next acts as "Skip Audio" or "Continue" if done.
    if (isAudioScreen) {
        if (confirm("Skip audio and continue?")) {
            // just proceed
        } else {
            return;
        }
    }

    // Check if we are at the end of the section
    const isLastPart = currentPartIndex === section.parts.length - 1;
    
    // READING / LISTENING REVIEW
    if (isLastPart && (section.type === 'READING' || section.type === 'LISTENING') && !showReview) {
        setShowReview(true);
        return;
    }

    if (currentPartIndex < section.parts.length - 1) {
      setCurrentPartIndex(prev => prev + 1);
    } else if (currentSectionIndex < set.sections.length - 1) {
      // Moving to next section
      setCurrentSectionIndex(prev => prev + 1);
      setCurrentPartIndex(0);
    } else {
      // Test Finished
      finishTest();
    }
  };

  const handleReviewContinue = () => {
     setShowReview(false);
     if (currentSectionIndex < set.sections.length - 1) {
        setCurrentSectionIndex(prev => prev + 1);
        setCurrentPartIndex(0);
     } else {
        finishTest();
     }
  };

  const analyzeWriting = async () => {
    setIsAnalyzing(true);
    const feedbackMap: Record<string, WritingEvaluation> = {};
    
    // Only analyze parts that belong to writing sections
    const writingSections = set.sections.filter(s => s.type === 'WRITING');
    
    for (const sec of writingSections) {
        for (const p of sec.parts) {
            // Use PART ID for retrieval, matching new storage logic
            const response = writingInputs[p.id]; 
            
            // Only send for evaluation if there is significant text
            if (response && response.trim().length > 10) {
                 const result = await API.evaluateWriting(p.instructions + "\n" + p.contentText, response);
                 if (result) {
                     feedbackMap[p.id] = result;
                 }
            }
        }
    }
    
    setAiFeedback(feedbackMap);
    setIsAnalyzing(false);
    setShowEvaluation(true);
  };

  const finishTest = async () => {
    // If it's a writing test involved, trigger AI analysis before final submission
    const hasWriting = set.sections.some(s => s.type === 'WRITING');
    if (hasWriting && !showEvaluation) {
        await analyzeWriting();
        return;
    }

    const scores: Record<string, number> = {};
    let totalQuestions = 0;
    let correctQuestions = 0;

    set.sections.forEach(sec => {
      if (sec.type === 'READING' || sec.type === 'LISTENING') {
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
      if (sec.type === 'WRITING') {
          // Use AI score if available, otherwise default 0
          // Sum up part scores? Average them?
          // If multiple parts, average the band score.
          const partScores = sec.parts.map(p => {
             const feedback = aiFeedback[p.id];
             return feedback ? (feedback as WritingEvaluation).bandScore : 0;
          }).filter((s: number) => s > 0);
          
          const avg = partScores.length > 0 ? Math.round(partScores.reduce((a, b) => a + b, 0) / partScores.length) : 0;
          scores[sec.id] = avg; 
      }
    });

    const results = { sectionScores: scores, totalCorrect: correctQuestions, totalPossible: totalQuestions, aiFeedback };
    onComplete(results);
  };

  // Logic to calculate numbering for displayed questions (skipping Passages)
  // We need to calculate this once upfront so numbers are consistent across the whole SECTION
  // However, in this view, we only render questions for the CURRENT PART. 
  // IMPORTANT: For Listening, questions are split across parts. We should probably number them 1..N per part, or global?
  // Let's stick to Part-based numbering for now as it's simpler.
  let questionCounter = 0;
  const numberedQuestions = part ? part.questions.map((q: any) => {
     if (q.type !== 'PASSAGE') {
        questionCounter++;
        return { ...q, displayNum: questionCounter };
     }
     return { ...q, displayNum: null };
  }) : [];

  // Helper to safely render plain text or HTML content for the main left pane
  const renderMainContent = (content: string) => {
      if (!content) return null;
      if (content.includes('<') && content.includes('>')) {
          return <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed font-serif text-lg" dangerouslySetInnerHTML={{ __html: content }} />;
      }
      return <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed font-serif text-lg whitespace-pre-wrap">{content}</div>;
  };

  if (isAnalyzing) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-8">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Analyzing your Writing...</h2>
              <p className="text-slate-500 max-w-md">
                  Gemini AI is evaluating your response against CELPIP criteria for coherence, vocabulary, and grammar. This may take a few seconds.
              </p>
          </div>
      );
  }

  if (showEvaluation) {
      return (
        <WritingEvaluationView 
            section={set.sections.find(s => s.type === 'WRITING') || section} // Pass the writing section (or current if it is writing)
            aiFeedback={aiFeedback} 
            onExit={finishTest} 
        />
      );
  }

  if (showReview) {
     return <SectionReview section={section} answers={answers} onContinue={handleReviewContinue} />;
  }

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
             <span className="text-blue-400">Screen {currentPartIndex + 1} of {section.parts.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <div className={`text-xl font-mono font-bold bg-slate-800 px-3 py-1 rounded ${timeLeft < 60 && !isAudioScreen ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
             {isAudioScreen ? 'AUDIO PLAYING' : formatTime(timeLeft)}
           </div>
           <Button variant="danger" size="sm" onClick={onExit} className="opacity-80 hover:opacity-100">Exit Test</Button>
           <Button variant="primary" onClick={handleNext} className="bg-blue-600 hover:bg-blue-500 font-bold px-6">
             {isAudioScreen ? 'Skip Audio' : 
              (currentSectionIndex === set.sections.length - 1 && currentPartIndex === section.parts.length - 1 ? 'Finish Test' : 'Next Screen →')}
           </Button>
        </div>
      </header>

      {/* VIEW: AUDIO SCREEN (Listening Phase) */}
      {isAudioScreen && (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-100 p-8 text-center animate-in fade-in duration-500">
             <div className="max-w-2xl w-full bg-white p-12 rounded-2xl shadow-xl border border-slate-200">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Listen to the recording</h2>
                <p className="text-slate-500 mb-8">{part.instructions || "The test timer is paused while the audio is playing."}</p>
                
                {part.audioData && (
                    <div className="max-w-md mx-auto">
                        <StrictAudioPlayer 
                            src={part.audioData} 
                            // Auto-advance is optional, maybe too jarring. Let user click Next.
                            // onEnded={() => {}} 
                        />
                    </div>
                )}
             </div>
          </div>
      )}

      {/* VIEW: QUESTION / CONTENT SCREEN */}
      {!isAudioScreen && (
        <div className="flex-1 flex overflow-hidden animate-in fade-in duration-300">
            {/* Left Pane: Instructions -> Text -> Image */}
            <div className="w-1/2 p-8 overflow-y-auto border-r border-slate-200 bg-slate-50 scroll-smooth">
            <div className="mb-8">
                {part.instructions && (
                    <div className="bg-blue-50 text-blue-900 p-4 rounded-lg mb-6 text-sm font-medium border border-blue-100 shadow-sm flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {part.instructions}
                    </div>
                )}
                
                {/* For Listening Question Screens, we show a "Audio Completed" placeholder if user wants context */}
                {section.type === 'LISTENING' && (
                    <div className="mb-6 opacity-70 border border-slate-300 rounded-lg p-4 bg-slate-200 text-center text-slate-500 text-xs font-bold uppercase tracking-wider">
                       Audio Recording Completed
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

            {/* Right Pane: Questions (MCQ) and Passages */}
            <div className="w-1/2 p-8 overflow-y-auto bg-white scroll-smooth relative">
            {(section.type === 'READING' || section.type === 'LISTENING') ? (
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
                        return null; // Don't render cloze definitions directly in list
                    }
                    // Standard MCQ
                    return (
                        <div key={q.id} className="p-5 rounded-xl border border-slate-100 hover:border-blue-200 transition-all shadow-sm hover:shadow-md bg-white group">
                            <div className="font-semibold text-slate-900 mb-4 flex gap-3 items-start">
                            <span className="bg-slate-800 text-white w-7 h-7 rounded flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">{q.displayNum}</span>
                            <div className="flex-1">
                                {/* Specific Question Audio */}
                                {q.audioData && (
                                    <div className="mb-2">
                                        <StrictAudioPlayer src={q.audioData} autoPlay={false} />
                                    </div>
                                )}
                                <span className="mt-0.5">{q.text}</span>
                            </div>
                            </div>
                            <div className="space-y-2 ml-10">
                                {q.options?.map((opt: string, oIdx: number) => {
                                  const isImageOption = opt.startsWith('data:image') || opt.startsWith('http');
                                  return (
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
                                    {isImageOption ? (
                                        <div className={`p-1 border rounded ${answers[q.id] === opt ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                                            <img src={opt} className="h-24 w-auto object-contain" alt="Option" />
                                        </div>
                                    ) : (
                                        <span className="text-slate-700 peer-checked:text-blue-700 font-medium">{opt}</span>
                                    )}
                                  </label>
                                )})}
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
                    Word Count: {(writingInputs[part.id] || '').split(/\s+/).filter(w => w.length > 0).length}
                    </span>
                </div>
                <TextArea 
                    className="flex-1 w-full p-6 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-base leading-relaxed bg-white text-slate-900 transition-colors shadow-inner min-h-[500px]"
                    placeholder="Type your response here..."
                    value={writingInputs[part.id] || ''}
                    onChange={(e) => setWritingInputs(prev => ({ ...prev, [part.id]: e.target.value }))}
                />
                </div>
            )}
            </div>
        </div>
      )}
    </div>
  );
};

// 6. USER DASHBOARD
const UserDashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'practice' | 'progress'>('practice');
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
      bandScore: Math.min(12, Math.round((results.totalCorrect / results.totalPossible) * 12) || 0),
      aiFeedback: results.aiFeedback
    };
    
    await API.saveAttempt(newAttempt);
    setView('HOME');
    setSelectedSet(null);
  };

  if (view === 'TEST' && selectedSet) {
    return <TestRunner set={selectedSet} onComplete={handleTestComplete} onExit={() => setView('HOME')} />;
  }

  // Helper to resolve section type from loaded sets for chart visualization
  const getSectionType = (setId: string, sectionId: string) => {
    const set = sets.find(s => s.id === setId);
    const sec = set?.sections.find(s => s.id === sectionId);
    return sec?.type;
  };

  // Prepare chart data with individual section trends
  // Data structure: [{ date: '...', READING: 10, WRITING: 8 }, ...]
  const chartData = history.map(h => {
    const point: any = { date: h.date, name: h.setTitle };
    Object.entries(h.sectionScores).forEach(([secId, score]) => {
      const type = getSectionType(h.setId, secId);
      if (type) {
        // Plotting raw score for now as band conversion happens elsewhere or needs schema update
        point[type] = score;
      }
    });
    return point;
  }).reverse(); // Sort oldest to newest

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

      {/* TABS NAVIGATION */}
      <div className="bg-white border-b border-slate-200">
         <div className="max-w-6xl mx-auto px-6 flex gap-8">
            <button 
              onClick={() => setActiveTab('practice')}
              className={`py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'practice' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Practice Sets
            </button>
            <button 
              onClick={() => setActiveTab('progress')}
              className={`py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'progress' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              My Progress
            </button>
         </div>
      </div>

      <main className="max-w-6xl mx-auto p-6 space-y-10 pb-20">
        
        {/* TAB: MY PROGRESS */}
        {activeTab === 'progress' && (
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Your Progress</h2>
                <p className="text-slate-500 text-sm mt-1">Track your band scores across different sections over time.</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-96">
               {chartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="date" tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} dy={10} />
                     <YAxis domain={[0, 12]} tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                     <Tooltip 
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                     />
                     <Legend wrapperStyle={{paddingTop: '20px'}} iconType="circle" />
                     <Line type="monotone" dataKey="READING" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                     <Line type="monotone" dataKey="WRITING" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                     <Line type="monotone" dataKey="LISTENING" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                     <Line type="monotone" dataKey="SPEAKING" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                   </LineChart>
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
        )}

        {/* TAB: PRACTICE SETS */}
        {activeTab === 'practice' && (
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
        )}
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