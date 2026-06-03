"use client";

import { useRouter } from "next/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
  user?: any;
  active?: "dashboard" | "subscribers" | "import" | "reason-config" | "logs";
};

export default function MobileDrawer({ open, onClose, user, active }: Props) {
  const router = useRouter();

  function go(path: string) {
    onClose();
    router.push(path);
  }

  function logout() {
    localStorage.removeItem("ftth_token");
    localStorage.removeItem("ftth_user");
    onClose();
    router.push("/login");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] lg:hidden">
      <button
        type="button"
        aria-label="Đóng menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <aside className="absolute left-0 top-0 h-full w-[82vw] max-w-[340px] bg-white shadow-2xl p-5">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs tracking-[0.25em] text-emerald-600 font-black">FTTH</div>
            <div className="text-xl font-black text-slate-900">Recovery</div>
            <div className="text-xs text-slate-500 mt-1">
              {user?.full_name || user?.username || "User"} | {user?.role || ""}
            </div>
          </div>

          <button type="button" onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-100 font-black">
            ×
          </button>
        </div>

        <nav className="space-y-2">
          <NavItem active={active === "dashboard"} label="Dashboard" onClick={() => go("/dashboard")} />
          <NavItem active={active === "subscribers"} label="Danh sách thuê bao" onClick={() => go("/subscribers")} />
          <NavItem active={active === "import"} label="Import dữ liệu" onClick={() => go("/import")} />
          <NavItem active={active === "reason-config"} label="Cấu hình lý do" onClick={() => go("/reason-config")} />
          <NavItem active={active === "logs"} label="Nhật ký cập nhật" onClick={() => go("/logs")} />
          <NavItem label="Đổi mật khẩu" onClick={() => go("/change-password")} />
        </nav>

        <div className="mt-5 pt-5 border-t border-slate-200">
          <button
            type="button"
            onClick={logout}
            className="w-full px-4 py-3 rounded-xl bg-red-600 text-white font-black text-left"
          >
            Đăng xuất
          </button>
        </div>
      </aside>
    </div>
  );
}

function NavItem({ label, active, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl font-bold ${
        active ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
