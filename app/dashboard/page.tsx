"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
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
  days_suspend?: number | string;
  latest_contact_status?: string;
  latest_reason_l1_name?: string;
  latest_reason_l2_name?: string;
  latest_recovery_result?: string;
  latest_workflow_status?: string;
};

const C = {
  blue: "#2563eb",
  green: "#16a34a",
  orange: "#f97316",
  purple: "#7c3aed",
  gray: "#e5e7eb",
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

  const stats = useMemo(() => {
    const total = viewRows.length;

    const contacted = viewRows.filter(
      (r) => up(r.latest_contact_status) === "CONTACTED"
    ).length;

    const recovered = viewRows.filter(
      (r) => up(r.latest_recovery_result) === "RECOVERED"
    ).length;

    const pending = viewRows.filter((r) =>
      ["PENDING", "FOLLOW_UP", "PROCESSING", ""].includes(
        up(r.latest_recovery_result || r.latest_workflow_status)
      )
    ).length;

    const closed = viewRows.filter(
      (r) => up(r.latest_workflow_status) === "COMPLETED"
    ).length;

    return {
      total,
      contacted,
      recovered,
      pending,
      closed,
      contactRate: pct(contacted, total),
      recoveryRate: pct(recovered, total),
      pendingRate: pct(pending, total),
      closeRate: pct(closed, total),
    };
  }, [viewRows]);

  const trend = useMemo(() => {
    const map = new Map<string, any>();

    viewRows.forEach((r) => {
      const d = String(r.suspend_date || "").slice(0, 10);
      if (!d) return;

      if (!map.has(d)) {
        map.set(d, {
          date: d.slice(5),
          suspend: 0,
          contacted: 0,
          recovered: 0,
          closed: 0,
        });
      }

      const x = map.get(d);
      x.suspend += 1;
      if (up(r.latest_contact_status) === "CONTACTED") x.contacted += 1;
      if (up(r.latest_recovery_result) === "RECOVERED") x.recovered += 1;
      if (up(r.latest_workflow_status) === "COMPLETED") x.closed += 1;
    });

    return Array.from(map.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
  }, [viewRows]);

  const topReason1 = useMemo(
    () => topCount(viewRows, "latest_reason_l1_name", stats.total),
    [viewRows, stats.total]
  );

  const topReason2 = useMemo(
    () => topCount(viewRows, "latest_reason_l2_name", stats.total),
    [viewRows, stats.total]
  );

  function logout() {
    localStorage.removeItem("ftth_token");
    localStorage.removeItem("ftth_user");
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] flex">
      <aside className="w-[250px] bg-white border-r min-h-screen p-5 hidden lg:block">
        <div className="text-xl font-black text-blue-600 mb-8">
          FTTH Recovery
        </div>

        <Nav active label="Dashboard KPI" onClick={() => router.push("/dashboard")} />
        <Nav label="Danh sách thuê bao" onClick={() => router.push("/subscribers")} />
        <Nav label="Cập nhật lịch sử" onClick={() => router.push("/subscribers")} />
        <Nav label="Import Excel" onClick={() => router.push("/import")} />
        <Nav label="Nhật ký hệ thống" onClick={() => {}} />
        <Nav label="Quản lý người dùng" onClick={() => {}} />
        <Nav label="Cấu hình" onClick={() => {}} />
        <Nav label="Hướng dẫn" onClick={() => {}} />

        <div className="absolute bottom-6 left-5 text-sm">
          <div className="font-bold">{user?.full_name}</div>
          <div className="text-gray-500">{user?.scope_code}</div>
          <button onClick={logout} className="text-red-600 font-bold mt-4">
            Đăng xuất
          </button>
        </div>
      </aside>

      <section className="flex-1">
        <header className="h-[64px] bg-white border-b flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button className="text-2xl">☰</button>
            <h1 className="font-black text-xl">Dashboard KPI</h1>
          </div>

          <div className="flex gap-3">
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
              <section className="bg-white rounded-2xl shadow p-6 mb-6">
                <h2 className="font-black text-xl mb-6">Dashboard KPI</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-0 divide-x">
                  <DonutCard
                    title="1. Tỷ lệ tiếp xúc"
                    rate={stats.contactRate}
                    done={stats.contacted}
                    total={stats.total}
                    color={C.blue}
                    doneLabel="Đã tiếp xúc"
                    remainLabel="Chưa tiếp xúc"
                  />

                  <DonutCard
                    title="2. Tỷ lệ khôi phục"
                    rate={stats.recoveryRate}
                    done={stats.recovered}
                    total={stats.total}
                    color={C.green}
                    doneLabel="Đã khôi phục"
                    remainLabel="Chưa khôi phục"
                  />

                  <DonutCard
                    title="3. Tỷ lệ đang xử lý"
                    rate={stats.pendingRate}
                    done={stats.pending}
                    total={stats.total}
                    color={C.orange}
                    doneLabel="Đang xử lý"
                    remainLabel="Đã xử lý"
                  />

                  <DonutCard
                    title="4. Tỷ lệ đóng việc"
                    rate={stats.closeRate}
                    done={stats.closed}
                    total={stats.total}
                    color={C.purple}
                    doneLabel="Đã đóng việc"
                    remainLabel="Chưa đóng việc"
                  />
                </div>
              </section>

              <section className="bg-white rounded-2xl shadow p-6 mb-6">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="font-black text-xl">Xu hướng phục hồi theo ngày</h2>
                  <div className="text-sm text-gray-500">
                    Tạm ngưng / Tiếp xúc / Khôi phục / Đóng việc
                  </div>
                </div>

                <div className="h-[310px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line dataKey="suspend" name="Tạm ngưng" stroke={C.blue} strokeWidth={3} />
                      <Line dataKey="contacted" name="Tiếp xúc" stroke={C.green} strokeWidth={3} />
                      <Line dataKey="recovered" name="Khôi phục" stroke={C.orange} strokeWidth={3} />
                      <Line dataKey="closed" name="Đóng việc" stroke={C.purple} strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <section className="xl:col-span-3 bg-white rounded-2xl shadow p-6">
                  <h2 className="font-black text-xl mb-5">
                    Top nguyên nhân tạm ngưng
                  </h2>

                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <Th>#</Th>
                        <Th>Nguyên nhân cấp 1</Th>
                        <Th>Số lượng</Th>
                        <Th>Tỷ lệ</Th>
                        <Th>Nguyên nhân cấp 2 phổ biến</Th>
                        <Th>Số lượng</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {topReason1.slice(0, 5).map((r, i) => (
                        <tr key={r.name} className="border-t">
                          <Td>{i + 1}</Td>
                          <Td>{r.name}</Td>
                          <Td>{num(r.value)}</Td>
                          <Td>{r.rate}%</Td>
                          <Td>{topReason2[i]?.name || ""}</Td>
                          <Td>{topReason2[i]?.value || ""}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                <section className="bg-white rounded-2xl shadow p-6">
                  <h2 className="font-black text-xl mb-5">Tổng quan tháng</h2>
                  <Summary label="Tổng thuê bao tạm ngưng" value={stats.total} />
                  <Summary label="Đã tiếp xúc" value={stats.contacted} />
                  <Summary label="Đã khôi phục" value={stats.recovered} />
                  <Summary label="Đang xử lý" value={stats.pending} />
                  <Summary label="Đã đóng việc" value={stats.closed} />
                  <Summary label="Chưa tiếp xúc" value={stats.total - stats.contacted} />
                </section>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function DonutCard({
  title,
  rate,
  done,
  total,
  color,
  doneLabel,
  remainLabel,
}: any) {
  const remain = Math.max(total - done, 0);

  const data = [
    { name: doneLabel, value: done },
    { name: remainLabel, value: remain },
  ];

  return (
    <div className="px-6">
      <div className="flex justify-between">
        <div>
          <div className="font-black">{title}</div>
          <div className="text-3xl font-black mt-4" style={{ color }}>
            {rate}%
          </div>
          <div className="text-gray-500 mt-2">
            {num(done)} / {num(total)} thuê bao
          </div>
        </div>
        <div className="text-green-600 bg-green-50 h-fit px-3 py-1 rounded-lg text-sm font-bold">
          ↑ KPI
        </div>
      </div>

      <div className="h-[180px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={54}
              outerRadius={74}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              <Cell fill={color} />
              <Cell fill={C.gray} />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <div>
          {doneLabel}: <b>{num(done)}</b>
        </div>
        <div>
          {remainLabel}: <b>{num(remain)}</b>
        </div>
      </div>
    </div>
  );
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
      <span className="text-gray-600">{label}</span>
      <b>{num(value)}</b>
    </div>
  );
}

function topCount(rows: Row[], field: keyof Row, total: number) {
  const map = new Map<string, number>();

  rows.forEach((r) => {
    const name = String(r[field] || "").trim();
    if (!name) return;
    map.set(name, (map.get(name) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([name, value]) => ({
      name,
      value,
      rate: pct(value, total),
    }))
    .sort((a, b) => b.value - a.value);
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

function Th({ children }: any) {
  return <th className="text-left p-3 font-bold text-gray-600">{children}</th>;
}

function Td({ children }: any) {
  return <td className="p-3 whitespace-nowrap">{children}</td>;
}