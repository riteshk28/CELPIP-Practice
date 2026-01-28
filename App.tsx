
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

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || disabled || hasEnded) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  return (
    <div className={`bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700 ${disabled ? 'opacity-60 grayscale' : ''}`}>
      <audio ref={audioRef} src={src} className="hidden" />
      
      <div className="flex items-center gap-4 mb-3">
        {/* Status Icon */}
        <button 
            onClick={togglePlay}
            disabled={disabled || hasEnded}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${isPlaying ? 'bg-blue-500 animate-pulse' : 'bg-slate-600 hover:bg-slate-500'} ${disabled || hasEnded ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isPlaying ? (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
          ) : hasEnded || disabled ? (
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : (
             <svg className="w-5 h-5 text-slate-300 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
          )}
        </button>
        
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

// --- EDITOR COMPONENTS ---

const PartEditor: React.FC<{
  part: any;
  onChange: (p: any) => void;
  onDelete: () => void;
  sectionType: string;
}> = ({ part, onChange, onDelete, sectionType }) => {
  const update = (field: string, val: any) => onChange({ ...part, [field]: val });

  const addQuestion = () => {
    update('questions', [...part.questions, {
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      partId: part.id,
      text: '',
      type: 'MCQ',
      options: ['', '', '', ''],
      correctAnswer: '',
      weight: 1
    }]);
  };

  const updateQuestion = (idx: number, q: any) => {
    const newQs = [...part.questions];
    newQs[idx] = q;
    update('questions', newQs);
  };

  const removeQuestion = (idx: number) => {
    update('questions', part.questions.filter((_: any, i: number) => i !== idx));
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 mb-4 shadow-sm">
      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
         <h4 className="font-bold text-slate-700">Part Content</h4>
         <Button variant="danger" size="sm" onClick={onDelete}>Delete Part</Button>
      </div>
      <div className="space-y-4">
        <Input label="Instructions" value={part.instructions || ''} onChange={e => update('instructions', e.target.value)} />
        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">Content / Transcript</label>
           <RichTextEditor value={part.contentText || ''} onChange={v => update('contentText', v)} className="min-h-[120px]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
           <Input label="Timer (sec)" type="number" value={part.timerSeconds} onChange={e => update('timerSeconds', parseInt(e.target.value))} />
           {(sectionType === 'LISTENING' || sectionType === 'SPEAKING') && (
              <Input label="Audio URL/Base64" value={part.audioData || ''} onChange={e => update('audioData', e.target.value)} />
           )}
           {(sectionType === 'READING' || sectionType === 'WRITING') && (
              <Input label="Image URL/Base64" value={part.imageData || ''} onChange={e => update('imageData', e.target.value)} />
           )}
        </div>
        
        {sectionType !== 'WRITING' && sectionType !== 'SPEAKING' && (
           <div className="bg-slate-50 p-3 rounded border border-slate-200">
             <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Questions ({part.questions.length})</label>
                <Button size="sm" onClick={addQuestion}>+ Add Question</Button>
             </div>
             <div className="space-y-3">
               {part.questions.map((q: any, i: number) => (
                 <div key={q.id || i} className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                    <div className="flex gap-2 mb-2">
                       <select className="border border-slate-300 rounded text-sm" value={q.type} onChange={e => updateQuestion(i, {...q, type: e.target.value})}>
                          <option value="MCQ">MCQ</option>
                          <option value="CLOZE">Cloze</option>
                          <option value="PASSAGE">Passage</option>
                       </select>
                       <Input className="flex-1" placeholder={q.type === 'PASSAGE' ? 'Passage HTML with [[id]]' : 'Question Text / ID'} value={q.text} onChange={e => updateQuestion(i, {...q, text: e.target.value})} />
                       <button onClick={() => removeQuestion(i)} className="text-red-500 font-bold hover:text-red-700 px-2">×</button>
                    </div>
                    {q.type !== 'PASSAGE' && (
                      <div className="pl-2 border-l-2 border-slate-100 space-y-2">
                         <div className="grid grid-cols-2 gap-2">
                            {q.options?.map((opt: string, o: number) => (
                               <Input key={o} placeholder={`Option ${o+1}`} value={opt} onChange={e => {
                                  const ops = [...(q.options||[])]; ops[o] = e.target.value;
                                  updateQuestion(i, {...q, options: ops});
                               }} />
                            ))}
                         </div>
                         <div className="flex gap-2">
                            <Dropdown options={q.options||[]} value={q.correctAnswer||''} onChange={v => updateQuestion(i, {...q, correctAnswer: v})} placeholder="Correct Answer" className="flex-1" />
                            <Input type="number" className="w-20" placeholder="Pts" value={q.weight} onChange={e => updateQuestion(i, {...q, weight: parseInt(e.target.value)})} />
                            {sectionType === 'LISTENING' && (
                                <Input className="flex-1" placeholder="Q Audio" value={q.audioData||''} onChange={e => updateQuestion(i, {...q, audioData: e.target.value})} />
                            )}
                         </div>
                      </div>
                    )}
                 </div>
               ))}
             </div>
           </div>
        )}
      </div>
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
  const updateSection = (idx: number, s: any) => {
    const secs = [...set.sections];
    secs[idx] = s;
    onChange({...set, sections: secs});
  };
  const addSection = () => {
    onChange({...set, sections: [...set.sections, {
      id: `sec-${Date.now()}`,
      setId: set.id,
      type: 'READING',
      title: 'New Section',
      parts: []
    }]});
  };
  const removeSection = (idx: number) => {
    if(!confirm("Delete section?")) return;
    onChange({...set, sections: set.sections.filter((_, i) => i !== idx)});
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
       <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
          <h2 className="font-bold text-xl text-slate-800">Edit Practice Set</h2>
          <div className="flex gap-2">
             <Button variant="outline" onClick={onCancel}>Cancel</Button>
             <Button onClick={onSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
       </header>
       <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
             <h3 className="font-bold text-slate-800 border-b pb-2">Set Details</h3>
             <Input label="Title" value={set.title} onChange={e => onChange({...set, title: e.target.value})} />
             <Input label="Description" value={set.description} onChange={e => onChange({...set, description: e.target.value})} />
             <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={set.isPublished} onChange={e => onChange({...set, isPublished: e.target.checked})} className="w-5 h-5" />
                <span className="font-medium text-slate-700">Published</span>
             </label>
          </div>
          
          <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="font-bold text-xl text-slate-800">Sections</h3>
                <Button onClick={addSection}>+ Add Section</Button>
             </div>
             {set.sections.map((sec, sIdx) => (
                <div key={sec.id || sIdx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                      <div className="flex items-center gap-3 flex-1">
                         <span className="font-mono font-bold text-slate-400">#{sIdx+1}</span>
                         <select className="font-bold text-sm border-slate-300 rounded" value={sec.type} onChange={e => updateSection(sIdx, {...sec, type: e.target.value})}>
                            <option value="READING">READING</option>
                            <option value="LISTENING">LISTENING</option>
                            <option value="WRITING">WRITING</option>
                            <option value="SPEAKING">SPEAKING</option>
                         </select>
                         <Input className="flex-1 bg-transparent border-none focus:ring-0" value={sec.title} onChange={e => updateSection(sIdx, {...sec, title: e.target.value})} />
                      </div>
                      <Button variant="danger" size="sm" onClick={() => removeSection(sIdx)}>Delete</Button>
                   </div>
                   <div className="p-4 bg-slate-100">
                      {sec.parts.map((part, pIdx) => (
                         <PartEditor 
                            key={part.id || pIdx} 
                            part={part} 
                            sectionType={sec.type}
                            onChange={p => {
                               const newParts = [...sec.parts];
                               newParts[pIdx] = p;
                               updateSection(sIdx, {...sec, parts: newParts});
                            }} 
                            onDelete={() => {
                               if(!confirm("Delete part?")) return;
                               const newParts = sec.parts.filter((_, i) => i !== pIdx);
                               updateSection(sIdx, {...sec, parts: newParts});
                            }}
                         />
                      ))}
                      <Button variant="secondary" className="w-full border-dashed border-2" onClick={() => {
                         updateSection(sIdx, {...sec, parts: [...sec.parts, {
                            id: `p-${Date.now()}`, sectionId: sec.id, contentText: '', instructions: '', questions: [], timerSeconds: 600
                         }]});
                      }}>+ Add Part</Button>
                   </div>
                </div>
             ))}
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

// --- TEST RUNNER HELPERS ---

const ClozeRenderer: React.FC<{
  htmlContent: string;
  questions: any[];
  answers: Record<string, any>;
  onAnswer: (id: string, val: string) => void;
}> = ({ htmlContent, questions, answers, onAnswer }) => {
  const parts = htmlContent.split(/(\[\[.*?\]\])/g);

  return (
    <div className="leading-relaxed text-lg text-slate-800">
      {parts.map((part, i) => {
        if (part.startsWith('[[') && part.endsWith(']]')) {
          const placeholderId = part.slice(2, -2);
          const question = questions.find(q => q.text === placeholderId && q.type === 'CLOZE');
          
          if (!question) return <span key={i} className="text-red-500 font-bold">?</span>;

          return (
             <span key={i} className="inline-block mx-1 relative">
                <span className="absolute -top-4 left-0 text-[10px] font-bold text-slate-400 bg-slate-100 px-1 rounded border border-slate-200">
                  {question.displayNum}
                </span>
                <select
                  className={`appearance-none border-b-2 bg-transparent py-0.5 px-2 font-bold text-blue-700 focus:outline-none focus:border-blue-600 transition-colors ${answers[question.id] ? 'border-blue-500 bg-blue-50' : 'border-slate-300'}`}
                  value={answers[question.id] || ''}
                  onChange={(e) => onAnswer(question.id, e.target.value)}
                >
                  <option value="" disabled>Select...</option>
                  {question.options?.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
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

const SectionReview: React.FC<{
  section: any;
  answers: Record<string, any>;
  onContinue: () => void;
}> = ({ section, answers, onContinue }) => {
  const allQuestions = section.parts.flatMap((p: any) => p.questions.filter((q: any) => q.type !== 'PASSAGE'));
  const answeredCount = allQuestions.filter((q: any) => answers[q.id]).length;

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Section Review</h2>
      </header>
      <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
         <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-8 flex justify-between items-center">
            <div>
               <h3 className="font-bold text-blue-900 text-lg">You have reached the end of the {section.type} section.</h3>
               <p className="text-blue-700">Please review your answers before proceeding. You cannot return to this section once you submit.</p>
            </div>
            <div className="text-right">
               <div className="text-3xl font-bold text-blue-800">{answeredCount} / {allQuestions.length}</div>
               <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Questions Answered</div>
            </div>
         </div>

         <div className="grid grid-cols-5 gap-4">
            {allQuestions.map((q: any, i: number) => {
               const isAnswered = !!answers[q.id];
               return (
                  <div key={q.id} className={`p-4 rounded border flex flex-col items-center justify-center gap-2 ${isAnswered ? 'bg-white border-green-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                     <span className="font-bold text-slate-500">Q{i+1}</span>
                     {isAnswered ? (
                        <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                           Answered
                        </div>
                     ) : (
                        <div className="flex items-center gap-1 text-amber-500 text-sm font-bold">
                           <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                           Skipped
                        </div>
                     )}
                  </div>
               );
            })}
         </div>
      </div>
      <footer className="bg-white border-t border-slate-200 px-8 py-4 flex justify-end">
        <Button size="lg" onClick={onContinue} className="shadow-blue-200 shadow-lg">Submit Section & Continue</Button>
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
    const scores = Object.values(aiFeedback)
        .filter(f => !f.error)
        .map((f: WritingEvaluation) => f.bandScore);
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // Helper to render simple text with bold markers (**text**) and headers (### text)
    const renderFormattedText = (text: string) => {
        if (!text) return null;
        return text.split('\n').map((line, i) => {
            let cleanLine = line.trim();
            if (!cleanLine) return <div key={i} className="h-2"></div>; 

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
                    // If no feedback was found (e.g. timeout or error not caught properly), show generic error
                    const isError = !feedback || feedback.error;

                    if (isError) {
                        return (
                            <div key={part.id} className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
                                <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex justify-between items-center">
                                    <h3 className="font-bold text-red-800">Task {idx + 1}: Evaluation Failed</h3>
                                </div>
                                <div className="p-6 text-center text-red-600">
                                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <p className="font-medium">The analysis for this task timed out or failed.</p>
                                    <p className="text-sm opacity-70">Please check your internet connection and try again.</p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={part.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700">Task {idx + 1}: {part.instructions ? part.instructions.substring(0, 50) + "..." : "Writing Response"}</h3>
                                <div className="flex items-center gap-4">
                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">Overall CLB: {feedback.bandScore}</span>
                                </div>
                            </div>
                            
                            {/* NEW: Score Breakdown Panel */}
                            {feedback.scores && (
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white p-3 rounded border border-slate-200 text-center shadow-sm">
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Content</div>
                                        <div className="text-xl font-bold text-slate-700">{feedback.scores.content}</div>
                                    </div>
                                    <div className="bg-white p-3 rounded border border-slate-200 text-center shadow-sm">
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Vocabulary</div>
                                        <div className="text-xl font-bold text-slate-700">{feedback.scores.vocabulary}</div>
                                    </div>
                                    <div className="bg-white p-3 rounded border border-slate-200 text-center shadow-sm">
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Readability</div>
                                        <div className="text-xl font-bold text-slate-700">{feedback.scores.readability}</div>
                                    </div>
                                    <div className="bg-white p-3 rounded border border-slate-200 text-center shadow-sm">
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Task Fulfillment</div>
                                        <div className="text-xl font-bold text-slate-700">{feedback.scores.taskFulfillment}</div>
                                    </div>
                                </div>
                            )}

                            <div className="p-6 grid md:grid-cols-2 gap-8">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">Examiner Feedback</h4>
                                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-100 h-full">
                                        {renderFormattedText(feedback.feedback)}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">Key Errors & Improvements</h4>
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
    const writingSections = set.sections.filter(s => s.type === 'WRITING');
    
    // Use Promise.all to run evaluations in parallel
    const analysisPromises: Promise<void>[] = [];

    for (const sec of writingSections) {
        for (const p of sec.parts) {
            const response = writingInputs[p.id]; 
            
            // Only send for evaluation if there is significant text
            if (response && response.trim().length > 10) {
                 const promise = API.evaluateWriting(p.instructions + "\n" + p.contentText, response)
                    .then(result => {
                        if (result) {
                            feedbackMap[p.id] = result;
                        } else {
                            // Explicitly handle null/fail from API layer
                            feedbackMap[p.id] = { bandScore: 0, feedback: "", corrections: "", error: "Failed to evaluate." };
                        }
                    })
                    .catch(err => {
                        console.error("Failed part evaluation:", err);
                        // Add error entry so UI knows it failed
                        feedbackMap[p.id] = { bandScore: 0, feedback: "", corrections: "", error: "Timeout or Network Error" };
                    });
                 
                 analysisPromises.push(promise);
            }
        }
    }
    
    if (analysisPromises.length > 0) {
        await Promise.all(analysisPromises);
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
             // Ignore errors in score calculation
             return (feedback && !feedback.error) ? (feedback as WritingEvaluation).bandScore : 0;
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

                {/* --- NEW: Listening Question Audio Players in Left Pane --- */}
                {section.type === 'LISTENING' && !isAudioScreen && (
                    <div className="space-y-4 mb-6">
                        {numberedQuestions.map((q: any) => (
                            q.audioData && (
                                <div key={`audio-${q.id}`} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Question {q.displayNum} Audio</div>
                                    <StrictAudioPlayer src={q.audioData} autoPlay={true} />
                                </div>
                            )
                        ))}
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
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const stored = localStorage.getItem('celprep_user_session');
    if (stored) {
      try {
        const parsedUser = JSON.parse(stored);
        setUser(parsedUser);
      } catch (err) {
        console.error("Failed to restore session", err);
        localStorage.removeItem('celprep_user_session');
      }
    }
    setIsAuthChecking(false);
  }, []);

  // Persist session on login
  const handleLogin = (u: User) => {
    localStorage.setItem('celprep_user_session', JSON.stringify(u));
    setUser(u);
  };

  // Clear session on logout
  const handleLogout = () => {
    localStorage.removeItem('celprep_user_session');
    setUser(null);
  };

  if (isAuthChecking) {
    return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400 animate-pulse">Loading session...</div>;
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (user.role === 'admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  return <UserDashboard user={user} onLogout={handleLogout} />;
};

export default App;
