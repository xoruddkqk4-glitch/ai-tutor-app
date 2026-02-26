import { useState, useEffect } from 'react';
import StudentChatInterface from './pages/StudentChatInterface';
import TeacherAdminPage from './pages/TeacherAdminDashboard';
import RoomEditWindow from './pages/RoomEditWindow';
import { GraduationCap, School, Lock } from 'lucide-react';
import { supabase } from './lib/supabase';
import { updatePassword } from './lib/auth';

function App() {
  const [view, setView] = useState<'landing' | 'student' | 'teacher' | 'room-edit' | 'reset-password'>('landing');

  // 비밀번호 재설정 상태
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetDone, setResetDone] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('page') === 'room-edit') {
      setView('room-edit');
      return;
    }

    // Supabase가 비밀번호 재설정 링크 클릭 후 PASSWORD_RECOVERY 이벤트를 발생시킴
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('reset-password');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (newPassword.length < 6) {
      setResetError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setResetLoading(true);
    try {
      await updatePassword(newPassword);
      setResetDone(true);
    } catch (err: any) {
      setResetError('비밀번호 변경 실패: ' + (err.message || '다시 시도해주세요.'));
    } finally {
      setResetLoading(false);
    }
  };

  if (view === 'room-edit') {
    return <RoomEditWindow />;
  }

  if (view === 'reset-password') {
    return (
      <div className="landing-container">
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '48px 40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
          width: '100%',
          maxWidth: '420px',
          textAlign: 'center'
        }}>
          {/* 아이콘 */}
          <div style={{
            width: '72px', height: '72px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 8px 24px rgba(59,130,246,0.35)'
          }}>
            <Lock size={32} color="white" />
          </div>

          {resetDone ? (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>
                비밀번호 변경 완료!
              </h2>
              <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '32px' }}>
                새 비밀번호로 로그인하실 수 있습니다.
              </p>
              <button
                onClick={() => {
                  setView('teacher');
                  setNewPassword('');
                  setConfirmPassword('');
                  setResetDone(false);
                }}
                style={{
                  width: '100%', padding: '14px',
                  background: '#3b82f6', color: 'white',
                  border: 'none', borderRadius: '10px',
                  fontSize: '16px', fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                로그인 페이지로 이동
              </button>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                새 비밀번호 설정
              </h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '32px' }}>
                사용할 새 비밀번호를 입력해주세요.
              </p>
              <form onSubmit={handleUpdatePassword} style={{ textAlign: 'left' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                    새 비밀번호
                  </label>
                  <input
                    type="password"
                    placeholder="6자 이상 입력"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '12px 14px',
                      border: '1.5px solid #e5e7eb', borderRadius: '8px',
                      fontSize: '15px', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                    비밀번호 확인
                  </label>
                  <input
                    type="password"
                    placeholder="비밀번호 재입력"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '12px 14px',
                      border: '1.5px solid #e5e7eb', borderRadius: '8px',
                      fontSize: '15px', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
                {resetError && (
                  <div style={{
                    padding: '10px 14px', background: '#fef2f2',
                    border: '1px solid #fecaca', borderRadius: '8px',
                    color: '#dc2626', fontSize: '13px', marginBottom: '16px'
                  }}>
                    {resetError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={resetLoading}
                  style={{
                    width: '100%', padding: '14px',
                    background: resetLoading ? '#93c5fd' : '#3b82f6',
                    color: 'white', border: 'none', borderRadius: '10px',
                    fontSize: '16px', fontWeight: '600',
                    cursor: resetLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {resetLoading ? '변경 중...' : '비밀번호 변경'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
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

