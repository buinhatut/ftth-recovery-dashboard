"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppMenu from "../components/AppMenu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type Row = {
  vtkv: string;
  cnkd: string;
  account: string;
  phone: string;
  suspend_date?: string;
  suspend_month?: string;
  suspend_year?: string;
  suspend_day?: string;
  days_suspend?: number | string;
  latest_contact_status?: string;
  latest_reason_l1_name?: string;
  latest_reason_l2_name?: string;
  latest_recovery_result?: string;
  latest_workflow_status?: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedVTKV, setSelectedVTKV] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState("ALL");
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

  const vtkvList = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.vtkv) set.add(r.vtkv);
    });
    return Array.from(set).sort();
  }, [rows]);

  const monthList = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.suspend_month) set.add(r.suspend_month);
    });
    return Array.from(set).sort().reverse();
  }, [rows]);

  const viewRows = useMemo(() => {
    let data = rows;

    if (role === "VTKV") {
      data = data.filter(
        (r) =>
          String(r.vtkv || "").toUpperCase() ===
          String(user?.scope_code || "").toUpperCase()
      );
    } else if (selectedVTKV !== "ALL") {
      data = data.filter(
        (r) =>
          String(r.vtkv || "").toUpperCase() === selectedVTKV.toUpperCase()
      );
    }

    if (selectedMonth !== "ALL") {
      data = data.filter((r) => String(r.suspend_month || "") === selectedMonth);
    }

    return data;
  }, [rows, selectedVTKV, selectedMonth, role, user]);

  const stats = useMemo(() => {
    const total = viewRows.length;

    const contacted = viewRows.filter(
      (x) => norm(x.latest_contact_status) === "CONTACTED"
    ).length;

    const recovered = viewRows.filter(
      (x) => norm(x.latest_recovery_result) === "RECOVERED"
    ).length;

    const closed = viewRows.filter(
      (x) => norm(x.latest_workflow_status) === "COMPLETED"
    ).length;

    const failed = viewRows.filter(
      (x) =>
        norm(x.latest_recovery_result) === "FAILED" ||
        norm(x.latest_recovery_result) === "NOT_RECOVERED"
    ).length;

    const over7 = viewRows.filter((x) => Number(x.days_suspend || 0) > 7).length;
    const over15 = viewRows.filter((x) => Number(x.days_suspend || 0) > 15).length;
    const over30 = viewRows.filter((x) => Number(x.days_suspend || 0) > 30).length;

    return {
      total,
      contacted,
      notContacted: total - contacted,
      recovered,
      failed,
      pending: total - recovered - failed,
      closed,
      over7,
      over15,
      over30,
      contactRate: pct(contacted, total),
      recoveryRate: pct(recovered, total),
    };
  }, [viewRows]);

  const topL1 = useMemo(() => topCount(viewRows, "latest_reason_l1_name", 10), [viewRows]);
  const topL2 = useMemo(() => topCount(viewRows, "latest_reason_l2_name", 10), [viewRows]);
  const byCNKD = useMemo(() => groupStats(viewRows, "cnkd"), [viewRows]);
  const byVTKV = useMemo(() => groupStats(viewRows, "vtkv"), [viewRows]);

  const trendByDate = useMemo(() => {
    const map = new Map<string, number>();

    viewRows.forEach((r) => {
      const d = String(r.suspend_date || "").trim();
      if (!d) return;
      map.set(d, (map.get(d) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [viewRows]);

  const recoveryPie = useMemo(() => {
    return [
      { name: "Đã khôi phục", value: stats.recovered },
      { name: "Không khôi phục", value: stats.failed },
      { name: "Đang xử lý", value: stats.pending },
    ].filter((x) => x.value > 0);
  }, [stats]);

  function goList(filter: string) {
    const params = new URLSearchParams();
    params.set("filter", filter);

    if (selectedVTKV && selectedVTKV !== "ALL") {
      params.set("vtkv", selectedVTKV);
    }

    if (selectedMonth && selectedMonth !== "ALL") {
      params.set("month", selectedMonth);
    }

    router.push(`/subscribers?${params.toString()}`);
  }

  function exportDashboardCsv() {
    const kpiRows = [
      ["Chỉ tiêu", "Giá trị"],
      ["VTKV", selectedVTKV],
      ["Tháng", selectedMonth],
      ["Tổng Account", stats.total],
      ["Đã tiếp xúc", stats.contacted],
      ["Chưa tiếp xúc", stats.notContacted],
      ["Đã khôi phục", stats.recovered],
      ["Không khôi phục", stats.failed],
      ["Đang xử lý", stats.pending],
      ["Đã đóng việc", stats.closed],
      ["Tồn > 7 ngày", stats.over7],
      ["Tồn > 15 ngày", stats.over15],
      ["Tồn > 30 ngày", stats.over30],
      ["Tỷ lệ tiếp xúc", `${stats.contactRate}%`],
      ["Tỷ lệ khôi phục", `${stats.recoveryRate}%`],
    ];

    const csv = kpiRows
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `dashboard_${selectedVTKV}_${selectedMonth}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 p-6 text-white shadow-xl mb-6">
        <div className="flex justify-between items-center gap-6">
          <div>
            <div className="text-sm opacity-80">FTTH RECOVERY DASHBOARD</div>

            <h1 className="text-4xl font-black mt-2">
              Điều hành khôi phục thuê bao
            </h1>

            <div className="mt-2">
              {user?.full_name} | {user?.role} | {user?.scope_code}
            </div>
          </div>

          <AppMenu user={user} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-5 mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="font-bold text-lg">Bộ lọc Dashboard</p>
          <p className="text-gray-500 text-sm mt-1">
            Chọn ALL để xem toàn chi nhánh hoặc chọn từng VTKV/tháng.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <span className="font-semibold">VTKV</span>

          <select
            value={selectedVTKV}
            disabled={role === "VTKV" || role === "CNKD"}
            onChange={(e) => setSelectedVTKV(e.target.value)}
            className="border rounded-xl px-4 py-3 min-w-[220px] font-semibold"
          >
            {role === "CN" && <option value="ALL">ALL - Toàn chi nhánh</option>}

            {vtkvList.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <span className="font-semibold">Tháng</span>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border rounded-xl px-4 py-3 min-w-[180px] font-semibold"
          >
            <option value="ALL">ALL - Tất cả tháng</option>

            {monthList.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <button
            onClick={exportDashboardCsv}
            className="bg-green-600 text-white rounded-xl px-5 py-3 font-bold"
          >
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-8">Đang tải dữ liệu...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
            <Card title="Tổng Account" value={stats.total} onClick={() => goList("all")} />
            <Card title="Đã tiếp xúc" value={stats.contacted} onClick={() => goList("contacted")} />
            <Card title="Chưa tiếp xúc" value={stats.notContacted} onClick={() => goList("not_contacted")} />
            <Card title="Đã khôi phục" value={stats.recovered} onClick={() => goList("recovered")} />
            <Card title="Không khôi phục" value={stats.failed} onClick={() => goList("failed")} />
            <Card title="Đang xử lý" value={stats.pending} onClick={() => goList("pending")} />
            <Card title="Đã đóng việc" value={stats.closed} onClick={() => goList("closed")} />
            <Card title="Tồn > 7 ngày" value={stats.over7} onClick={() => goList("over7")} />
            <Card title="Tồn > 15 ngày" value={stats.over15} onClick={() => goList("over15")} />
            <Card title="Tồn > 30 ngày" value={stats.over30} onClick={() => goList("over30")} />
          </div>

          <div className="grid xl:grid-cols-3 gap-6 mb-6">
            <Panel title="Cơ cấu kết quả khôi phục">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={recoveryPie}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label
                    >
                      {recoveryPie.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={["#10b981", "#ef4444", "#f59e0b"][index % 3]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Top nguyên nhân cấp 1">
              <BarBlock data={topL1} dataKey="value" nameKey="name" />
            </Panel>

            <Panel title="Top nguyên nhân cấp 2">
              <BarBlock data={topL2} dataKey="value" nameKey="name" />
            </Panel>
          </div>

          <div className="grid xl:grid-cols-2 gap-6 mb-6">
            <Panel title={selectedVTKV === "ALL" ? "Top VTKV tồn nhiều nhất" : "Top CNKD tồn nhiều nhất"}>
              <BarBlock
                data={(selectedVTKV === "ALL" ? byVTKV : byCNKD).slice(0, 10)}
                dataKey="total"
                nameKey="name"
              />
            </Panel>

            <Panel title="Xu hướng tạm ngưng theo ngày">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendByDate}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#0f766e"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          {role === "CN" && selectedVTKV === "ALL" && (
            <Panel title="Thống kê theo VTKV">
              <StatsTable data={byVTKV} label="VTKV" />
            </Panel>
          )}

          {(role === "CN" || role === "VTKV") && (
            <div className="mt-6">
              <Panel title="Thống kê theo CNKD">
                <StatsTable data={byCNKD} label="CNKD" />
              </Panel>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function Card({
  title,
  value,
  onClick,
}: {
  title: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow p-5 text-left hover:shadow-xl hover:-translate-y-1 transition"
    >
      <div className="text-gray-500 font-semibold">{title}</div>
      <div className="text-4xl font-black mt-3">{value}</div>
    </button>
  );
}

function Panel({ title, children }: any) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="font-black text-2xl mb-5">{title}</h2>
      {children}
    </div>
  );
}

function BarBlock({ data, dataKey, nameKey }: any) {
  if (!data || data.length === 0) {
    return <div className="text-gray-500">Chưa có dữ liệu</div>;
  }

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 30, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis
            type="category"
            dataKey={nameKey}
            width={120}
            tick={{ fontSize: 12 }}
          />
          <Tooltip />
          <Bar dataKey={dataKey} fill="#0f766e" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatsTable({ data, label }: any) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <Th>{label}</Th>
            <Th>Tổng</Th>
            <Th>Đã TX</Th>
            <Th>Chưa TX</Th>
            <Th>KP</Th>
            <Th>Không KP</Th>
            <Th>Đang XL</Th>
            <Th>Đóng việc</Th>
            <Th>%TX</Th>
            <Th>%KP</Th>
          </tr>
        </thead>

        <tbody>
          {data.map((r: any) => (
            <tr key={r.name} className="border-t">
              <Td bold>{r.name}</Td>
              <Td>{r.total}</Td>
              <Td>{r.contacted}</Td>
              <Td>{r.notContacted}</Td>
              <Td>{r.recovered}</Td>
              <Td>{r.failed}</Td>
              <Td>{r.pending}</Td>
              <Td>{r.closed}</Td>
              <Td>{r.contactRate}%</Td>
              <Td>{r.recoveryRate}%</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function groupStats(rows: Row[], key: "vtkv" | "cnkd") {
  const map = new Map<string, Row[]>();

  rows.forEach((r) => {
    const name = String(r[key] || "Không xác định").trim();
    if (!map.has(name)) map.set(name, []);
    map.get(name)?.push(r);
  });

  return Array.from(map.entries())
    .map(([name, arr]) => {
      const total = arr.length;
      const contacted = arr.filter((x) => norm(x.latest_contact_status) === "CONTACTED").length;
      const recovered = arr.filter((x) => norm(x.latest_recovery_result) === "RECOVERED").length;
      const failed = arr.filter(
        (x) =>
          norm(x.latest_recovery_result) === "FAILED" ||
          norm(x.latest_recovery_result) === "NOT_RECOVERED"
      ).length;
      const closed = arr.filter((x) => norm(x.latest_workflow_status) === "COMPLETED").length;

      return {
        name,
        total,
        contacted,
        notContacted: total - contacted,
        recovered,
        failed,
        pending: total - recovered - failed,
        closed,
        contactRate: pct(contacted, total),
        recoveryRate: pct(recovered, total),
      };
    })
    .sort((a, b) => b.total - a.total);
}

function topCount(rows: Row[], field: keyof Row, limit = 10) {
  const map = new Map<string, number>();

  rows.forEach((r) => {
    const name = String(r[field] || "").trim();
    if (!name) return;
    map.set(name, (map.get(name) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function pct(a: number, b: number) {
  return b ? Math.round((a / b) * 100) : 0;
}

function norm(v?: string) {
  return String(v || "").trim().toUpperCase();
}

function Th({ children }: any) {
  return <th className="text-left p-4 font-bold whitespace-nowrap">{children}</th>;
}

function Td({ children, bold }: any) {
  return (
    <td className={`p-4 whitespace-nowrap ${bold ? "font-bold" : ""}`}>
      {children}
    </td>
  );
}