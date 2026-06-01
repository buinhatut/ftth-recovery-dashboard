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

type FormState = ReasonRow;

const EMPTY_FORM: FormState = {
  reason_l1_id: "",
  reason_l1: "",
  reason_l2_id: "",
  reason_l2: "",
  status: "ACTIVE",
};

export default function ReasonConfigPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [rows, setRows] = useState<ReasonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingL2Id, setEditingL2Id] = useState("");

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

  const role = String(user?.role || "").toUpperCase();
  const canEdit = role === "CN";

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

  async function saveReasonConfig() {
    if (!canEdit) {
      alert("Chỉ quyền CN được thêm/sửa cấu hình lý do");
      return;
    }

    const token = localStorage.getItem("ftth_token") || "";

    const payload: FormState = {
      reason_l1_id: form.reason_l1_id.trim().toUpperCase(),
      reason_l1: form.reason_l1.trim(),
      reason_l2_id: form.reason_l2_id.trim().toUpperCase(),
      reason_l2: form.reason_l2.trim(),
      status: String(form.status || "ACTIVE").trim().toUpperCase(),
    };

    if (!payload.reason_l1_id || !payload.reason_l1 || !payload.reason_l2_id || !payload.reason_l2) {
      alert("Anh nhập đủ Mã cấp 1, Tên cấp 1, Mã cấp 2, Tên cấp 2");
      return;
    }

    setSaving(true);

    try {
      const qs = new URLSearchParams();
      qs.set("action", "saveReasonConfig");
      qs.set("token", token);
      qs.set("reason_l1_id", payload.reason_l1_id);
      qs.set("reason_l1", payload.reason_l1);
      qs.set("reason_l2_id", payload.reason_l2_id);
      qs.set("reason_l2", payload.reason_l2);
      qs.set("status", payload.status);

      const res = await fetch(`/api/proxy?${qs.toString()}`);
      const data = await res.json();

      if (data.status !== "OK") {
        alert(data.message || "Không lưu được cấu hình lý do");
        return;
      }

      alert(data.message || "Đã lưu cấu hình lý do");
      setForm(EMPTY_FORM);
      setEditingL2Id("");
      await loadReasonConfig(token);
    } catch (err: any) {
      alert("Không lưu được cấu hình lý do: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  }

  async function inactiveReason(r: ReasonRow) {
    if (!canEdit) {
      alert("Chỉ quyền CN được khóa cấu hình lý do");
      return;
    }

    const ok = confirm(`Chuyển lý do ${r.reason_l2_id} - ${r.reason_l2} sang INACTIVE?`);
    if (!ok) return;

    const token = localStorage.getItem("ftth_token") || "";

    setSaving(true);

    try {
      const qs = new URLSearchParams();
      qs.set("action", "deleteReasonConfig");
      qs.set("token", token);
      qs.set("reason_l2_id", r.reason_l2_id);

      const res = await fetch(`/api/proxy?${qs.toString()}`);
      const data = await res.json();

      if (data.status !== "OK") {
        alert(data.message || "Không khóa được lý do");
        return;
      }

      alert(data.message || "Đã khóa lý do");
      await loadReasonConfig(token);
    } catch (err: any) {
      alert("Không khóa được lý do: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  }

  function editReason(r: ReasonRow) {
    setEditingL2Id(r.reason_l2_id);
    setForm({
      reason_l1_id: String(r.reason_l1_id || ""),
      reason_l1: String(r.reason_l1 || ""),
      reason_l2_id: String(r.reason_l2_id || ""),
      reason_l2: String(r.reason_l2 || ""),
      status: String(r.status || "ACTIVE").toUpperCase(),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingL2Id("");
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

  const activeL2 = rows.filter((r) => String(r.status || "").toUpperCase() === "ACTIVE").length;
  const inactiveL2 = rows.filter((r) => String(r.status || "").toUpperCase() === "INACTIVE").length;

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
            <h1 className="font-black text-xl">Cấu hình nguyên nhân tạm ngưng</h1>
            <p className="text-xs text-slate-500">
              Thêm/sửa nguyên nhân cấp 1 và cấp 2 trên sheet CONFIG_REASON
            </p>
          </div>

          <button
            onClick={() => loadReasonConfig()}
            disabled={loading || saving}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50"
          >
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </header>

        <div className="p-6 space-y-6">
          <section className="bg-white rounded-2xl shadow p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
            <InfoCard title="Tổng dòng cấu hình" value={rows.length} />
            <InfoCard title="Nguyên nhân cấp 1" value={groupedL1.length} />
            <InfoCard title="Cấp 2 ACTIVE" value={activeL2} />
            <InfoCard title="Cấp 2 INACTIVE" value={inactiveL2} />
          </section>

          <section className="bg-white rounded-2xl shadow p-5">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="font-black text-xl">
                  {editingL2Id ? "Sửa lý do" : "Thêm lý do mới"}
                </h2>
                <p className="text-sm text-slate-500">
                  Mỗi dòng gồm 1 nguyên nhân cấp 1 và 1 nguyên nhân cấp 2.
                </p>
              </div>

              {!canEdit && (
                <div className="px-4 py-2 rounded-xl bg-orange-50 text-orange-700 text-sm font-bold">
                  Chỉ quyền CN được thêm/sửa
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <InputBox
                label="Mã cấp 1"
                placeholder="VD: KT"
                value={form.reason_l1_id}
                disabled={!canEdit || saving}
                onChange={(v: string) => setForm((f) => ({ ...f, reason_l1_id: v.toUpperCase() }))}
              />

              <InputBox
                label="Tên cấp 1"
                placeholder="VD: Kỹ thuật"
                value={form.reason_l1}
                disabled={!canEdit || saving}
                onChange={(v: string) => setForm((f) => ({ ...f, reason_l1: v }))}
              />

              <InputBox
                label="Mã cấp 2"
                placeholder="VD: KT03"
                value={form.reason_l2_id}
                disabled={!canEdit || saving || Boolean(editingL2Id)}
                onChange={(v: string) => setForm((f) => ({ ...f, reason_l2_id: v.toUpperCase() }))}
              />

              <InputBox
                label="Tên cấp 2"
                placeholder="VD: Chập chờn"
                value={form.reason_l2}
                disabled={!canEdit || saving}
                onChange={(v: string) => setForm((f) => ({ ...f, reason_l2: v }))}
              />

              <label className="block">
                <div className="text-sm font-bold text-slate-600 mb-1">Trạng thái</div>
                <select
                  value={form.status}
                  disabled={!canEdit || saving}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full border rounded-xl px-4 py-3 bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={saveReasonConfig}
                disabled={!canEdit || saving}
                className="px-5 py-3 rounded-xl bg-green-600 text-white font-black disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : editingL2Id ? "Cập nhật" : "Thêm mới"}
              </button>

              <button
                onClick={resetForm}
                disabled={saving}
                className="px-5 py-3 rounded-xl bg-slate-100 font-black disabled:opacity-50"
              >
                Nhập lại
              </button>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="font-black text-xl">Danh mục nguyên nhân cấp 1</h2>
                <p className="text-sm text-slate-500">Mỗi cấp 1 có thể có nhiều nguyên nhân cấp 2.</p>
              </div>

              <div className="flex gap-3">
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm lý do..."
                  className="border rounded-xl px-4 py-2 min-w-[220px]"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded-xl px-4 py-2 bg-white"
                >
                  <option value="ALL">Tất cả</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {groupedL1.map((g) => (
                <div key={g.id} className="border rounded-2xl p-5">
                  <div className="text-sm font-bold text-slate-500">{g.id}</div>
                  <div className="text-xl font-black mt-2">{g.name}</div>
                  <div className="text-sm text-slate-500 mt-4">
                    ACTIVE: <b>{g.active}</b> / Tổng: <b>{g.total}</b>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-black text-xl mb-5">Chi tiết nguyên nhân cấp 1 / cấp 2</h2>

            {loading ? (
              <div className="p-8 text-center text-slate-500">Đang tải dữ liệu...</div>
            ) : (
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
                        <Td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => editReason(r)}
                              disabled={!canEdit || saving}
                              className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-bold disabled:opacity-50"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => inactiveReason(r)}
                              disabled={!canEdit || saving || String(r.status || "").toUpperCase() === "INACTIVE"}
                              className="px-3 py-2 rounded-lg bg-red-50 text-red-700 font-bold disabled:opacity-50"
                            >
                              Khóa
                            </button>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

function InputBox({ label, value, onChange, placeholder, disabled }: any) {
  return (
    <label className="block">
      <div className="text-sm font-bold text-slate-600 mb-1">{label}</div>
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-xl px-4 py-3 disabled:bg-slate-50"
      />
    </label>
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
    <td className={`p-3 whitespace-nowrap ${bold ? "font-bold" : ""}`}>{children}</td>
  );
}

function num(v: any) {
  return Number(v || 0).toLocaleString("vi-VN");
}
