import { BookOpen, FileText, LayoutDashboard, Users } from 'lucide-react';

interface WelcomeTabProps {
    onSelectTab: (tab: 'students' | 'materials' | 'dashboard') => void;
}

export default function WelcomeTab({ onSelectTab }: WelcomeTabProps) {
    return (
        <div className="teacher-content-wrapper" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            textAlign: 'center',
            padding: '40px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
            borderRadius: '24px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
        }}>
            <div style={{
                width: '100px',
                height: '100px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '32px',
                boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.3)',
                transform: 'rotate(-5deg)'
            }}>
                <BookOpen size={48} color="white" />
            </div>
            <h1 style={{
                fontSize: '42px',
                fontWeight: '850',
                color: '#1e293b',
                marginBottom: '20px',
                letterSpacing: '-0.025em',
                lineHeight: '1.2'
            }}>
                Welcome Back,<br />
                <span style={{ color: '#3b82f6' }}>AI Tutor</span>
            </h1>
            <p style={{
                fontSize: '19px',
                color: '#475569',
                maxWidth: '650px',
                lineHeight: '1.7',
                marginBottom: '48px',
                fontWeight: '400'
            }}>
                선생님을 위한 지능형 학습 보조 솔루션, AI Tutor 교사 페이지입니다.<br />
                왼쪽 메뉴를 통해 학습 자료를 관리하고 실시간 대시보드를 확인하세요.
            </p>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '24px',
                width: '100%',
                maxWidth: '850px'
            }}>
                <div
                    className="welcome-card"
                    style={{
                        padding: '32px 24px',
                        background: 'white',
                        borderRadius: '20px',
                        border: '1px solid #e2e8f0',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}
                    onClick={() => onSelectTab('students')}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <Users size={24} color="#ef4444" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>학생 명단 관리</h3>
                    <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>클래스별 학생 명단을 등록하고 개인별 학습 역량을 설정 및 관리합니다.</p>
                </div>
                <div
                    className="welcome-card"
                    style={{
                        padding: '32px 24px',
                        background: 'white',
                        borderRadius: '20px',
                        border: '1px solid #e2e8f0',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}
                    onClick={() => onSelectTab('materials')}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <FileText size={24} color="#3b82f6" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>학습 자료 관리</h3>
                    <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>지문 등록 및 논리 흐름 설정을 통해 AI 튜터의 지식 베이스를 구축합니다.</p>
                </div>
                <div
                    className="welcome-card"
                    style={{
                        padding: '32px 24px',
                        background: 'white',
                        borderRadius: '20px',
                        border: '1px solid #e2e8f0',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}
                    onClick={() => onSelectTab('dashboard')}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <LayoutDashboard size={24} color="#10b981" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>수업 대시보드</h3>
                    <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>수업 방을 생성하고 참여 학생들의 학습 현황을 실시간으로 모니터링합니다.</p>
                </div>
            </div>
            <style>{`
                .welcome-card:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    border-color: #3b82f6;
                }
            `}</style>
        </div>
    );
}
