import { Edit, Pause, Play, Plus, Trash2 } from 'lucide-react';
import type { Room } from '../../types';

interface RoomsTabProps {
    rooms: Room[];
    onCreateRoom: () => void;
    onToggleRoomActive: (room: Room) => void;
    onEditRoom: (room: Room) => void;
    onDeleteRoom: (id: number) => void;
}

export default function RoomsTab({
    rooms,
    onCreateRoom,
    onToggleRoomActive,
    onEditRoom,
    onDeleteRoom,
}: RoomsTabProps) {
    return (
        <div className="teacher-content-wrapper">
            <div className="teacher-section-header">
                <h1 className="teacher-section-title">수업 대시보드</h1>
                <p className="teacher-section-subtitle">현재 진행 중인 수업 방을 관리하세요.</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <button onClick={onCreateRoom} className="teacher-button-primary">
                    <Plus size={20} /> 새 수업 시작 (방 만들기)
                </button>
            </div>

            {/* Room List */}
            {rooms.length === 0 ? (
                <div className="teacher-empty-state">
                    <Play className="teacher-empty-state-icon" />
                    <div className="teacher-empty-state-title">진행 중인 수업이 없습니다.</div>
                    <div className="teacher-empty-state-subtitle">새 수업 시작 버튼을 눌러 Room Code를 생성하세요.</div>
                </div>
            ) : (
                rooms.map((room) => (
                    <div key={room.id} className="teacher-room-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div
                                className="teacher-room-code"
                                style={{
                                    background: room.isActive ? undefined : '#f1f5f9',
                                    color: room.isActive ? undefined : '#64748b'
                                }}
                            >
                                {room.code}
                            </div>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#222', marginBottom: '4px' }}>
                                    {room.className}
                                </div>
                                <div style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                        width: '8px',
                                        height: '8px',
                                        background: room.isActive ? '#10b981' : '#f59e0b',
                                        borderRadius: '50%'
                                    }}></span>
                                    {room.isActive ? '수업 진행 중' : '일시 중지됨'} • {room.createdAt ? new Date(room.createdAt).toLocaleString('ko-KR') : '-'}
                                    {room.folderName && <span style={{ marginLeft: '8px', color: '#888' }}>({room.folderName})</span>}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => onToggleRoomActive(room)}
                                className="teacher-button-secondary"
                                style={{ padding: '8px 12px', fontSize: '12px' }}
                                title={room.isActive ? '일시 중지' : '수업 재개'}
                            >
                                {room.isActive ? <><Pause size={15} /> 일시중지</> : <><Play size={15} /> 재개</>}
                            </button>
                            <button
                                onClick={() => onEditRoom(room)}
                                className="teacher-button-secondary"
                                title="수정"
                            >
                                <Edit size={16} />
                            </button>
                            <button
                                onClick={() => onDeleteRoom(room.id)}
                                className="teacher-button-danger"
                                title="종료(삭제)"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
