"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ReasonRow = {
  reason_l1_id: string;
  reason_l1: string;
  reason_l2_id: string;
  reason_l2: string;
  status: string;
};

export default function ReasonConfigPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [rows, setRows] = useState<ReasonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    const token = localStorage.getItem("ftth_token");
    const userText = localStorage.getItem("ftth_user");

    if (!token || !userText) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userText));
    loadReasonConfig(token);
  }, [router]);

  async function loadReasonConfig(token?: string) {
    const t = token || localStorage.getItem("ftth_token") || "";

    setLoading(true);

    try {
      const res = await fetch(
        `/api/proxy?action=getReasonConfig&token=${encodeURIComponent(t)}`
      );

      const data = await res.json();

      if (data.status === "OK") {
        setRows(data.data || []);
      } else {
        alert(data.message || "Không tải được cấu hình lý do");
      }
    } catch (err: any) {
      alert("Không tải được cấu hình lý do: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("ftth_token");
    localStorage.removeItem("ftth_user");
    router.push("/login");
  }

  const filteredRows = useMemo(() => {
    const k = keyword.trim().toUpperCase();

    return rows.filter((r) => {
      const okStatus =
        statusFilter === "ALL" || String(r.status || "").toUpperCase() === statusFilter;

      const text = [
        r.reason_l1_id,
        r.reason_l1,
        r.reason_l2_id,
        r.reason_l2,
        r.status,
      ]
        .join(" ")
        .toUpperCase();

      const okKeyword = !k || text.includes(k);

      return okStatus && okKeyword;
    });
  }, [rows, keyword, statusFilter]);

  const groupedL1 = useMemo(() => {
    const map = new Map<string, { id: string; name: string; active: number; total: number }>();

    rows.forEach((r) => {
      const id = String(r.reason_l1_id || "").trim();
      if (!id) return;

      if (!map.has(id)) {
        map.set(id, {
          id,
          name: r.reason_l1,
          active: 0,
          total: 0,
        });
      }

      const item = map.get(id)!;
      item.total += 1;

      if (String(r.status || "").toUpperCase() === "ACTIVE") {
        item.active += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [rows]);

  return (
    <main className="min-h-screen bg-[#f8fafc] flex text-slate-900">
      <aside className="w-[250px] bg-white border-r border-slate-200 min-h-screen p-5 hidden lg:block relative">
        <div className="text-xl font-black text-blue-600 mb-8">FTTH Recovery</div>

        <Nav label="Dashboard V2" onClick={() => router.push("/dashboard")} />
        <Nav label="Danh sách thuê bao" onClick={() => router.push("/subscribers")} />
        <Nav label="Import dữ liệu" onClick={() => router.push("/import")} />
        <Nav active label="Cấu hình lý do" onClick={() => router.push("/reason-config")} />
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
            <h1 className="font-black text-xl">Cấu hình lý do</h1>
            <p className="text-xs text-slate-500">
              Đọc dữ liệu nguyên nhân tạm ngưng cấp 1/cấp 2 từ Google Sheet CONFIG_REASON
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 rounded-xl bg-slate-100 font-bold"
            >
              Về Dashboard
            </button>

            <button
              onClick={() => loadReasonConfig()}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50"
            >
              {loading ? "Đang tải..." : "Làm mới"}
            </button>
          </div>
        </header>

        <div className="p-6">
          <section className="bg-white rounded-2xl shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <InfoCard title="Tổng dòng cấu hình" value={rows.length} />
              <InfoCard title="Nguyên nhân cấp 1" value={groupedL1.length} />
              <InfoCard
                title="Cấp 2 ACTIVE"
                value={
                  rows.filter((r) => String(r.status || "").toUpperCase() === "ACTIVE")
                    .length
                }
              />
              <InfoCard
                title="Cấp 2 INACTIVE"
                value={
                  rows.filter((r) => String(r.status || "").toUpperCase() === "INACTIVE")
                    .length
                }
              />
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
              <div>
                <h2 className="font-black text-xl">Danh mục nguyên nhân cấp 1</h2>
                <p className="text-sm text-slate-500">
                  Mỗi cấp 1 có thể có nhiều nguyên nhân cấp 2.
                </p>
              </div>

              <div className="flex gap-3">
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm lý do..."
                  className="inputBox min-w-[260px]"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="inputBox"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-slate-500">Đang tải dữ liệu...</div>
            ) : groupedL1.length === 0 ? (
              <div className="p-8 text-slate-500">Chưa có dữ liệu CONFIG_REASON.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupedL1.map((x) => (
                  <div key={x.id} className="border rounded-2xl p-4">
                    <div className="text-sm text-slate-500 font-bold">{x.id}</div>
                    <div className="font-black text-lg mt-1">{x.name}</div>
                    <div className="text-sm text-slate-500 mt-3">
                      ACTIVE: <b>{x.active}</b> / Tổng: <b>{x.total}</b>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow p-6">
            <h2 className="font-black text-xl mb-5">
              Chi tiết nguyên nhân cấp 1 / cấp 2
            </h2>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <Th>reason_l1_id</Th>
                    <Th>reason_l1</Th>
                    <Th>reason_l2_id</Th>
                    <Th>reason_l2</Th>
                    <Th>status</Th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((r, idx) => (
                    <tr key={`${r.reason_l1_id}-${r.reason_l2_id}-${idx}`} className="border-t">
                      <Td bold>{r.reason_l1_id}</Td>
                      <Td>{r.reason_l1}</Td>
                      <Td bold>{r.reason_l2_id}</Td>
                      <Td>{r.reason_l2}</Td>
                      <Td>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black ${
                            String(r.status || "").toUpperCase() === "ACTIVE"
                              ? "bg-green-50 text-green-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {r.status || "ACTIVE"}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 text-sm text-slate-500">
              Muốn thêm/sửa/xóa lý do thì cập nhật trực tiếp trong Google Sheet
              <b> CONFIG_REASON</b>, sau đó bấm <b>Làm mới</b>.
            </div>
          </section>
        </div>
      </section>
    </main>
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

function InfoCard({ title, value }: any) {
  return (
    <div className="border rounded-2xl p-5">
      <div className="text-sm text-slate-500 font-bold">{title}</div>
      <div className="text-4xl font-black text-blue-600 mt-2">{num(value)}</div>
    </div>
  );
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

function num(v: any) {
  return Number(v || 0).toLocaleString("vi-VN");
}
