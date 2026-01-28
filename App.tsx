import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, PracticeSet, Attempt, QuestionType, WritingEvaluation, Section, Part } from './types';
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

// Strict Audio Player for Test Takers (Play Once, No Seek, Auto Play)
const StrictAudioPlayer: React.FC<{
  src?: string;
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

    // Reset
    setHasEnded(false);
    setProgress(0);
    setIsPlaying(false);
    
    if(src) audio.load();

    if (!src) return;

    const handleTimeUpdate = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setHasEnded(true);
      if (onEnded) onEnded();
    };

    const handlePlay = () => setIsPlaying(false); // Fix: setIsPlaying(false) when it plays or ensure state correct
    const handlePause = () => setIsPlaying(false);
    
    // Correction: handlePlay should set true
    const onPlay = () => setIsPlaying(true);

    const handleError = (e: any) => console.error("Audio Playback Error", e);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    // Initial autoplay attempt
    if (autoPlay && !disabled && src) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
            console.log("Autoplay prevented (user interaction needed).", e);
        });
      }
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [src, autoPlay, disabled]);

  if (!src) {
      return (
          <div className="bg-red-50 p-2 rounded border border-red-200 text-center">
              <p className="text-red-500 text-xs font-bold">Audio missing</p>
          </div>
      )
  }

  return (
    <div className={`bg-slate-800 p-3 rounded-lg shadow border border-slate-700 ${disabled ? 'opacity-60 grayscale' : ''}`}>
      <audio ref={audioRef} src={src} className="hidden" controls={false} />
      
      <div className="flex items-center gap-3">
        {/* Status Icon */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isPlaying ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`}>
          {isPlaying ? (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
          ) : hasEnded || disabled ? (
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : (
             <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
          )}
        </div>
        
        <div className="flex-1">
          {/* Progress Bar (Non-interactive) */}
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
             <div 
               className={`h-full transition-all duration-300 ease-linear ${hasEnded || disabled ? 'bg-green-500' : 'bg-blue-500'}`} 
               style={{ width: `${disabled ? 100 : progress}%` }}
             ></div>
          </div>
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
            <Input label="Full Name" type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required={isSignUp} />
          )}
          <Input label="Email Address" type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          <Button type="submit" className="w-full py-3 text-base shadow-blue-200 shadow-lg" disabled={loading}>
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="font-bold text-blue-600 hover:text-blue-700 hover:underline">{isSignUp ? "Sign In" : "Sign Up"}</button>
          </p>
        </div>
      </div>
    </div>
  );
};

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
    if (window.confirm('Are you sure?')) {
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
      }
    }
  };

  if (editingSet) {
    return (
      <SetEditor 
        set={editingSet} 
        onChange={setEditingSet} 
        onSave={handleSaveSet} 
        onCancel={() => setEditingSet(null)}
        isSaving={isSaving}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="flex justify-between items-center mb-8 max-w-6xl mx-auto bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
           <span className="text-sm text-slate-600">{user.email}</span>
           <Button variant="outline" size="sm" onClick={onLogout}>Logout</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-slate-800">Practice Sets</h2>
          <Button onClick={handleCreateSet}>+ Create New Set</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sets.map(set => (
            <div key={set.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md">
              <div className="p-6 cursor-pointer hover:bg-slate-50" onClick={() => setEditingSet(set)}>
                <h3 className="font-bold text-slate-900 mb-2 truncate">{set.title}</h3>
                <p className="text-slate-500 text-xs mb-4">{set.description || 'No description.'}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{set.sections.length} Sections</span>
                </div>
              </div>
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                 <button onClick={() => setEditingSet(set)} className="text-xs font-bold text-blue-600">Edit</button>
                 <button onClick={(e) => handleDeleteSet(e, set.id)} className="text-xs font-bold text-red-500">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

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
    
    const newPart = {
      id: `part-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sectionId,
      timerSeconds: section.type === 'LISTENING' ? 0 : 600, 
      contentText: '',
      questions: [],
      instructions: section.type === 'LISTENING' ? 'Listen to the audio conversation.' : 'Read and answer.'
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
          <div className="flex flex-col">
             <input 
               value={set.title} 
               onChange={e => onChange({ ...set, title: e.target.value })}
               className="font-bold text-lg border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none"
               placeholder="Set Title"
             />
          </div>
        </div>
        <div className="flex gap-4 items-center">
           <label className="flex items-center gap-2 text-sm">
             <input type="checkbox" checked={set.isPublished} onChange={e => onChange({ ...set, isPublished: e.target.checked })} />
             Published
           </label>
           <Button onClick={onSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-700 text-xs uppercase mb-3">Sections</h3>
            <div className="grid grid-cols-2 gap-2">
               <button onClick={() => addSection('READING')} className="p-2 text-xs bg-white border rounded hover:border-blue-400 font-bold">+ Reading</button>
               <button onClick={() => addSection('WRITING')} className="p-2 text-xs bg-white border rounded hover:border-green-400 font-bold">+ Writing</button>
               <button onClick={() => addSection('LISTENING')} className="p-2 text-xs bg-white border rounded hover:border-amber-400 font-bold">+ Listening</button>
            </div>
          </div>
          <div className="p-2 space-y-1">
            {set.sections.map((section, idx) => (
              <div 
                key={section.id} 
                className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer ${activeSectionId === section.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                onClick={() => !isSaving && setActiveSectionId(section.id)}
              >
                <div className="truncate text-sm font-medium">{idx+1}. {section.title}</div>
                <button onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }} className="text-slate-400 hover:text-red-500">&times;</button>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
          {activeSection ? (
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <Input label="Section Title" value={activeSection.title} onChange={e => updateSection(activeSection.id, { title: e.target.value })} />
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                   <h3 className="text-lg font-bold text-slate-800">Parts & Content</h3>
                   <Button size="sm" variant="secondary" onClick={() => addPart(activeSection.id)}>+ Add Part</Button>
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
             <div className="flex h-full items-center justify-center text-slate-400">Select a section to edit</div>
          )}
        </main>
      </div>
    </div>
  );
};

const PartEditor: React.FC<{ 
  part: any; 
  index: number; 
  sectionType: string;
  onChange: (p: any) => void; 
  onDelete: () => void; 
}> = ({ part, index, sectionType, onChange, onDelete }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingQ, setGeneratingQ] = useState<string | null>(null);

  const addItem = (type: QuestionType) => {
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      partId: part.id,
      text: '',
      type,
      options: type !== 'PASSAGE' ? ['', '', '', ''] : undefined,
      correctAnswer: type !== 'PASSAGE' ? '' : undefined,
      weight: 1,
      image: undefined
    };
    onChange({ ...part, questions: [...part.questions, newItem] });
  };

  // Generate Audio for Main Script (Listening Module)
  const handleGenerateAudio = async () => {
     if (!part.contentText || part.contentText.trim().length === 0) return alert("Enter script first.");
     setIsGenerating(true);
     const result = await API.generateSpeech(part.contentText); 
     setIsGenerating(false);
     if (result?.audioData) {
         onChange({ ...part, audioData: result.audioData });
     } else {
         alert("Failed to generate audio.");
     }
  };

  // Generate Audio for Individual Questions
  const handleGenerateQuestionAudio = async (qId: string, text: string) => {
      if (!text) return alert("Enter question text first.");
      setGeneratingQ(qId);
      const result = await API.generateSpeech(text);
      setGeneratingQ(null);
      if (result?.audioData) {
          const newQs = part.questions.map((q: any) => 
              q.id === qId ? { ...q, audioData: result.audioData } : q
          );
          onChange({ ...part, questions: newQs });
      }
  };

  // Standard Image Upload (Main Content)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onChange({ ...part, imageData: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  // Question Image Upload
  const handleQuestionImageUpload = (qId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const newQs = part.questions.map((q: any) => 
               q.id === qId ? { ...q, image: reader.result as string } : q
            );
            onChange({ ...part, questions: newQs });
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <span className="bg-white border text-xs font-bold px-2 py-0.5 rounded">Part {index + 1}</span>
           <span className="text-xs text-slate-400">{sectionType}</span>
        </div>
        <div className="flex items-center gap-3">
          <Input 
            type="number" 
            placeholder="Timer (sec)" 
            className="w-24 text-center h-8 text-xs" 
            value={part.timerSeconds} 
            onChange={e => onChange({ ...part, timerSeconds: parseInt(e.target.value) || 0 })} 
          />
          <button onClick={onDelete} className="text-slate-400 hover:text-red-500">&times;</button>
        </div>
      </div>
      
      <div className="p-5 space-y-4">
         <Input label="Instructions" value={part.instructions} onChange={e => onChange({ ...part, instructions: e.target.value })} />
      
        <div className="grid grid-cols-2 gap-8 h-[500px]">
           {/* LEFT COLUMN: Content / Script */}
           <div className="flex flex-col space-y-4 h-full">
              
              {/* LISTENING: Script Editor & Audio Generator */}
              {sectionType === 'LISTENING' ? (
                  <div className="flex-1 flex flex-col border rounded-lg p-3 bg-amber-50/30">
                      <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-bold text-amber-600 uppercase">Audio Script</label>
                          {part.audioData && <span className="text-xs text-green-600 font-bold">Audio Ready ✓</span>}
                      </div>
                      <textarea
                          className="flex-1 w-full text-sm font-mono p-2 border rounded resize-none focus:outline-none mb-2"
                          value={part.contentText || ''}
                          onChange={(e) => onChange({ ...part, contentText: e.target.value })} 
                          placeholder={`Man: Hello.\nWoman: Hi there.\n\n(Type script to generate audio)`}
                      />
                      <div className="flex gap-2 items-center">
                          <Button size="sm" onClick={handleGenerateAudio} disabled={isGenerating}>
                              {isGenerating ? 'Generating...' : 'Generate Audio'}
                          </Button>
                          {part.audioData && (
                              <audio controls src={part.audioData} className="h-8 w-40" key={part.audioData} />
                          )}
                      </div>
                  </div>
              ) : (
                  <div className="flex-1 flex flex-col min-h-0">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2">Reading Text</label>
                    <RichTextEditor 
                        className="flex-1"
                        value={part.contentText}
                        onChange={val => onChange({ ...part, contentText: val })}
                    />
                  </div>
              )}

              <div className="bg-slate-50 p-3 rounded border border-slate-100 shrink-0">
                <label className="text-xs font-bold text-slate-500">Image (Optional)</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-xs mt-1"/>
                {part.imageData && <img src={part.imageData} className="h-20 mt-2 border bg-white" />}
              </div>
           </div>

           {/* RIGHT COLUMN: Questions */}
           <div className="flex flex-col h-full bg-slate-50 rounded-xl border p-4 overflow-hidden">
               <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                 {numberedQuestions.map((q: any, qIdx: number) => (
                   <div key={q.id} className="bg-white p-3 rounded border shadow-sm">
                      <div className="flex justify-between mb-2">
                         <span className="text-xs font-bold bg-slate-100 px-1 rounded">{q.type} {q.displayNum}</span>
                         <button onClick={() => {
                            const newQs = part.questions.filter((item: any) => item.id !== q.id);
                            onChange({ ...part, questions: newQs });
                         }} className="text-red-400 font-bold">&times;</button>
                      </div>
                      
                      {q.type === 'PASSAGE' && (
                         <RichTextEditor className="h-32" value={q.text} onChange={val => {
                            const newQs = [...part.questions]; newQs[qIdx].text = val; onChange({ ...part, questions: newQs });
                         }} />
                      )}

                      {q.type === 'MCQ' && (
                        <div className="mb-2">
                           {/* QUESTION IMAGE UPLOAD */}
                           <div className="mb-2 bg-slate-50 p-1.5 rounded border border-dashed border-slate-300">
                               <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Question Image</label>
                               <input type="file" accept="image/*" onChange={(e) => handleQuestionImageUpload(q.id, e)} className="block w-full text-xs"/>
                               {q.image && <img src={q.image} className="mt-2 h-16 border rounded bg-white object-contain" />}
                           </div>

                          <div className="flex gap-2 mb-1">
                              <input 
                                className="flex-1 border rounded px-2 py-1 text-xs"
                                placeholder="Question Text"
                                value={q.text}
                                onChange={e => {
                                  const newQs = [...part.questions]; newQs[qIdx].text = e.target.value; onChange({ ...part, questions: newQs });
                                }}
                              />
                              {/* LISTENING: Question Audio Button */}
                              {sectionType === 'LISTENING' && (
                                  <button 
                                    onClick={() => handleGenerateQuestionAudio(q.id, q.text)}
                                    className={`px-2 py-1 rounded text-xs font-bold border ${q.audioData ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-slate-500 border-slate-200'}`}
                                    title="Generate Audio for Question"
                                  >
                                      {generatingQ === q.id ? '...' : '♫'}
                                  </button>
                              )}
                          </div>
                          {q.audioData && <audio controls src={q.audioData} className="h-6 w-full mb-2" key={q.audioData} />}
                        </div>
                      )}

                      {q.type === 'CLOZE' && (
                          <input className="w-full border rounded px-2 py-1 text-xs mb-2" placeholder="Gap ID (e.g. 1)" value={q.text} onChange={e => {
                              const newQs = [...part.questions]; newQs[qIdx].text = e.target.value; onChange({ ...part, questions: newQs });
                          }} />
                      )}

                      {(q.type === 'MCQ' || q.type === 'CLOZE') && (
                        <div className="space-y-1">
                           {q.options.map((opt: string, oIdx: number) => (
                             <div key={oIdx} className="flex gap-1">
                               <input type="radio" checked={q.correctAnswer === opt && opt !== ''} onChange={() => {
                                   const newQs = [...part.questions]; newQs[qIdx].correctAnswer = opt; onChange({ ...part, questions: newQs });
                               }} />
                               <input className="flex-1 border rounded px-2 py-0.5 text-xs" value={opt} onChange={e => {
                                  const newQs = [...part.questions]; newQs[qIdx].options[oIdx] = e.target.value;
                                  if(q.correctAnswer === opt) newQs[qIdx].correctAnswer = e.target.value;
                                  onChange({ ...part, questions: newQs });
                               }} />
                             </div>
                           ))}
                        </div>
                      )}
                   </div>
                 ))}
               </div>
               <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t">
                 <button onClick={() => addItem('MCQ')} className="text-xs font-bold py-1 border rounded hover:bg-slate-100">+ MCQ</button>
                 <button onClick={() => addItem('PASSAGE')} className="text-xs font-bold py-1 border rounded hover:bg-slate-100">+ Passage</button>
                 <button onClick={() => addItem('CLOZE')} className="text-xs font-bold py-1 border rounded hover:bg-slate-100">+ Cloze</button>
               </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const TestRunner: React.FC<{ 
  set: PracticeSet; 
  onComplete: (results: any) => void; 
  onExit: () => void; 
}> = ({ set, onComplete, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to resolve API requests for audio generation if needed (Client side fetch helper for API.ts not shown here but assumed consistent)
  // For TestRunner we just play audio

  const parts = React.useMemo(() => {
     const flat: { section: any, part: any }[] = [];
     set.sections.forEach(sec => {
        sec.parts.forEach(p => flat.push({ section: sec, part: p }));
     });
     return flat;
  }, [set]);

  const currentItem = parts[currentIndex];
  const { section, part } = currentItem || {};

  // Check if this is an Audio-Only Screen (Listening Phase)
  // Definition: Listening Section + Has Audio + No Questions
  const isListeningPhase = section?.type === 'LISTENING' && part?.audioData && (!part.questions || part.questions.length === 0);

  useEffect(() => {
     if (part) setTimeLeft(part.timerSeconds);
  }, [part]);

  useEffect(() => {
     if (timeLeft <= 0 || isSubmitting) return; // Audio phases might rely on audio length, but keep timer as backup
     const timer = setInterval(() => {
        setTimeLeft(t => {
           if (t <= 1) {
              clearInterval(timer);
              // Auto next? Maybe.
              return 0;
           }
           return t - 1;
        });
     }, 1000);
     return () => clearInterval(timer);
  }, [timeLeft]);

  const handleNext = async () => {
     if (currentIndex < parts.length - 1) {
        setCurrentIndex(c => c + 1);
        window.scrollTo(0,0);
     } else {
        submitTest();
     }
  };

  const submitTest = () => {
     setIsSubmitting(true);
     // Calculate scores logic (simplified)
     let score = 0;
     let total = 0;
     const scores: any = {};
     parts.forEach(({section, part}) => {
         if(!scores[section.id]) scores[section.id] = 0;
         part.questions.forEach((q: any) => {
             if(q.type === 'MCQ' || q.type === 'CLOZE') {
                 total++;
                 if(answers[q.id] === q.correctAnswer) {
                     score++;
                     scores[section.id]++;
                 }
             }
         });
     });
     onComplete({ sectionScores: scores, totalCorrect: score, totalPossible: total, answers });
  };

  if (!currentItem) return null;

  let qCounter = 0;
  const displayQs = part.questions.map((q: any) => {
      if(q.type !== 'PASSAGE') { qCounter++; return { ...q, displayNum: qCounter }; }
      return { ...q, displayNum: null };
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
       <header className="bg-slate-900 text-white px-6 py-3 flex justify-between items-center shadow-lg sticky top-0 z-20">
          <div>
             <h2 className="font-bold text-lg">{section.type} SECTION</h2>
             <p className="text-xs text-slate-400">Part {currentIndex + 1} of {parts.length}</p>
          </div>
          <div className="flex items-center gap-6">
             <div className="font-mono font-bold text-xl">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</div>
             <Button onClick={() => handleNext()} variant="primary" className="bg-blue-600 hover:bg-blue-500">
                {currentIndex === parts.length - 1 ? 'Finish' : 'Next >'}
             </Button>
          </div>
       </header>

       {isListeningPhase ? (
           <div className="flex-1 flex flex-col items-center justify-center bg-slate-200 p-8">
               <div className="bg-white p-12 rounded-2xl shadow-xl max-w-xl w-full text-center">
                   <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                   </div>
                   <h2 className="text-2xl font-bold text-slate-900 mb-2">Listen to the recording</h2>
                   <p className="text-slate-500 mb-8">{part.instructions}</p>
                   {/* Audio Player without controls if we want to force listen, but StrictAudioPlayer handles one-time logic */}
                   <div className="max-w-md mx-auto">
                        <StrictAudioPlayer src={part.audioData} />
                   </div>
               </div>
           </div>
       ) : (
           <div className="flex-1 overflow-hidden flex">
              <div className="w-1/2 p-6 overflow-y-auto border-r border-slate-200 bg-white">
                 <div className="max-w-2xl mx-auto space-y-6">
                    <div className="bg-blue-50 p-4 rounded text-blue-900 text-sm font-medium">{part.instructions}</div>
                    
                    {/* If Audio exists WITH questions, user can play it (reference audio) */}
                    {part.audioData && (
                        <div className="mb-4">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Conversation</p>
                            <StrictAudioPlayer src={part.audioData} autoPlay={false} />
                        </div>
                    )}

                    {part.imageData && <img src={part.imageData} className="w-full rounded border" />}
                    
                    {/* Only show text script if NOT Listening section */}
                    {part.contentText && section.type !== 'LISTENING' && (
                        <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: part.contentText }} />
                    )}
                 </div>
              </div>

              <div className="w-1/2 p-6 overflow-y-auto bg-slate-50">
                 <div className="max-w-2xl mx-auto space-y-6">
                    {section.type === 'WRITING' ? (
                       <TextArea 
                          className="h-96" 
                          placeholder="Your response..." 
                          value={answers[`part-${part.id}`] || ''} 
                          onChange={e => setAnswers({ ...answers, [`part-${part.id}`]: e.target.value })} 
                       />
                    ) : (
                       displayQs.map((q: any) => (
                          <div key={q.id} className="bg-white p-5 rounded border shadow-sm">
                             {q.type === 'PASSAGE' ? (
                                <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: q.text }} />
                             ) : (
                                <div>
                                   <div className="flex gap-2 items-start mb-3">
                                       <span className="bg-slate-800 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0">{q.displayNum}</span>
                                       <div className="flex-1">
                                           {/* Question Text & Audio */}
                                           <div className="flex items-center gap-2 mb-2">
                                               {q.audioData && (
                                                   <button 
                                                     className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-200"
                                                     onClick={() => {
                                                         const a = new Audio(q.audioData);
                                                         a.play();
                                                     }}
                                                   >
                                                       ▶
                                                   </button>
                                               )}
                                               <span className="font-bold text-slate-900">{q.text}</span>
                                           </div>

                                           {/* QUESTION IMAGE DISPLAY */}
                                           {q.image && (
                                               <div className="mb-4">
                                                   <img src={q.image} className="rounded border max-h-48 object-contain" alt="Question visual" />
                                               </div>
                                           )}
                                           
                                           <div className="space-y-2">
                                               {q.options?.map((opt: string, oIdx: number) => (
                                                   <label key={oIdx} className="flex items-center gap-3 p-2 rounded border cursor-pointer hover:bg-slate-50">
                                                       <input 
                                                         type="radio" 
                                                         name={q.id} 
                                                         checked={answers[q.id] === opt} 
                                                         onChange={() => setAnswers({ ...answers, [q.id]: opt })} 
                                                       />
                                                       <span className="text-sm">{opt}</span>
                                                   </label>
                                               ))}
                                           </div>
                                       </div>
                                   </div>
                                </div>
                             )}
                          </div>
                       ))
                    )}
                 </div>
              </div>
           </div>
       )}
    </div>
  );
};

const UserDashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const [sets, setSets] = useState<PracticeSet[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [activeSet, setActiveSet] = useState<PracticeSet | null>(null);
  const [view, setView] = useState<'sets' | 'history'>('sets');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    API.getSets().then(data => setSets(data.filter(s => s.isPublished)));
    API.getAttempts(user.id).then(setAttempts);
  }, [user.id]);

  const handleCompleteSet = async (results: any) => {
    if (!activeSet) return;
    setIsProcessing(true);

    const aiFeedback: Record<string, WritingEvaluation> = {};
    
    // Evaluate Writing Tasks
    for (const section of activeSet.sections) {
        if (section.type === 'WRITING') {
            for (const part of section.parts) {
                const answerKey = `part-${part.id}`;
                const userResponse = results.answers[answerKey];
                
                if (userResponse && userResponse.trim().length > 10) {
                     try {
                         const evaluation = await API.evaluateWriting(part.contentText, userResponse);
                         if (evaluation) {
                             aiFeedback[part.id] = evaluation;
                         }
                     } catch(e) { console.error("Evaluation error", e); }
                }
            }
        }
    }

    const attempt: Attempt = {
        id: `att-${Date.now()}`,
        userId: user.id,
        setId: activeSet.id,
        setTitle: activeSet.title,
        date: new Date().toISOString(),
        sectionScores: results.sectionScores,
        bandScore: results.totalPossible > 0 
           ? Math.round((results.totalCorrect / results.totalPossible) * 12)
           : (Object.keys(aiFeedback).length > 0 ? 7 : 0), // Mock logic
        aiFeedback: aiFeedback
    };

    await API.saveAttempt(attempt);
    
    const newAttempts = await API.getAttempts(user.id);
    setAttempts(newAttempts);
    setActiveSet(null);
    setView('history');
    setIsProcessing(false);
  };

  if (activeSet) {
    if (isProcessing) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-xl font-bold text-slate-700">Submitting & Evaluating...</div>
                <p className="text-slate-500">The AI is analyzing your writing responses.</p>
            </div>
        );
    }
    return (
      <TestRunner 
        set={activeSet} 
        onComplete={handleCompleteSet} 
        onExit={() => setActiveSet(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">Student Dashboard</h1>
        <div className="flex items-center gap-4">
           <div className="text-right hidden sm:block">
               <div className="text-sm font-bold text-slate-900">{user.name}</div>
               <div className="text-xs text-slate-500 uppercase">{user.email}</div>
           </div>
           <Button variant="outline" size="sm" onClick={onLogout}>Logout</Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-8">
         <div className="flex gap-6 border-b border-slate-200 mb-8">
            <button 
                onClick={() => setView('sets')}
                className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${view === 'sets' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
            >
                Practice Sets
            </button>
            <button 
                onClick={() => setView('history')}
                className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${view === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
            >
                My History
            </button>
         </div>

         {view === 'sets' ? (
             <div className="grid gap-6 md:grid-cols-2">
                 {sets.map(set => (
                     <div key={set.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all">
                         <h3 className="font-bold text-lg text-slate-900 mb-2">{set.title}</h3>
                         <p className="text-slate-500 text-sm mb-6 line-clamp-2">{set.description}</p>
                         <div className="flex justify-between items-center">
                             <span className="text-xs bg-slate-100 px-2 py-1 rounded font-medium text-slate-600">{set.sections.length} Sections</span>
                             <Button onClick={() => setActiveSet(set)}>Start Practice</Button>
                         </div>
                     </div>
                 ))}
                 {sets.length === 0 && <p className="text-slate-400 py-10 text-center col-span-2">No practice sets available.</p>}
             </div>
         ) : (
             <div className="space-y-6">
                 {attempts.map(att => (
                     <div key={att.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                         <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                             <div>
                                 <h3 className="font-bold text-slate-900">{att.setTitle}</h3>
                                 <p className="text-xs text-slate-400">{new Date(att.date).toLocaleDateString()} &bull; {new Date(att.date).toLocaleTimeString()}</p>
                             </div>
                             <div className="text-right">
                                 <div className="text-2xl font-bold text-blue-600">{att.bandScore}</div>
                                 <div className="text-xs text-slate-400 uppercase font-bold">Band Score</div>
                             </div>
                         </div>
                         
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                             {Object.entries(att.sectionScores).map(([secId, score]) => (
                                 <div key={secId} className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                                     <div className="text-xs text-slate-400 uppercase">Section Score</div>
                                     <div className="font-bold text-slate-800">{score}</div>
                                 </div>
                             ))}
                         </div>

                         {att.aiFeedback && Object.keys(att.aiFeedback).length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                    AI Writing Evaluation
                                </h4>
                                {Object.values(att.aiFeedback).map((fb: WritingEvaluation, i) => (
                                    <div key={i} className="mb-4 bg-purple-50/30 p-4 rounded-lg border border-purple-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-purple-700 uppercase">Analysis</span>
                                            <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-purple-200">Band {fb.bandScore}</span>
                                        </div>
                                        <div className="text-sm text-slate-700 whitespace-pre-wrap prose prose-sm max-w-none mb-3">{fb.feedback}</div>
                                        {fb.corrections && (
                                            <div className="text-xs text-slate-600 bg-white p-3 rounded border border-slate-200">
                                                <strong className="block mb-1 text-slate-800">Suggested Corrections:</strong>
                                                <pre className="whitespace-pre-wrap font-sans text-slate-600">{fb.corrections}</pre>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                         )}
                     </div>
                 ))}
                 {attempts.length === 0 && <p className="text-slate-400 py-10 text-center">No attempts found.</p>}
             </div>
         )}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (u: User) => setUser(u);
  const handleLogout = () => setUser(null);

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return user.role === 'admin' 
    ? <AdminDashboard user={user} onLogout={handleLogout} />
    : <UserDashboard user={user} onLogout={handleLogout} />;
};

export default App;