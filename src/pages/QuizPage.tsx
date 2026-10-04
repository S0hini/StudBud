import React, { useState, useEffect } from "react";
import { getQuizQuestions } from "../lib/quiz_gemini"; 
import { db } from "../lib/firebase"; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { 
  Loader, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  BookOpen, 
  Award, 
  Coins, 
  Sparkles,
  Trophy
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { formatMathExpressions } from '../lib/mathFormatter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';

interface Question {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export function QuizPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, credits, awardCredits } = useAuthStore();

  const [course, setCourse] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("Intermediate");
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState<Question[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [showAnswers, setShowAnswers] = useState<{ [key: number]: boolean }>({});
  const [quizStarted, setQuizStarted] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<{ [key: number]: boolean }>({});
  const [showExplanations, setShowExplanations] = useState<{ [key: number]: boolean }>({});
  const [recentEarnedPoints, setRecentEarnedPoints] = useState<number | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Quick Presets
  const popularPresets = [
    { course: "GATE CSE", topic: "Limits and Continuity", level: "Intermediate" },
    { course: "GATE CSE", topic: "Graph Theory & Trees", level: "Advanced" },
    { course: "Computer Science", topic: "Operating Systems Deadlock & Synchronization", level: "Intermediate" },
    { course: "Mathematics", topic: "Calculus Limits and Differentiation", level: "Beginner" },
    { course: "Computer Science", topic: "Data Structures & Binary Search Trees", level: "Intermediate" }
  ];

  useEffect(() => {
    if (location.state?.course) setCourse(location.state.course);
    if (location.state?.topic) setTopic(location.state.topic);
    if (location.state?.fromTutor || location.state?.fromLecture) {
      if (location.state.course && location.state.topic) {
        startQuiz(location.state.course, location.state.topic, level);
      }
    }
  }, [location.state]);

  const getPointsPerCorrect = () => {
    switch (level) {
      case "Beginner": return 1;
      case "Intermediate": return 2;
      case "Advanced": return 3;
      default: return 1;
    }
  };

  const startQuiz = async (overrideCourse?: string, overrideTopic?: string, overrideLevel?: string) => {
    const c = (overrideCourse || course).trim();
    const t = (overrideTopic || topic).trim();
    const l = overrideLevel || level || "Intermediate";

    if (!c || !t || !l) {
      alert("Please enter Course, Topic, and select a Difficulty Level.");
      return;
    }

    setLoading(true);
    setQuizData([]);
    setSelectedAnswers({});
    setShowAnswers({});
    setAnsweredQuestions({});
    setShowExplanations({});
    setQuizCompleted(false);
    setRecentEarnedPoints(null);
    setQuizStarted(true);

    try {
      const response = await getQuizQuestions(c, t, l);
      if (response && response.questions && Array.isArray(response.questions) && response.questions.length > 0) {
        const validated = response.questions.map((q) => ({
          ...q,
          explanation: q.explanation || `The correct answer is "${q.answer}". This is an essential concept in ${t}.`
        }));
        setQuizData(validated);
      } else {
        alert("Could not generate questions for this topic. Please try with different keywords.");
        setQuizStarted(false);
      }

      if (user) {
        await addDoc(collection(db, "quizzes"), {
          course: c,
          topic: t,
          level: l,
          userId: user.uid,
          timestamp: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Error starting quiz:", err);
      alert("Failed to load questions. Please check your network and API keys.");
      setQuizStarted(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = async (questionIndex: number, selectedOption: string) => {
    if (answeredQuestions[questionIndex]) return;

    const currentQuestion = quizData[questionIndex];
    if (!currentQuestion) return;

    const isCorrect = (selectedOption || '').trim().toLowerCase() === (currentQuestion.answer || '').trim().toLowerCase();

    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: selectedOption }));
    setShowAnswers((prev) => ({ ...prev, [questionIndex]: true }));
    setAnsweredQuestions((prev) => ({ ...prev, [questionIndex]: true }));

    // Award points and credits if correct
    if (isCorrect) {
      const pts = getPointsPerCorrect();
      setRecentEarnedPoints(pts);
      setTimeout(() => setRecentEarnedPoints(null), 2500);

      if (user) {
        await awardCredits(pts, false);
      }
    }

    // Check if all questions are now answered
    const nextAnsweredCount = Object.keys(answeredQuestions).length + 1;
    if (nextAnsweredCount === quizData.length) {
      setQuizCompleted(true);
      if (user) {
        await awardCredits(0, true); // increments totalQuizzesTaken
      }
    }
  };

  const toggleExplanation = (questionIndex: number) => {
    setShowExplanations((prev) => ({ ...prev, [questionIndex]: !prev[questionIndex] }));
  };

  const resetQuiz = () => {
    setSelectedAnswers({});
    setShowAnswers({});
    setAnsweredQuestions({});
    setShowExplanations({});
    setQuizCompleted(false);
  };

  const resetEntireQuiz = () => {
    setCourse("");
    setTopic("");
    setLevel("Intermediate");
    setQuizData([]);
    setSelectedAnswers({});
    setShowAnswers({});
    setAnsweredQuestions({});
    setShowExplanations({});
    setQuizStarted(false);
    setQuizCompleted(false);
  };

  const calculateScore = () => {
    if (quizData.length === 0) return { correct: 0, total: 0, percentage: 0, points: 0 };
    let correct = 0;
    let points = 0;
    const ptsPerCorrect = getPointsPerCorrect();

    Object.keys(selectedAnswers).forEach((idxStr) => {
      const idx = parseInt(idxStr, 10);
      const isCorrect = (selectedAnswers[idx] || '').trim().toLowerCase() === (quizData[idx]?.answer || '').trim().toLowerCase();
      if (isCorrect) {
        correct++;
        points += ptsPerCorrect;
      } else if (level === "Advanced") {
        points = Math.max(0, points - 1);
      }
    });

    const answered = Object.keys(selectedAnswers).length;
    const percentage = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    return { correct, total: answered, percentage, points };
  };

  const score = calculateScore();

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 max-w-5xl mx-auto">
      {/* Floating Earned Credits Toast */}
      <AnimatePresence>
        {recentEarnedPoints !== null && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="fixed top-6 right-6 z-50 bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-5 py-3 rounded-2xl font-bold shadow-2xl flex items-center space-x-2 border border-yellow-200"
          >
            <Coins className="w-6 h-6 animate-spin text-black" />
            <span className="text-sm sm:text-base">+{recentEarnedPoints} Credits Earned!</span>
            <Sparkles className="w-5 h-5 text-black" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#B3D8A8]/10 backdrop-blur-lg rounded-2xl p-6 sm:p-8 border border-[#B3D8A8]/30 mb-8 shadow-xl shadow-[#B3D8A8]/5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2.5 bg-[#B3D8A8]/20 rounded-xl border border-[#B3D8A8]/40">
                <Trophy className="w-6 h-6 text-[#B3D8A8]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-gray-100 to-[#B3D8A8] bg-clip-text text-transparent">
                AI Interactive Quiz & Credit Rewards
              </h1>
            </div>
            <p className="text-gray-400 text-sm max-w-xl">
              Test your mastery on any topic. Earn <span className="text-[#B3D8A8] font-semibold">+{getPointsPerCorrect()} credits</span> per correct answer and boost your global rank!
            </p>
          </div>

          {/* User Credits Balance Card */}
          <div 
            onClick={() => navigate('/credits')}
            className="cursor-pointer bg-black/60 hover:bg-black/80 border border-[#B3D8A8]/30 hover:border-[#B3D8A8]/60 p-3.5 rounded-2xl flex items-center space-x-3 transition-all group"
            title="View Credits Dashboard"
          >
            <div className="p-2 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
              <Coins className="w-5 h-5 text-yellow-400 group-hover:rotate-12 transition-transform" />
            </div>
            <div>
              <span className="text-xs text-gray-400 block font-medium">Your Credits</span>
              <span className="text-lg font-bold text-[#B3D8A8]">{credits}</span>
            </div>
          </div>
        </div>

        {/* Quiz Setup Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startQuiz();
          }}
          className="mt-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Course / Subject <span className="text-[#B3D8A8]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g., Mathematics, GATE CSE"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full pl-10 px-4 py-3 bg-black/60 border border-[#B3D8A8]/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#B3D8A8] focus:ring-1 focus:ring-[#B3D8A8] transition-all text-sm"
                  required
                />
                <BookOpen className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Topic / Chapter <span className="text-[#B3D8A8]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g., Limits & Continuity, Graph Theory"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full pl-10 px-4 py-3 bg-black/60 border border-[#B3D8A8]/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#B3D8A8] focus:ring-1 focus:ring-[#B3D8A8] transition-all text-sm"
                  required
                />
                <Zap className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Difficulty Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-4 py-3 bg-black/60 border border-[#B3D8A8]/30 rounded-xl text-white focus:outline-none focus:border-[#B3D8A8] focus:ring-1 focus:ring-[#B3D8A8] transition-all text-sm appearance-none"
              >
                <option value="Beginner" className="bg-gray-900 text-white">Beginner (+1 pt)</option>
                <option value="Intermediate" className="bg-gray-900 text-white">Intermediate (+2 pts)</option>
                <option value="Advanced" className="bg-gray-900 text-white">Advanced (+3 pts, -1 wrong)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !course.trim() || !topic.trim()}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-[#B3D8A8] to-[#82A878] hover:from-[#9bc790] hover:to-[#719667] text-black font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-[#B3D8A8]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin text-black" />
                <span>AI Generating 10 MCQs...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 text-black" />
                <span>Start Quiz & Earn Credits</span>
              </>
            )}
          </button>
        </form>

        {/* Preset Chips */}
        <div className="mt-5 pt-4 border-t border-[#B3D8A8]/20">
          <div className="flex items-center space-x-2 text-xs text-gray-400 mb-2 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#B3D8A8]" />
            <span>Popular Quizzes:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {popularPresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCourse(preset.course);
                  setTopic(preset.topic);
                  setLevel(preset.level);
                  startQuiz(preset.course, preset.topic, preset.level);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#B3D8A8]/20 border border-white/10 hover:border-[#B3D8A8]/40 text-gray-300 hover:text-white transition-all text-left"
              >
                <span className="text-[#B3D8A8] font-semibold">{preset.course}:</span> {preset.topic}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Quiz Progress & Questions Container */}
      {!loading && quizData.length > 0 && (
        <div className="space-y-6">
          {/* Status Bar */}
          <div className="bg-[#B3D8A8]/10 border border-[#B3D8A8]/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
            <div>
              <span className="text-xs font-semibold text-[#B3D8A8] uppercase tracking-wider block">
                Active Quiz ({level})
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {course}: <span className="text-gray-300 font-normal">{topic}</span>
              </h2>
            </div>

            <div className="flex items-center space-x-4 bg-black/60 px-5 py-2.5 rounded-xl border border-white/10">
              <div className="text-center">
                <span className="text-[10px] text-gray-400 uppercase block">Score</span>
                <span className="text-base font-bold text-green-400">{score.correct} / {quizData.length}</span>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div className="text-center">
                <span className="text-[10px] text-gray-400 uppercase block">Credits Won</span>
                <span className="text-base font-bold text-yellow-400">+{score.points}</span>
              </div>
            </div>
          </div>

          {/* Completion Card */}
          {quizCompleted && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-amber-500/20 via-[#B3D8A8]/20 to-black border-2 border-yellow-400/50 rounded-2xl p-6 text-center shadow-2xl"
            >
              <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2 animate-bounce" />
              <h3 className="text-2xl font-bold text-white mb-1">Quiz Completed! 🎉</h3>
              <p className="text-gray-300 text-sm max-w-md mx-auto mb-4">
                You scored <span className="text-yellow-400 font-bold">{score.correct}/{quizData.length} ({score.percentage}%)</span> and earned <span className="text-green-400 font-bold">+{score.points} Credits</span> added to your account!
              </p>
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => startQuiz()}
                  className="py-2.5 px-5 bg-[#B3D8A8] text-black font-bold rounded-xl text-sm hover:bg-[#9bc790] transition-colors"
                >
                  Generate New Quiz
                </button>
                <button
                  onClick={() => navigate('/credits')}
                  className="py-2.5 px-5 bg-white/10 text-white font-semibold rounded-xl text-sm border border-white/20 hover:bg-white/20 transition-colors"
                >
                  View Credits Dashboard
                </button>
              </div>
            </motion.div>
          )}

          {/* Question Cards */}
          <div className="space-y-6">
            {quizData.map((q, qIndex) => {
              const hasAnswered = !!answeredQuestions[qIndex];
              const userSelection = selectedAnswers[qIndex];
              const isCorrectAnswer = (userSelection || '').trim().toLowerCase() === (q.answer || '').trim().toLowerCase();

              return (
                <motion.div
                  key={qIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: qIndex * 0.05 }}
                  className="bg-[#B3D8A8]/5 border border-[#B3D8A8]/20 hover:border-[#B3D8A8]/40 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-lg"
                >
                  {/* Question Header */}
                  <div className="flex items-start space-x-3 mb-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-[#B3D8A8]/20 border border-[#B3D8A8]/40 text-[#B3D8A8] font-bold text-sm flex items-center justify-center">
                      {qIndex + 1}
                    </span>
                    <div className="flex-1 text-base sm:text-lg font-semibold text-white markdown-body prose prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false, throwOnError: false }]]}
                      >
                        {formatMathExpressions(q.question)}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {q.options.map((option, optIdx) => {
                      const isOptionSelected = userSelection === option;
                      const isOptionCorrect = (option || '').trim().toLowerCase() === (q.answer || '').trim().toLowerCase();

                      let btnStyle = "bg-black/40 border-white/10 hover:border-[#B3D8A8]/50 hover:bg-[#B3D8A8]/10 text-gray-200";

                      if (hasAnswered) {
                        if (isOptionCorrect) {
                          btnStyle = "bg-green-950/60 border-green-500 text-green-200 shadow-md shadow-green-500/20";
                        } else if (isOptionSelected && !isOptionCorrect) {
                          btnStyle = "bg-red-950/60 border-red-500 text-red-200 shadow-md shadow-red-500/20";
                        } else {
                          btnStyle = "bg-black/30 border-white/5 text-gray-500 opacity-60";
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={hasAnswered}
                          onClick={() => handleAnswerSelect(qIndex, option)}
                          className={`p-3.5 rounded-xl border text-left flex items-start space-x-3 transition-all ${btnStyle}`}
                        >
                          <span className="w-6 h-6 rounded-lg bg-white/10 flex-shrink-0 text-xs font-bold flex items-center justify-center">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <div className="flex-1 text-sm font-medium markdown-body prose prose-invert max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false, throwOnError: false }]]}
                            >
                              {formatMathExpressions(option)}
                            </ReactMarkdown>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation Toggle */}
                  {hasAnswered && (
                    <div className="mt-4 pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm">
                          {isCorrectAnswer ? (
                            <span className="text-green-400 font-semibold flex items-center">
                              <CheckCircle className="w-4 h-4 mr-1 text-green-400" />
                              Correct (+{getPointsPerCorrect()} Credits)
                            </span>
                          ) : (
                            <span className="text-red-400 font-semibold flex items-center">
                              <XCircle className="w-4 h-4 mr-1 text-red-400" />
                              Incorrect (Correct: {q.answer})
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => toggleExplanation(qIndex)}
                          className="text-xs text-gray-400 hover:text-[#B3D8A8] flex items-center space-x-1"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>{showExplanations[qIndex] ? "Hide" : "Show"} Explanation</span>
                          {showExplanations[qIndex] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* Explanation Content */}
                      <AnimatePresence>
                        {showExplanations[qIndex] && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 p-3.5 bg-black/60 rounded-xl border border-white/10 text-xs sm:text-sm text-gray-300 leading-relaxed"
                          >
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false, throwOnError: false }]]}
                            >
                              {formatMathExpressions(q.explanation)}
                            </ReactMarkdown>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap gap-3 pt-4">
            <button
              onClick={resetQuiz}
              className="py-3 px-5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-sm border border-white/15 transition-all flex items-center space-x-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Quiz</span>
            </button>
            <button
              onClick={() => startQuiz()}
              className="py-3 px-5 bg-gradient-to-r from-[#B3D8A8] to-[#82A878] text-black font-bold rounded-xl text-sm hover:opacity-90 transition-all flex items-center space-x-1.5 shadow-md"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>Generate New Questions</span>
            </button>
            <button
              onClick={resetEntireQuiz}
              className="py-3 px-5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl text-sm transition-all"
            >
              Change Topic
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizPage;