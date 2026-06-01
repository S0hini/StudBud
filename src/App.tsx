import { Outlet } from 'react-router-dom';
import { useAuthStore } from './lib/store';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { Spinner } from './components/Spinner'; // Import the Spinner component
export function AppLayout() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Sidebar />
      <main className={`pt-16 ${user ? 'md:pl-64' : ''} flex-1 flex flex-col`}>
        <div className="min-h-[calc(170vh-120px)] flex-1 pb-16">
          <Outlet />
        </div>
        <Footer />
      </main>
    </div>
  );
}

export default AppLayout;