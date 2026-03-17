const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const quizBtn = `
                  <button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-panel-bg hover:bg-panel-solid text-xs font-medium text-text-main transition-colors border border-border-subtle">
                    {isGeneratingQuiz ? <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" /> : <BookOpen className="w-3 h-3" />} 
                    {isGeneratingQuiz ? 'Generating...' : 'Generate Quiz'}
                  </button>
`;

content = content.replace(
  "{isGeneratingCards ? 'Generating...' : 'Generate Flashcards'}\n                  </button>",
  "{isGeneratingCards ? 'Generating...' : 'Generate Flashcards'}\n                  </button>" + quizBtn
);

fs.writeFileSync('src/App.tsx', content);
