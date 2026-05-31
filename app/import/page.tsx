"use client";

import { useState } from "react";
import Papa from "papaparse";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export default function ImportPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  function handleFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setRows(res.data as any[]);
      },
    });
  }

  async function doImport() {
    const token = localStorage.getItem("ftth_token");

    if (!token) {
      alert("Hết phiên đăng nhập");
      return;
    }

    if (rows.length === 0) {
      alert("Chưa có dữ liệu");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "importSubscribers",
          token,
          rows,
        }),
      });

      const data = await res.json();

      setResult(data);

      if (data.status === "OK") {
        alert(
          `Import thành công ${data.success} thuê bao`
        );
      } else {
        alert(data.message);
      }
    } catch (err: any) {
      alert(err.message);
    }

    setLoading(false);
  }

  return (
    <main className="p-6">
      <div className="bg-white rounded-2xl shadow p-6">

        <h1 className="text-2xl font-black mb-4">
          Import thuê bao tạm ngưng
        </h1>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="font-bold mb-2">
            Cấu trúc file CSV
          </div>

          <pre className="text-sm">
{`vtkv,cnkd,account,phone,suspend_date,suspend_reason

TTI,DUCHV_HNI_CNKD,h004_gftth_001,,01-06-2026,KHYC
TTI,DUCHV_HNI_CNKD,h004_gftth_002,,01-06-2026,Nợ cước
TTI,DUCHV_HNI_CNKD,h004_gftth_003,,01-06-2026,KHYC+NC`}
          </pre>

          <div className="mt-3 text-sm">
            Giá trị hợp lệ:
            <b> KHYC </b>,
            <b> Nợ cước </b>,
            <b> KHYC+NC </b>
          </div>
        </div>

        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFile(file);
            }
          }}
        />

        <div className="mt-4">
          <button
            onClick={doImport}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold"
          >
            {loading ? "Đang import..." : "Import dữ liệu"}
          </button>
        </div>

        <div className="mt-6">
          <div className="font-bold mb-2">
            Preview ({rows.length} records)
          </div>

          <div className="overflow-auto border rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2">VTKV</th>
                  <th className="p-2">CNKD</th>
                  <th className="p-2">Account</th>
                  <th className="p-2">Phone</th>
                  <th className="p-2">Ngày TN</th>
                  <th className="p-2">Lý do TN</th>
                </tr>
              </thead>

              <tbody>
                {rows.slice(0, 20).map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{r.vtkv}</td>
                    <td className="p-2">{r.cnkd}</td>
                    <td className="p-2">{r.account}</td>
                    <td className="p-2">{r.phone}</td>
                    <td className="p-2">{r.suspend_date}</td>
                    <td className="p-2">
                      {r.suspend_reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {result && (
          <div className="mt-6 bg-slate-50 rounded-xl p-4">
            <div>
              Thành công:
              <b> {result.success || 0}</b>
            </div>

            <div>
              Trùng:
              <b> {result.duplicate || 0}</b>
            </div>

            <div>
              Lỗi:
              <b> {result.error_count || 0}</b>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}