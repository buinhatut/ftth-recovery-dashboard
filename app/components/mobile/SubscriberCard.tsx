"use client";

type Props = {
  row: any;
  index: number;
  onUpdate?: (row: any) => void;
};

export default function SubscriberCard({ row, index, onUpdate }: Props) {
  const contactStatus = row.latest_contact_status || row.contact_status || "NOT_CONTACTED";
  const workflowStatus = row.latest_workflow_status || row.workflow_status || "NEW";
  const recoveryResult = row.latest_recovery_result || row.recovery_result || "";

  const reason1 = row.latest_reason_l1_name || row.latest_reason_l1 || "";
  const reason2 = row.latest_reason_l2_name || row.latest_reason_l2 || "";

  return (
    <article className="md:hidden bg-white rounded-2xl shadow border border-slate-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-slate-400 font-bold">#{index + 1} · {row.vtkv || ""}</div>
          <h3 className="font-black text-base text-slate-900 mt-1 break-all">{row.account || ""}</h3>
          <div className="text-xs text-slate-500 mt-1 break-all">CNKD: <b>{row.cnkd || ""}</b></div>
        </div>

        <StatusBadge
          contactStatus={contactStatus}
          workflowStatus={workflowStatus}
          recoveryResult={recoveryResult}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
        <Info label="SĐT" value={row.phone || "—"} />
        <Info label="Ngày TN" value={formatDateText(row.suspend_date) || "—"} />
        <Info label="Số ngày TN" value={String(row.days_suspend || "—")} />
        <Info label="Tiếp xúc" value={contactStatus === "CONTACTED" ? "Đã tiếp xúc" : "Chưa tiếp xúc"} />
      </div>

      {(reason1 || reason2) && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <div className="text-xs text-slate-500 font-bold mb-1">Nguyên nhân</div>
          <div className="text-sm font-bold text-slate-800">
            {[reason1, reason2].filter(Boolean).join(" / ")}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => onUpdate?.(row)}
        className="mt-4 w-full rounded-xl bg-blue-600 text-white font-black py-3 active:scale-[0.99]"
      >
        Cập nhật
      </button>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-[11px] text-slate-500 font-bold">{label}</div>
      <div className="font-black text-slate-900 mt-1 break-all">{value}</div>
    </div>
  );
}

function StatusBadge({ contactStatus, workflowStatus, recoveryResult }: any) {
  const wf = String(workflowStatus || "").toUpperCase();
  const rr = String(recoveryResult || "").toUpperCase();
  const cs = String(contactStatus || "").toUpperCase();

  let label = "Chưa tiếp xúc";
  let cls = "bg-orange-50 text-orange-700";

  if (cs === "CONTACTED") {
    label = "Đã tiếp xúc";
    cls = "bg-blue-50 text-blue-700";
  }

  if (rr === "RECOVERED") {
    label = "Đã khôi phục";
    cls = "bg-green-50 text-green-700";
  }

  if (wf === "COMPLETED") {
    label = "Đã đóng việc";
    cls = "bg-slate-100 text-slate-700";
  }

  return <span className={`shrink-0 px-3 py-2 rounded-full text-xs font-black ${cls}`}>{label}</span>;
}

function formatDateText(v: any) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  return s;
}
