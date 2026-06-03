"use client";

type MobileMenuProps = {
  open: boolean;
  user?: any;
  active?: "dashboard" | "subscribers" | "import" | "reason-config" | "change-password";
  onClose: () => void;
  onGo: (path: string) => void;
  onLogout: () => void;
};

export default function MobileMenu({
  open,
  user,
  active,
  onClose,
  onGo,
  onLogout,
}: MobileMenuProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] md:hidden">
      <button
        type="button"
        aria-label="Đóng menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <aside className="absolute left-0 top-0 h-full w-[82vw] max-w-[340px] bg-white shadow-2xl p-5">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs tracking-[0.25em] text-emerald-600 font-black">
              FTTH
            </div>

            <div className="text-xl font-black text-slate-900">
              Recovery
            </div>

            <div className="text-xs text-slate-500 mt-1">
              {user?.full_name || user?.username || "User"} | {user?.role || ""}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-100 font-black"
          >
            ×
          </button>
        </div>

        <nav className="space-y-2">
          <MobileNav
            active={active === "dashboard"}
            label="Dashboard"
            onClick={() => onGo("/dashboard")}
          />

          <MobileNav
            active={active === "subscribers"}
            label="Danh sách thuê bao"
            onClick={() => onGo("/subscribers")}
          />

          <MobileNav
            active={active === "import"}
            label="Import dữ liệu"
            onClick={() => onGo("/import")}
          />

          <MobileNav
            active={active === "reason-config"}
            label="Cấu hình lý do"
            onClick={() => onGo("/reason-config")}
          />

          <MobileNav
            active={active === "change-password"}
            label="Đổi mật khẩu"
            onClick={() => onGo("/change-password")}
          />
        </nav>

        <div className="mt-5 pt-5 border-t border-slate-200">
          <button
            type="button"
            onClick={onLogout}
            className="w-full px-4 py-3 rounded-xl bg-red-600 text-white font-black text-left"
          >
            Đăng xuất
          </button>
        </div>
      </aside>
    </div>
  );
}

function MobileNav({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl font-bold ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}