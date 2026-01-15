import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { List  as VirtualList } from 'react-window';
import { Check, ChevronDown, Loader2, Search, AlertTriangle } from 'lucide-react';
import { loadGoogleFont } from '../../utils/fontLoader';
import { api } from '../../services/api';

const CACHE_KEY = 'mw:googleFonts:v1:popularity';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const FALLBACK_FONTS = [
  { family: 'Inter', category: 'sans-serif' },
  { family: 'Roboto', category: 'sans-serif' },
  { family: 'Open Sans', category: 'sans-serif' },
  { family: 'Lora', category: 'serif' },
  { family: 'Merriweather', category: 'serif' },
  { family: 'Great Vibes', category: 'handwriting' },
  { family: 'Playfair Display', category: 'serif' },
  { family: 'Dancing Script', category: 'handwriting' },
  { family: 'Cinzel', category: 'serif' },
];

function categoryToCssFallback(category) {
  switch ((category || '').toLowerCase()) {
    case 'serif':
      return 'serif';
    case 'monospace':
      return 'monospace';
    case 'handwriting':
      return 'cursive';
    case 'display':
      return 'sans-serif';
    case 'sans-serif':
    default:
      return 'sans-serif';
  }
}

function toCssFontFamily({ family, category }) {
  return `"${family}", ${categoryToCssFallback(category)}`;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || !Array.isArray(parsed?.items)) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.items;
  } catch {
    return null;
  }
}

function writeCache(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items }));
  } catch {
    // ignore
  }
}

export default function GoogleFontPicker({
  activeFamily,
  onSelect,
  placeholder = 'Font',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [fonts, setFonts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;

    const cached = readCache();
    if (cached?.length) {
      setFonts(cached);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Call backend proxy
    api.fetchGoogleFonts()
      .then((data) => {
        // Normalize backend response (Google API structure)
        const items = Array.isArray(data?.items) ? data.items : [];
        const normalized = items
          .filter((f) => f?.family)
          .map((f) => ({ family: f.family, category: f.category || 'sans-serif' }));
        
        if (normalized.length === 0) {
            // If proxy returns empty (e.g. key missing on server), use fallback
            throw new Error('No fonts returned from server');
        }

        setFonts(normalized);
        writeCache(normalized);
      })
      .catch((e) => {
        console.error("Font fetch error:", e);
        setError(e);
        setFonts(FALLBACK_FONTS);
      })
      .finally(() => setLoading(false));

  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fonts;
    return fonts.filter((f) => f.family.toLowerCase().includes(q));
  }, [fonts, query]);

  const selected = useMemo(() => {
    if (!activeFamily) return null;
    return fonts.find((f) => f.family === activeFamily) || { family: activeFamily, category: 'sans-serif' };
  }, [fonts, activeFamily]);

  const Row = ({ index, style }) => {
    const font = filtered[index];
    if (!font) return null;

    const cssFamily = toCssFontFamily(font);
    // OPTIMIZATION: Removed eager loadGoogleFont(cssFamily)
    // Fonts will only load when hovering to prevent massive network spam on scroll

    const isActive = (selected?.family || '') === font.family;

    return (
      <button
        type="button"
        style={style}
        className={`w-full flex items-center gap-2 px-3 text-left hover:bg-gray-100 transition-colors ${isActive ? 'bg-indigo-50' : ''}`}
        onMouseEnter={() => loadGoogleFont(cssFamily)}
        onClick={() => {
          onSelect?.(font);
          setOpen(false);
        }}
      >
        <span className={`w-4 h-4 flex items-center justify-center ${isActive ? 'text-indigo-600' : 'text-transparent'}`}>
          <Check size={14} />
        </span>
        <span className="flex-1 truncate" style={{ fontFamily: cssFamily }}>
          {font.family}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-gray-400">
          {font.category}
        </span>
      </button>
    );
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-gray-200 text-xs font-medium text-gray-700 max-w-[180px]"
          title={'Seleziona un font da Google Fonts'}
        >
          <span className="truncate" style={{ fontFamily: selected ? toCssFontFamily(selected) : undefined }}>
            {selected?.family || placeholder}
          </span>
          <ChevronDown size={14} className="text-gray-500" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="start"
          className="z-50 w-[360px] max-w-[90vw] rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden"
        >
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-50 border border-gray-200">
              <Search size={14} className="text-gray-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-sm"
                placeholder="Cerca font..."
              />
              {loading && <Loader2 size={14} className="animate-spin text-gray-500" />}
            </div>

            {error && (
              <div className="mt-2 text-[11px] text-amber-600 flex items-center gap-1">
                <AlertTriangle size={12} />
                Offline mode: lista font ridotta.
              </div>
            )}
          </div>

          <div className="h-[280px]">
            {filtered.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">Nessun font trovato.</div>
            ) : (
              <VirtualList
                width="100%"
                rowCount={filtered.length}
                rowHeight={36}
                rowComponent={Row}
                rowProps={filtered}
              />
            )}
          </div>

          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
