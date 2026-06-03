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
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 30;

  const [selected, setSelected] = useState<Subscriber | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [form, setForm] = useState({
    phone: "",
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    setPage(1);
  }, [filter, filterVTKV]);

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
    const k = debouncedKeyword.trim().toLowerCase();

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
  }, [rows, debouncedKeyword, filter, filterVTKV]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const pagedRows = useMemo(() => {
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, totalPages]);

  const pageStart = filteredRows.length === 0 ? 0 : (Math.min(page, totalPages) - 1) * pageSize + 1;
  const pageEnd = Math.min(Math.min(page, totalPages) * pageSize, filteredRows.length);

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
      phone: row.phone || "",
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

    if (!normalizePhoneText(form.phone)) {
      setMessage("Thuê bao chưa có số điện thoại. Vui lòng nhập bổ sung số điện thoại trước khi cập nhật.");
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
          phone: normalizePhoneText(form.phone),
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

  function goMobile(path: string) {
    setMobileMenuOpen(false);
    router.push(path);
  }

  function logoutMobile() {
    localStorage.removeItem("ftth_token");
    localStorage.removeItem("ftth_user");
    setMobileMenuOpen(false);
    router.push("/login");
  }


  return (
    <main className="min-h-screen bg-gray-100 p-3 md:p-8">
      <MobileHeader
        title={getFilterTitle()}
        subtitle={`${user?.full_name || ""} | ${user?.role || ""} | ${user?.scope_code || ""}`}
        total={filteredRows.length}
        onMenuClick={() => setMobileMenuOpen(true)}
      />

      <MobileDrawer
        open={mobileMenuOpen}
        user={user}
        onClose={() => setMobileMenuOpen(false)}
        onGo={goMobile}
        onLogout={logoutMobile}
      />

      <div className="hidden md:block rounded-3xl bg-gradient-to-r from-[#007f73] via-[#009688] to-[#00a896] text-white p-6 shadow-xl mb-6">
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

      <MobileFilter
        keyword={keyword}
        onKeywordChange={setKeyword}
        filter={filter}
        onFilterChange={setFilter}
        filterVTKV={filterVTKV}
        onFilterVTKVChange={setFilterVTKV}
        rows={rows}
        onExport={exportCsv}
      />

      <div className="hidden md:block bg-white rounded-2xl shadow p-6 mb-6">
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

      <div className="md:hidden space-y-3 mt-4">
        {loading ? (
          <div className="bg-white rounded-2xl shadow p-6">Đang tải dữ liệu...</div>
        ) : filteredRows.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-6 text-center text-gray-500">
            Không có dữ liệu
          </div>
        ) : (
          pagedRows.map((r, idx) => (
            <MobileSubscriberCard
              key={`${r.account}-${idx}`}
              row={r}
              index={pageStart + idx - 1}
              onUpdate={openUpdate}
            />
          ))
        )}
      </div>

      <div className="hidden md:block bg-white rounded-2xl shadow overflow-hidden">
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
                  pagedRows.map((r, idx) => (
                    <tr
                      key={`${r.account}-${idx}`}
                      className="border-t hover:bg-gray-50"
                    >
                      <Td>{pageStart + idx}</Td>
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

      {!loading && filteredRows.length > 0 && (
        <PaginationBar
          page={Math.min(page, totalPages)}
          totalPages={totalPages}
          pageStart={pageStart}
          pageEnd={pageEnd}
          total={filteredRows.length}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-6 z-[1000]">
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full md:w-[760px] max-h-[95vh] overflow-auto">
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

            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {!normalizePhoneText(selected.phone) && (
                <Field label="Bổ sung số điện thoại KH">
                  <input
                    className="input"
                    value={form.phone}
                    placeholder="Nhập SĐT để gọi và lưu cập nhật"
                    onChange={(e) =>
                      setForm({
                        ...form,
                        phone: e.target.value,
                      })
                    }
                  />
                </Field>
              )}

              {normalizePhoneText(form.phone) && (
                <div className="flex items-end">
                  <a
                    href={`tel:${normalizePhoneText(form.phone)}`}
                    className="w-full rounded-lg bg-green-600 text-white px-5 py-3 font-bold text-center"
                  >
                    Gọi ngay
                  </a>
                </div>
              )}

              {!normalizePhoneText(form.phone) && (
                <div className="flex items-end">
                  <div className="w-full rounded-lg bg-yellow-50 text-yellow-800 px-4 py-3 text-sm font-semibold">
                    Thuê bao chưa có SĐT, bắt buộc nhập bổ sung trước khi lưu.
                  </div>
                </div>
              )}

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

              <div className="md:col-span-2">
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
                <div className="md:col-span-2 bg-yellow-100 text-yellow-800 rounded-lg p-3">
                  {message}
                </div>
              )}
            </div>

            <div className="p-4 md:p-6 border-t flex flex-col-reverse md:flex-row md:justify-end gap-3">
              <button
                onClick={() => setSelected(null)}
                className="border rounded-lg px-5 py-3 md:py-2 font-semibold"
              >
                Đóng
              </button>

              <button
                onClick={saveRecovery}
                disabled={saving || Boolean(isClosed)}
                className="bg-blue-600 text-white rounded-lg px-5 py-3 md:py-2 font-semibold disabled:bg-gray-400"
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



function PaginationBar({
  page,
  totalPages,
  pageStart,
  pageEnd,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 bg-white rounded-2xl shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="text-sm text-slate-600 font-semibold">
        Hiển thị <b>{pageStart}</b> - <b>{pageEnd}</b> / <b>{total}</b> thuê bao
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
          className="flex-1 md:flex-none rounded-xl border px-4 py-3 md:py-2 font-bold disabled:opacity-40"
        >
          Trước
        </button>

        <div className="px-4 py-2 font-black text-slate-700">
          {page}/{totalPages}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          className="flex-1 md:flex-none rounded-xl border px-4 py-3 md:py-2 font-bold disabled:opacity-40"
        >
          Sau
        </button>
      </div>
    </div>
  );
}

function MobileHeader({
  title,
  subtitle,
  total,
  onMenuClick,
}: {
  title: string;
  subtitle?: string;
  total: number;
  onMenuClick: () => void;
}) {
  return (
    <header className="md:hidden sticky top-0 z-40 bg-gradient-to-r from-[#007f73] via-[#009688] to-[#00a896] text-white rounded-2xl shadow-xl mb-4">
      <div className="px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
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
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs opacity-90 truncate">{subtitle}</p>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] opacity-80">Tổng</div>
          <div className="text-2xl font-black">{total}</div>
        </div>
      </div>
    </header>
  );
}

function MobileDrawer({
  open,
  user,
  onClose,
  onGo,
  onLogout,
}: {
  open: boolean;
  user: any;
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
            <div className="text-xl font-black text-slate-900">Recovery</div>
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
          <MobileNav label="Dashboard" onClick={() => onGo("/dashboard")} />
          <MobileNav active label="Danh sách thuê bao" onClick={() => onGo("/subscribers")} />
          <MobileNav label="Import dữ liệu" onClick={() => onGo("/import")} />
          <MobileNav label="Cấu hình lý do" onClick={() => onGo("/reason-config")} />
          <MobileNav label="Đổi mật khẩu" onClick={() => onGo("/change-password")} />
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

function MobileNav({ label, active, onClick }: any) {
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

function MobileFilter({
  keyword,
  onKeywordChange,
  filter,
  onFilterChange,
  filterVTKV,
  onFilterVTKVChange,
  rows,
  onExport,
}: {
  keyword: string;
  onKeywordChange: (v: string) => void;
  filter: string;
  onFilterChange: (v: string) => void;
  filterVTKV: string;
  onFilterVTKVChange: (v: string) => void;
  rows: Subscriber[];
  onExport: () => void;
}) {
  const vtkvOptions = Array.from(
    new Set(rows.map((r) => r.vtkv).filter(Boolean))
  ).sort();

  return (
    <section className="md:hidden bg-white rounded-2xl shadow p-4 space-y-3">
      <input
        value={keyword}
        onChange={(e) => onKeywordChange(e.target.value)}
        placeholder="Tìm Account, SĐT, CNKD..."
        className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
      />

      <div className="grid grid-cols-2 gap-3">
        <select
          value={filterVTKV}
          onChange={(e) => onFilterVTKVChange(e.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-3 bg-white"
        >
          <option value="ALL">Tất cả VTKV</option>
          {vtkvOptions.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>

        <select
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-3 bg-white"
        >
          <option value="all">Tất cả</option>
          <option value="not_contacted">Chưa tiếp xúc</option>
          <option value="contacted">Đã tiếp xúc</option>
          <option value="pending">Đang xử lý</option>
          <option value="recovered">Đã khôi phục</option>
          <option value="failed">Không khôi phục</option>
          <option value="closed">Đã đóng việc</option>
        </select>
      </div>

      <button
        type="button"
        onClick={onExport}
        className="w-full rounded-xl bg-green-600 text-white font-black py-3"
      >
        Export CSV
      </button>
    </section>
  );
}

function MobileSubscriberCard({
  row,
  index,
  onUpdate,
}: {
  row: Subscriber;
  index: number;
  onUpdate: (row: Subscriber) => void;
}) {
  const isDone = norm(row.latest_workflow_status) === "COMPLETED";
  const reasonText =
    row.latest_reason_l2_name || row.latest_reason_l1_name || "Chưa cập nhật";
  const phone = normalizePhoneText(row.phone);

  return (
    <article className="bg-white rounded-2xl shadow border border-slate-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-slate-400 font-bold">
            #{index + 1} · {row.vtkv || ""}
          </div>
          <h3 className="font-black text-base text-slate-900 mt-1 break-all">
            {row.account || ""}
          </h3>
          <div className="text-xs text-slate-500 mt-1 break-all">
            CNKD: <b>{row.cnkd || ""}</b>
          </div>
        </div>

        <MobileStatusBadge row={row} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
        <MobileInfo
          label="Ngày TN"
          value={formatShortDate(row.suspend_date) || "—"}
        />

        <MobileInfo
          label="Số ngày TN"
          value={String(row.days_suspend || "—")}
        />

        <MobileInfo
          label="Tiếp xúc"
          value={showContact(row.latest_contact_status)}
        />

        <MobileInfo
          label="Kết quả"
          value={showResult(row.latest_recovery_result) || "Chưa cập nhật"}
        />
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <div className="text-xs text-slate-500 font-bold mb-1">Nguyên nhân</div>
        <div className="text-sm font-bold text-slate-800">{reasonText}</div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2">
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="w-full rounded-xl bg-green-600 text-white font-black py-3 text-center active:scale-[0.99]"
          >
            Gọi điện
          </a>
        ) : (
          <button
            type="button"
            onClick={() => onUpdate(row)}
            className="w-full rounded-xl bg-yellow-500 text-white font-black py-3 active:scale-[0.99]"
          >
            Bổ sung SĐT
          </button>
        )}

        <button
          type="button"
          disabled={isDone}
          onClick={() => onUpdate(row)}
          className={`w-full rounded-xl text-white font-black py-3 active:scale-[0.99] ${
            isDone ? "bg-gray-400" : "bg-blue-600"
          }`}
        >
          {isDone ? "Đã đóng" : "Cập nhật nguyên nhân"}
        </button>
      </div>
    </article>
  );
}

function MobileStatusBadge({ row }: { row: Subscriber }) {
  const workflow = norm(row.latest_workflow_status);
  const result = norm(row.latest_recovery_result);
  const contact = norm(row.latest_contact_status);

  let label = "Chưa tiếp xúc";
  let cls = "bg-orange-50 text-orange-700";

  if (contact === "CONTACTED") {
    label = "Đã tiếp xúc";
    cls = "bg-blue-50 text-blue-700";
  }

  if (result === "RECOVERED") {
    label = "Đã khôi phục";
    cls = "bg-green-50 text-green-700";
  }

  if (workflow === "COMPLETED") {
    label = "Đã đóng việc";
    cls = "bg-slate-100 text-slate-700";
  }

  return (
    <span className={`shrink-0 px-3 py-2 rounded-full text-xs font-black ${cls}`}>
      {label}
    </span>
  );
}

function MobileInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-[11px] text-slate-500 font-bold">{label}</div>
      <div className="font-black text-slate-900 mt-1 break-all">{value}</div>
    </div>
  );
}

function formatShortDate(v?: string) {
  if (!v) return "";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  return s;
}

function normalizePhoneText(v?: string) {
  let p = String(v || "").trim();
  if (!p) return "";
  p = p.replace(/[^\d]/g, "");
  if (p.length === 9 && p.charAt(0) !== "0") p = "0" + p;
  return p;
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