"use client";

import SubscriberCard from "./SubscriberCard";

type Props = {
  rows: any[];
  onUpdate?: (row: any) => void;
};

export default function ResponsiveSubscriberList({ rows, onUpdate }: Props) {
  return (
    <>
      <div className="md:hidden space-y-3">
        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-slate-500">Không có dữ liệu</div>
        ) : (
          rows.map((row, index) => (
            <SubscriberCard
              key={row.account || index}
              row={row}
              index={index}
              onUpdate={onUpdate}
            />
          ))
        )}
      </div>

      <div className="hidden md:block overflow-auto bg-white rounded-2xl shadow">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
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
              <Th>Thao tác</Th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => (
              <tr key={r.account || i} className="border-t">
                <Td>{i + 1}</Td>
                <Td bold>{r.vtkv}</Td>
                <Td>{r.cnkd}</Td>
                <Td bold>{r.account}</Td>
                <Td>{r.phone}</Td>
                <Td>{String(r.suspend_date || "").slice(0, 10)}</Td>
                <Td>{r.days_suspend}</Td>
                <Td>{r.latest_contact_status === "CONTACTED" ? "Đã tiếp xúc" : "Chưa tiếp xúc"}</Td>
                <Td>{[r.latest_reason_l1_name, r.latest_reason_l2_name].filter(Boolean).join(" / ")}</Td>
                <Td>{r.latest_recovery_result || ""}</Td>
                <Td>{r.latest_workflow_status || "NEW"}</Td>
                <Td>
                  <button
                    onClick={() => onUpdate?.(r)}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold"
                  >
                    Cập nhật
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Th({ children }: any) {
  return <th className="p-3 text-left font-black whitespace-nowrap">{children}</th>;
}

function Td({ children, bold }: any) {
  return <td className={`p-3 whitespace-nowrap ${bold ? "font-bold" : ""}`}>{children}</td>;
}
