"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = {
  vtkv: string;
  cnkd: string;
  account: string;
  phone: string;
  suspend_date?: string;
  suspend_month?: string;
  suspend_reason?: string;
  latest_contact_status?: string;
  latest_recovery_result?: string;
  latest_workflow_status?: string;
  days_suspend?: number | string;
};

const COLORS = {
  blue: "#2563eb",
  green: "#16a34a",
  orange: "#f97316",
  red: "#dc2626",
  purple: "#7c3aed",
  slate: "#475569",
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [selectedVTKV, setSelectedVTKV] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ftth_token");
    const userText = localStorage.getItem("ftth_user");

    if (!token || !userText) {
      router.push("/login");
      return;
    }

    const u = JSON.parse(userText);
    setUser(u);

    if (String(u.role).toUpperCase() === "VTKV") {
      setSelectedVTKV(String(u.scope_code || ""));
    }

    loadData(token);
  }, [router]);

  async function loadData(token: string) {
    setLoading(true);

    const res = await fetch(
      `/api/proxy?action=getCurrentStatus&token=${encodeURIComponent(token)}`
    );

    const data = await res.json();

    if (data.status === "OK") {
      setRows(data.data || []);
    }

    setLoading(false);
  }

  const role = String(user?.role || "").toUpperCase();

  const monthList = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.suspend_month && s.add(r.suspend_month));
    return Array.from(s).sort().reverse();
  }, [rows]);

  const vtkvList = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.vtkv && s.add(r.vtkv));
    return Array.from(s).sort();
  }, [rows]);

  const viewRows = useMemo(() => {
    let data = rows;

    if (role === "VTKV") {
      data = data.filter((r) => up(r.vtkv) === up(user?.scope_code));
    } else if (role === "CNKD") {
      data = data.filter((r) => up(r.cnkd) === up(user?.scope_code));
    } else if (selectedVTKV !== "ALL") {
      data = data.filter((r) => up(r.vtkv) === up(selectedVTKV));
    }

    if (selectedMonth !== "ALL") {
      data = data.filter((r) => String(r.suspend_month || "") === selectedMonth);
    }

    return data;
  }, [rows, role, user, selectedVTKV, selectedMonth]);

  const today = getToday();
  const yesterday = getYesterday();

  const todayRows = viewRows.filter((r) => dateOnly(r.suspend_date) === today);
  const yesterdayRows = viewRows.filter((r) => dateOnly(r.suspend_date) === yesterday);

  const monthStats = useMemo(() => buildStats(viewRows), [viewRows]);
  const todayStats = useMemo(() => buildStats(todayRows), [todayRows]);
  const yesterdayStats = useMemo(() => buildStats(yesterdayRows), [yesterdayRows]);

  const reasonMonth = useMemo(() => reasonCount(viewRows), [viewRows]);
  const reasonToday = useMemo(() => reasonCount(todayRows), [todayRows]);
  const reasonYesterday = useMemo(() => reasonCount(yesterdayRows), [yesterdayRows]);

  const trendData = useMemo(() => {
    const map = new Map<string, any>();

    viewRows.forEach((r) => {
      const d = dateOnly(r.suspend_date);
      if (!d) return;

      if (!map.has(d)) {
        map.set(d, {
          date: d.slice(5),
          suspend: 0,
          contact: 0,
          recovery: 0,
          close: 0,
        });
      }

      const x = map.get(d);
      x.suspend += 1;

      if (up(r.latest_contact_status) === "CONTACTED") x.contact += 1;
      if (up(r.latest_recovery_result) === "RECOVERED") x.recovery += 1;
      if (up(r.latest_workflow_status) === "COMPLETED") x.close += 1;
    });

    return Array.from(map.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
  }, [viewRows]);

  const byVTKV = useMemo(() => groupByVTKV(viewRows), [viewRows]);

  function goList(filter: string) {
    const params = new URLSearchParams();
    params.set("filter", filter);

    if (selectedVTKV !== "ALL") params.set("vtkv", selectedVTKV);
    if (selectedMonth !== "ALL") params.set("month", selectedMonth);

    router.push(`/subscribers?${params.toString()}`);
  }

  function logout() {
    localStorage.removeItem("ftth_token");
    localStorage.removeItem("ftth_user");
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] flex text-slate-900">
      <aside className="w-[250px] bg-white border-r border-slate-200 min-h-screen p-5 hidden lg:block relative">
        <div className="text-xl font-black text-blue-600 mb-8">
          FTTH Recovery
        </div>

        <Nav active label="Dashboard V2" onClick={() => router.push("/dashboard")} />
        <Nav label="Danh sách thuê bao" onClick={() => router.push("/subscribers")} />
        <Nav label="Import dữ liệu" onClick={() => router.push("/import")} />
        <Nav label="Cấu hình lý do" />
        <Nav label="Nhật ký cập nhật" />

        <div className="absolute bottom-6 left-5 right-5 text-sm">
          <div className="font-black">{user?.full_name || "User"}</div>
          <div className="text-slate-500">
            {user?.role} | {user?.scope_code}
          </div>
          <button onClick={logout} className="text-red-600 font-bold mt-4">
            Đăng xuất
          </button>
        </div>
      </aside>

      <section className="flex-1">
        <header className="h-[64px] bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <div>
            <h1 className="font-black text-xl">Dashboard tạm ngưng tháng</h1>
            <p className="text-xs text-slate-500">
              Theo dõi tạm ngưng ngày N, N-1, lý do KHYC / Nợ cước / KHYC+NC
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
              {role === "CN" && <option value="ALL">Tất cả VTKV</option>}
              {vtkvList.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="p-6">
          {loading ? (
            <div className="bg-white rounded-2xl p-8 shadow">Đang tải dữ liệu...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 mb-6">
                <MainCard
                  title="Tạm ngưng tháng"
                  value={monthStats.total}
                  subtitle={`Tháng ${selectedMonth}`}
                  color={COLORS.blue}
                  reasons={reasonMonth}
                  onClick={() => goList("all")}
                />

                <MainCard
                  title="Tạm ngưng ngày N"
                  value={todayStats.total}
                  subtitle={formatDateVi(today)}
                  color={COLORS.red}
                  delta={todayStats.total - yesterdayStats.total}
                  reasons={reasonToday}
                  onClick={() => goList("today")}
                />

                <MainCard
                  title="Tạm ngưng N-1"
                  value={yesterdayStats.total}
                  subtitle={formatDateVi(yesterday)}
                  color={COLORS.orange}
                  reasons={reasonYesterday}
                  extra={[
                    ["Đã tiếp xúc", yesterdayStats.contacted],
                    ["Đã khôi phục", yesterdayStats.recovered],
                    ["% tiếp xúc", `${yesterdayStats.contactRate}%`],
                  ]}
                  onClick={() => goList("yesterday")}
                />

                <MainCard
                  title="Cảnh báo tồn xử lý"
                  value={monthStats.notContacted}
                  subtitle="Chưa tiếp xúc trong tháng"
                  color={COLORS.purple}
                  extra={[
                    ["Đang xử lý", monthStats.pending],
                    ["> 7 ngày", monthStats.over7],
                    ["Đã đóng việc", monthStats.closed],
                  ]}
                  onClick={() => goList("not_contacted")}
                />
              </div>

              <section className="bg-white rounded-2xl shadow p-6 mb-6">
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h2 className="font-black text-xl">
                      Xu hướng tạm ngưng theo ngày trong tháng
                    </h2>
                    <p className="text-sm text-slate-500">
                      Cột: tạm ngưng | Line: tiếp xúc, khôi phục, đóng việc
                    </p>
                  </div>
                </div>

                <div className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="suspend" name="Tạm ngưng" fill={COLORS.blue} radius={[6, 6, 0, 0]} />
                      <Line type="monotone" dataKey="contact" name="Tiếp xúc" stroke={COLORS.green} strokeWidth={3} />
                      <Line type="monotone" dataKey="recovery" name="Khôi phục" stroke={COLORS.orange} strokeWidth={3} />
                      <Line type="monotone" dataKey="close" name="Đóng việc" stroke={COLORS.purple} strokeWidth={3} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <section className="xl:col-span-2 bg-white rounded-2xl shadow p-6">
                  <h2 className="font-black text-xl mb-5">
                    Cơ cấu lý do tạm ngưng
                  </h2>

                  <ReasonTable
                    total={monthStats.total}
                    reason={reasonMonth}
                  />
                </section>

                <section className="bg-white rounded-2xl shadow p-6">
                  <h2 className="font-black text-xl mb-5">Tổng quan tháng</h2>

                  <Summary label="Tạm ngưng tháng" value={monthStats.total} />
                  <Summary label="Tạm ngưng ngày N" value={todayStats.total} />
                  <Summary label="Tạm ngưng N-1" value={yesterdayStats.total} />
                  <Summary label="Đã tiếp xúc" value={monthStats.contacted} />
                  <Summary label="Đã khôi phục" value={monthStats.recovered} />
                  <Summary label="Chưa tiếp xúc" value={monthStats.notContacted} />
                  <Summary label="Tồn > 7 ngày" value={monthStats.over7} />
                </section>
              </div>

              {role !== "CNKD" && (
                <section className="bg-white rounded-2xl shadow p-6 mt-6">
                  <h2 className="font-black text-xl mb-5">
                    Thống kê theo VTKV
                  </h2>

                  <StatsTable data={byVTKV} />
                </section>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function MainCard({ title, value, subtitle, color, reasons, extra, delta, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow p-5 text-left hover:shadow-xl transition"
    >
      <div className="text-sm font-bold text-slate-500 uppercase">
        {title}
      </div>

      <div className="text-5xl font-black mt-3" style={{ color }}>
        {num(value)}
      </div>

      <div className="text-sm text-slate-500 mt-2">{subtitle}</div>

      {typeof delta === "number" && (
        <div
          className={`mt-3 font-black ${
            delta > 0 ? "text-red-600" : delta < 0 ? "text-green-600" : "text-slate-500"
          }`}
        >
          {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {delta > 0 ? "+" : ""}
          {num(delta)} so với N-1
        </div>
      )}

      {reasons && (
        <div className="mt-5 space-y-2">
          <ReasonLine label="KHYC" value={reasons.KHYC || 0} color="#2563eb" />
          <ReasonLine label="Nợ cước" value={reasons["Nợ cước"] || 0} color="#f97316" />
          <ReasonLine label="KHYC+NC" value={reasons["KHYC+NC"] || 0} color="#7c3aed" />
        </div>
      )}

      {extra && (
        <div className="mt-5 space-y-2">
          {extra.map((x: any) => (
            <div key={x[0]} className="flex justify-between text-sm">
              <span className="text-slate-500">{x[0]}</span>
              <b>{numOrText(x[1])}</b>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

function ReasonLine({ label, value, color }: any) {
  return (
    <div className="flex justify-between items-center text-sm">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ background: color }} />
        <span>{label}</span>
      </div>
      <b>{num(value)}</b>
    </div>
  );
}

function ReasonTable({ reason, total }: any) {
  const rows = [
    ["KHYC", reason.KHYC || 0, COLORS.blue],
    ["Nợ cước", reason["Nợ cước"] || 0, COLORS.orange],
    ["KHYC+NC", reason["KHYC+NC"] || 0, COLORS.purple],
  ];

  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <Th>Lý do tạm ngưng</Th>
          <Th>Số lượng</Th>
          <Th>Tỷ lệ</Th>
          <Th>Biểu đồ</Th>
        </tr>
      </thead>

      <tbody>
        {rows.map(([label, value, color]: any) => (
          <tr key={label} className="border-t">
            <Td bold>{label}</Td>
            <Td>{num(value)}</Td>
            <Td>{pct(value, total)}%</Td>
            <td className="p-3 w-[45%]">
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct(value, total)}%`,
                    background: color,
                  }}
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatsTable({ data }: any) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <Th>VTKV</Th>
          <Th>Tạm ngưng</Th>
          <Th>Đã TX</Th>
          <Th>Chưa TX</Th>
          <Th>Khôi phục</Th>
          <Th>Đóng việc</Th>
          <Th>%TX</Th>
          <Th>%KP</Th>
        </tr>
      </thead>

      <tbody>
        {data.map((r: any) => (
          <tr key={r.name} className="border-t">
            <Td bold>{r.name}</Td>
            <Td>{num(r.total)}</Td>
            <Td>{num(r.contacted)}</Td>
            <Td>{num(r.notContacted)}</Td>
            <Td>{num(r.recovered)}</Td>
            <Td>{num(r.closed)}</Td>
            <Td>{r.contactRate}%</Td>
            <Td>{r.recoveryRate}%</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function buildStats(data: Row[]) {
  const total = data.length;

  const contacted = data.filter((r) => up(r.latest_contact_status) === "CONTACTED").length;
  const recovered = data.filter((r) => up(r.latest_recovery_result) === "RECOVERED").length;
  const closed = data.filter((r) => up(r.latest_workflow_status) === "COMPLETED").length;
  const failed = data.filter((r) => ["FAILED", "NOT_RECOVERED"].includes(up(r.latest_recovery_result))).length;
  const over7 = data.filter((r) => Number(r.days_suspend || 0) > 7).length;

  return {
    total,
    contacted,
    notContacted: total - contacted,
    recovered,
    closed,
    failed,
    pending: total - recovered - failed,
    over7,
    contactRate: pct(contacted, total),
    recoveryRate: pct(recovered, total),
  };
}

function reasonCount(data: Row[]) {
  const r: any = {
    KHYC: 0,
    "Nợ cước": 0,
    "KHYC+NC": 0,
  };

  data.forEach((x) => {
    const reason = String(x.suspend_reason || "").trim();
    if (reason === "KHYC") r.KHYC++;
    else if (reason === "Nợ cước") r["Nợ cước"]++;
    else if (reason === "KHYC+NC") r["KHYC+NC"]++;
  });

  return r;
}

function groupByVTKV(data: Row[]) {
  const map = new Map<string, Row[]>();

  data.forEach((r) => {
    const key = r.vtkv || "Không xác định";
    if (!map.has(key)) map.set(key, []);
    map.get(key)?.push(r);
  });

  return Array.from(map.entries())
    .map(([name, arr]) => ({
      name,
      ...buildStats(arr),
    }))
    .sort((a, b) => b.total - a.total);
}

function Nav({ label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl mb-2 font-semibold ${
        active ? "bg-blue-50 text-blue-600" : "hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function Summary({ label, value }: any) {
  return (
    <div className="flex justify-between py-3 border-b">
      <span className="text-slate-600">{label}</span>
      <b>{num(value)}</b>
    </div>
  );
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function dateOnly(v?: string) {
  return String(v || "").slice(0, 10);
}

function formatDateVi(v: string) {
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
}

function pct(a: number, b: number) {
  return b ? Math.round((a / b) * 1000) / 10 : 0;
}

function up(v?: string) {
  return String(v || "").trim().toUpperCase();
}

function num(v: any) {
  return Number(v || 0).toLocaleString("vi-VN");
}

function numOrText(v: any) {
  if (typeof v === "string" && v.includes("%")) return v;
  return num(v);
}

function Th({ children }: any) {
  return <th className="text-left p-3 font-bold text-slate-600">{children}</th>;
}

function Td({ children, bold }: any) {
  return <td className={`p-3 whitespace-nowrap ${bold ? "font-bold" : ""}`}>{children}</td>;
}
