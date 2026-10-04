import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigate, Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom';
import AppLayout from './App.tsx';
import { useAuthStore } from './lib/store';
import { LandingPage } from './pages/LandingPage';
import { NotesPage } from './pages/NotesPage';
import { LecturesPage } from './pages/LecturesPage';
import { FriendsPage } from './pages/FriendsPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { CreditsPage } from './pages/CreditsPage';
import { TutorPage } from './pages/TutorPage';
import { ProfilePage } from './pages/ProfilePage';
import QuizPage from './pages/QuizPage';
import { LoginPage } from './pages/LoginPage';
import { QuizBattlePage } from './pages/QuizBattlePage';
import 'katex/dist/katex.min.css';
import './index.css';

const ProtectedRoute = () => {
  const { user } = useAuthStore();
  return user ? <Outlet /> : <Navigate to="/login" />;
};

const LoginRoute = () => {
  const { user } = useAuthStore();
  return user ? <Navigate to="/notes" /> : <LoginPage />;
};

const router = createBrowserRouter(
  [
    {
      element: <AppLayout />,
      children: [
        { path: '/', element: <LandingPage /> },
        { path: '/login', element: <LoginRoute /> },
        {
          element: <ProtectedRoute />,
          children: [
            { path: '/notes', element: <NotesPage /> },
            { path: '/lectures', element: <LecturesPage /> },
            { path: '/tutor', element: <TutorPage /> },
            { path: '/friends', element: <FriendsPage /> },
            { path: '/leaderboard', element: <LeaderboardPage /> },
            { path: '/credits', element: <CreditsPage /> },
            { path: '/quiz', element: <QuizPage /> },
            { path: '/profile', element: <ProfilePage /> },
            { path: '/quiz-battle/:battleId', element: <QuizBattlePage /> }
          ]
        }
      ]
    }
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
