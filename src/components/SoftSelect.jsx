import { useState, useRef, useEffect } from 'react';

function SoftSelect({ value, options, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-1.5 bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-purple-200 outline-none focus:ring-2 focus:ring-indigo-400/50 transition-all hover:bg-slate-100 dark:hover:bg-purple-800/60 shadow-sm"
      >
        <span className="truncate">{selected ? selected.label : '선택'}</span>
        <svg className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-purple-900 border border-slate-100 dark:border-purple-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-xs font-bold transition-colors ${o.value === value ? 'bg-indigo-50 dark:bg-purple-800 text-indigo-600 dark:text-purple-200' : 'text-slate-600 dark:text-purple-300 hover:bg-slate-50 dark:hover:bg-purple-800/60'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SoftSelect;
