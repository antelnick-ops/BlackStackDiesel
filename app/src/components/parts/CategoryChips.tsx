import { BG, BORDER, SURFACE, TEXT, TEXT_MUTED } from '@/lib/constants/colors';

interface CategoryChipsProps {
  categories: string[];
  active: string;
  onSelect: (c: string) => void;
}

export default function CategoryChips({ categories, active, onSelect }: CategoryChipsProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 px-4 pb-1">
        {categories.map((c) => {
          const isActive = active === c;
          return (
            <button
              key={c}
              onClick={() => onSelect(c)}
              className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap"
              style={
                isActive
                  ? { background: TEXT, color: BG, border: `1px solid ${TEXT}` }
                  : { background: SURFACE, color: TEXT_MUTED, border: `1px solid ${BORDER}` }
              }
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}
