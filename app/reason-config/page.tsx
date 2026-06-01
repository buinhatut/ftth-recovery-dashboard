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

type L1Option = {
  reason_l1_id: string;
  reason_l1: string;
};

export default function ReasonConfigPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState("");
  const [rows, setRows] = useState<ReasonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [mode, setMode] = useState<"L1" | "L2">("L2");
  const [reasonL1Id, setReasonL1Id] = useState("");
  const [reasonL1Name, setReasonL1Name] = useState("");
  const [reasonL2Id, setReasonL2Id] = useState("");
  const [reasonL2Name, setReasonL2Name] = useState("");
  const [editKey, setEditKey] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("ftth_token") || "";
    const userText = localStorage.getItem("ftth_user") || "";

    if (!t || !userText) {
      router.push("/login");
      return;
    }

    const u = JSON.parse(userText);
    setUser(u);
    setToken(t);
    loadData(t);
  }, [router]);

  async function api(action: string, body?: any) {
    const res = await fetch(`/api/proxy?action=${action}&token=${encodeURIComponent(token)}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify({ ...body, token }) : undefined,
    });

    return res.json();
  }

  async function loadData(t = token) {
    setLoading(true);

    try {
      const res = await fetch(`/api/proxy?action=getReasonConfig&token=${encodeURIComponent(t)}`);
      const data = await res.json();

      if (data.status === "OK") {
        setRows(data.data || []);
      } else {
        alert(data.message || "Không tải được cấu hình lý do");
      }
    } catch (err: any) {
      alert("Không tải được cấu hình lý do: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const l1Options = useMemo<L1Option[]>(() => {
    const map = new Map<string, string>();

    rows.forEach((r) => {
      if (up(r.status) !== "ACTIVE") return;
      if (!r.reason_l1_id || !r.reason_l1) return;
      map.set(r.reason_l1_id, r.reason_l1);
    });

    return Array.from(map.entries())
      .map(([reason_l1_id, reason_l1]) => ({ reason_l1_id, reason_l1 }))
      .sort((a, b) => a.reason_l1.localeCompare(b.reason_l1, "vi"));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const k = keyword.trim().toLowerCase();

    return rows.filter((r) => {
      const okStatus = statusFilter === "ALL" || up(r.status) === statusFilter;
      const text = `${r.reason_l1_id} ${r.reason_l1} ${r.reason_l2_id} ${r.reason_l2} ${r.status}`.toLowerCase();
      const okKeyword = !k || text.includes(k);
      return okStatus && okKeyword;
    });
  }, [rows, keyword, statusFilter]);

  const l1Summary = useMemo(() => {
    const map = new Map<string, { id: string; name: string; total: number; active: number }>();

    rows.forEach((r) => {
      const id = r.reason_l1_id || "";
      const name = r.reason_l1 || "";
      if (!id || !name) return;

      if (!map.has(id)) {
        map.set(id, { id, name, total: 0, active: 0 });
      }

      const item = map.get(id)!;
      item.total += 1;
      if (up(r.status) === "ACTIVE") item.active += 1;
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [rows]);

  function resetForm() {
    setMode("L2");
    setReasonL1Id("");
    setReasonL1Name("");
    setReasonL2Id("");
    setReasonL2Name("");
    setEditKey("");
  }

  function onSelectL1(id: string) {
    setReasonL1Id(id);
    const found = l1Options.find((x) => x.reason_l1_id === id);
    setReasonL1Name(found?.reason_l1 || "");
  }

  async function saveReason() {
    if (up(user?.role) !== "CN") {
      alert("Chỉ quyền CN được cấu hình lý do");
      return;
    }

    if (mode === "L1") {
      if (!reasonL1Id.trim() || !reasonL1Name.trim()) {
        alert("Vui lòng nhập mã và tên nguyên nhân cấp 1");
        return;
      }
    }

    if (mode === "L2") {
      if (!reasonL1Id.trim()) {
        alert("Vui lòng chọn nguyên nhân cấp 1");
        return;
      }
      if (!reasonL2Id.trim() || !reasonL2Name.trim()) {
        alert("Vui lòng nhập mã và tên nguyên nhân cấp 2");
        return;
      }
    }

    setSaving(true);

    try {
      const body = {
        mode,
        edit_key: editKey,
        reason_l1_id: reasonL1Id.trim(),
        reason_l1: reasonL1Name.trim(),
        reason_l2_id: mode === "L1" ? "" : reasonL2Id.trim(),
        reason_l2: mode === "L1" ? "" : reasonL2Name.trim(),
        status: "ACTIVE",
      };

      const data = await api("saveReasonConfig", body);

      if (data.status !== "OK") {
        alert(data.message || "Không lưu được lý do");
        return;
      }

      alert("Đã lưu cấu hình lý do");
      resetForm();
      await loadData();
    } catch (err: any) {
      alert("Không lưu được lý do: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  function editRow(r: ReasonRow) {
    setMode(r.reason_l2_id ? "L2" : "L1");
    setReasonL1Id(r.reason_l1_id || "");
    setReasonL1Name(r.reason_l1 || "");
    setReasonL2Id(r.reason_l2_id || "");
    setReasonL2Name(r.reason_l2 || "");
    setEditKey(makeKey(r));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleStatus(r: ReasonRow) {
    if (up(user?.role) !== "CN") {
      alert("Chỉ quyền CN được cấu hình lý do");
      return;
    }

    const newStatus = up(r.status) === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    if (!confirm(`Chuyển trạng thái sang ${newStatus}?`)) return;

    setSaving(true);

    try {
      const data = await api("saveReasonConfig", {
        mode: r.reason_l2_id ? "L2" : "L1",
        edit_key: makeKey(r),
        reason_l1_id: r.reason_l1_id,
        reason_l1: r.reason_l1,
        reason_l2_id: r.reason_l2_id,
        reason_l2: r.reason_l2,
        status: newStatus,
      });

      if (data.status !== "OK") {
        alert(data.message || "Không đổi được trạng thái");
        return;
      }

      await loadData();
    } catch (err: any) {
      alert("Không đổi được trạng thái: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    localStorage.removeItem("ftth_token");
    localStorage.removeItem("ftth_user");
    router.push("/login");
  }

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
            <h1 className="font-black text-xl">Cấu hình lý do tạm ngưng</h1>
            <p className="text-xs text-slate-500">
              Thêm/sửa nguyên nhân cấp 1 và cấp 2, dữ liệu lưu tại Google Sheet CONFIG_REASON
            </p>
          </div>

          <button
            onClick={() => loadData()}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
          >
            Làm mới
          </button>
        </header>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="bg-white rounded-2xl p-8 shadow">Đang tải dữ liệu...</div>
          ) : (
            <>
              <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Metric title="Tổng dòng cấu hình" value={rows.length} />
                <Metric title="Nguyên nhân cấp 1" value={l1Summary.length} />
                <Metric title="Cấp 2 ACTIVE" value={rows.filter((r) => up(r.status) === "ACTIVE" && r.reason_l2_id).length} />
                <Metric title="Cấp 2 INACTIVE" value={rows.filter((r) => up(r.status) === "INACTIVE" && r.reason_l2_id).length} />
              </section>

              <section className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className="font-black text-xl">Thêm / sửa lý do</h2>
                    <p className="text-sm text-slate-500">
                      Khi thêm nguyên nhân cấp 2, chọn nguyên nhân cấp 1 bằng dropdown.
                    </p>
                  </div>
                  <button onClick={resetForm} className="px-4 py-2 rounded-xl bg-slate-100 font-bold">
                    Nhập mới
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                  <div>
                    <label className="label">Loại thêm mới</label>
                    <select
                      value={mode}
                      onChange={(e) => {
                        const next = e.target.value as "L1" | "L2";
                        setMode(next);
                        setReasonL1Id("");
                        setReasonL1Name("");
                        setReasonL2Id("");
                        setReasonL2Name("");
                        setEditKey("");
                      }}
                      className="inputBox w-full"
                    >
                      <option value="L2">Thêm nguyên nhân cấp 2</option>
                      <option value="L1">Thêm nguyên nhân cấp 1</option>
                    </select>
                  </div>

                  {mode === "L2" ? (
                    <div className="md:col-span-2">
                      <label className="label">Chọn nguyên nhân cấp 1</label>
                      <select
                        value={reasonL1Id}
                        onChange={(e) => onSelectL1(e.target.value)}
                        className="inputBox w-full"
                      >
                        <option value="">-- Chọn cấp 1 --</option>
                        {l1Options.map((x) => (
                          <option key={x.reason_l1_id} value={x.reason_l1_id}>
                            {x.reason_l1_id} - {x.reason_l1}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="label">Mã cấp 1</label>
                        <input
                          value={reasonL1Id}
                          onChange={(e) => setReasonL1Id(e.target.value.toUpperCase())}
                          className="inputBox w-full"
                          placeholder="VD: KT"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="label">Tên cấp 1</label>
                        <input
                          value={reasonL1Name}
                          onChange={(e) => setReasonL1Name(e.target.value)}
                          className="inputBox w-full"
                          placeholder="VD: Kỹ thuật"
                        />
                      </div>
                    </>
                  )}

                  {mode === "L2" && (
                    <>
                      <div>
                        <label className="label">Mã cấp 2</label>
                        <input
                          value={reasonL2Id}
                          onChange={(e) => setReasonL2Id(e.target.value.toUpperCase())}
                          className="inputBox w-full"
                          placeholder="VD: KT03"
                        />
                      </div>
                      <div>
                        <label className="label">Tên cấp 2</label>
                        <input
                          value={reasonL2Name}
                          onChange={(e) => setReasonL2Name(e.target.value)}
                          className="inputBox w-full"
                          placeholder="VD: Mất kết nối"
                        />
                      </div>
                    </>
                  )}

                  <button
                    onClick={saveReason}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-green-600 text-white font-bold disabled:opacity-50"
                  >
                    {saving ? "Đang lưu..." : editKey ? "Cập nhật" : "Thêm mới"}
                  </button>
                </div>
              </section>

              <section className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-center justify-between mb-5 gap-4">
                  <div>
                    <h2 className="font-black text-xl">Danh mục nguyên nhân cấp 1</h2>
                    <p className="text-sm text-slate-500">Mỗi cấp 1 có thể có nhiều nguyên nhân cấp 2.</p>
                  </div>
                  <div className="flex gap-3">
                    <input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      className="inputBox"
                      placeholder="Tìm lý do..."
                    />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="inputBox"
                    >
                      <option value="ALL">Tất cả</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {l1Summary.map((x) => (
                    <div key={x.id} className="border border-slate-200 rounded-2xl p-5">
                      <div className="text-sm text-slate-500 font-bold">{x.id}</div>
                      <div className="text-xl font-black mt-1">{x.name}</div>
                      <div className="text-sm text-slate-500 mt-3">
                        ACTIVE: {x.active} / Tổng: {x.total}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white rounded-2xl shadow p-6">
                <h2 className="font-black text-xl mb-5">Chi tiết nguyên nhân cấp 1 / cấp 2</h2>

                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <Th>reason_l1_id</Th>
                        <Th>reason_l1</Th>
                        <Th>reason_l2_id</Th>
                        <Th>reason_l2</Th>
                        <Th>status</Th>
                        <Th>Thao tác</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((r) => (
                        <tr key={makeKey(r)} className="border-t">
                          <Td bold>{r.reason_l1_id}</Td>
                          <Td>{r.reason_l1}</Td>
                          <Td bold>{r.reason_l2_id}</Td>
                          <Td>{r.reason_l2}</Td>
                          <Td>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-black ${
                                up(r.status) === "ACTIVE"
                                  ? "bg-green-50 text-green-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {up(r.status) || "ACTIVE"}
                            </span>
                          </Td>
                          <Td>
                            <div className="flex gap-2">
                              <button onClick={() => editRow(r)} className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold">
                                Sửa
                              </button>
                              <button onClick={() => toggleStatus(r)} className="px-3 py-1 rounded-lg bg-slate-100 font-bold">
                                {up(r.status) === "ACTIVE" ? "Tắt" : "Bật"}
                              </button>
                            </div>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function Metric({ title, value }: any) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 border border-slate-200">
      <div className="text-sm text-slate-500 font-bold">{title}</div>
      <div className="text-4xl font-black text-blue-600 mt-2">{Number(value || 0).toLocaleString("vi-VN")}</div>
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

function Th({ children }: any) {
  return <th className="text-left p-3 font-bold text-slate-600 whitespace-nowrap">{children}</th>;
}

function Td({ children, bold }: any) {
  return <td className={`p-3 whitespace-nowrap ${bold ? "font-bold" : ""}`}>{children}</td>;
}

function up(v?: string) {
  return String(v || "").trim().toUpperCase();
}

function makeKey(r: ReasonRow) {
  return `${r.reason_l1_id || ""}__${r.reason_l2_id || ""}`;
}
