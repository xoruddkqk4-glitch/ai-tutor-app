import { useState, useEffect } from 'react';
import { getQuestions } from '../lib/questions';
import { getStudents } from '../lib/students';
import { getRoomById, updateRoom, getRoomQuestionIds, createRoom } from '../lib/rooms';
import type { Room, Question } from '../types';
import { Save, Loader2, X } from 'lucide-react';

export default function RoomEditWindow() {
    const [room, setRoom] = useState<Room | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [classes, setClasses] = useState<string[]>([]);
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const params = new URLSearchParams(window.location.search);
            const roomId = params.get('id');

            // Load common data
            const [qList, sList] = await Promise.all([
                getQuestions(),
                getStudents()
            ]);

            setQuestions(qList);
            const uniqueClasses = Array.from(new Set(sList.map(s => s.class))).sort();
            setClasses(uniqueClasses);

            if (roomId) {
                // Edit Mode
                const [r, linkedQ] = await Promise.all([
                    getRoomById(Number(roomId)),
                    getRoomQuestionIds(Number(roomId))
                ]);
                setRoom(r);
                const currentClasses = r.className ? r.className.split(',').map(s => s.trim()) : [];
                setSelectedClasses(currentClasses);
                setSelectedQuestions(linkedQ);
            } else {
                // Create Mode
                setRoom({ id: 0, code: '', className: '', folderName: '', isActive: true, createdAt: '' });
            }

        } catch (error: any) {
            console.error(error);
            alert('데이터 로드 실패: ' + error.message);
            window.close();
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!room) return;
        try {
            if (room.id === 0) {
                // Create
                await createRoom(selectedClasses, selectedQuestions);
                alert('수업 방이 생성되었습니다.');
            } else {
                // Update
                await updateRoom(room.id, selectedClasses, selectedQuestions);
                alert('수업 방이 수정되었습니다.');
            }

            if (window.opener) {
                window.opener.postMessage('roomUpdated', '*');
            }
            window.close();
        } catch (e: any) {
            alert('저장 실패: ' + e.message);
        }
    };

    const toggleQuestionSelection = (id: number) => {
        setSelectedQuestions(prev =>
            prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
        );
    };

    const toggleClassSelection = (cls: string) => {
        setSelectedClasses(prev =>
            prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
        );
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Loader2 className="animate-spin" /> 로딩 중...
            </div>
        );
    }

    if (!room) return null;

    return (
        <div style={{ padding: '24px', background: 'white', minHeight: '100vh', fontFamily: "'Noto Sans KR', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #eee', paddingBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                    {room.id === 0 ? '새 수업 시작 (방 만들기)' : '수업 방 수정'}
                </h2>
                <button onClick={() => window.close()} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={24} />
                </button>
            </div>

            <div className="teacher-input-group" style={{ marginBottom: '24px' }}>
                <label className="teacher-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>학급 선택 ({selectedClasses.length}개 선택됨)</label>
                <div style={{
                    maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '8px', padding: '8px',
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px'
                }}>
                    {classes.map((cls, idx) => (
                        <div
                            key={idx}
                            onClick={() => toggleClassSelection(cls)}
                            style={{
                                padding: '8px', borderRadius: '6px', cursor: 'pointer',
                                border: selectedClasses.includes(cls) ? '1px solid #3b82f6' : '1px solid #eee',
                                background: selectedClasses.includes(cls) ? '#eff6ff' : 'white',
                                fontSize: '14px', textAlign: 'center', fontWeight: selectedClasses.includes(cls) ? 'bold' : 'normal',
                                color: selectedClasses.includes(cls) ? '#1e40af' : '#4b5563'
                            }}
                        >
                            {cls}
                        </div>
                    ))}
                </div>
            </div>

            <div className="teacher-input-group" style={{ marginBottom: '24px' }}>
                <label className="teacher-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>문항 선택 ({selectedQuestions.length}개 선택됨)</label>
                <div style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '10px', padding: '12px' }}>
                    {questions.map(q => (
                        <div
                            key={q.id}
                            onClick={() => toggleQuestionSelection(q.id)}
                            style={{
                                padding: '12px',
                                marginBottom: '8px',
                                borderRadius: '8px',
                                border: selectedQuestions.includes(q.id) ? '2px solid #3b82f6' : '1px solid #e5e5e5',
                                background: selectedQuestions.includes(q.id) ? '#eff6ff' : 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={selectedQuestions.includes(q.id)}
                                onChange={() => { }}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                                    <span className="teacher-badge teacher-badge-info" style={{
                                        display: 'inline-block', padding: '2px 8px', borderRadius: '999px',
                                        background: '#dbeafe', color: '#1e40af', fontSize: '12px', marginRight: '8px'
                                    }}>{q.examCode}</span>
                                    {q.topic}
                                </div>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                    {q.targetGrade} • {q.logicFlow}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                <button
                    onClick={() => window.close()}
                    style={{
                        padding: '10px 16px', borderRadius: '8px', border: 'none',
                        background: '#f5f5f5', color: '#666', fontWeight: 'bold', cursor: 'pointer'
                    }}
                >
                    취소
                </button>
                <button
                    onClick={handleSave}
                    style={{
                        padding: '10px 16px', borderRadius: '8px', border: 'none',
                        background: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                >
                    <Save size={18} /> {room.id === 0 ? '생성' : '수정'}
                </button>
            </div>
        </div>
    );
}
