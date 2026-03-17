const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  "const [activeTab, setActiveTab] = useState<'editor' | 'whiteboard' | 'flashcards'>('editor');",
  "const [activeTab, setActiveTab] = useState<'editor' | 'whiteboard' | 'flashcards' | 'quiz'>('editor');\n  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);\n  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);\n  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0);\n  const [quizScore, setQuizScore] = useState<number | null>(null);\n  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);"
);

content = content.replace(
  "<button onClick={() => setActiveTab('flashcards')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'flashcards' ? 'bg-panel-solid text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'}`}>\n                Flashcards\n              </button>",
  "<button onClick={() => setActiveTab('flashcards')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'flashcards' ? 'bg-panel-solid text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'}`}>\n                Flashcards\n              </button>\n              <button onClick={() => setActiveTab('quiz')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'quiz' ? 'bg-panel-solid text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'}`}>\n                Quiz\n              </button>"
);

content = content.replace(
  "StudyHub <span className=\"text-[10px] bg-panel-solid text-text-main px-1.5 py-0.5 rounded ml-1 border border-border-subtle\">PRO</span>",
  "jainGPT <span className=\"text-[10px] bg-panel-solid text-text-main px-1.5 py-0.5 rounded ml-1 border border-border-subtle\">PRO</span>"
);

content = content.replace(
  "title: 'Welcome to StudyHub Pro',",
  "title: 'Welcome to jainGPT',"
);

content = content.replace(
  "className={`flex h-screen w-full mesh-bg ${currentTheme.text} font-sans overflow-hidden transition-colors duration-500`}",
  "className={`flex h-screen w-full mesh-bg theme-${themeColor} ${currentTheme.text} font-sans overflow-hidden transition-colors duration-500`}"
);

fs.writeFileSync('src/App.tsx', content);
