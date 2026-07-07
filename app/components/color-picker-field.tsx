'use client';

interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  description?: string;
}

function isValidHexInput(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

export function ColorPickerField({
  label,
  value,
  onChange,
  disabled = false,
  description,
}: ColorPickerFieldProps) {
  const handleTextChange = (raw: string) => {
    let v = raw.trim();
    if (v && !v.startsWith('#')) v = `#${v}`;
    if (isValidHexInput(v)) onChange(v.toLowerCase());
    else if (v === '' || v === '#') onChange(value);
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative shrink-0">
          <span
            className="block h-10 w-10 rounded-lg ring-1 ring-default-200"
            style={{ backgroundColor: value }}
          />
          <input
            type="color"
            value={value.length === 7 ? value : '#000000'}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value.toLowerCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            aria-label={`Pilih ${label}`}
          />
        </div>
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="#000000"
          className="min-w-0 flex-1 rounded-lg border border-default-200 bg-white px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        />
      </div>
      {description && <p className="text-xs text-default-400">{description}</p>}
    </div>
  );
}
