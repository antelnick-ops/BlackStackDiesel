import { Search } from 'lucide-react';
import { BORDER, SURFACE, TEXT, TEXT_DIM } from '@/lib/constants/colors';

interface SearchBarProps {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value = '',
  onChange,
  placeholder = 'Search parts, brands, part #...',
}: SearchBarProps) {
  return (
    <div
      className="flex items-center gap-2 rounded-2xl px-4 py-3"
      style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
    >
      <Search size={18} style={{ color: TEXT_DIM }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm outline-none"
        style={{ color: TEXT }}
      />
    </div>
  );
}
