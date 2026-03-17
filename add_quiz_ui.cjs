const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const quizUI = `
            {activeTab === 'quiz' && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 relative">
                {quizQuestions.length > 0 ? (
                  <div className="w-full max-w-2xl">
                    {quizScore !== null && currentQuizQuestion >= quizQuestions.length ? (
                      <div className="bg-panel-bg border border-border-subtle rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-xl backdrop-blur-xl">
                        <h3 className="text-3xl font-medium text-text-main mb-4">Quiz Complete!</h3>
                        <p className="text-xl text-text-muted mb-8">You scored {quizScore} out of {quizQuestions.length}</p>
                        <button 
                          onClick={handleGenerateQuiz} 
                          className="px-6 py-3 rounded-lg bg-text-main hover:bg-text-muted transition-colors text-app-bg text-sm font-medium shadow-sm"
                        >
                          Retake Quiz
                        </button>
                      </div>
                    ) : (
                      <div className="bg-panel-bg border border-border-subtle rounded-3xl p-10 flex flex-col shadow-xl backdrop-blur-xl">
                        <span className="text-xs font-medium text-text-muted uppercase tracking-widest mb-6">Question {currentQuizQuestion + 1}/{quizQuestions.length}</span>
                        <h3 className="text-2xl font-medium text-text-main leading-tight mb-8">{quizQuestions[currentQuizQuestion]?.q}</h3>
                        <div className="flex flex-col gap-3">
                          {quizQuestions[currentQuizQuestion]?.options.map((opt, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleAnswerSelect(idx)}
                              className={\`text-left px-6 py-4 rounded-xl border transition-all \${selectedAnswer === idx ? 'bg-accent-main border-accent-main text-text-main shadow-md' : 'bg-panel-solid border-border-subtle text-text-main hover:border-accent-main'}\`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-end mt-8">
                          <button 
                            onClick={handleNextQuestion} 
                            disabled={selectedAnswer === null} 
                            className="px-6 py-3 rounded-lg bg-text-main hover:bg-text-muted disabled:opacity-50 transition-colors text-app-bg text-sm font-medium shadow-sm"
                          >
                            {currentQuizQuestion < quizQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
                    <div className="w-20 h-20 rounded-2xl bg-panel-bg flex items-center justify-center border border-border-subtle mb-6 shadow-sm">
                      <BookOpen className="w-10 h-10 text-text-muted" />
                    </div>
                    <h3 className="text-xl font-medium text-text-main mb-2">AI Quiz</h3>
                    <p className="text-text-muted mb-8 text-sm">Test your knowledge with an AI-generated multiple choice quiz based on your notes.</p>
                    <button 
                      onClick={handleGenerateQuiz} 
                      disabled={isGeneratingQuiz}
                      className="flex items-center gap-2 px-6 py-3 rounded-lg bg-text-main hover:bg-text-muted text-app-bg font-medium transition-all shadow-sm disabled:opacity-50 text-sm"
                    >
                      {isGeneratingQuiz ? <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {isGeneratingQuiz ? 'Generating Quiz...' : 'Generate from Current Note'}
                    </button>
                  </div>
                )}
              </div>
            )}
`;

content = content.replace(
  "              </div>\n            )}\n          </>\n        ) : (",
  "              </div>\n            )}\n" + quizUI + "          </>\n        ) : ("
);

fs.writeFileSync('src/App.tsx', content);
