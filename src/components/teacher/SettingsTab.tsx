import { Save } from 'lucide-react';
import type { TeacherRecord } from '../../lib/settings';

interface SettingsTabProps {
    teacherRole: 'master' | 'regular';
    apiKey: string;
    onChangeApiKey: (value: string) => void;
    systemPrompt: string;
    onChangeSystemPrompt: (value: string) => void;
    driveFolderId: string;
    onChangeDriveFolderId: (value: string) => void;
    googleScriptUrl: string;
    onChangeGoogleScriptUrl: (value: string) => void;
    limitInput: string;
    onChangeLimitInput: (value: string) => void;
    loginNoticeText: string;
    onChangeLoginNoticeText: (value: string) => void;
    maxQuestionsLimit: number;
    teacherList: TeacherRecord[];
    teacherLimitDrafts: Record<string, string>;
    onChangeTeacherLimitDraft: (teacherId: string, value: string) => void;
    onClearTeacherLimitDraft: (teacherId: string) => void;
    onSaveSettings: () => void;
    onUpdateTeacherLimit: (teacher: TeacherRecord, value: string) => void;
    onToggleTeacherActive: (teacher: TeacherRecord) => void;
    onDeleteTeacher: (teacher: TeacherRecord) => void;
}

export default function SettingsTab({
    teacherRole,
    apiKey,
    onChangeApiKey,
    systemPrompt,
    onChangeSystemPrompt,
    driveFolderId,
    onChangeDriveFolderId,
    googleScriptUrl,
    onChangeGoogleScriptUrl,
    limitInput,
    onChangeLimitInput,
    loginNoticeText,
    onChangeLoginNoticeText,
    maxQuestionsLimit,
    teacherList,
    teacherLimitDrafts,
    onChangeTeacherLimitDraft,
    onClearTeacherLimitDraft,
    onSaveSettings,
    onUpdateTeacherLimit,
    onToggleTeacherActive,
    onDeleteTeacher,
}: SettingsTabProps) {
    return (
        <div className="teacher-content-wrapper">
            <div className="teacher-section-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '24px'
            }}>
                <div>
                    <h1 className="teacher-section-title">설정</h1>
                    <p className="teacher-section-subtitle">시스템 설정을 관리하세요.</p>
                </div>
                <button onClick={onSaveSettings} className="teacher-button-primary">
                    <Save size={18} /> 설정 저장
                </button>
            </div>


            {/* Master Config Section */}
            {teacherRole === 'master' && (
                <>
                    <div className="teacher-content-card" style={{ border: '2px solid #3b82f6', background: '#eff6ff' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#1e40af' }}>
                            🛠️ 시스템 설정 (관리자 전용)
                        </h3>
                        <div className="teacher-input-group">
                            <label className="teacher-input-label">일반 교사 문항 등록 제한 수</label>
                            <input
                                type="number"
                                className="teacher-input-field"
                                value={limitInput}
                                onChange={e => onChangeLimitInput(e.target.value)}
                                placeholder="50"
                            />
                            <div className="teacher-alert-info">
                                모든 일반 교사에게 적용되는 문항 등록 최대 개수입니다.
                            </div>
                        </div>

                        <div className="teacher-input-group" style={{ marginTop: '20px' }}>
                            <label className="teacher-input-label">로그인 페이지 안내 문구</label>
                            <textarea
                                className="teacher-textarea"
                                rows={5}
                                value={loginNoticeText}
                                onChange={e => onChangeLoginNoticeText(e.target.value)}
                                placeholder="안내 문구를 입력하세요. {limit}를 입력하면 '일반 교사 문항 등록 제한 수'로 자동 변환됩니다."
                                style={{ lineHeight: '1.6' }}
                            />
                            <div className="teacher-alert-info" style={{ marginTop: '8px' }}>
                                줄바꿈(Enter) 시 번호 매기기 목록(1, 2, 3...)으로 표시됩니다.
                                <br />문구 내에 <strong>{`{limit}`}</strong>를 입력하면 위의 '문항 등록 제한 수' 값으로 자동 치환됩니다.
                                <br />이메일 주소를 입력하면 자동으로 이메일 보내기 링크가 생성됩니다.
                            </div>
                        </div>
                    </div>

                    {/* Teacher Management Table */}
                    <div className="teacher-content-card" style={{ border: '2px solid #3b82f6', background: '#eff6ff' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#1e40af' }}>
                            👥 교사 회원 관리
                        </h3>
                        {teacherList.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#6b7280', padding: '24px' }}>
                                등록된 일반 교사가 없습니다.
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ background: '#dbeafe', borderBottom: '2px solid #93c5fd' }}>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#1e40af', width: '30%' }}>이메일</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#1e40af', width: '15%' }}>상태</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#1e40af', width: '25%' }}>문항 제한수</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#1e40af', width: '30%' }}>관리</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teacherList.map((t) => (
                                            <tr key={t.id} style={{ borderBottom: '1px solid #e5e7eb', background: t.is_active ? 'white' : '#fef2f2' }}>
                                                <td style={{ padding: '10px 12px', color: t.is_active ? '#222' : '#9ca3af' }}>
                                                    {t.email}
                                                    {!t.is_active && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#ef4444' }}>(중지됨)</span>}
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        padding: '2px 10px',
                                                        borderRadius: '12px',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        background: t.is_active ? '#dcfce7' : '#fee2e2',
                                                        color: t.is_active ? '#166534' : '#991b1b'
                                                    }}>
                                                        {t.is_active ? '✅ 활성' : '⛔ 중지'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step={1}
                                                            style={{
                                                                width: '70px',
                                                                padding: '4px 8px',
                                                                border: '1px solid #d1d5db',
                                                                borderRadius: '6px',
                                                                textAlign: 'center',
                                                                fontSize: '13px'
                                                            }}
                                                            value={teacherLimitDrafts[t.id] ?? String(t.max_questions ?? maxQuestionsLimit)}
                                                            onChange={(e) => onChangeTeacherLimitDraft(t.id, e.target.value)}
                                                            onBlur={() => {
                                                                if (!(t.id in teacherLimitDrafts)) return;
                                                                const raw = teacherLimitDrafts[t.id].trim();
                                                                if (raw === '') {
                                                                    if (t.max_questions !== null) {
                                                                        onUpdateTeacherLimit(t, '');
                                                                    } else {
                                                                        onClearTeacherLimitDraft(t.id);
                                                                    }
                                                                    return;
                                                                }
                                                                if (!/^\d+$/.test(raw)) {
                                                                    alert('개별 문항 제한수는 0 이상의 정수로 입력해주세요.');
                                                                    onClearTeacherLimitDraft(t.id);
                                                                    return;
                                                                }
                                                                if (Number(raw) !== t.max_questions) {
                                                                    onUpdateTeacherLimit(t, raw);
                                                                } else {
                                                                    onClearTeacherLimitDraft(t.id);
                                                                }
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    (e.target as HTMLInputElement).blur();
                                                                }
                                                            }}
                                                        />
                                                        {t.max_questions === null && (
                                                            <span style={{ fontSize: '11px', color: '#6b7280', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>기본값</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                        <button
                                                            onClick={() => onToggleTeacherActive(t)}
                                                            style={{
                                                                padding: '4px 12px',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '12px',
                                                                fontWeight: '500',
                                                                cursor: 'pointer',
                                                                background: t.is_active ? '#fef3c7' : '#dcfce7',
                                                                color: t.is_active ? '#92400e' : '#166534',
                                                                transition: 'all 0.2s',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {t.is_active ? '🚫 중지' : '✅ 활성화'}
                                                        </button>
                                                        <button
                                                            onClick={() => onDeleteTeacher(t)}
                                                            style={{
                                                                padding: '4px 12px',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '12px',
                                                                fontWeight: '500',
                                                                cursor: 'pointer',
                                                                background: '#fee2e2',
                                                                color: '#991b1b',
                                                                transition: 'all 0.2s',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            🗑️ 삭제
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* API Key */}
            <div className="teacher-content-card">
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
                    🔑 OpenAI API 키 (필수 사항)
                </h3>
                <div className="teacher-input-group">
                    <label className="teacher-input-label">API 키</label>
                    <input
                        type="password"
                        className="teacher-input-field"
                        placeholder="sk-..."
                        value={apiKey}
                        onChange={e => onChangeApiKey(e.target.value)}
                    />
                    <div className="teacher-alert-info">
                        🔒 API 키는 교사 본인 계정에 안전하게 저장되며, 서버 프록시(Edge Function) 모드 사용 시 학생 브라우저로 노출되지 않습니다.
                    </div>
                </div>
            </div>

            {/* Google Drive Integration */}
            <div className="teacher-content-card" style={{ opacity: teacherRole === 'master' ? 1 : 0.6 }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>📁 구글 드라이브 연동 (선택 사항)</span>
                    {teacherRole !== 'master' && (
                        <span style={{ fontSize: '12px', background: '#e2e8f0', color: '#64748b', padding: '2px 8px', borderRadius: '12px', fontWeight: 'normal' }}>준비 중</span>
                    )}
                </h3>

                <div className="teacher-input-group">
                    <label className="teacher-input-label">Google Apps Script URL (웹 앱 URL)</label>
                    <input
                        type="text"
                        className="teacher-input-field"
                        placeholder="https://script.google.com/macros/s/.../exec"
                        value={googleScriptUrl}
                        onChange={e => onChangeGoogleScriptUrl(e.target.value)}
                        disabled={teacherRole !== 'master'}
                        style={{ cursor: teacherRole !== 'master' ? 'not-allowed' : 'text', background: teacherRole !== 'master' ? '#f1f5f9' : 'white' }}
                    />
                    <div className="teacher-alert-info">
                        대화 내용을 구글 드라이브에 저장하려면, 본인 구글 계정으로 Apps Script를 생성하고 웹 앱으로 배포한 URL을 입력하세요.
                    </div>
                </div>

                <div className="teacher-input-group">
                    <label className="teacher-input-label">구글 드라이브 폴더 ID</label>
                    <input
                        type="text"
                        className="teacher-input-field"
                        placeholder="1AbC2DeF3GhI4JkL5MnO6PqR7StU8VwX9YzA"
                        value={driveFolderId}
                        onChange={e => onChangeDriveFolderId(e.target.value)}
                        disabled={teacherRole !== 'master'}
                        style={{ cursor: teacherRole !== 'master' ? 'not-allowed' : 'text', background: teacherRole !== 'master' ? '#f1f5f9' : 'white' }}
                    />
                    <div className="teacher-alert-info">
                        대화 내용이 저장될 폴더의 ID입니다. (URL의 folders/ 뒷부분)
                    </div>
                </div>

                {teacherRole !== 'master' && (
                    <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
                        💡 일반 교사분들을 위한 <strong>구글 드라이브 간편 연동 기능</strong>이 곧 지원될 예정입니다.
                    </div>
                )}
            </div>

            {/* System Prompt */}
            <div className="teacher-content-card">
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
                    AI 기본 시스템 프롬프트 (Persona)
                </h3>
                <div className="teacher-input-group">
                    <label className="teacher-input-label">시스템 프롬프트</label>
                    <textarea
                        rows={4}
                        className="teacher-textarea"
                        value={systemPrompt || ''}
                        onChange={e => onChangeSystemPrompt(e.target.value)}
                    />
                    <div className="teacher-alert-info">
                        모든 대화에 기본적으로 적용되는 AI의 성격입니다.
                    </div>
                </div>
            </div>


        </div>
    );
}
