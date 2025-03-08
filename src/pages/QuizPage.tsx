import React, { useState } from 'react';

const QuizPage = () => {
  const [course, setCourse] = useState('');
  const [topic, setTopic] = useState('');

  const courses = [
    'Database_and_Management_System',
    'Design_Analysis_And_Algorithm',
    'Formal_Language_And_Automata',
    'Introduction_to_AI',
    'Human_Values_And_Ethics',
    'Object_Oriented_Programming_Java',
  ];

  const topics: { [key: string]: string[] } = {
    Database_and_Management_System: ['RDBMS', 'Keys', 'ER Diagrams'],
    Design_Analysis_And_Algorithm: ['Pointers', 'Searching', 'Sorting', 'Tree'],
    Introduction_to_AI: ['Heuristic Algorithm', 'Machine Learning', 'Neural Networks', 'Deep Learning'],
    Formal_Language_And_Automata: ['Sequence Detector', 'Null Removal', 'Regular Expressions', 'Context-Free Grammars'],
    Object_Oriented_Programming_Java: ['Encapsulation', 'Inheritance', 'Polymorphism'],
    Human_Values_And_Ethics: ['Ethics', 'Human Values'],
  };

  const startQuiz = () => {
    console.log(`Starting quiz on ${topic}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Start Quiz</h1>
      <p className="mb-4">Total Score: 10</p>

      {/* Course Selection */}
      <div className="mb-4">
        <label htmlFor="course" className="block mb-2">Select Course:</label>
        <select
          id="course"
          value={course}
          onChange={(e) => {
            setCourse(e.target.value);
            setTopic(''); // Reset topic when course changes
          }}
          className="border rounded p-2 bg-black text-white"
        >
          <option value="">--Select a Course--</option>
          {courses.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Topic Selection */}
      {course && (
        <div className="mb-4">
          <label htmlFor="topic" className="block mb-2">Select Topic:</label>
          <select
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="border rounded p-2 bg-black text-white"
          >
            <option value="">--Select a Topic--</option>
            {topics[course].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      {/* Start Quiz Button */}
      {topic && (
        <button
          onClick={startQuiz}
          className="bg-purple-600 text-white rounded-lg p-2 transition-transform duration-200 hover:scale-105"
        >
          Start Quiz
        </button>
      )}
    </div>
  );
};

export default QuizPage;
