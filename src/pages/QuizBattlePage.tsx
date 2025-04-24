import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../lib/store';
import { Loader, Check, X, Clock, Award, Swords, RefreshCcw, ArrowRight } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface Participant {
  id: string;
  name: string;
  photoURL: string;
}

interface Battle {
  id: string;
  status: 'pending' | 'active' | 'completed';
  challenger: Participant;
  opponent: Participant;
  scores: {
    [key: string]: number;
  };
  questions?: Question[];
  startTime?: any;
  endTime?: any;
}

export function QuizBattlePage() {
  const { battleId } = useParams();
  const { user } = useAuthStore();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerStatus, setAnswerStatus] = useState<'correct' | 'incorrect' | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [myResults, setMyResults] = useState<{correct: number, total: number}>({ correct: 0, total: 0 });
  const [opponentResults, setOpponentResults] = useState<{correct: number, total: number}>({ correct: 0, total: 0 });
  const navigate = useNavigate();

  const isChallenger = battle?.challenger.id === user?.uid;
  const isOpponent = battle?.opponent.id === user?.uid;
  const otherPerson = isChallenger ? battle?.opponent : battle?.challenger;
  const amIWaiting = battle?.status === 'pending' && isOpponent;
  const isBattleComplete = battle?.status === 'completed';
  const questions = battle?.questions || [];

  // Listen for battle updates
  useEffect(() => {
    if (!battleId || !user) return;
    
    const battleRef = doc(db, 'battles', battleId);
    const unsubscribe = onSnapshot(battleRef, (docSnap) => {
      if (docSnap.exists()) {
        const battleData = { id: docSnap.id, ...docSnap.data() } as Battle;
        setBattle(battleData);
        
        // If battle became active, set up timer
        if (battleData.status === 'active' && battleData.startTime) {
          const startTime = battleData.startTime.toDate();
          const duration = 5 * 60 * 1000; // 5 minutes in ms
          const endTime = new Date(startTime.getTime() + duration);
          const now = new Date();
          
          const remainingTime = Math.max(0, endTime.getTime() - now.getTime());
          setTimeLeft(Math.floor(remainingTime / 1000));
        }
      } else {
        navigate('/friends');
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [battleId, user, navigate]);
  
  // Timer countdown
  useEffect(() => {
    if (battle?.status !== 'active' || timeLeft === null) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleQuizCompletion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, battle?.status]);

  const acceptChallenge = async () => {
    if (!battleId || !user || !battle) return;
    
    try {
      setLoading(true);
      
      // Fetch quiz questions
      const questionsQuery = query(collection(db, 'quizQuestions'), where('difficulty', '==', 'medium'));
      const snapshot = await getDocs(questionsQuery);
      
      if (snapshot.empty) {
        console.error('No questions found!');
        return;
      }
      
      // Select 10 random questions
      const allQuestions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Question));
      
      const randomQuestions = [...allQuestions]
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);
      
      // Update the battle
      const battleRef = doc(db, 'battles', battleId);
      await updateDoc(battleRef, {
        status: 'active',
        questions: randomQuestions,
        startTime: new Date(),
      });
      
      // Set the time limit (5 minutes)
      setTimeLeft(5 * 60);
    } catch (error) {
      console.error('Error starting battle:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (optionIndex: number) => {
    if (answerStatus !== null) return; // Already answered
    
    setSelectedAnswer(optionIndex);
    
    const currentQ = questions[currentQuestion];
    const isCorrect = optionIndex === currentQ.correctAnswer;
    setAnswerStatus(isCorrect ? 'correct' : 'incorrect');
    
    if (isCorrect) {
      setMyResults(prev => ({ ...prev, correct: prev.correct + 1 }));
    }
    
    // Wait a moment before moving to next question
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
        setAnswerStatus(null);
      } else {
        handleQuizCompletion();
      }
    }, 1500);
  };

  const handleQuizCompletion = async () => {
    if (!battleId || !user?.uid || !battle) return;
    
    try {
      // Calculate final score
      const score = myResults.correct;
      
      // Update the battle with user's score
      const battleRef = doc(db, 'battles', battleId);
      await updateDoc(battleRef, {
        [`scores.${user.uid}`]: score,
        status: 'completed',
        endTime: new Date()
      });
      
      // Navigate to results
      setMyResults(prev => ({ ...prev, total: questions.length }));
    } catch (error) {
      console.error('Error completing quiz:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const determineWinner = () => {
    if (!battle) return null;
    
    const myScore = battle.scores[user!.uid] || 0;
    const opponentScore = battle.scores[otherPerson?.id || ''] || 0;
    
    if (myScore > opponentScore) return 'You win!';
    if (myScore < opponentScore) return `${otherPerson?.name} wins!`;
    return "It's a tie!";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Battle not found or you don't have access to it.</p>
        <button
          onClick={() => navigate('/friends')}
          className="mt-4 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
        >
          Return to Friends
        </button>
      </div>
    );
  }

  // Waiting for opponent to accept
  if (battle.status === 'pending') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card-gradient rounded-xl p-8">
          <div className="flex justify-center items-center mb-8">
            <div className="text-center">
              <img 
                src={battle.challenger.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(battle.challenger.name)}&background=random`}
                alt={battle.challenger.name}
                className="w-16 h-16 rounded-full mx-auto mb-2"
              />
              <p className="font-medium">{battle.challenger.name}</p>
              <p className="text-xs text-gray-400">Challenger</p>
            </div>
            
            <div className="mx-6 flex flex-col items-center">
              <Swords className="w-8 h-8 text-orange-500 mb-2" />
              <div className="text-xs text-gray-400">VS</div>
            </div>
            
            <div className="text-center">
              <img 
                src={battle.opponent.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(battle.opponent.name)}&background=random`}
                alt={battle.opponent.name}
                className="w-16 h-16 rounded-full mx-auto mb-2"
              />
              <p className="font-medium">{battle.opponent.name}</p>
              <p className="text-xs text-gray-400">Opponent</p>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center mb-6">Quiz Battle Challenge</h1>
          
          {amIWaiting ? (
            <>
              <p className="text-center text-gray-300 mb-6">
                {battle.challenger.name} has challenged you to a quiz battle!
              </p>
              <div className="text-center">
                <button
                  onClick={acceptChallenge}
                  className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                >
                  Accept Challenge
                </button>
                <button
                  onClick={() => navigate('/friends')}
                  className="ml-4 px-6 py-3 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  Decline
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-center text-gray-300 mb-6">
                Waiting for {battle.opponent.name} to accept your challenge...
              </p>
              <div className="flex justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full"></div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Battle is completed - show results
  if (battle.status === 'completed') {
    const myScore = battle.scores[user!.uid] || 0;
    const opponentScore = battle.scores[otherPerson?.id || ''] || 0;
    const winner = determineWinner();
    
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card-gradient rounded-xl p-8">
          <h1 className="text-2xl font-bold text-center mb-8">Quiz Battle Results</h1>
          
          <div className="flex justify-around items-center mb-10">
            <div className="text-center">
              <img 
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || '')}&background=random`}
                alt="You"
                className="w-16 h-16 rounded-full mx-auto mb-2"
              />
              <p className="font-medium">You</p>
              <div className="text-3xl font-bold text-purple-400 mt-2">{myScore}</div>
              <p className="text-xs text-gray-400">points</p>
            </div>
            
            <div className="mx-6">
              <Award className={`w-12 h-12 ${
                winner === "You win!" ? "text-yellow-500" : 
                winner === "It's a tie!" ? "text-blue-500" : "text-gray-500"
              }`} />
            </div>
            
            <div className="text-center">
              <img 
                src={otherPerson?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherPerson?.name || '')}&background=random`}
                alt={otherPerson?.name}
                className="w-16 h-16 rounded-full mx-auto mb-2"
              />
              <p className="font-medium">{otherPerson?.name}</p>
              <div className="text-3xl font-bold text-purple-400 mt-2">{opponentScore}</div>
              <p className="text-xs text-gray-400">points</p>
            </div>
          </div>
          
          <div className="text-center mb-8">
            <div className="text-2xl font-bold mb-2 text-yellow-500">{winner}</div>
            <p className="text-gray-400">
              {Math.max(myScore, opponentScore)} / {questions.length} correct answers
            </p>
          </div>
          
          <div className="text-center">
            <button
              onClick={() => navigate('/friends')}
              className="px-6 py-3 bg-purple-500/20 text-purple-400 rounded-lg font-medium hover:bg-purple-500/30 transition-colors mr-4"
            >
              Back to Friends
            </button>
            <button
              onClick={() => {/* Logic for rematch */}}
              className="px-6 py-3 bg-orange-500/20 text-orange-500 rounded-lg font-medium hover:bg-orange-500/30 transition-colors"
            >
              <RefreshCcw className="w-4 h-4 inline-block mr-2" />
              Rematch
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active battle - quiz interface
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="card-gradient rounded-xl p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <img 
              src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || '')}&background=random`}
              alt="Your avatar"
              className="w-10 h-10 rounded-full mr-3"
            />
            <div>
              <p className="font-medium">You</p>
              <p className="text-xs text-gray-400">{myResults.correct} correct</p>
            </div>
          </div>
          
          <div className="flex items-center px-4 py-2 bg-gray-800/50 rounded-full">
            <Clock className="w-4 h-4 mr-2 text-orange-500" />
            <span className={timeLeft && timeLeft < 30 ? "text-red-500 font-medium" : "text-gray-300"}>
              {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
            </span>
          </div>
          
          <div className="flex items-center">
            <div className="text-right mr-3">
              <p className="font-medium">{otherPerson?.name}</p>
              <p className="text-xs text-gray-400">Answering...</p>
            </div>
            <img 
              src={otherPerson?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherPerson?.name || '')}&background=random`}
              alt="Opponent avatar"
              className="w-10 h-10 rounded-full"
            />
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-800 rounded-full h-2 mb-6">
          <div 
            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
        
        {/* Question */}
        {questions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm text-gray-400 mb-2">
              Question {currentQuestion + 1} of {questions.length}
            </h3>
            <h2 className="text-xl font-semibold mb-6">
              {questions[currentQuestion].question}
            </h2>
            
            {/* Options */}
            <div className="space-y-3">
              {questions[currentQuestion].options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={answerStatus !== null}
                  className={`w-full text-left p-4 rounded-lg transition-all ${
                    selectedAnswer === index
                      ? answerStatus === 'correct'
                        ? 'bg-green-500/20 border border-green-500'
                        : 'bg-red-500/20 border border-red-500'
                      : 'bg-gray-800/50 hover:bg-gray-800/80 border border-gray-700'
                  } ${answerStatus !== null && index === questions[currentQuestion].correctAnswer 
                      ? 'border border-green-500 bg-green-500/10'
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{option}</span>
                    {selectedAnswer === index && answerStatus === 'correct' && (
                      <Check className="w-5 h-5 text-green-500" />
                    )}
                    {selectedAnswer === index && answerStatus === 'incorrect' && (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                    {answerStatus !== null && index === questions[currentQuestion].correctAnswer && 
                     selectedAnswer !== index && (
                      <Check className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Next button (visible only when answered) */}
        {answerStatus !== null && currentQuestion < questions.length - 1 && (
          <div className="text-right mt-4">
            <button
              onClick={() => {
                setCurrentQuestion(prev => prev + 1);
                setSelectedAnswer(null);
                setAnswerStatus(null);
              }}
              className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
            >
              Next Question
              <ArrowRight className="w-4 h-4 inline-block ml-2" />
            </button>
          </div>
        )}
        
        {/* Finish button (visible on last question when answered) */}
        {answerStatus !== null && currentQuestion === questions.length - 1 && (
          <div className="text-right mt-4">
            <button
              onClick={handleQuizCompletion}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Finish Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}