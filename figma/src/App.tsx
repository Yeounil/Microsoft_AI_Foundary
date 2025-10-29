import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { Dashboard } from './components/Dashboard';

type Page = 'landing' | 'login' | 'register' | 'dashboard';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [username, setUsername] = useState<string>('');

  const handleGetStarted = () => {
    setCurrentPage('login');
  };

  const handleLogin = (user: string) => {
    setUsername(user);
    setCurrentPage('dashboard');
  };

  const handleRegister = (user: string) => {
    setUsername(user);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUsername('');
    setCurrentPage('landing');
  };

  const handleSwitchToLogin = () => {
    setCurrentPage('login');
  };

  const handleSwitchToRegister = () => {
    setCurrentPage('register');
  };

  return (
    <>
      {currentPage === 'landing' && (
        <LandingPage onGetStarted={handleGetStarted} />
      )}
      {currentPage === 'login' && (
        <LoginPage 
          onLogin={handleLogin} 
          onSwitchToRegister={handleSwitchToRegister}
        />
      )}
      {currentPage === 'register' && (
        <RegisterPage 
          onRegister={handleRegister}
          onSwitchToLogin={handleSwitchToLogin}
        />
      )}
      {currentPage === 'dashboard' && (
        <Dashboard 
          username={username}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}
