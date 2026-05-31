"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppMenu from "../components/AppMenu";

type Subscriber = {
  vtkv: string;
  cnkd: string;
  account: string;
  phone: string;

  suspend_date?: string;
  suspend_month?: string;
  suspend_year?: string;
  suspend_day?: string;
  days_suspend?: string | number;

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

type Reason = {
  reason_l1_id: string;
  reason_l1: string;
  reason_l2_id: string;
  reason_l2: string;
};

export default function SubscribersPage() {
  const router = useRouter();

  const [filter, setFilter] = useState("all");
  const [filterVTKV, setFilterVTKV] = useState("ALL");

  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState("");

  const [rows, setRows] = useState<Subscriber[]>([]);
  const [reasons, setReasons] = useState<Reason[]>([]);

  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  const [selected, setSelected] = useState<Subscriber | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    contact_status: "CONTACTED",
    reason_l1_id: "",
    reason_l2_id: "",
    customer_status: "",
    solution_plan: "",
    action_taken: "",
    recovery_result: "",
    workflow_status: "PROCESSING",
    next_action_date: "",
    note: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilter(params.get("filter") || "all");
    setFilterVTKV(params.get("vtkv") || "ALL");

    const savedToken = localStorage.getItem("ftth_token");
    const savedUser = localStorage.getItem("ftth_user");

    if (!savedToken || !savedUser) {
      router.push("/login");
      return;
    }

    setToken(savedToken);
    setUser(JSON.parse(savedUser));

    loadData(savedToken);
  }, [router]);

  async function loadData(authToken: string) {
    setLoading(true);

    const [subRes, reasonRes] = await Promise.all([
      fetch(
        `/api/proxy?action=getCurrentStatus&token=${encodeURIComponent(
          authToken
        )}`
      ),
      fetch("/api/proxy?action=getReasons"),
    ]);

    const subData = await subRes.json();
    const reasonData = await reasonRes.json();

    if (subData.status === "OK") {
      setRows(subData.data || []);
    }

    if (reasonData.status === "OK") {
      setReasons(reasonData.data || []);
    }

    setLoading(false);
  }

  const filteredRows = useMemo(() => {
    const k = keyword.trim().toLowerCase();

    return rows.filter((r) => {
      if (
        filterVTKV !== "ALL" &&
        String(r.vtkv || "").toUpperCase() !== filterVTKV.toUpperCase()
      ) {
        return false;
      }

      const contact = norm(r.latest_contact_status);
      const result = norm(r.latest_recovery_result);
      const workflow = norm(r.latest_workflow_status);

      let ok = true;

      if (filter === "contacted") ok = contact === "CONTACTED";
      if (filter === "not_contacted") ok = contact !== "CONTACTED";
      if (filter === "recovered") ok = result === "RECOVERED";
      if (filter === "failed") ok = result === "FAILED" || result === "NOT_RECOVERED";

      if (filter === "pending") {
        ok =
          result !== "RECOVERED" &&
          result !== "FAILED" &&
          result !== "NOT_RECOVERED";
      }

      if (filter === "closed") ok = workflow === "COMPLETED";
      if (filter === "all") ok = true;

      if (!ok) return false;
      if (!k) return true;

      return (
        String(r.vtkv || "").toLowerCase().includes(k) ||
        String(r.cnkd || "").toLowerCase().includes(k) ||
        String(r.account || "").toLowerCase().includes(k) ||
        String(r.phone || "").toLowerCase().includes(k) ||
        String(r.suspend_date || "").toLowerCase().includes(k) ||
        String(r.latest_reason_l1_name || "").toLowerCase().includes(k) ||
        String(r.latest_reason_l2_name || "").toLowerCase().includes(k)
      );
    });
  }, [rows, keyword, filter, filterVTKV]);

  const reasonL1List = useMemo(() => {
    const map = new Map<string, string>();

    reasons.forEach((r) => {
      if (r.reason_l1_id && r.reason_l1) {
        map.set(r.reason_l1_id, r.reason_l1);
      }
    });

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [reasons]);

  const reasonL2List = useMemo(() => {
    return reasons.filter((r) => r.reason_l1_id === form.reason_l1_id);
  }, [reasons, form.reason_l1_id]);

  function getFilterTitle() {
    if (filter === "contacted") return "Danh sách thuê bao đã tiếp xúc";
    if (filter === "not_contacted") return "Danh sách thuê bao chưa tiếp xúc";
    if (filter === "recovered") return "Danh sách thuê bao đã khôi phục";
    if (filter === "failed") return "Danh sách thuê bao không khôi phục";
    if (filter === "pending") return "Danh sách thuê bao đang xử lý";
    if (filter === "closed") return "Danh sách thuê bao đã đóng việc";
    return "Tất cả thuê bao";
  }

  function openUpdate(row: Subscriber) {
    setSelected(row);
    setMessage("");

    setForm({
      contact_status: row.latest_contact_status || "CONTACTED",
      reason_l1_id: row.latest_reason_l1 || "",
      reason_l2_id: row.latest_reason_l2 || "",
      customer_status: "",
      solution_plan: "",
      action_taken: "",
      recovery_result: row.latest_recovery_result || "",
      workflow_status: row.latest_workflow_status || "PROCESSING",
      next_action_date: "",
      note: row.latest_note || "",
    });
  }

  async function saveRecovery() {
    if (!selected) return;

    if (norm(selected.latest_workflow_status) === "COMPLETED") {
      setMessage("Thuê bao đã đóng việc, không được cập nhật tiếp");
      return;
    }

    if (!form.reason_l1_id || !form.reason_l2_id) {
      setMessage("Vui lòng chọn nguyên nhân cấp 1 và cấp 2");
      return;
    }

    if (!form.recovery_result) {
      setMessage("Vui lòng chọn kết quả xử lý");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateRecovery",
          token,
          account: selected.account,
          ...form,
        }),
      });

      const data = await res.json();

      if (data.status !== "OK") {
        setMessage(data.message || "Cập nhật không thành công");
        return;
      }

      setMessage("Cập nhật thành công");
      await loadData(token);

      setTimeout(() => {
        setSelected(null);
        setMessage("");
      }, 700);
    } catch (err: any) {
      setMessage("Lỗi: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const headers = [
      "VTKV",
      "CNKD",
      "Account",
      "Phone",
      "Suspend Date",
      "Days Suspend",
      "Contact Status",
      "Reason L1",
      "Reason L2",
      "Recovery Result",
      "Workflow Status",
      "Updated By",
      "Updated At",
    ];

    const data = filteredRows.map((r) => [
      r.vtkv,
      r.cnkd,
      r.account,
      r.phone,
      r.suspend_date,
      r.days_suspend,
      showContact(r.latest_contact_status),
      r.latest_reason_l1_name || r.latest_reason_l1 || "",
      r.latest_reason_l2_name || r.latest_reason_l2 || "",
      showResult(r.latest_recovery_result),
      showWorkflow(r.latest_workflow_status),
      r.latest_updated_by || "",
      formatDate(r.latest_updated_at),
    ]);

    const csv = [headers, ...data]
      .map((row) =>
        row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `subscribers_${filter}_${filterVTKV}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  const reasonLocked =
    selected && norm(selected.latest_contact_status) === "CONTACTED";

  const isClosed =
    selected && norm(selected.latest_workflow_status) === "COMPLETED";

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="rounded-3xl bg-gradient-to-r from-[#007f73] via-[#009688] to-[#00a896] text-white p-6 shadow-xl mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="uppercase tracking-[0.25em] text-sm text-white/80">
              FTTH Recovery Dashboard
            </p>

            <h1 className="text-4xl font-black mt-2">{getFilterTitle()}</h1>

            <p className="mt-3 text-white/90">
              {user?.full_name} | {user?.role} | {user?.scope_code}
            </p>

            {filterVTKV !== "ALL" && (
              <p className="mt-2 font-bold text-yellow-200">
                VTKV: {filterVTKV}
              </p>
            )}
          </div>

          <AppMenu user={user} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <div className="flex gap-4 items-center justify-between">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo VTKV, CNKD, Account, SĐT, ngày tạm ngưng, nguyên nhân..."
            className="border rounded-lg px-4 py-3 w-full"
          />

          <button
            onClick={exportCsv}
            className="bg-green-600 text-white rounded-lg px-5 py-3 font-bold whitespace-nowrap"
          >
            Export CSV
          </button>

          <div className="text-right min-w-[140px]">
            <p className="text-gray-500 text-sm">Tổng số</p>
            <p className="text-3xl font-black">{filteredRows.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8">Đang tải dữ liệu...</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <Th>STT</Th>
                  <Th>VTKV</Th>
                  <Th>CNKD</Th>
                  <Th>Account</Th>
                  <Th>Phone</Th>
                  <Th>Ngày TN</Th>
                  <Th>Số ngày TN</Th>
                  <Th>Tiếp xúc</Th>
                  <Th>Nguyên nhân</Th>
                  <Th>Kết quả</Th>
                  <Th>Trạng thái</Th>
                  <Th>Updated By</Th>
                  <Th>Updated At</Th>
                  <Th>Thao tác</Th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="p-8 text-center text-gray-500">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r, idx) => (
                    <tr
                      key={`${r.account}-${idx}`}
                      className="border-t hover:bg-gray-50"
                    >
                      <Td>{idx + 1}</Td>
                      <Td>{r.vtkv}</Td>
                      <Td>{r.cnkd}</Td>
                      <Td bold>{r.account}</Td>
                      <Td>{r.phone}</Td>
                      <Td>{r.suspend_date || ""}</Td>
                      <Td>{r.days_suspend || ""}</Td>
                      <Td>{showContact(r.latest_contact_status)}</Td>
                      <Td>
                        {r.latest_reason_l2_name ||
                          r.latest_reason_l1_name ||
                          ""}
                      </Td>
                      <Td>{showResult(r.latest_recovery_result)}</Td>
                      <Td>{showWorkflow(r.latest_workflow_status)}</Td>
                      <Td>{r.latest_updated_by || ""}</Td>
                      <Td>{formatDate(r.latest_updated_at)}</Td>
                      <Td>
                        <button
                          disabled={
                            norm(r.latest_workflow_status) === "COMPLETED"
                          }
                          onClick={() => openUpdate(r)}
                          className={`rounded-lg px-4 py-2 font-semibold text-white ${
                            norm(r.latest_workflow_status) === "COMPLETED"
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-blue-600"
                          }`}
                        >
                          {norm(r.latest_workflow_status) === "COMPLETED"
                            ? "Đã đóng"
                            : "Cập nhật"}
                        </button>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-[760px] max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">
                Cập nhật kết quả khôi phục
              </h2>

              <p className="text-gray-600 mt-1">
                Account: <b>{selected.account}</b> | VTKV: {selected.vtkv} |
                CNKD: {selected.cnkd}
              </p>

              {reasonLocked && (
                <p className="mt-3 text-orange-600 font-semibold">
                  Thuê bao đã tiếp xúc: nguyên nhân cấp 1/cấp 2 sẽ bị khóa,
                  chỉ được cập nhật trạng thái/kết quả xử lý.
                </p>
              )}

              {isClosed && (
                <p className="mt-3 text-red-600 font-semibold">
                  Thuê bao đã đóng việc, không được cập nhật tiếp.
                </p>
              )}
            </div>

            <div className="p-6 grid grid-cols-2 gap-4">
              <Field label="Trạng thái tiếp xúc">
                <select
                  className="input"
                  value={form.contact_status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      contact_status: e.target.value,
                    })
                  }
                >
                  <option value="CONTACTED">Đã tiếp xúc</option>
                  <option value="NO_ANSWER">Không nghe máy</option>
                  <option value="CALLBACK">Hẹn gọi lại</option>
                  <option value="INVALID_PHONE">Sai số</option>
                </select>
              </Field>

              <Field label="Trạng thái cập nhật">
                <select
                  className="input"
                  value={form.workflow_status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      workflow_status: e.target.value,
                    })
                  }
                >
                  <option value="PROCESSING">Đang xử lý</option>
                  <option value="CALLBACK">Hẹn lại</option>
                  <option value="COMPLETED">Hoàn thành</option>
                  <option value="FAILED">Không khôi phục</option>
                </select>
              </Field>

              <Field label="Nguyên nhân cấp 1">
                <select
                  disabled={Boolean(reasonLocked || isClosed)}
                  className="input disabled:bg-gray-100"
                  value={form.reason_l1_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      reason_l1_id: e.target.value,
                      reason_l2_id: "",
                    })
                  }
                >
                  <option value="">-- Chọn cấp 1 --</option>
                  {reasonL1List.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Nguyên nhân cấp 2">
                <select
                  disabled={Boolean(reasonLocked || isClosed)}
                  className="input disabled:bg-gray-100"
                  value={form.reason_l2_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      reason_l2_id: e.target.value,
                    })
                  }
                >
                  <option value="">-- Chọn cấp 2 --</option>
                  {reasonL2List.map((r) => (
                    <option key={r.reason_l2_id} value={r.reason_l2_id}>
                      {r.reason_l2}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Trạng thái KH">
                <input
                  className="input"
                  value={form.customer_status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customer_status: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Kết quả xử lý">
                <select
                  className="input"
                  value={form.recovery_result}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      recovery_result: e.target.value,
                    })
                  }
                >
                  <option value="">-- Chọn kết quả --</option>
                  <option value="RECOVERED">Đã khôi phục</option>
                  <option value="FAILED">Không khôi phục</option>
                  <option value="PENDING">Đang theo dõi</option>
                  <option value="FOLLOW_UP">Cần xử lý tiếp</option>
                </select>
              </Field>

              <Field label="Phương án xử lý">
                <input
                  className="input"
                  value={form.solution_plan}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      solution_plan: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Hành động đã thực hiện">
                <input
                  className="input"
                  value={form.action_taken}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      action_taken: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Ngày hẹn xử lý tiếp">
                <input
                  type="date"
                  className="input"
                  value={form.next_action_date}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      next_action_date: e.target.value,
                    })
                  }
                />
              </Field>

              <div className="col-span-2">
                <label className="block font-semibold mb-2">Ghi chú</label>
                <textarea
                  className="input min-h-[100px]"
                  value={form.note}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      note: e.target.value,
                    })
                  }
                />
              </div>

              {message && (
                <div className="col-span-2 bg-yellow-100 text-yellow-800 rounded-lg p-3">
                  {message}
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setSelected(null)}
                className="border rounded-lg px-5 py-2 font-semibold"
              >
                Đóng
              </button>

              <button
                onClick={saveRecovery}
                disabled={saving || Boolean(isClosed)}
                className="bg-blue-600 text-white rounded-lg px-5 py-2 font-semibold disabled:bg-gray-400"
              >
                {saving ? "Đang lưu..." : "Lưu cập nhật"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function norm(v?: string) {
  return String(v || "").trim().toUpperCase();
}

function showContact(v?: string) {
  if (!v) return "Chưa tiếp xúc";
  if (v === "CONTACTED") return "Đã tiếp xúc";
  if (v === "NO_ANSWER") return "Không nghe máy";
  if (v === "CALLBACK") return "Hẹn gọi lại";
  if (v === "INVALID_PHONE") return "Sai số";
  return v;
}

function showResult(v?: string) {
  if (!v) return "";
  if (v === "RECOVERED") return "Đã khôi phục";
  if (v === "FAILED") return "Không khôi phục";
  if (v === "PENDING") return "Đang theo dõi";
  if (v === "FOLLOW_UP") return "Cần xử lý tiếp";
  return v;
}

function showWorkflow(v?: string) {
  if (!v || v === "NEW") return "Chưa xử lý";
  if (v === "PROCESSING") return "Đang xử lý";
  if (v === "CALLBACK") return "Hẹn lại";
  if (v === "COMPLETED") return "Hoàn thành";
  if (v === "FAILED") return "Không khôi phục";
  return v;
}

function formatDate(v?: string) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString("vi-VN");
}

function Th({ children }: any) {
  return (
    <th className="text-left p-4 font-bold whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children, bold }: any) {
  return (
    <td className={`p-4 whitespace-nowrap ${bold ? "font-bold" : ""}`}>
      {children}
    </td>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="block font-semibold mb-2">{label}</label>
      {children}
    </div>
  );
}