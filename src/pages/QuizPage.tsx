import { useState } from "react";
import { getQuizQuestions } from "../lib/quiz_gemini"; // Correct import path
import { db } from "../lib/firebase"; 
import { collection, addDoc } from "firebase/firestore";
import { Loader, CheckCircle, XCircle } from "lucide-react";

function QuizPage() {  // Change 'export function' to just 'function'
  const [course, setCourse] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("");
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showAnswers, setShowAnswers] = useState({});

  const startQuiz = async () => {
    if (!course || !topic || !level) {
      alert("Please fill all fields before starting the quiz.");
      return;
    }

    setLoading(true);
    setQuizData([]);
    setSelectedAnswers({});
    setShowAnswers({});

    try {
      const response = await getQuizQuestions(course, topic, level);
      setQuizData(response.questions);

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
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: selectedOption }));
    setShowAnswers((prev) => ({ ...prev, [questionIndex]: true }));
  };

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

      {quizData.length > 0 && (
        <div className="mt-8 space-y-6">
          {quizData.map((q, index) => (
            <div key={index} className="p-4 rounded-lg bg-gray-900 border border-gray-700">
              <h2 className="text-lg font-semibold">{q.question}</h2>

              <div className="mt-2 space-y-2">
                {q.options.map((option, optIndex) => (
                  <button
                    key={optIndex}
                    onClick={() => handleAnswerSelect(index, option)}
                    className={`w-full px-4 py-2 rounded-lg text-left border ${
                      selectedAnswers[index] === option
                        ? option === q.answer
                          ? "border-green-500 bg-green-900/30"
                          : "border-red-500 bg-red-900/30"
                        : "border-gray-700 hover:border-blue-500"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {showAnswers[index] && (
                <div className="flex items-center mt-3">
                  <p className="text-sm">
                    Correct Answer: <span className="font-semibold">{q.answer}</span>
                  </p>
                  {selectedAnswers[index] === q.answer ? (
                    <CheckCircle className="ml-2 text-green-500 w-6 h-6 animate-bounce" />
                  ) : (
                    <XCircle className="ml-2 text-red-500 w-6 h-6 animate-bounce" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default QuizPage;
