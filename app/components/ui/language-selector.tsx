import { useState, useRef, useEffect } from "react";
import { SA_LANGUAGES, resolveLanguage, languageLabel, type SaLanguageCode } from "~/lib/sa-languages";
import { Languages, Check, ChevronDown } from "lucide-react";

interface LanguageSelectorProps {
  currentLang: SaLanguageCode;
  onSelect: (code: SaLanguageCode) => void;
  /** When true, shows the native name first (e.g. "isiZulu (Zulu)") */
  showNative?: boolean;
  /** Compact mode — just a small icon button that opens the dropdown */
  compact?: boolean;
}

export function LanguageSelector({
  currentLang,
  onSelect,
  showNative = false,
  compact = false,
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (compact) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5 text-xs font-mono uppercase tracking-widest"
          aria-label="Select language"
        >
          <Languages className="w-3.5 h-3.5" />
          <span>{currentLang.toUpperCase()}</span>
        </button>
        {open && <Dropdown currentLang={currentLang} onSelect={onSelect} onClose={() => setOpen(false)} showNative={showNative} />}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg border border-white/10 hover:border-white/20"
      >
        <Languages className="w-4 h-4" />
        <span>{languageLabel(currentLang)}</span>
        <ChevronDown className="w-3 h-3 text-slate-500" />
      </button>
      {open && <Dropdown currentLang={currentLang} onSelect={onSelect} onClose={() => setOpen(false)} showNative={showNative} />}
    </div>
  );
}

function Dropdown({
  currentLang,
  onSelect,
  onClose,
  showNative,
}: {
  currentLang: SaLanguageCode;
  onSelect: (code: SaLanguageCode) => void;
  onClose: () => void;
  showNative: boolean;
}) {
  return (
    <div className="absolute top-full right-0 mt-1 z-50 w-56 bg-nz-surface border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden backdrop-blur-xl">
      <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-slate-500 border-b border-white/5">
        🌍 SA Languages
      </div>
      <div className="max-h-64 overflow-y-auto">
        {SA_LANGUAGES.map((lang) => {
          const isActive = currentLang === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => {
                onSelect(lang.code);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="w-5 text-center text-xs font-mono text-slate-500">
                {lang.code.toUpperCase()}
              </span>
              <span className="flex-1">
                {showNative ? lang.nativeName : lang.name}
              </span>
              {isActive && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
