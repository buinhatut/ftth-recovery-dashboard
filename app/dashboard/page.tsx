"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  vtkv?: string;
  cnkd?: string;
  account?: string;
  phone?: string;
  suspend_date?: string;
  suspend_month?: string;
  suspend_year?: string;
  suspend_day?: string;
  days_suspend?: string | number;
  suspend_reason?: string;

  latest_contact_status?: string;
  latest_reason_l1?: string;
  latest_reason_l2?: string;
  latest_reason_l1_name?: string;
  latest_reason_l2_name?: string;
  latest_recovery_result?: string;
  latest_workflow_status?: string;
  latest_note?: string;
  latest_updated_by?: string;
  latest_updated_at?: string;
};

type User = {
  username?: string;
  full_name?: string;
  role?: string;
  scope_code?: string;
  must_change_password?: boolean | string;
};

const COLORS = {
  blue: "text-blue-600",
  purple: "text-purple-600",
  green: "text-green-600",
  orange: "text-orange-600",
  red: "text-red-600",
  slate: "text-slate-700",
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [selectedVTKV, setSelectedVTKV] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState("ALL");

  useEffect(() => {
    const savedToken = localStorage.getItem("ftth_token");
    const savedUser = localStorage.getItem("ftth_user");

    if (!savedToken || !savedUser) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(savedUser);

    if (
      parsedUser?.must_change_password === true ||
      String(parsedUser?.must_change_password || "").toUpperCase() === "TRUE"
    ) {
      router.push("/change-password");
      return;
    }

    setToken(savedToken);
    setUser(parsedUser);

    loadData(savedToken);
  }, [router]);

  async function loadData(authToken: string) {
    setLoading(true);

    try {
      const res = await fetch(
        `/api/proxy?action=getCurrentStatus&token=${encodeURIComponent(authToken)}`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (data.status === "OK") {
        setRows(data.data || []);
      } else {
        alert(data.message || "Không tải được dashboard");
      }
    } catch (err: any) {
      alert("Lỗi tải dashboard: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("ftth_token");
    localStorage.removeItem("ftth_user");
    router.push("/login");
  }

  function goMobile(path: string) {
    setMobileMenuOpen(false);
    router.push(path);
  }

  const role = norm(user?.role);
  const isCNKD = role === "CNKD";

  const monthList = useMemo(() => {
    const list = Array.from(
      new Set(
        rows
          .map((r) => String(r.suspend_month || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => b.localeCompare(a));

    return list;
  }, [rows]);

  const activeMonth = useMemo(() => {
    if (selectedMonth !== "ALL") return selectedMonth;
    return monthList[0] || "";
  }, [monthList, selectedMonth]);

  const vtkvList = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .map((r) => String(r.vtkv || "").trim().toUpperCase())
          .filter(Boolean)
      )
    ).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const okMonth =
        selectedMonth === "ALL" ||
        String(r.suspend_month || "").trim() === selectedMonth;

      const okVTKV =
        selectedVTKV === "ALL" ||
        String(r.vtkv || "").trim().toUpperCase() === selectedVTKV;

      return okMonth && okVTKV;
    });
  }, [rows, selectedMonth, selectedVTKV]);

  const stats = useMemo(() => {
    const total = filteredRows.length;

    const contacted = filteredRows.filter(
      (r) => norm(r.latest_contact_status) === "CONTACTED"
    ).length;

    const recovered = filteredRows.filter(
      (r) => norm(r.latest_recovery_result) === "RECOVERED"
    ).length;

    const failed = filteredRows.filter((r) => {
      const v = norm(r.latest_recovery_result);
      return v === "FAILED" || v === "NOT_RECOVERED";
    }).length;

    const closed = filteredRows.filter(
      (r) => norm(r.latest_workflow_status) === "COMPLETED"
    ).length;

    const notContacted = Math.max(0, total - contacted);
    const pending = Math.max(0, total - recovered - failed);

    const over7 = filteredRows.filter((r) => Number(r.days_suspend || 0) > 7).length;
    const over15 = filteredRows.filter((r) => Number(r.days_suspend || 0) > 15).length;

    const contactRate = total ? Math.round((contacted / total) * 100) : 0;
    const recoveryRate = total ? Math.round((recovered / total) * 100) : 0;

    const reasonMap: Record<string, number> = {};

    filteredRows.forEach((r) => {
      const key = String(r.suspend_reason || "Không xác định").trim() || "Không xác định";
      reasonMap[key] = (reasonMap[key] || 0) + 1;
    });

    return {
      total,
      contacted,
      notContacted,
      recovered,
      failed,
      pending,
      closed,
      over7,
      over15,
      contactRate,
      recoveryRate,
      reasonMap,
    };
  }, [filteredRows]);

  const topVTKV = useMemo(() => {
    const map = new Map<string, number>();

    filteredRows.forEach((r) => {
      const k = String(r.vtkv || "Không xác định").trim().toUpperCase() || "Không xác định";
      map.set(k, (map.get(k) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [filteredRows]);

  function goList(filter: string) {
    const params = new URLSearchParams();

    if (filter) params.set("filter", filter);
    if (selectedVTKV !== "ALL") params.set("vtkv", selectedVTKV);
    if (selectedMonth !== "ALL") params.set("month", selectedMonth);

    router.push(`/subscribers?${params.toString()}`);
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] flex text-slate-900">
      <MobileMenu
        open={mobileMenuOpen}
        user={user}
        active="dashboard"
        onClose={() => setMobileMenuOpen(false)}
        onGo={goMobile}
        onLogout={logout}
      />

      <aside className="w-[250px] bg-white border-r border-slate-200 min-h-screen p-5 hidden lg:block">
        <div className="text-xl font-black text-blue-600 mb-8">
          FTTH Recovery
        </div>

        <Nav active label="Dashboard V2" onClick={() => router.push("/dashboard")} />
        <Nav label="Danh sách thuê bao" onClick={() => router.push("/subscribers")} />

        {role === "CN" && (
          <>
            <Nav label="Import dữ liệu" onClick={() => router.push("/import")} />
            <Nav label="Cấu hình lý do" onClick={() => router.push("/reason-config")} />
          </>
        )}

        <Nav label="Đổi mật khẩu" onClick={() => router.push("/change-password")} />

        <div className="mt-4 pt-4 border-t border-slate-200 text-sm">
          <div className="font-black">{user?.full_name || user?.username || "User"}</div>
          <div className="text-slate-500">
            {user?.role} | {user?.scope_code}
          </div>

          <button
            onClick={logout}
            className="w-full text-left px-4 py-3 rounded-xl font-bold text-red-600 hover:bg-red-50 mt-3"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <section className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-40 bg-gradient-to-r from-[#007f73] via-[#009688] to-[#00a896] text-white rounded-b-3xl shadow-xl">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="w-11 h-11 rounded-xl bg-white/15 font-black text-2xl"
              aria-label="Mở menu"
            >
              ☰
            </button>

            <div className="flex-1 min-w-0">
              <div className="text-[11px] tracking-[0.18em] font-black opacity-80">
                FTTH RECOVERY
              </div>
              <h1 className="font-black text-lg leading-tight truncate">
                Dashboard
              </h1>
              <p className="text-xs opacity-90 truncate">
                {user?.full_name || user?.username || "User"} | {user?.role || ""}
              </p>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[10px] opacity-80">Tổng TN</div>
              <div className="text-2xl font-black">{stats.total}</div>
            </div>
          </div>
        </header>

        <header className="hidden lg:flex h-[64px] bg-white border-b border-slate-200 items-center justify-between px-6 sticky top-0 z-10">
          <div>
            <h1 className="font-black text-xl">Dashboard tạm ngưng tháng</h1>
            <p className="text-xs text-slate-500">
              KPI tạm ngưng, tồn chưa tiếp xúc và kết quả khôi phục
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="inputBox"
            >
              <option value="ALL">Tất cả tháng</option>
              {monthList.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={selectedVTKV}
              disabled={role === "VTKV" || role === "CNKD"}
              onChange={(e) => setSelectedVTKV(e.target.value)}
              className="inputBox"
            >
              <option value="ALL">Tất cả VTKV</option>
              {vtkvList.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            <button
              onClick={() => token && loadData(token)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
            >
              Làm mới
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-6">
          {loading ? (
            <div className="bg-white rounded-2xl p-8 shadow">
              Đang tải dữ liệu...
            </div>
          ) : (
            <>
              <div className="lg:hidden bg-white rounded-2xl shadow p-4 mb-4 grid grid-cols-2 gap-3">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-3 bg-white"
                >
                  <option value="ALL">Tất cả tháng</option>
                  {monthList.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedVTKV}
                  disabled={role === "VTKV" || role === "CNKD"}
                  onChange={(e) => setSelectedVTKV(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-3 bg-white disabled:bg-slate-100"
                >
                  <option value="ALL">Tất cả VTKV</option>
                  {vtkvList.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-5">
                <h2 className="text-2xl font-black">
                  Báo cáo FTTH Recovery - {selectedVTKV === "ALL" ? "Toàn HNI" : selectedVTKV}
                </h2>
                <p className="text-sm text-slate-500">
                  Tháng báo cáo: {selectedMonth === "ALL" ? activeMonth || "ALL" : selectedMonth}
                </p>
              </div>

              {isCNKD ? (
                <CNKDDashboard stats={stats} goList={goList} />
              ) : (
                <FullDashboard stats={stats} topVTKV={topVTKV} goList={goList} />
              )}
            </>
          )}
        </div>
      </section>

      <style jsx global>{`
        .inputBox {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 8px 12px;
          background: white;
          font-weight: 700;
          outline: none;
        }
      `}</style>
    </main>
  );
}

function CNKDDashboard({
  stats,
  goList,
}: {
  stats: any;
  goList: (filter: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <KpiCard
        title="Tạm ngưng Tn"
        value={stats.total}
        subtitle="Tổng thuê bao được giao"
        color={COLORS.blue}
        onClick={() => goList("all")}
      />

      <KpiCard
        title="Tồn chưa tiếp xúc"
        value={stats.notContacted}
        subtitle="Bấm để gọi điện và cập nhật"
        color={COLORS.purple}
        onClick={() => goList("not_contacted")}
      />

      <KpiCard
        title="Đã tiếp xúc"
        value={stats.contacted}
        subtitle={`${stats.contactRate}% trên tổng tạm ngưng`}
        color={COLORS.green}
        onClick={() => goList("contacted")}
      />

      <KpiCard
        title="Đã khôi phục"
        value={stats.recovered}
        subtitle={`${stats.recoveryRate}% trên tổng tạm ngưng`}
        color={COLORS.orange}
        onClick={() => goList("recovered")}
      />
    </div>
  );
}

function FullDashboard({
  stats,
  topVTKV,
  goList,
}: {
  stats: any;
  topVTKV: { name: string; value: number }[];
  goList: (filter: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7 gap-4 mb-6">
        <KpiCard title="Tạm ngưng tháng" value={stats.total} subtitle="Tổng tạm ngưng" color={COLORS.blue} onClick={() => goList("all")} />
        <KpiCard title="Tồn chưa tiếp xúc" value={stats.notContacted} subtitle="Cần xử lý" color={COLORS.purple} onClick={() => goList("not_contacted")} />
        <KpiCard title="Đã tiếp xúc" value={stats.contacted} subtitle={`${stats.contactRate}%`} color={COLORS.green} onClick={() => goList("contacted")} />
        <KpiCard title="Đã khôi phục" value={stats.recovered} subtitle={`${stats.recoveryRate}%`} color={COLORS.orange} onClick={() => goList("recovered")} />
        <KpiCard title="Đang xử lý" value={stats.pending} subtitle="Chưa có kết quả cuối" color={COLORS.slate} onClick={() => goList("pending")} />
        <KpiCard title="Tồn > 7 ngày" value={stats.over7} subtitle="Cần ưu tiên" color={COLORS.red} onClick={() => goList("all")} />
        <KpiCard title="Tồn > 15 ngày" value={stats.over15} subtitle="Cảnh báo cao" color={COLORS.red} onClick={() => goList("all")} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel title="Top VTKV tạm ngưng trong tháng">
          <div className="space-y-3">
            {topVTKV.length === 0 ? (
              <div className="text-slate-500">Không có dữ liệu</div>
            ) : (
              topVTKV.map((x) => (
                <MiniBar key={x.name} label={x.name} value={x.value} max={topVTKV[0]?.value || 1} />
              ))
            )}
          </div>
        </Panel>

        <Panel title="Tổng quan tháng">
          <SummaryRow label="Tạm ngưng tháng" value={stats.total} />
          <SummaryRow label="Chưa tiếp xúc" value={stats.notContacted} />
          <SummaryRow label="Đã tiếp xúc" value={stats.contacted} />
          <SummaryRow label="Đã khôi phục" value={stats.recovered} />
          <SummaryRow label="Tỷ lệ tiếp xúc" value={`${stats.contactRate}%`} />
          <SummaryRow label="Tỷ lệ khôi phục" value={`${stats.recoveryRate}%`} />
          <SummaryRow label="Tồn > 7 ngày" value={stats.over7} />
          <SummaryRow label="Tồn > 15 ngày" value={stats.over15} />
        </Panel>
      </div>
    </>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  color,
  onClick,
}: {
  title: string;
  value: number;
  subtitle: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white rounded-2xl shadow p-5 text-left hover:shadow-lg active:scale-[0.99] transition"
    >
      <div className="text-sm text-slate-500 font-bold">{title}</div>
      <div className={`text-4xl font-black mt-2 ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-2">{subtitle}</div>
    </button>
  );
}

function Panel({ title, children }: any) {
  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h3 className="font-black text-lg mb-4">{title}</h3>
      {children}
    </section>
  );
}

function MiniBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max ? Math.max(4, Math.round((value / max) * 100)) : 0;

  return (
    <div>
      <div className="flex justify-between text-sm font-bold mb-1">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-600"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between border-b border-slate-200 py-3 text-sm">
      <span className="text-slate-600">{label}</span>
      <b>{value}</b>
    </div>
  );
}

function Nav({
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
      className={`w-full text-left px-4 py-3 rounded-xl font-bold mb-2 ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}


function MobileMenu({
  open,
  user,
  active,
  onClose,
  onGo,
  onLogout,
}: {
  open: boolean;
  user?: any;
  active?: "dashboard" | "subscribers" | "import" | "reason-config" | "change-password";
  onClose: () => void;
  onGo: (path: string) => void;
  onLogout: () => void;
}) {
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


function norm(v: any) {
  return String(v || "").trim().toUpperCase();
}
