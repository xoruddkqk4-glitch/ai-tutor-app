interface TagChipGroupProps {
    label: string;
    tags: readonly string[];
    category: 'primary' | 'secondary' | 'custom';
    activeTags: string[];
    counts?: Map<string, number>;
    onToggle: (tag: string) => void;
}

export default function TagChipGroup({
    label,
    tags,
    category,
    activeTags,
    counts,
    onToggle,
}: TagChipGroupProps) {
    return (
        <div className="teacher-tag-group-row">
            <span className="teacher-tag-group-label">{label}</span>
            <div className="teacher-tag-chip-list">
                {tags.map((tag) => {
                    const active = activeTags.includes(tag);
                    return (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => onToggle(tag)}
                            className={`teacher-tag-chip ${category} ${active ? 'active' : ''}`}
                        >
                            #{tag}
                            {counts ? (
                                <>
                                    {' '}
                                    <span className="teacher-tag-count">{counts.get(tag) ?? 0}</span>
                                </>
                            ) : null}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
