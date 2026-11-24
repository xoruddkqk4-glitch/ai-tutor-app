interface PresetOrCustomFieldProps {
    label: string;
    value: string;
    presets: readonly string[];
    customMode: boolean;
    placeholder: string;
    selectEmptyLabel: string;
    formatPresetLabel?: (preset: string) => string;
    normalizeValue: (raw: string) => string;
    onChangeValue: (val: string) => void;
    onToggleCustomMode: (custom: boolean) => void;
}

export default function PresetOrCustomField({
    label,
    value,
    presets,
    customMode,
    placeholder,
    selectEmptyLabel,
    formatPresetLabel,
    normalizeValue,
    onChangeValue,
    onToggleCustomMode,
}: PresetOrCustomFieldProps) {
    return (
        <div className="teacher-source-field">
            <span className="teacher-source-sublabel">{label}</span>
            {customMode ? (
                <div className="teacher-custom-input-wrap">
                    <input
                        type="text"
                        className="teacher-input-field"
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => onChangeValue(e.target.value)}
                    />
                    <button
                        type="button"
                        className="teacher-inline-switch-btn"
                        onClick={() => {
                            onToggleCustomMode(false);
                            if (value && !presets.includes(normalizeValue(value))) {
                                onChangeValue('');
                            }
                        }}
                    >
                        목록
                    </button>
                </div>
            ) : (
                <select
                    className="teacher-select"
                    value={value}
                    onChange={(e) => {
                        if (e.target.value === '__custom__') {
                            onToggleCustomMode(true);
                        } else {
                            onChangeValue(e.target.value);
                        }
                    }}
                >
                    <option value="">{selectEmptyLabel}</option>
                    {presets.map((preset) => (
                        <option key={preset} value={preset}>
                            {formatPresetLabel ? formatPresetLabel(preset) : preset}
                        </option>
                    ))}
                    <option value="__custom__">직접 입력...</option>
                </select>
            )}
        </div>
    );
}
