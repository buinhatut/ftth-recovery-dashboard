"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toBlob, toPng } from "html-to-image";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
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
  suspend_reason?: string;
  latest_contact_status?: string;
  latest_reason_l1_name?: string;
  latest_reason_l2_name?: string;
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
  teal: "#0f766e",
};

const PAGE_SIZE = 30;

export default function DashboardPage() {
  const router = useRouter();
  const dashboardRef = useRef<HTMLDivElement | null>(null);

  const [user, setUser] = useState<any>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [selectedVTKV, setSelectedVTKV] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [cnkdPage, setCnkdPage] = useState(1);
  const [exporting, setExporting] = useState(false);

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

  useEffect(() => {
    setCnkdPage(1);
  }, [selectedMonth, selectedVTKV]);

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

  const activeMonth = useMemo(() => {
    if (selectedMonth !== "ALL") return selectedMonth;
    if (monthList.length > 0) return monthList[0];
    return getCurrentMonth();
  }, [selectedMonth, monthList]);

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

  const reasonMonth = useMemo(() => suspendReasonCount(viewRows), [viewRows]);
  const reasonToday = useMemo(() => suspendReasonCount(todayRows), [todayRows]);
  const reasonYesterday = useMemo(() => suspendReasonCount(yesterdayRows), [yesterdayRows]);

  const trendData = useMemo(() => {
    const [year, month] = activeMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const data = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      suspend: 0,
      contact: 0,
      recovery: 0,
      close: 0,
    }));

    viewRows.forEach((r) => {
      const d = parseLocalDate(r.suspend_date);
      if (!d) return;

      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const day = d.getDate();

      if (y !== year || m !== month) return;
      if (day < 1 || day > daysInMonth) return;

      const x = data[day - 1];

      x.suspend += 1;

      if (up(r.latest_contact_status) === "CONTACTED") x.contact += 1;
      if (up(r.latest_recovery_result) === "RECOVERED") x.recovery += 1;
      if (up(r.latest_workflow_status) === "COMPLETED") x.close += 1;
    });

    return data;
  }, [viewRows, activeMonth]);

  const byVTKV = useMemo(() => groupBy(viewRows, "vtkv"), [viewRows]);
  const byCNKD = useMemo(() => groupBy(viewRows, "cnkd"), [viewRows]);

  const cnkdTotalPages = Math.max(1, Math.ceil(byCNKD.length / PAGE_SIZE));

  const cnkdPageData = useMemo(() => {
    const start = (cnkdPage - 1) * PAGE_SIZE;
    return byCNKD.slice(start, start + PAGE_SIZE);
  }, [byCNKD, cnkdPage]);

  const vtkvSuspendChart = useMemo(() => {
    return byVTKV
      .map((x) => ({ name: x.name, value: x.total }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [byVTKV]);

  const suspendReasonChart = useMemo(() => {
    return [
      { name: "KHYC", value: reasonMonth.KHYC || 0, color: COLORS.blue },
      { name: "Nợ cước", value: reasonMonth["Nợ cước"] || 0, color: COLORS.orange },
      { name: "KHYC+NC", value: reasonMonth["KHYC+NC"] || 0, color: COLORS.purple },
    ];
  }, [reasonMonth]);

  const reasonL1Chart = useMemo(() => {
    return topCount(viewRows, "latest_reason_l1_name", 10);
  }, [viewRows]);

  const reasonL2Chart = useMemo(() => {
    return topCount(viewRows, "latest_reason_l2_name", 10);
  }, [viewRows]);

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

  async function exportDashboardPNG(mode: "download" | "copy") {
    const element = dashboardRef.current;
    if (!element) return;

    setExporting(true);

    try {
      await new Promise((r) => setTimeout(r, 500));

      const filename = `ftth-recovery-${activeMonth}-${
        selectedVTKV === "ALL" ? "ALL" : selectedVTKV
      }.png`;

      const filter = (node: HTMLElement) => {
        return !node.classList?.contains("no-export");
      };

      const exportOptions = {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        filter,
        style: {
          background: "#ffffff",
          color: "#0f172a",
        },
      };

      if (mode === "copy" && navigator.clipboard && (window as any).ClipboardItem) {
        const blob = await toBlob(element, exportOptions);

        if (!blob) {
          throw new Error("Không tạo được PNG blob");
        }

        await navigator.clipboard.write([
          new (window as any).ClipboardItem({
            "image/png": blob,
          }),
        ]);

        alert("Đã copy ảnh Dashboard. Anh có thể Paste vào WhatsApp.");
        return;
      }

      const dataUrl = await toPng(element, exportOptions);

      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      console.error(err);

      alert(
        "Không export được PNG:\n\n" +
          (err?.message || JSON.stringify(err))
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] flex text-slate-900">
      <aside className="w-[250px] bg-white border-r border-slate-200 min-h-screen p-5 hidden lg:block relative">
        <div className="text-xl font-black text-blue-600 mb-8">FTTH Recovery</div>

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
              Điều hành ngày N, N-1, lý do tạm ngưng và nguyên nhân cấp 1/cấp 2
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

            <button
              onClick={() => exportDashboardPNG("download")}
              disabled={exporting}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50"
            >
              {exporting ? "Đang xuất..." : "Tải PNG"}
            </button>

            <button
              onClick={() => exportDashboardPNG("copy")}
              disabled={exporting}
              className="px-4 py-2 rounded-xl bg-green-600 text-white font-bold disabled:opacity-50"
            >
              Copy PNG
            </button>
          </div>
        </header>

        <div className="p-6">
          {loading ? (
            <div className="bg-white rounded-2xl p-8 shadow">Đang tải dữ liệu...</div>
          ) : (
            <div ref={dashboardRef} data-export-root className="bg-white p-4">
              <div className="mb-5">
                <h2 className="text-2xl font-black">
                  Báo cáo FTTH Recovery - {selectedVTKV === "ALL" ? "Toàn HNI" : selectedVTKV}
                </h2>
                <p className="text-sm text-slate-500">
                  Tháng báo cáo: {activeMonth} | Thời điểm xuất:{" "}
                  {new Date().toLocaleString("vi-VN")}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7 gap-5 mb-6">
                <MainCard
                  title="Tạm ngưng tháng"
                  value={monthStats.total}
                  subtitle={selectedMonth === "ALL" ? `Tháng ${activeMonth}` : `Tháng ${selectedMonth}`}
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
                  title="Tồn chưa tiếp xúc"
                  value={monthStats.notContacted}
                  subtitle="Cần điều hành xử lý"
                  color={COLORS.purple}
                  extra={[
                    ["Đang xử lý", monthStats.pending],
                    ["> 7 ngày", monthStats.over7],
                    ["> 15 ngày", monthStats.over15],
                    ["Đã đóng việc", monthStats.closed],
                  ]}
                  onClick={() => goList("not_contacted")}
                />

                <MainCard
                  title="Đã tiếp xúc"
                  value={monthStats.contacted}
                  subtitle={`${monthStats.contactRate}% trên tổng TN`}
                  color={COLORS.green}
                  extra={[
                    ["Tổng tạm ngưng", monthStats.total],
                    ["Chưa tiếp xúc", monthStats.notContacted],
                  ]}
                  onClick={() => goList("contacted")}
                />

                <MainCard
                  title="Đã khôi phục"
                  value={monthStats.recovered}
                  subtitle="Thuê bao đã khôi phục"
                  color={COLORS.teal}
                  extra={[
                    ["Đang xử lý", monthStats.pending],
                    ["Đã đóng việc", monthStats.closed],
                  ]}
                  onClick={() => goList("recovered")}
                />

                <MainCard
                  title="Tỷ lệ khôi phục"
                  value={`${monthStats.recoveryRate}%`}
                  subtitle={`${num(monthStats.recovered)} / ${num(monthStats.total)} thuê bao`}
                  color={COLORS.purple}
                  extra={[
                    ["Đã khôi phục", monthStats.recovered],
                    ["Chưa khôi phục", monthStats.total - monthStats.recovered],
                  ]}
                  onClick={() => goList("recovered")}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">
                <section className="xl:col-span-3 bg-white rounded-2xl shadow p-6">
                  <div className="flex justify-between items-center mb-5">
                    <div>
                      <h2 className="font-black text-xl">
                        Xu hướng tạm ngưng theo ngày trong tháng
                      </h2>
                      <p className="text-sm text-slate-500">
                        Cột cố định theo ngày 1 → cuối tháng | Line: tiếp xúc, khôi phục, đóng việc
                      </p>
                    </div>
                  </div>

                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={trendData}
                        margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                        barCategoryGap="80%"
                        barGap={2}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="day"
                          interval={0}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => String(v).padStart(2, "0")}
                        />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value: any, name: any) => [num(value), name]}
                          labelFormatter={(label) => `Ngày ${label}`}
                        />
                        <Legend />
                        <Bar
                          dataKey="suspend"
                          name="Tạm ngưng"
                          fill={COLORS.blue}
                          barSize={12}
                          radius={[3, 3, 0, 0]}
                        />
                        <Line
                          type="monotone"
                          dataKey="contact"
                          name="Tiếp xúc"
                          stroke={COLORS.green}
                          strokeWidth={3}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="recovery"
                          name="Khôi phục"
                          stroke={COLORS.orange}
                          strokeWidth={3}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="close"
                          name="Đóng việc"
                          stroke={COLORS.purple}
                          strokeWidth={3}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="bg-white rounded-2xl shadow p-6">
                  <h2 className="font-black text-xl mb-5">Tổng quan tháng</h2>

                  <Summary label="Tạm ngưng tháng" value={monthStats.total} />
                  <Summary label="Tạm ngưng ngày N" value={todayStats.total} />
                  <Summary label="Tạm ngưng N-1" value={yesterdayStats.total} />
                  <Summary label="Đã tiếp xúc" value={monthStats.contacted} />
                  <Summary label="Đã khôi phục" value={monthStats.recovered} />
                  <Summary label="Tỷ lệ khôi phục" value={`${monthStats.recoveryRate}%`} />
                  <Summary label="Chưa tiếp xúc" value={monthStats.notContacted} />
                  <Summary label="Tồn > 7 ngày" value={monthStats.over7} />
                  <Summary label="Tồn > 15 ngày" value={monthStats.over15} />
                </section>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                <ChartCard title="Top VTKV tạm ngưng trong tháng">
                  <VerticalBarChart
                    data={vtkvSuspendChart}
                    color={COLORS.red}
                    dataKey="value"
                    name="Tạm ngưng"
                  />
                </ChartCard>

                <section className="bg-white rounded-2xl shadow p-6">
                  <h2 className="font-black text-xl mb-5">
                    Cơ cấu nguyên nhân tạm ngưng
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={suspendReasonChart}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={70}
                            outerRadius={110}
                            label
                          >
                            {suspendReasonChart.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-4">
                      {suspendReasonChart.map((r) => (
                        <ProgressLine
                          key={r.name}
                          label={r.name}
                          value={r.value}
                          total={monthStats.total}
                          color={r.color}
                        />
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                <ChartCard title="Nguyên nhân cấp 1">
                  <VerticalBarChart
                    data={reasonL1Chart}
                    color={COLORS.teal}
                    dataKey="value"
                    name="Nguyên nhân cấp 1"
                  />
                </ChartCard>

                <ChartCard title="Nguyên nhân cấp 2">
                  <VerticalBarChart
                    data={reasonL2Chart}
                    color={COLORS.orange}
                    dataKey="value"
                    name="Nguyên nhân cấp 2"
                  />
                </ChartCard>
              </div>

              {role !== "CNKD" && (
                <section className="bg-white rounded-2xl shadow p-6 mt-6">
                  <h2 className="font-black text-xl mb-5">Thống kê theo VTKV</h2>
                  <StatsTable data={byVTKV} firstCol="VTKV" />
                </section>
              )}

              <section className="bg-white rounded-2xl shadow p-6 mt-6">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="font-black text-xl">Thống kê theo CNKD</h2>

                  <div className="flex items-center gap-3 text-sm">
                    <button
                      onClick={() => setCnkdPage((p) => Math.max(1, p - 1))}
                      disabled={cnkdPage <= 1}
                      className="px-4 py-2 rounded-lg bg-slate-100 font-bold disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <span>
                      Trang <b>{cnkdPage}</b> / <b>{cnkdTotalPages}</b>
                    </span>

                    <button
                      onClick={() => setCnkdPage((p) => Math.min(cnkdTotalPages, p + 1))}
                      disabled={cnkdPage >= cnkdTotalPages}
                      className="px-4 py-2 rounded-lg bg-slate-100 font-bold disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>

                <StatsTable data={cnkdPageData} firstCol="CNKD" />
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ChartCard({ title, children }: any) {
  return (
    <section className="bg-white rounded-2xl shadow p-6">
      <h2 className="font-black text-xl mb-5">{title}</h2>
      {children}
    </section>
  );
}

function VerticalBarChart({ data, color, dataKey, name }: any) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[360px] flex items-center justify-center text-slate-500">
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <div className="h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 40, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey={dataKey} name={name} fill={color} radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MainCard({
  title,
  value,
  subtitle,
  color,
  reasons,
  extra,
  delta,
  onClick,
}: any) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow p-5 text-left hover:shadow-xl transition"
    >
      <div className="text-sm font-bold text-slate-500 uppercase">{title}</div>

      <div className="text-5xl font-black mt-3" style={{ color }}>
        {numOrText(value)}
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

function ProgressLine({ label, value, total, color }: any) {
  return (
    <div>
      <div className="flex justify-between text-sm font-bold mb-1">
        <span>{label}</span>
        <span>
          {num(value)} - {pct(value, total)}%
        </span>
      </div>

      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct(value, total)}%`, background: color }}
        />
      </div>
    </div>
  );
}

function StatsTable({ data, firstCol }: any) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <Th>{firstCol}</Th>
            <Th>Tạm ngưng</Th>
            <Th>Đã TX</Th>
            <Th>Chưa TX</Th>
            <Th>Khôi phục</Th>
            <Th>Đóng việc</Th>
            <Th>%TX</Th>
            <Th>%KP</Th>
            <Th>{">7 ngày"}</Th>
            <Th>{">15 ngày"}</Th>
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
              <Td>{num(r.over7)}</Td>
              <Td>{num(r.over15)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildStats(data: Row[]) {
  const total = data.length;

  const contacted = data.filter((r) => up(r.latest_contact_status) === "CONTACTED").length;
  const recovered = data.filter((r) => up(r.latest_recovery_result) === "RECOVERED").length;
  const closed = data.filter((r) => up(r.latest_workflow_status) === "COMPLETED").length;

  const failed = data.filter((r) =>
    ["FAILED", "NOT_RECOVERED"].includes(up(r.latest_recovery_result))
  ).length;

  const over7 = data.filter((r) => Number(r.days_suspend || 0) > 7).length;
  const over15 = data.filter((r) => Number(r.days_suspend || 0) > 15).length;

  return {
    total,
    contacted,
    notContacted: total - contacted,
    recovered,
    closed,
    failed,
    pending: total - recovered - failed,
    over7,
    over15,
    contactRate: pct(contacted, total),
    recoveryRate: pct(recovered, total),
  };
}

function suspendReasonCount(data: Row[]) {
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

function topCount(data: Row[], field: keyof Row, limit = 10) {
  const map = new Map<string, number>();

  data.forEach((r) => {
    const name = String(r[field] || "").trim();
    if (!name) return;
    map.set(name, (map.get(name) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function groupBy(data: Row[], field: "vtkv" | "cnkd") {
  const map = new Map<string, Row[]>();

  data.forEach((r) => {
    const key = String(r[field] || "Không xác định").trim();
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

function parseLocalDate(v?: string) {
  if (!v) return null;

  const s = String(v).slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [d, m, y] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  if (/^\d{2}-\d{2}-\d{2}$/.test(s)) {
    const [d, m, yy] = s.split("-").map(Number);
    return new Date(2000 + yy, m - 1, d);
  }

  const d = new Date(s);
  if (isNaN(d.getTime())) return null;

  return d;
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
      <b>{numOrText(value)}</b>
    </div>
  );
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
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
  return (
    <th className="text-left p-3 font-bold text-slate-600 whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children, bold }: any) {
  return (
    <td className={`p-3 whitespace-nowrap ${bold ? "font-bold" : ""}`}>
      {children}
    </td>
  );
}