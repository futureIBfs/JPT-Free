import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';
import { 
  Book, MessageSquare, Play, Pause, RotateCcw, 
  Plus, Trash2, Sparkles, 
  Zap, Brain, Globe, X, Send, ChevronLeft,
  FileText, CheckCircle2, PenTool, Paperclip, File,
  Layers, CheckSquare, Wand2, Download,
  Bold, Italic, Strikethrough, Heading1, Heading2, 
  List, ListOrdered, Quote, Code, PanelLeft, PanelRight, BookOpen, Search, Settings, Palette,
  Mic, MicOff, HelpCircle
} from 'lucide-react';

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      setStoredValue((prevValue) => {
        const valueToStore = value instanceof Function ? value(prevValue) : value;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      });
    } catch (error) {
      console.warn(error);
    }
  };

  return [storedValue, setValue] as const;
}

type Note = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
};

type ChatFile = {
  dataUrl: string;
  mimeType: string;
  name: string;
  isImage: boolean;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'model';
  text: string;
  files?: ChatFile[];
  isThinking?: boolean;
};

type Flashcard = {
  q: string;
  a: string;
};

type QuizQuestion = {
  q: string;
  options: string[];
  correct: number;
  explanation: string;
};

type Todo = {
  id: string;
  text: string;
  done: boolean;
  dueDate?: string;
  assignmentType?: 'homework' | 'test' | 'presentation' | 'other';
  subject?: string;
  justDone?: boolean;
};

type AiMode = 'fast' | 'smart' | 'deep' | 'search';

