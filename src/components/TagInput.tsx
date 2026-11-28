import React, { useMemo, useRef, useState } from 'react';
import { Hash, Plus, X } from 'lucide-react';
import { normalizeTag } from '../utils/ganttEngine';

const TAG_PALETTE = [
  'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
  'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
  'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800',
  'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
  'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
];

export function getTagBadgeClass(tag: string): string {
  const norm = normalizeTag(tag).toLowerCase();
  if (norm === 'urgente' || norm === 'bloqueado' || norm === 'critico' || norm === 'crítico') {
    return TAG_PALETTE[3]; // rose
  }
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash * 31 + norm.charCodeAt(i)) >>> 0;
  }
  return TAG_PALETTE[hash % TAG_PALETTE.length];
}

export interface TagInputProps {
  tags: string[];
  allTags?: string[];
  onChange: (nextTags: string[]) => void;
  placeholder?: string;
  compact?: boolean;
  readOnly?: boolean;
  testIdPrefix?: string;
  extraReadOnlyTags?: string[];
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  allTags = [],
  onChange,
  placeholder = '+ etiqueta...',
  compact = false,
  readOnly = false,
  testIdPrefix = 'tag-input',
  extraReadOnlyTags = [],
}) => {
  const [draft, setDraft] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedSet = useMemo(
    () => new Set(tags.map((t) => normalizeTag(t).toLowerCase())),
    [tags]
  );

  const suggestions = useMemo(() => {
    const q = normalizeTag(draft).toLowerCase();
    return allTags
      .filter((t) => {
        const key = normalizeTag(t).toLowerCase();
        if (normalizedSet.has(key)) return false;
        if (!q) return true;
        return key.includes(q);
      })
      .slice(0, 8);
  }, [allTags, draft, normalizedSet]);

  const addTag = (raw: string) => {
    const norm = normalizeTag(raw);
    if (!norm) return;
    if (normalizedSet.has(norm.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...tags, norm]);
    setDraft('');
  };

  const removeTag = (tagToRemove: string) => {
    const key = normalizeTag(tagToRemove).toLowerCase();
    onChange(tags.filter((t) => normalizeTag(t).toLowerCase() !== key));
  };

  const cleanDraft = normalizeTag(draft);
  const canCreateNew =
    Boolean(cleanDraft) &&
    !normalizedSet.has(cleanDraft.toLowerCase()) &&
    !suggestions.some((s) => normalizeTag(s).toLowerCase() === cleanDraft.toLowerCase());

  const inheritedOnlyTags = useMemo(
    () =>
      extraReadOnlyTags.filter(
        (t) => !normalizedSet.has(normalizeTag(t).toLowerCase())
      ),
    [extraReadOnlyTags, normalizedSet]
  );

  return (
    <div
      data-testid={`${testIdPrefix}-container`}
      className="relative"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`flex flex-wrap items-center gap-1 rounded-[4px] ${
          compact
            ? 'min-h-[24px]'
            : 'px-2 py-1.5 border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 focus-within:border-indigo-500'
        }`}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            data-testid={`${testIdPrefix}-pill-${tag}`}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border font-mono text-[10px] font-semibold leading-none ${getTagBadgeClass(
              tag
            )}`}
          >
            <span>{`#${tag}`}</span>
            {!readOnly && (
              <button
                type="button"
                data-testid={`${testIdPrefix}-remove-${tag}`}
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 cursor-pointer"
                title={`Quitar #${tag}`}
                aria-label={`Quitar etiqueta ${tag}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </span>
        ))}

        {inheritedOnlyTags.map((tag) => (
          <span
            key={`sub-${tag}`}
            data-testid={`${testIdPrefix}-rollup-pill-${tag}`}
            title="Etiqueta procedente de subtarea"
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-dashed font-mono text-[10px] font-medium opacity-80 leading-none ${getTagBadgeClass(
              tag
            )}`}
          >
            <span>{`↳ #${tag}`}</span>
          </span>
        ))}

        {!readOnly && (
          <input
            ref={inputRef}
            type="text"
            data-testid={`${testIdPrefix}-field`}
            value={draft}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 140)}
            onChange={(e) => {
              setDraft(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                if (cleanDraft) {
                  addTag(cleanDraft);
                }
              } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
                removeTag(tags[tags.length - 1]);
              } else if (e.key === 'Escape') {
                setIsOpen(false);
                inputRef.current?.blur();
              }
            }}
            placeholder={tags.length === 0 ? placeholder : '+'}
            className={`bg-transparent text-[11px] text-[#0C0C09] dark:text-zinc-100 placeholder:text-[#9A9A94] outline-none ${
              compact ? 'w-20 focus:w-28 transition-all px-1 py-0.5' : 'flex-1 min-w-[80px] py-0.5'
            }`}
          />
        )}
      </div>

      {/* Autocomplete dropdown */}
      {!readOnly && isOpen && (suggestions.length > 0 || canCreateNew) && (
        <div
          data-testid={`${testIdPrefix}-suggestions`}
          className="absolute left-0 top-full mt-1 z-50 min-w-[170px] max-w-[240px] rounded-[6px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1 text-[11px]"
        >
          {suggestions.map((sug) => (
            <button
              key={sug}
              type="button"
              data-testid={`${testIdPrefix}-suggestion-${sug}`}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(sug);
              }}
              className="w-full px-2.5 py-1 text-left flex items-center gap-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-[#0C0C09] dark:text-zinc-100 cursor-pointer"
            >
              <Hash className="w-3 h-3 text-indigo-500 shrink-0" />
              <span className="truncate font-mono">{sug}</span>
            </button>
          ))}
          {canCreateNew && (
            <button
              type="button"
              data-testid={`${testIdPrefix}-create-${cleanDraft}`}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(cleanDraft);
              }}
              className="w-full px-2.5 py-1 text-left flex items-center gap-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold border-t border-[#E2E2DC] dark:border-zinc-800 cursor-pointer"
            >
              <Plus className="w-3 h-3 shrink-0" />
              <span className="truncate">{`Crear #${cleanDraft}`}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
