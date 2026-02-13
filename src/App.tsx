import { useState, useEffect } from 'react';
import StudentChatInterface from './pages/StudentChatInterface';
import TeacherAdminPage from './pages/TeacherAdminDashboard';
import RoomEditWindow from './pages/RoomEditWindow';
import { GraduationCap, School } from 'lucide-react';

function App() {
  const [view, setView] = useState<'landing' | 'student' | 'teacher' | 'room-edit'>('landing');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('page') === 'room-edit') {
      setView('room-edit');
    }
  }, []);

  if (view === 'room-edit') {
    return <RoomEditWindow />;
  }

  if (view === 'student') {
    return (
      <div style={{ background: '#e5e5e5', minHeight: '100vh' }}>

        <StudentChatInterface />
      </div>
    );
  }

  if (view === 'teacher') {
    return (
      <div style={{ background: '#e5e5e5', minHeight: '100vh' }}>
        <button
          onClick={() => setView('landing')}
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 50,
            background: 'rgba(255,255,255,0.9)',
            padding: '8px 12px',
            borderRadius: '999px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: 'none',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#666',
            cursor: 'pointer'
          }}
        >
          ← 뒤로가기
        </button>
        <TeacherAdminPage />
      </div>
    );
  }

  return (
    <div className="landing-container">
      <div className="landing-title">
        <div style={{ fontSize: '60px', marginBottom: '16px' }}>🏫</div>
        <h1>AI Tutor</h1>
        <p>역할을 선택하여 계속하세요</p>
      </div>

      <div className="landing-cards">
        <div className="landing-card" onClick={() => setView('teacher')}>
          <div className="landing-card-content">
            <div className="landing-card-icon" style={{ background: '#dbeafe' }}>
              <GraduationCap size={48} style={{ color: '#2563eb' }} />
            </div>
            <h2>선생님용</h2>
            <p>
              수업을 개설하고<br />학습 현황을 관리하세요
            </p>
          </div>
        </div>

        <div className="landing-card" onClick={() => setView('student')}>
          <div className="landing-card-content">
            <div className="landing-card-icon" style={{ background: '#fef3c7' }}>
              <School size={48} style={{ color: '#ca8a04' }} />
            </div>
            <h2>학생용</h2>
            <p>
              AI 튜터와 함께<br />맞춤형 학습을 시작하세요
            </p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '40px', fontSize: '12px', textAlign: 'center' }}>
        <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: '#9ca3af', textDecoration: 'none' }}>
          개인정보처리방침
        </a>
      </div>
    </div>
  );
}

export default App;
