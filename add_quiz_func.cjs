const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const quizFunc = `
  // --- Quiz Handlers ---
  const handleGenerateQuiz = async () => {
    if (!activeNote || !activeNote.content.trim()) return;
    setIsGeneratingQuiz(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: \`Create a 5-question multiple choice quiz based on the following notes. Return ONLY a valid JSON array of objects. Each object must have: 'q' (the question string), 'options' (an array of 4 string options), and 'answer' (the index 0-3 of the correct option). Notes:\\n\\n\${activeNote.content}\`,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      const questions = JSON.parse(response.text || '[]');
      setQuizQuestions(questions);
      setActiveTab('quiz');
      setCurrentQuizQuestion(0);
      setQuizScore(null);
      setSelectedAnswer(null);
    } catch (error) {
      console.error("Failed to generate quiz", error);
      alert("Failed to generate quiz. Please try adding more content to your note.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleAnswerSelect = (index) => {
    setSelectedAnswer(index);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer === quizQuestions[currentQuizQuestion].answer) {
      setQuizScore((prev) => (prev || 0) + 1);
    } else if (quizScore === null) {
      setQuizScore(0);
    }
    
    if (currentQuizQuestion < quizQuestions.length - 1) {
      setCurrentQuizQuestion(prev => prev + 1);
      setSelectedAnswer(null);
    } else {
      setCurrentQuizQuestion(prev => prev + 1); // Move to results screen
    }
  };
`;

content = content.replace(
  "// --- AI Editor Handlers ---",
  quizFunc + "\n  // --- AI Editor Handlers ---"
);

fs.writeFileSync('src/App.tsx', content);
