import { useState } from "react";
import { getQuizQuestions } from "../lib/quiz_gemini"; 
import { db } from "../lib/firebase"; 
import { collection, addDoc } from "firebase/firestore";
import { Loader, CheckCircle, XCircle, RefreshCw, Info, ChevronDown, ChevronUp } from "lucide-react";

function QuizPage() {
  const [course, setCourse] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("");
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showAnswers, setShowAnswers] = useState({});
  const [quizStarted, setQuizStarted] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState({});
  const [showExplanations, setShowExplanations] = useState({});

  const startQuiz = async () => {
    if (!course || !topic || !level) {
      alert("Please fill all fields before starting the quiz.");
      return;
    }

    setLoading(true);
    setQuizData([]);
    setSelectedAnswers({});
    setShowAnswers({});
    setAnsweredQuestions({});
    setShowExplanations({});
    setQuizStarted(true);

    try {
      const response = await getQuizQuestions(course, topic, level);
      console.log("API Response:", response);
      
      if (response && response.questions && Array.isArray(response.questions)) {
        // Add explanations to each question if they don't already have one
        const questionsWithExplanations = response.questions.map(question => {
          if (!question.explanation) {
            // Generate a simple explanation if none exists
            const explanation = `The correct answer is "${question.answer}". This is a key concept in ${topic} that's important to understand for ${level} level ${course}.`;
            return { ...question, explanation };
          }
          return question;
        });
        
        setQuizData(questionsWithExplanations);
      } else {
        console.error("Invalid response format:", response);
        alert("Received invalid response format from API.");
      }

      // Save quiz metadata to Firebase
      await addDoc(collection(db, "quizzes"), {
        course,
        topic,
        level,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error("Error fetching quiz questions:", error);
      alert("Failed to load questions. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex, selectedOption) => {
    // Only allow selection if this question hasn't been answered yet
    if (!answeredQuestions[questionIndex]) {
      setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: selectedOption }));
      setShowAnswers((prev) => ({ ...prev, [questionIndex]: true }));
      setAnsweredQuestions((prev) => ({ ...prev, [questionIndex]: true }));
    }
  };

  const toggleExplanation = (questionIndex) => {
    setShowExplanations((prev) => ({ 
      ...prev, 
      [questionIndex]: !prev[questionIndex] 
    }));
  };

  const resetQuiz = () => {
    setSelectedAnswers({});
    setShowAnswers({});
    setAnsweredQuestions({});
    setShowExplanations({});
  };

  const generateNewQuiz = () => {
    // Keep the same parameters but generate new questions
    startQuiz();
  };

  const resetEntireQuiz = () => {
    setCourse("");
    setTopic("");
    setLevel("");
    setQuizData([]);
    setSelectedAnswers({});
    setShowAnswers({});
    setAnsweredQuestions({});
    setShowExplanations({});
    setQuizStarted(false);
  };

  // Calculate score
  const calculateScore = () => {
    if (quizData.length === 0) return { correct: 0, total: 0, percentage: 0 };
    
    let correct = 0;
    Object.keys(selectedAnswers).forEach(index => {
      if (selectedAnswers[index] === quizData[index].answer) {
        correct++;
      }
    });
    
    const answered = Object.keys(selectedAnswers).length;
    const percentage = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    
    return { correct, total: answered, percentage };
  };

  const score = calculateScore();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">AI-Powered Quiz Generator</h1>

      <div className="space-y-4 bg-black/50 p-6 rounded-xl border border-gray-700">
        <input
          type="text"
          placeholder="Enter Course Name"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:border-blue-500 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Enter Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:border-blue-500 focus:outline-none"
        />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700"
        >
          <option value="">Select Difficulty Level</option>
          <option value="Placement">Placement</option>
          <option value="GATE">GATE</option>
          <option value="Semester Exam">Semester Exam</option>
        </select>

        <button
          onClick={startQuiz}
          disabled={loading}
          className="w-full px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-green-600 text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
        >
          {loading ? <Loader className="w-5 h-5 animate-spin" /> : <span>Start Quiz</span>}
        </button>
      </div>

      {loading && (
        <div className="mt-8 flex justify-center">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
          <p className="ml-2">Generating quiz questions...</p>
        </div>
      )}

      {!loading && quizData && quizData.length > 0 && (
        <div className="mt-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Quiz Questions for {course}: {topic} ({level})</h2>
            
            {/* Score display */}
            {Object.keys(selectedAnswers).length > 0 && (
              <div className="bg-gray-800 px-4 py-2 rounded-lg">
                <p className="text-sm">
                  Score: <span className="font-bold text-green-400">{score.correct}</span>/{score.total} 
                  ({score.percentage}%)
                </p>
              </div>
            )}
          </div>
          
          {quizData.map((q, index) => (
            <div key={index} className="p-4 rounded-lg bg-gray-900 border border-gray-700">
              <h2 className="text-lg font-semibold">
                <span className="mr-2">{index + 1}.</span>{q.question}
              </h2>

              <div className="mt-2 space-y-2">
                {q.options && Array.isArray(q.options) ? (
                  q.options.map((option, optIndex) => (
                    <button
                      key={optIndex}
                      onClick={() => handleAnswerSelect(index, option)}
                      disabled={answeredQuestions[index]}
                      className={`w-full px-4 py-2 rounded-lg text-left border ${
                        selectedAnswers[index] === option
                          ? option === q.answer
                            ? "border-green-500 bg-green-900/30"
                            : "border-red-500 bg-red-900/30"
                          : answeredQuestions[index]
                            ? "border-gray-700 opacity-70"
                            : "border-gray-700 hover:border-blue-500"
                      }`}
                    >
                      {option}
                    </button>
                  ))
                ) : (
                  <p className="text-red-500">Options not available</p>
                )}
              </div>

              {showAnswers[index] && (
                <div className="mt-3">
                  <div className="flex items-center">
                    <p className="text-sm">
                      Correct Answer: <span className="font-semibold">{q.answer}</span>
                    </p>
                    {selectedAnswers[index] === q.answer ? (
                      <CheckCircle className="ml-2 text-green-500 w-6 h-6 animate-bounce" />
                    ) : (
                      <XCircle className="ml-2 text-red-500 w-6 h-6 animate-bounce" />
                    )}
                    
                    {/* Explanation toggle button */}
                    <button 
                      onClick={() => toggleExplanation(index)}
                      className="ml-4 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs flex items-center"
                    >
                      <Info className="w-4 h-4 mr-1" />
                      {showExplanations[index] ? "Hide" : "Show"} Explanation
                      {showExplanations[index] ? 
                        <ChevronUp className="w-4 h-4 ml-1" /> : 
                        <ChevronDown className="w-4 h-4 ml-1" />
                      }
                    </button>
                  </div>
                  
                  {/* Explanation section */}
                  {showExplanations[index] && (
                    <div className="mt-2 p-3 bg-gray-800 rounded-lg border-l-4 border-blue-500">
                      <p className="text-sm text-gray-200">{q.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {/* Control buttons */}
          <div className="flex space-x-4 mt-8">
            <button
              onClick={resetQuiz}
              className="flex-1 px-4 py-2 rounded-lg bg-yellow-600 text-white font-medium hover:bg-yellow-700"
            >
              Reset Answers
            </button>
            
            <button
              onClick={generateNewQuiz}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              New Questions
            </button>
            
            <button
              onClick={resetEntireQuiz}
              className="flex-1 px-4 py-2 rounded-lg bg-gray-600 text-white font-medium hover:bg-gray-700"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {!loading && quizStarted && (!quizData || quizData.length === 0) && (
        <div className="mt-8 p-4 rounded-lg bg-gray-900 border border-gray-700 text-center">
          <p className="text-yellow-400">No questions were generated. Please try again with different parameters.</p>
          <button
            onClick={resetEntireQuiz}
            className="mt-4 px-4 py-2 rounded-lg bg-gray-600 text-white font-medium hover:bg-gray-700"
          >
            Reset
          </button>
        </div>
      )}
      
      {!loading && !quizStarted && (
        <div className="mt-8 p-4 rounded-lg bg-gray-900 border border-gray-700 text-center">
          <p>Enter course information and click "Start Quiz" to generate questions.</p>
        </div>
      )}
    </div>
  );
}

export default QuizPage;