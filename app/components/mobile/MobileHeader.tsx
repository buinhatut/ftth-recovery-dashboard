"use client";

type Props = {
  title: string;
  subtitle?: string;
  total?: number;
  onMenuClick: () => void;
};

export default function MobileHeader({ title, subtitle, total, onMenuClick }: Props) {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-emerald-600 text-white shadow-md">
      <div className="px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="w-11 h-11 rounded-xl bg-white/15 font-black text-2xl"
          aria-label="Mở menu"
        >
          ☰
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-[11px] tracking-[0.18em] font-black opacity-80">FTTH RECOVERY</div>
          <h1 className="font-black text-lg leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs opacity-90 truncate">{subtitle}</p>}
        </div>

        {typeof total === "number" && (
          <div className="text-right">
            <div className="text-[10px] opacity-80">Tổng</div>
            <div className="text-2xl font-black">{total}</div>
          </div>
        )}
      </div>
    </header>
  );
}