export default function App() {
  // --- Layout State ---
  const [showLeftSidebar, setShowLeftSidebar] = useLocalStorage('jpt_showLeftSidebar', true);
  const [showRightSidebar, setShowRightSidebar] = useLocalStorage('jpt_showRightSidebar', true);

  // --- Notes State ---
  const [notes, setNotes] = useLocalStorage<Note[]>('jpt_notes', [
    { 
      id: '1', 
      title: 'Welcome to JPT Pro', 
      content: '# The Ultimate Workspace\n\nWelcome to your upgraded study environment.\n\n## Features\n- **Rich Notes**: Distraction-free Markdown editor with formatting tools.\n- **Fullscreen Mode**: Hide sidebars to focus purely on writing.\n- **AI Flashcards**: Instantly generate interactive flashcards from your notes.\n- **AI Quiz**: Test your knowledge with custom generated quizzes.\n- **Whiteboard**: Click "Whiteboard" to draw infinitely.\n- **AI Assistant**: Powered by Gemini 3.1.\n- **Quick Dictionary**: Look up concepts instantly in the right sidebar.', 
      updatedAt: Date.now() 
    }
  ]);
  const [activeNoteId, setActiveNoteId] = useLocalStorage<string>('jpt_activeNoteId', '1');
  const [activeTab, setActiveTab] = useLocalStorage<'editor' | 'whiteboard' | 'flashcards' | 'quiz'>('jpt_activeTab', 'editor');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Flashcards State ---
  const [flashcards, setFlashcards] = useLocalStorage<Record<string, Flashcard[]>>('jpt_flashcards', {});
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // --- Quiz State ---
  const [quizzes, setQuizzes] = useLocalStorage<Record<string, QuizQuestion[]>>('jpt_quizzes', {});
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [quizAnswers, setQuizAnswers] = useLocalStorage<Record<string, Record<number, number>>>('jpt_quizAnswers', {});
  const [quizSubmitted, setQuizSubmitted] = useLocalStorage<Record<string, boolean>>('jpt_quizSubmitted', {});

  // --- Microphone State ---
  const [isListening, setIsListening] = useState(false);
  const [isProcessingDictation, setIsProcessingDictation] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const fullTranscriptRef = useRef<string>('');

  // --- Todos State ---
  const [todos, setTodos] = useLocalStorage<Todo[]>('jpt_todos', [
    { id: '1', text: 'Review biology chapter 4', done: false, assignmentType: 'homework', subject: 'Biology' },
    { id: '2', text: 'Complete math assignment', done: true, assignmentType: 'homework', subject: 'Math' },
  ]);
  const [newTodo, setNewTodo] = useState('');
  const [newTodoDate, setNewTodoDate] = useState('');
  const [newTodoType, setNewTodoType] = useState<'homework' | 'test' | 'presentation' | 'other' | ''>('');
  const [newTodoSubject, setNewTodoSubject] = useState('');

  // --- Timer State ---
  const [workDuration, setWorkDuration] = useLocalStorage('jpt_workDuration', 25);
  const [breakDuration, setBreakDuration] = useLocalStorage('jpt_breakDuration', 5);
  const [timeLeft, setTimeLeft] = useLocalStorage('jpt_timeLeft', 25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useLocalStorage<'work' | 'break'>('jpt_timerMode', 'work');
  const [showTimerSettings, setShowTimerSettings] = useState(false);

  // --- Chat State ---
  const [chatHistory, setChatHistory] = useLocalStorage<Record<string, ChatMessage[]>>('jpt_chatHistory_v2', {});
  const [chatInput, setChatInput] = useState('');
  const [chatFiles, setChatFiles] = useState<ChatFile[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [aiMode, setAiMode] = useLocalStorage<AiMode>('jpt_aiMode', 'smart');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Dictionary State ---
  const [dictQuery, setDictQuery] = useState('');
  const [dictResult, setDictResult] = useState('');
  const [isDictLoading, setIsDictLoading] = useState(false);

  // --- Theme State ---
  const [themeColor, setThemeColor] = useLocalStorage<'zinc' | 'indigo' | 'rose' | 'emerald' | 'amber' | 'cyan'>('jpt_themeColor', 'zinc');
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  const activeNote = notes.find(n => n.id === activeNoteId);

  // --- Effects ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      if (timerMode === 'work') {
        setTimerMode('break');
        setTimeLeft(breakDuration * 60);
      } else {
        setTimerMode('work');
        setTimeLeft(workDuration * 60);
      }
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, timerMode, workDuration, breakDuration]);

  useEffect(() => {
    if (!isTimerRunning) {
      setTimeLeft(timerMode === 'work' ? workDuration * 60 : breakDuration * 60);
    }
  }, [workDuration, breakDuration, timerMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, activeNoteId, isChatLoading]);

  // --- Handlers ---
  const handleNoteSelect = (id: string) => {
    setActiveNoteId(id);
    setActiveTab('editor');
  };

  const handleNoteChange = (field: 'title' | 'content', value: string) => {
    setNotes(prev => prev.map(n => 
      n.id === activeNoteId ? { ...n, [field]: value, updatedAt: Date.now() } : n
    ));
  };

  const createNewNote = () => {
    const newNote: Note = { id: Date.now().toString(), title: '', content: '', updatedAt: Date.now() };
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setActiveTab('editor');
  };

  const deleteNote = (id: string) => {
    setNotes(prev => {
      const filtered = prev.filter(n => n.id !== id);
      if (activeNoteId === id) {
        setActiveNoteId(filtered[0]?.id || '');
        setActiveTab('editor');
      }
      return filtered;
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- Formatting Handlers ---
  const applyFormatting = (prefix: string, suffix: string = '') => {
    if (!activeNote || !textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = activeNote.content;
    
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);
    
    const newText = `${before}${prefix}${selected}${suffix}${after}`;
    handleNoteChange('content', newText);
    
    // Reset cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
      }
    }, 0);
  };

  // --- Todos Handlers ---
  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done, justDone: !t.done } : t));
    // Auto-delete after a short delay if marked as done
    setTimeout(() => {
      setTodos(prev => {
        const todo = prev.find(t => t.id === id);
        if (todo && todo.done) {
          return prev.filter(t => t.id !== id);
        }
        return prev;
      });
    }, 1500); // Increased to 1500ms to allow animation to play
  };
  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };
  const addTodo = () => {
    if (!newTodo.trim()) return;
    setTodos(prev => [...prev, { 
      id: Date.now().toString(), 
      text: newTodo, 
      done: false, 
      dueDate: newTodoDate || undefined,
      assignmentType: newTodoType || undefined,
      subject: newTodoSubject.trim() || undefined
    }]);
    setNewTodo('');
    setNewTodoDate('');
    setNewTodoType('');
    setNewTodoSubject('');
  };

  // --- Quiz Handlers ---
  const handleGenerateQuiz = async () => {
    if (!activeNote || !activeNote.content.trim()) return;
    setIsGeneratingQuiz(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create a 5-question multiple choice quiz based on the following notes. Return ONLY a valid JSON array of objects, where each object has: 'q' (the question string), 'options' (array of 4 string options), 'correct' (index of correct option 0-3), and 'explanation' (string explaining the answer). Notes:\n\n${activeNote.content}`,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      const quizData = JSON.parse(response.text || '[]');
      setQuizzes(prev => ({ ...prev, [activeNote.id]: quizData }));
      setQuizAnswers(prev => ({ ...prev, [activeNote.id]: {} }));
      setQuizSubmitted(prev => ({ ...prev, [activeNote.id]: false }));
      setActiveTab('quiz');
      setCurrentQuizIdx(0);
    } catch (error) {
      console.error("Failed to generate quiz", error);
      alert("Failed to generate quiz. Please try adding more content to your note.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleQuizAnswer = (questionIdx: number, optionIdx: number) => {
    if (!activeNote || quizSubmitted[activeNote.id]) return;
    setQuizAnswers(prev => ({
      ...prev,
      [activeNote.id]: {
        ...(prev[activeNote.id] || {}),
        [questionIdx]: optionIdx
      }
    }));
  };

  const submitQuiz = () => {
    if (!activeNote) return;
    setQuizSubmitted(prev => ({ ...prev, [activeNote.id]: true }));
  };

  // --- Microphone Handlers ---
  const processDictation = async (transcript: string) => {
    if (!transcript.trim()) return;
    setIsProcessingDictation(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Process the following raw class/lecture transcript. 
1. Create structured Markdown notes summarizing the key points, ignoring fluff.
2. Extract any tasks/assignments mentioned (homework, tests, reading, presentations, etc.) with their due dates, type, and subject.
CRITICAL: When extracting tasks, preserve the EXACT details, specific page numbers, chapters, and subject names mentioned in the transcript. Do NOT generalize the task description (e.g., write "Math HW page 132" instead of "Complete homework assignment").

Return ONLY a valid JSON object with this shape:
{
  "notes": "markdown string",
  "tasks": [
    {
      "text": "Highly specific description of task including all details (e.g. 'Math HW page 132')",
      "dueDate": "YYYY-MM-DD or descriptive string if exact date unknown",
      "assignmentType": "homework" | "test" | "presentation" | "other",
      "subject": "Specific subject name (e.g. 'Math', 'History') or 'General'"
    }
  ]
}

Transcript:
${transcript}`,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      const result = JSON.parse(response.text || '{}');
      
      if (result.notes) {
        setNotes(prev => prev.map(n => 
          n.id === activeNoteId ? { ...n, content: n.content + (n.content.trim() ? '\n\n' : '') + '### Lecture Notes (AI Processed)\n\n' + result.notes, updatedAt: Date.now() } : n
        ));
      }
      
      if (result.tasks && Array.isArray(result.tasks)) {
        setTodos(prev => [
          ...prev,
          ...result.tasks.map((t: any) => ({
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            text: t.text,
            done: false,
            dueDate: t.dueDate,
            assignmentType: t.assignmentType,
            subject: t.subject
          }))
        ]);
      }
    } catch (error) {
      console.error("Failed to process dictation", error);
      // Fallback: just append the raw transcript
      setNotes(prev => prev.map(n => 
        n.id === activeNoteId ? { ...n, content: n.content + (n.content.endsWith('\n') ? '' : '\n') + transcript, updatedAt: Date.now() } : n
      ));
    } finally {
      setIsProcessingDictation(false);
      setLiveTranscript('');
      fullTranscriptRef.current = '';
    }
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser. Try using Chrome or Safari.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      fullTranscriptRef.current = '';
      setLiveTranscript('');
      
      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (final) {
          fullTranscriptRef.current += final;
        }
        setLiveTranscript(fullTranscriptRef.current + interim);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error !== 'not-allowed') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (fullTranscriptRef.current) {
          processDictation(fullTranscriptRef.current);
          fullTranscriptRef.current = '';
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    }
  };

  // --- Flashcards Handlers ---
  const handleGenerateFlashcards = async () => {
    if (!activeNote || !activeNote.content.trim()) return;
    setIsGeneratingCards(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create up to 10 highly effective study flashcards based on the following notes. Return ONLY a valid JSON array of objects, where each object has a 'q' property (the question) and an 'a' property (the answer). Notes:\n\n${activeNote.content}`,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      const cards = JSON.parse(response.text || '[]');
      setFlashcards(prev => ({ ...prev, [activeNote.id]: cards }));
      setActiveTab('flashcards');
      setCurrentCardIdx(0);
      setIsFlipped(false);
    } catch (error) {
      console.error("Failed to generate flashcards", error);
      alert("Failed to generate flashcards. Please try adding more content to your note.");
    } finally {
      setIsGeneratingCards(false);
    }
  };

  // --- AI Editor Handlers ---
  const handleAiAutocomplete = async () => {
    if (!activeNote) return;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Continue writing the following study notes naturally. Add about 2-3 paragraphs of relevant, accurate information. Do not repeat what is already there. Return only the new text. Notes so far:\n\n${activeNote.content}`,
      });
      handleNoteChange('content', activeNote.content + '\n\n' + response.text);
    } catch (e) {
      console.error(e);
    }
  };

  const exportNote = () => {
    if (!activeNote) return;
    const blob = new Blob([`# ${activeNote.title}\n\n${activeNote.content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNote.title || 'note'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Dictionary Handlers ---
  const handleDictionaryLookup = async () => {
    if (!dictQuery.trim() || isDictLoading) return;
    setIsDictLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: `Define or explain the concept of "${dictQuery}" briefly (max 2-3 sentences) for a student. Make it easy to understand.`,
      });
      setDictResult(response.text || 'No definition found.');
    } catch (e) {
      setDictResult('Error fetching definition.');
    } finally {
      setIsDictLoading(false);
    }
  };

  // --- Chat Handlers ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const isImage = file.type.startsWith('image/');
        setChatFiles(prev => [...prev, { dataUrl, mimeType: file.type, name: file.name, isImage }]);
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setChatFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if ((!chatInput.trim() && chatFiles.length === 0) || isChatLoading) return;
    
    const newUserMsg: ChatMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      text: chatInput,
      files: [...chatFiles]
    };
    
    setChatHistory((prev) => ({
      ...prev,
      [activeNoteId]: [...(prev[activeNoteId] || []), newUserMsg]
    }));
    setChatInput('');
    setChatFiles([]);
    setIsChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let modelName = 'gemini-3.1-pro-preview';
      const allNotesContext = notes.map(n => `--- Note: ${n.title} ---\n${n.content}`).join('\n\n');
      
      let config: any = {
        systemInstruction: `You are an elite study assistant. You have access to all the user's notes. Help them study, summarize, explain concepts clearly, or analyze files they upload. Answer questions across different notes if needed.\n\nHere are all the user's notes:\n${allNotesContext}`,
      };

      if (aiMode === 'fast') {
        modelName = 'gemini-3.1-flash-lite-preview';
      } else if (aiMode === 'deep') {
        modelName = 'gemini-3.1-pro-preview';
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      } else if (aiMode === 'search') {
        modelName = 'gemini-3-flash-preview';
        config.tools = [{ googleSearch: {} }];
      }

      const parts: any[] = [];
      
      // Add files
      newUserMsg.files?.forEach(file => {
        const [header, base64] = file.dataUrl.split(',');
        parts.push({
          inlineData: { data: base64, mimeType: file.mimeType }
        });
      });

      // Add text and context
      const activeNoteContext = activeNote && activeTab === 'editor' ? `\n\n--- Current Active Note: ${activeNote.title} ---` : '';
      parts.push({ text: newUserMsg.text + activeNoteContext });

      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config
      });

      const newModelMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: response.text || 'No response.',
        isThinking: aiMode === 'deep'
      };
      setChatHistory((prev) => ({
        ...prev,
        [activeNoteId]: [...(prev[activeNoteId] || []), newModelMsg]
      }));
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: 'Error connecting to AI. Please try again.' };
      setChatHistory((prev) => ({
        ...prev,
        [activeNoteId]: [...(prev[activeNoteId] || []), errorMsg]
      }));
    } finally {
      setIsChatLoading(false);
    }
  };

  const quickAction = (prompt: string) => {
    setChatInput(prompt);
    setTimeout(() => handleSendMessage(), 50);
  };

  const themeColors = {
    zinc: { bg: 'bg-app-bg', border: 'border-border-subtle', text: 'text-text-main', accent: 'bg-panel-solid', accentText: 'text-text-main', hover: 'hover:bg-panel-solid', focus: 'focus:border-border-subtle' },
    indigo: { bg: 'bg-indigo-950', border: 'border-indigo-800/50', text: 'text-indigo-200', accent: 'bg-indigo-800', accentText: 'text-indigo-100', hover: 'hover:bg-indigo-800', focus: 'focus:border-indigo-700' },
    rose: { bg: 'bg-rose-950', border: 'border-rose-800/50', text: 'text-rose-200', accent: 'bg-rose-800', accentText: 'text-rose-100', hover: 'hover:bg-rose-800', focus: 'focus:border-rose-700' },
    emerald: { bg: 'bg-emerald-950', border: 'border-emerald-800/50', text: 'text-emerald-200', accent: 'bg-emerald-800', accentText: 'text-emerald-100', hover: 'hover:bg-emerald-800', focus: 'focus:border-emerald-700' },
    amber: { bg: 'bg-amber-950', border: 'border-amber-800/50', text: 'text-amber-200', accent: 'bg-amber-800', accentText: 'text-amber-100', hover: 'hover:bg-amber-800', focus: 'focus:border-amber-700' },
    cyan: { bg: 'bg-cyan-950', border: 'border-cyan-800/50', text: 'text-cyan-200', accent: 'bg-cyan-800', accentText: 'text-cyan-100', hover: 'hover:bg-cyan-800', focus: 'focus:border-cyan-700' },
  };

  const currentTheme = themeColors[themeColor];

  return (
    <div className={`flex h-screen w-full mesh-bg theme-${themeColor} font-sans overflow-hidden transition-colors duration-500`}>
      <div className="flex h-full w-full">
        {/* Left Sidebar - Notes & Tasks */}
        {showLeftSidebar && (
          <>
            <div className="w-80 glass-panel border-r border-border-subtle flex flex-col z-10 shrink-0 overflow-hidden">
              <div className="flex flex-col h-full">
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
                </div>
                <div className="px-5 pb-5 pt-2 border-b border-border-subtle flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-panel-solid flex items-center justify-center border border-border-subtle shadow-sm">
                      <Book className="w-4 h-4 text-text-main" />
                    </div>
                    <h1 className="font-medium text-sm tracking-wide text-text-main">JPT <span className="text-[10px] bg-panel-solid text-text-main px-1.5 py-0.5 rounded ml-1 border border-border-subtle">PRO</span></h1>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button 
                        onClick={() => setShowThemeSelector(!showThemeSelector)}
                        className={`p-1.5 hover:bg-panel-solid rounded-md text-text-muted hover:text-text-main transition-all`}
                        title="Change Theme Color"
                      >
                        <Palette className="w-4 h-4" />
                      </button>
                      {showThemeSelector && (
                        <div className={`absolute top-full right-0 mt-2 p-3 rounded-xl bg-panel-solid border border-border-subtle shadow-xl grid grid-cols-3 gap-3 z-50 w-max`}>
                          {(Object.keys(themeColors) as Array<keyof typeof themeColors>).map((color) => (
                            <button
                              key={color}
                              onClick={() => setThemeColor(color)}
                              className={`w-6 h-6 rounded-full ${color === 'zinc' ? 'bg-zinc-500' : color === 'indigo' ? 'bg-indigo-500' : color === 'rose' ? 'bg-rose-500' : color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : 'bg-cyan-500'} ${themeColor === color ? 'ring-2 ring-text-main ring-offset-2 ring-offset-panel-solid' : 'hover:scale-110 transition-transform'}`}
                              title={color.charAt(0).toUpperCase() + color.slice(1)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={createNewNote} 
                      className={`p-1.5 hover:bg-panel-solid rounded-md text-text-muted hover:text-text-main transition-all`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col h-full">
                  <div className="flex-[3] flex flex-col min-h-0">
                    {/* Notes List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-1">
                      <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                        Notes
                      </div>
                      <AnimatePresence>
                        {notes.map(note => (
                          <motion.div 
                            key={note.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={() => handleNoteSelect(note.id)}
                            className={`group flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer text-sm transition-all ${
                              activeNoteId === note.id 
                                ? 'bg-panel-bg text-text-main' 
                                : 'text-text-muted hover:bg-panel-solid hover:text-text-main'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <span className="truncate font-medium">{note.title || 'Untitled Note'}</span>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }} 
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 rounded transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {notes.length === 0 && (
                        <div className="text-center text-xs text-text-muted mt-8 flex flex-col items-center gap-2">
                          <Book className="w-6 h-6 opacity-20" />
                          No notes yet. Create one!
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-[2] flex flex-col min-h-0 border-t border-border-subtle">
                    {/* Todos Section */}
                    <div className="p-4 flex flex-col h-full">
                      <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2 shrink-0">
                        Tasks
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-1">
                        <AnimatePresence>
                          {todos.filter(t => !t.done || t.justDone).map(todo => (
                            <motion.div 
                              key={todo.id} 
                              layout
                              initial={{ opacity: 0, height: 0, scale: 0.95 }}
                              animate={{ opacity: 1, height: 'auto', scale: 1 }}
                              exit={{ opacity: 0, height: 0, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              className="flex items-start gap-3 group py-2 px-1 rounded-lg transition-colors overflow-hidden"
                            >
                              <button onClick={() => toggleTodo(todo.id)} className={`mt-0.5 shrink-0 w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${todo.done ? 'bg-accent-main border-border-subtle text-text-main' : 'border-border-subtle text-transparent hover:border-zinc-400'}`}>
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: todo.done ? 1 : 0 }}
                                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                </motion.div>
                              </button>
                              <div className="flex flex-col flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm transition-all duration-300 ${todo.done ? 'text-text-muted line-through' : 'text-text-main'}`}>{todo.text}</span>
                                  {todo.assignmentType && (
                                    <span className="text-[9px] px-1.5 py-0.5 bg-panel-solid border border-border-subtle rounded text-text-muted uppercase tracking-wider">
                                      {todo.assignmentType}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {todo.subject && (
                                    <span className="text-[10px] text-text-muted font-medium">
                                      {todo.subject}
                                    </span>
                                  )}
                                  {todo.dueDate && (
                                    <span className={`text-[10px] ${!isNaN(new Date(todo.dueDate).getTime()) && new Date(todo.dueDate) < new Date() && !todo.done ? 'text-red-400/80' : 'text-text-muted'}`}>
                                      Due: {!isNaN(new Date(todo.dueDate).getTime()) ? new Date(todo.dueDate).toLocaleDateString() : todo.dueDate}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-red-400 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                      <div className="mt-3 flex flex-col gap-2 shrink-0">
                        <div className="relative">
                          <input 
                            type="text" 
                            value={newTodo} 
                            onChange={e => setNewTodo(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addTodo()}
                            placeholder="Add task..." 
                            className="w-full bg-panel-bg border border-border-subtle rounded-lg pl-3 pr-8 py-2 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-border-subtle transition-colors"
                          />
                          <button onClick={addTodo} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"><Plus className="w-4 h-4" /></button>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={newTodoDate}
                            onChange={e => setNewTodoDate(e.target.value)}
                            className="flex-1 bg-panel-bg border border-border-subtle rounded-lg px-2 py-1.5 text-xs text-text-muted focus:outline-none focus:border-border-subtle transition-colors"
                          />
                          <select
                            value={newTodoType}
                            onChange={e => setNewTodoType(e.target.value as any)}
                            className="flex-1 bg-panel-bg border border-border-subtle rounded-lg px-2 py-1.5 text-xs text-text-muted focus:outline-none focus:border-border-subtle transition-colors"
                          >
                            <option value="">Type...</option>
                            <option value="homework">Homework</option>
                            <option value="test">Test</option>
                            <option value="presentation">Presentation</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={newTodoSubject}
                          onChange={e => setNewTodoSubject(e.target.value)}
                          placeholder="Subject (e.g. Math)"
                          className="w-full bg-panel-bg border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-text-main placeholder-text-muted focus:outline-none focus:border-border-subtle transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Center - Workspace */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-transparent min-w-[300px]">
          {/* Tabs Header */}
          <div className="flex items-center justify-between p-4 z-20 relative">
            <button 
              onClick={() => setShowLeftSidebar(!showLeftSidebar)}
              className="p-2 text-text-muted hover:text-text-main rounded-lg transition-colors"
              title="Toggle Left Sidebar"
            >
              <PanelLeft className="w-5 h-5" />
            </button>

            {activeNote && (
              <div className="flex items-center gap-1 bg-panel-bg p-1 rounded-lg border border-border-subtle">
                <button onClick={() => setActiveTab('editor')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'editor' ? 'bg-panel-solid text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'}`}>
                  Notes
                </button>
                <button onClick={() => setActiveTab('whiteboard')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'whiteboard' ? 'bg-panel-solid text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'}`}>
                  Whiteboard
                </button>
                <button onClick={() => setActiveTab('flashcards')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'flashcards' ? 'bg-panel-solid text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'}`}>
                  Flashcards
                </button>
                <button onClick={() => setActiveTab('quiz')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'quiz' ? 'bg-panel-solid text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'}`}>
                  Quiz
                </button>
              </div>
            )}

            <button 
              onClick={() => setShowRightSidebar(!showRightSidebar)}
              className="p-2 text-text-muted hover:text-text-main rounded-lg transition-colors"
              title="Toggle Right Sidebar"
            >
              <PanelRight className="w-5 h-5" />
            </button>
          </div>

          {activeNote ? (
            <>
              {/* Editor View */}
              {activeTab === 'editor' && (
                <motion.div 
                  key="editor"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-1 overflow-y-auto p-10 max-w-4xl mx-auto w-full z-10 flex flex-col"
                >
                  <input 
                    type="text"
                    value={activeNote.title}
                    onChange={(e) => handleNoteChange('title', e.target.value)}
                    placeholder="Note Title"
                    className="w-full bg-transparent text-4xl font-bold text-text-main placeholder-text-muted outline-none mb-4"
                  />
                  
                  {/* Quick Actions Bar */}
                  <div className="flex items-center gap-2 mb-6 flex-wrap">
                    <button onClick={handleGenerateFlashcards} disabled={isGeneratingCards} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-panel-bg hover:bg-panel-solid text-xs font-medium text-text-main transition-colors border border-border-subtle">
                      {isGeneratingCards ? <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" /> : <Layers className="w-3 h-3" />} 
                      {isGeneratingCards ? 'Generating...' : 'Generate Flashcards'}
                    </button>
                    <button onClick={handleAiAutocomplete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-panel-bg hover:bg-panel-solid text-xs font-medium text-text-main transition-colors border border-border-subtle">
                      <Wand2 className="w-3 h-3" /> AI Continue
                    </button>
                    <button onClick={() => quickAction("Summarize this note.")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-panel-bg hover:bg-panel-solid text-xs font-medium text-text-main transition-colors border border-border-subtle">
                      <Sparkles className="w-3 h-3" /> Summarize
                    </button>
                    <button onClick={toggleListening} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md ${isListening ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20' : 'bg-panel-bg text-text-main hover:bg-panel-solid border-border-subtle'} text-xs font-medium transition-colors border`}>
                      {isListening ? <Mic className="w-3 h-3 animate-pulse" /> : <MicOff className="w-3 h-3" />} 
                      {isListening ? 'Listening...' : 'Dictate'}
                    </button>
                    {isProcessingDictation && (
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                        Processing Dictation...
                      </span>
                    )}
                    <button onClick={exportNote} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-panel-bg hover:bg-panel-solid text-xs font-medium text-text-main transition-colors border border-border-subtle ml-auto">
                      <Download className="w-3 h-3" /> Export .md
                    </button>
                  </div>

                  {liveTranscript && (
                    <div className="mb-4 p-4 rounded-xl bg-panel-solid border border-border-subtle text-sm text-text-muted italic">
                      {liveTranscript}
                    </div>
                  )}

                  {/* Formatting Toolbar */}
                <div className="flex items-center gap-1 mb-4 bg-panel-bg p-1 rounded-lg border border-border-subtle w-fit">
                  <button onClick={() => applyFormatting('**', '**')} className="p-1.5 text-text-muted hover:text-text-main hover:bg-panel-solid rounded transition-colors" title="Bold"><Bold className="w-4 h-4" /></button>
                  <button onClick={() => applyFormatting('*', '*')} className="p-1.5 text-text-muted hover:text-text-main hover:bg-panel-solid rounded transition-colors" title="Italic"><Italic className="w-4 h-4" /></button>
                  <button onClick={() => applyFormatting('~~', '~~')} className="p-1.5 text-text-muted hover:text-text-main hover:bg-panel-solid rounded transition-colors" title="Strikethrough"><Strikethrough className="w-4 h-4" /></button>
                  <div className="w-px h-4 bg-panel-solid mx-1"></div>
                  <button onClick={() => applyFormatting('# ', '')} className="p-1.5 text-text-muted hover:text-text-main hover:bg-panel-solid rounded transition-colors" title="Heading 1"><Heading1 className="w-4 h-4" /></button>
                  <button onClick={() => applyFormatting('## ', '')} className="p-1.5 text-text-muted hover:text-text-main hover:bg-panel-solid rounded transition-colors" title="Heading 2"><Heading2 className="w-4 h-4" /></button>
                  <div className="w-px h-4 bg-panel-solid mx-1"></div>
                  <button onClick={() => applyFormatting('- ', '')} className="p-1.5 text-text-muted hover:text-text-main hover:bg-panel-solid rounded transition-colors" title="Bullet List"><List className="w-4 h-4" /></button>
                  <button onClick={() => applyFormatting('1. ', '')} className="p-1.5 text-text-muted hover:text-text-main hover:bg-panel-solid rounded transition-colors" title="Numbered List"><ListOrdered className="w-4 h-4" /></button>
                  <div className="w-px h-4 bg-panel-solid mx-1"></div>
                  <button onClick={() => applyFormatting('> ', '')} className="p-1.5 text-text-muted hover:text-text-main hover:bg-panel-solid rounded transition-colors" title="Quote"><Quote className="w-4 h-4" /></button>
                  <button onClick={() => applyFormatting('`', '`')} className="p-1.5 text-text-muted hover:text-text-main hover:bg-panel-solid rounded transition-colors" title="Code"><Code className="w-4 h-4" /></button>
                </div>

                <textarea
                  ref={textareaRef}
                  value={activeNote.content}
                  onChange={(e) => handleNoteChange('content', e.target.value)}
                  placeholder="Start typing your notes here... Markdown is supported."
                  className="w-full flex-1 min-h-[500px] bg-transparent text-text-main placeholder-text-muted outline-none resize-none text-base leading-relaxed font-sans"
                />
              </motion.div>
            )}

            {/* Whiteboard View */}
            {activeTab === 'whiteboard' && (
              <div className="flex-1 relative flex flex-col z-10 bg-white">
                <div className="flex-1 w-full h-full" style={{ isolation: 'isolate' }}>
                  <Tldraw persistenceKey={`tldraw-${activeNote.id}`} />
                </div>
              </div>
            )}

            {/* Flashcards View */}
            {activeTab === 'flashcards' && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 relative">
                {flashcards[activeNote.id] && flashcards[activeNote.id].length > 0 ? (
                  <div className="w-full max-w-2xl perspective-1000">
                    <motion.div 
                      className="w-full aspect-[3/2] relative preserve-3d cursor-pointer"
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                      onClick={() => setIsFlipped(!isFlipped)}
                    >
                      {/* Front (Question) */}
                      <div className="absolute inset-0 backface-hidden bg-panel-bg border border-border-subtle rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-xl backdrop-blur-xl">
                        <span className="absolute top-6 left-6 text-xs font-medium text-text-muted uppercase tracking-widest">Question {currentCardIdx + 1}/{flashcards[activeNote.id].length}</span>
                        <h3 className="text-3xl font-medium text-text-main leading-tight">{flashcards[activeNote.id][currentCardIdx].q}</h3>
                        <span className="absolute bottom-6 text-xs text-text-muted uppercase tracking-widest">Click to flip</span>
                      </div>
                      {/* Back (Answer) */}
                      <div className="absolute inset-0 backface-hidden bg-panel-solid border border-border-subtle rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-xl" style={{ transform: 'rotateY(180deg)' }}>
                        <span className="absolute top-6 left-6 text-xs font-medium text-text-muted uppercase tracking-widest">Answer</span>
                        <p className="text-2xl text-text-main leading-relaxed">{flashcards[activeNote.id][currentCardIdx].a}</p>
                      </div>
                    </motion.div>
                    <div className="flex items-center justify-between mt-8 px-4">
                      <button 
                        onClick={() => {setCurrentCardIdx(Math.max(0, currentCardIdx - 1)); setIsFlipped(false);}} 
                        disabled={currentCardIdx === 0} 
                        className="px-6 py-3 rounded-lg bg-panel-bg hover:bg-panel-solid border border-border-subtle disabled:opacity-50 transition-colors text-sm font-medium text-text-main"
                      >
                        Previous
                      </button>
                      <button 
                        onClick={() => {setCurrentCardIdx(Math.min(flashcards[activeNote.id].length - 1, currentCardIdx + 1)); setIsFlipped(false);}} 
                        disabled={currentCardIdx === flashcards[activeNote.id].length - 1} 
                        className="px-6 py-3 rounded-lg bg-text-main hover:bg-text-muted disabled:opacity-50 transition-colors text-app-bg text-sm font-medium shadow-sm"
                      >
                        Next Card
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
                    <div className="w-20 h-20 rounded-2xl bg-panel-bg flex items-center justify-center border border-border-subtle mb-6 shadow-sm">
                      <Layers className="w-10 h-10 text-text-muted" />
                    </div>
                    <h3 className="text-xl font-medium text-text-main mb-2">AI Flashcards</h3>
                    <p className="text-text-muted mb-8 text-sm">Transform your notes into interactive flashcards instantly using Gemini 3.1. Perfect for active recall and spaced repetition.</p>
                    <button 
                      onClick={handleGenerateFlashcards} 
                      disabled={isGeneratingCards}
                      className="flex items-center gap-2 px-6 py-3 rounded-lg bg-text-main hover:bg-text-muted text-app-bg font-medium transition-all shadow-sm disabled:opacity-50 text-sm"
                    >
                      {isGeneratingCards ? <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {isGeneratingCards ? 'Analyzing Notes...' : 'Generate from Current Note'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quiz View */}
            {activeTab === 'quiz' && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 relative overflow-y-auto">
                {quizzes[activeNote.id] && quizzes[activeNote.id].length > 0 ? (
                  <div className="w-full max-w-3xl">
                    <div className="bg-panel-bg border border-border-subtle rounded-3xl p-8 shadow-xl backdrop-blur-xl mb-6">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-xs font-medium text-text-muted uppercase tracking-widest">Question {currentQuizIdx + 1} of {quizzes[activeNote.id].length}</span>
                        {quizSubmitted[activeNote.id] && (
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${quizAnswers[activeNote.id]?.[currentQuizIdx] === quizzes[activeNote.id][currentQuizIdx].correct ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                            {quizAnswers[activeNote.id]?.[currentQuizIdx] === quizzes[activeNote.id][currentQuizIdx].correct ? 'Correct' : 'Incorrect'}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-2xl font-medium text-text-main leading-tight mb-8">{quizzes[activeNote.id][currentQuizIdx].q}</h3>
                      
                      <div className="space-y-3">
                        {quizzes[activeNote.id][currentQuizIdx].options.map((option, optIdx) => {
                          const isSelected = quizAnswers[activeNote.id]?.[currentQuizIdx] === optIdx;
                          const isSubmitted = quizSubmitted[activeNote.id];
                          const isCorrect = quizzes[activeNote.id][currentQuizIdx].correct === optIdx;
                          
                          let optionClass = "bg-panel-solid border-border-subtle hover:border-text-muted text-text-main";
                          if (isSelected && !isSubmitted) optionClass = "bg-accent-main/10 border-accent-main text-accent-main ring-1 ring-accent-main";
                          
                          if (isSubmitted) {
                            if (isCorrect) optionClass = "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500";
                            else if (isSelected && !isCorrect) optionClass = "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500";
                            else optionClass = "bg-panel-solid border-border-subtle opacity-50 text-text-muted";
                          }

                          return (
                            <button
                              key={optIdx}
                              onClick={() => handleQuizAnswer(currentQuizIdx, optIdx)}
                              disabled={isSubmitted}
                              className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${optionClass}`}
                            >
                              <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium shrink-0 ${isSelected || (isSubmitted && isCorrect) ? 'border-current bg-current text-white dark:text-black' : 'border-border-subtle text-text-muted'}`}>
                                {String.fromCharCode(65 + optIdx)}
                              </div>
                              <span className="font-medium">{option}</span>
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted[activeNote.id] && (
                        <div className="mt-6 p-4 rounded-xl bg-accent-main/5 border border-accent-main/20 flex gap-3">
                          <HelpCircle className="w-5 h-5 text-accent-main shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-semibold text-accent-main mb-1">Explanation</h4>
                            <p className="text-sm text-text-main leading-relaxed">{quizzes[activeNote.id][currentQuizIdx].explanation}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between px-2">
                      <button 
                        onClick={() => setCurrentQuizIdx(Math.max(0, currentQuizIdx - 1))} 
                        disabled={currentQuizIdx === 0} 
                        className="px-6 py-3 rounded-lg bg-panel-bg hover:bg-panel-solid border border-border-subtle disabled:opacity-50 transition-colors text-sm font-medium text-text-main"
                      >
                        Previous
                      </button>
                      
                      {!quizSubmitted[activeNote.id] && currentQuizIdx === quizzes[activeNote.id].length - 1 ? (
                        <button 
                          onClick={submitQuiz}
                          disabled={Object.keys(quizAnswers[activeNote.id] || {}).length < quizzes[activeNote.id].length}
                          className="px-6 py-3 rounded-lg bg-text-main hover:bg-text-muted disabled:opacity-50 transition-colors text-app-bg text-sm font-medium shadow-sm"
                        >
                          Submit Quiz
                        </button>
                      ) : (
                        <button 
                          onClick={() => setCurrentQuizIdx(Math.min(quizzes[activeNote.id].length - 1, currentQuizIdx + 1))} 
                          disabled={currentQuizIdx === quizzes[activeNote.id].length - 1} 
                          className="px-6 py-3 rounded-lg bg-text-main hover:bg-text-muted disabled:opacity-50 transition-colors text-app-bg text-sm font-medium shadow-sm"
                        >
                          Next Question
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
                    <div className="w-20 h-20 rounded-2xl bg-panel-bg flex items-center justify-center border border-border-subtle mb-6 shadow-sm">
                      <HelpCircle className="w-10 h-10 text-text-muted" />
                    </div>
                    <h3 className="text-xl font-medium text-text-main mb-2">AI Quiz</h3>
                    <p className="text-text-muted mb-8 text-sm">Test your knowledge with a custom multiple-choice quiz generated from your notes.</p>
                    <button 
                      onClick={handleGenerateQuiz} 
                      disabled={isGeneratingQuiz}
                      className="flex items-center gap-2 px-6 py-3 rounded-lg bg-text-main hover:bg-text-muted text-app-bg font-medium transition-all shadow-sm disabled:opacity-50 text-sm"
                    >
                      {isGeneratingQuiz ? <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {isGeneratingQuiz ? 'Generating Quiz...' : 'Generate Quiz'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-muted z-10">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-panel-bg flex items-center justify-center border border-border-subtle">
                <Book className="w-8 h-8 text-text-muted" />
              </div>
              <p className="text-sm">Select or create a note to start studying.</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Tools */}
      {showRightSidebar && (
        <>
          <div className="w-80 glass-panel border-l border-border-subtle flex flex-col z-10 shrink-0 overflow-hidden">
            <div className="flex flex-col h-full">
              {/* Timer Section */}
              <div className="p-6 border-b border-border-subtle">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-medium text-xs text-text-muted uppercase tracking-wider flex items-center gap-2">
                    Timer
                    <button onClick={() => setShowTimerSettings(!showTimerSettings)} className="text-text-muted hover:text-text-main transition-colors">
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </h2>
                  <div className="flex gap-1 bg-panel-bg p-1 rounded-md border border-border-subtle">
                    <button 
                      onClick={() => { setTimerMode('work'); setTimeLeft(workDuration * 60); setIsTimerRunning(false); }}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${timerMode === 'work' ? 'bg-accent-main text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'}`}
                    >
                      Work
                    </button>
                    <button 
                      onClick={() => { setTimerMode('break'); setTimeLeft(breakDuration * 60); setIsTimerRunning(false); }}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${timerMode === 'break' ? 'bg-accent-main text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'}`}
                    >
                      Break
                    </button>
                  </div>
                </div>
                
                {showTimerSettings && (
                  <div className="mb-4 p-3 bg-panel-bg rounded-lg border border-border-subtle flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1">Work (min)</label>
                      <input type="number" value={workDuration} onChange={e => setWorkDuration(Number(e.target.value))} className="w-full bg-panel-solid border border-border-subtle rounded px-2 py-1 text-sm text-text-main focus:outline-none" min="1" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1">Break (min)</label>
                      <input type="number" value={breakDuration} onChange={e => setBreakDuration(Number(e.target.value))} className="w-full bg-panel-solid border border-border-subtle rounded px-2 py-1 text-sm text-text-main focus:outline-none" min="1" />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-5xl font-light tracking-tighter text-text-main">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-text-main transition-all ${
                        isTimerRunning ? 'bg-accent-main hover:bg-accent-hover' : 'bg-panel-solid hover:bg-accent-main'
                      }`}
                    >
                      {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <button 
                      onClick={() => {
                        setIsTimerRunning(false);
                        setTimeLeft(timerMode === 'work' ? workDuration * 60 : breakDuration * 60);
                      }}
                      className="w-10 h-10 rounded-full bg-panel-solid hover:bg-panel-solid flex items-center justify-center text-text-muted hover:text-text-main transition-all border border-border-subtle"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat Section */}
              <div className="flex-1 flex flex-col overflow-hidden relative border-b border-border-subtle">
                {/* Chat Header */}
                <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                  <h2 className="font-medium text-xs text-text-muted uppercase tracking-wider">
                    Assistant
                  </h2>
                  
                  {/* AI Mode Selector */}
                  <div className="flex bg-panel-bg p-1 rounded-md border border-border-subtle">
                    <button 
                      onClick={() => setAiMode('fast')}
                      title="Fast (Flash Lite)"
                      className={`p-1.5 rounded transition-all ${aiMode === 'fast' ? 'bg-accent-main text-text-main' : 'text-text-muted hover:text-text-main'}`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setAiMode('smart')}
                      title="Smart (Pro)"
                      className={`p-1.5 rounded transition-all ${aiMode === 'smart' ? 'bg-accent-main text-text-main' : 'text-text-muted hover:text-text-main'}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setAiMode('deep')}
                      title="Deep Think (Pro + Thinking)"
                      className={`p-1.5 rounded transition-all ${aiMode === 'deep' ? 'bg-accent-main text-text-main' : 'text-text-muted hover:text-text-main'}`}
                    >
                      <Brain className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setAiMode('search')}
                      title="Web Search (Flash + Search)"
                      className={`p-1.5 rounded transition-all ${aiMode === 'search' ? 'bg-accent-main text-text-main' : 'text-text-muted hover:text-text-main'}`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  {(chatHistory[activeNoteId] || []).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                      <div className="w-12 h-12 rounded-full bg-panel-solid flex items-center justify-center mb-3 border border-border-subtle shadow-sm">
                        <Sparkles className="w-5 h-5 text-text-main" />
                      </div>
                      <p className="text-sm text-text-muted mb-1">I'm your AI study buddy.</p>
                      <p className="text-xs text-text-muted">Ask questions, upload files/PDFs, or select a mode above.</p>
                    </div>
                  ) : (
                    (chatHistory[activeNoteId] || []).map(msg => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={msg.id} 
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-2 mb-1.5 px-1">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                            {msg.role === 'user' ? 'You' : 'Assistant'}
                          </span>
                          {msg.isThinking && (
                            <span className="text-[10px] flex items-center gap-1 text-text-muted bg-panel-solid px-1.5 py-0.5 rounded">
                              <Brain className="w-3 h-3" /> Deep Think
                            </span>
                          )}
                        </div>
                        <div className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm border ${
                          msg.role === 'user' 
                            ? 'bg-panel-solid border-border-subtle text-text-main rounded-tr-sm' 
                            : 'bg-panel-bg border-border-subtle text-text-main rounded-tl-sm'
                        }`}>
                          {/* Render Files if any */}
                          {msg.files && msg.files.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {msg.files.map((file, i) => (
                                file.isImage ? (
                                  <img key={i} src={file.dataUrl} alt="upload" className="w-24 h-24 object-cover rounded-lg border border-border-subtle" />
                                ) : (
                                  <div key={i} className="flex items-center gap-2 bg-panel-bg p-2 rounded-lg border border-border-subtle">
                                    <File className="w-5 h-5 text-text-muted shrink-0" />
                                    <span className="text-xs text-text-main max-w-[150px] truncate">{file.name}</span>
                                  </div>
                                )
                              ))}
                            </div>
                          )}
                          
                          {/* Render Text */}
                          {msg.role === 'model' ? (
                            <div className="markdown-body">
                              <Markdown>{msg.text}</Markdown>
                            </div>
                          ) : (
                            <div className="text-sm leading-relaxed">{msg.text}</div>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                  
                  {isChatLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start">
                      <div className="bg-panel-bg border border-border-subtle rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                        <div className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-border-subtle">
                  {/* File Preview Area */}
                  <AnimatePresence>
                    {chatFiles.length > 0 && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex gap-2 mb-3 overflow-x-auto pb-1"
                      >
                        {chatFiles.map((file, i) => (
                          <div key={i} className="relative shrink-0 group flex items-center justify-center w-16 h-16 bg-panel-bg rounded-lg border border-border-subtle overflow-hidden">
                            {file.isImage ? (
                              <img src={file.dataUrl} alt="preview" className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center justify-center p-1">
                                <File className="w-6 h-6 text-text-muted mb-1" />
                                <span className="text-[8px] text-text-muted w-14 truncate text-center">{file.name}</span>
                              </div>
                            )}
                            <button 
                              onClick={() => removeFile(i)}
                              className="absolute -top-1.5 -right-1.5 bg-panel-solid text-text-main p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md border border-border-subtle"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="relative flex items-end gap-2 bg-panel-bg border border-border-subtle rounded-xl p-1 focus-within:border-border-subtle transition-colors">
                    <input 
                      type="file" 
                      accept="image/*,application/pdf,text/plain,text/markdown,text/csv" 
                      multiple 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-text-muted hover:text-text-main hover:bg-panel-solid rounded-lg transition-colors shrink-0"
                      title="Upload File or Image"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    
                    <textarea 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={`Ask Gemini (${aiMode})...`}
                      className="w-full bg-transparent py-2 text-sm text-text-main placeholder-text-muted focus:outline-none resize-none max-h-32 min-h-[36px]"
                      rows={1}
                    />
                    
                    <button 
                      onClick={handleSendMessage}
                      disabled={(!chatInput.trim() && chatFiles.length === 0) || isChatLoading}
                      className="p-2 bg-panel-solid hover:bg-accent-main text-text-main rounded-lg disabled:opacity-50 disabled:hover:bg-panel-solid transition-colors shrink-0 shadow-sm border border-border-subtle"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Dictionary Section (Replaced Music) */}
              <div className="p-6 min-h-[160px] flex flex-col">
                <h2 className="font-medium text-xs text-text-muted uppercase tracking-wider flex items-center gap-2 mb-4">
                  <BookOpen className="w-3.5 h-3.5" />
                  Dictionary
                </h2>
                <div className="relative mb-4">
                  <input 
                    type="text" 
                    value={dictQuery}
                    onChange={(e) => setDictQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDictionaryLookup()}
                    placeholder="Type a word or concept..." 
                    className="w-full bg-panel-bg border border-border-subtle rounded-lg pl-3 pr-8 py-2 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-border-subtle transition-colors"
                  />
                  <button 
                    onClick={handleDictionaryLookup}
                    disabled={isDictLoading || !dictQuery.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main disabled:opacity-50"
                  >
                    {isDictLoading ? <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {dictResult ? (
                    <p className="text-sm text-text-main leading-relaxed">{dictResult}</p>
                  ) : (
                    <p className="text-sm text-text-muted italic mt-2">Instant AI definitions and concept explanations.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
