"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";

type ImportRow = {
  vtkv: string;
  cnkd: string;
  account: string;
  phone: string;
  suspend_date: string;
  suspend_reason: string;
};

export default function ImportPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("ftth_token");
    const userText = localStorage.getItem("ftth_user");

    if (!token || !userText) {
      router.push("/login");
      return;
    }

    const u = JSON.parse(userText);
    setUser(u);

    if (String(u.role || "").toUpperCase() !== "CN") {
      setMessage("Chỉ tài khoản CN/Admin được quyền import dữ liệu");
    }
  }, [router]);

  function normalizeReason(v: string) {
    const s = String(v || "").trim();
    const x = s.toLowerCase().replace(/\s+/g, "");

    if (x === "khyc" || x==="Chặn 1C KHYC") return "Chặn 1C KHYC";
    if (x === "nợcước" || x === "Chặn 1C nợ cước") return "Chặn 1C nợ cước";
    if (x === "khyc+nc" || x === "Chặn 1C KHYC, chặn 1C nợ cước" || x === "Chặn 1C KHYC, chặn 1C nợ cước") {
      return "Chặn 1C KHYC, chặn 1C nợ cước";
    }

    return s;
  }

  function handleFile(file: File) {
    setResult(null);
    setMessage("");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const data = (res.data as any[]).map((r) => ({
          vtkv: String(r.vtkv || "").trim(),
          cnkd: String(r.cnkd || "").trim(),
          account: String(r.account || "").trim(),
          phone: String(r.phone || "").trim(),
          suspend_date: String(r.suspend_date || "").trim(),
          suspend_reason: normalizeReason(r.suspend_reason || ""),
        }));

        setRows(data);
      },
      error: (err) => {
        setMessage("Lỗi đọc file CSV: " + err.message);
      },
    });
  }

  function downloadTemplate() {
    const csv = [
      "vtkv,cnkd,account,phone,suspend_date,suspend_reason",
      "TTI,DUCHV_HNI_CNKD,h004_gftth_001,,01-06-2026,KHYC",
      "TTI,DUCHV_HNI_CNKD,h004_gftth_002,,01-06-2026,Nợ cước",
      "TTI,DUCHV_HNI_CNKD,h004_gftth_003,,01-06-2026,KHYC+NC",
    ].join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "template_import_subscribers.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  async function doImport() {
    const token = localStorage.getItem("ftth_token");

    if (!token) {
      router.push("/login");
      return;
    }

    if (String(user?.role || "").toUpperCase() !== "CN") {
      setMessage("Chỉ tài khoản CN/Admin được quyền import dữ liệu");
      return;
    }

    if (rows.length === 0) {
      setMessage("Chưa có dữ liệu import");
      return;
    }

    const invalid = rows.filter(
      (r) =>
        !r.vtkv ||
        !r.cnkd ||
        !r.account ||
        !r.suspend_date ||
        !["KHYC", "Nợ cước", "KHYC+NC"].includes(r.suspend_reason)
    );

    if (invalid.length > 0) {
      setMessage(
        `Có ${invalid.length} dòng thiếu dữ liệu hoặc sai lý do tạm ngưng`
      );
      return;
    }

    setLoading(true);
    setMessage("");
    setResult(null);

    try {
      const res = await fetch("/api/proxy", {
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
        setMessage(`Import hoàn tất: ${data.success || 0} thuê bao`);
      } else {
        setMessage(data.message || "Import không thành công");
      }
    } catch (err: any) {
      setMessage("Lỗi import: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black">Import thuê bao tạm ngưng</h1>
            <p className="text-slate-500 mt-1">
              Chỉ tài khoản CN/Admin được import dữ liệu.
            </p>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="bg-black text-white px-5 py-3 rounded-xl font-bold"
          >
            Dashboard
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
          <div className="font-bold mb-2">Cấu trúc file CSV</div>

          <pre className="text-sm whitespace-pre-wrap">
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

        <div className="flex flex-wrap gap-3 items-center mb-5">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="border rounded-xl px-4 py-3 bg-white"
          />

          <button
            onClick={downloadTemplate}
            className="bg-slate-700 text-white px-5 py-3 rounded-xl font-bold"
          >
            Tải file mẫu
          </button>

          <button
            onClick={doImport}
            disabled={loading || rows.length === 0}
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold disabled:bg-gray-400"
          >
            {loading ? "Đang import..." : "Import dữ liệu"}
          </button>
        </div>

        {message && (
          <div
            className={`rounded-xl p-4 mb-5 ${
              result?.status === "OK"
                ? "bg-green-50 text-green-700"
                : "bg-yellow-50 text-yellow-800"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mb-3 font-bold">
          Preview ({rows.length} records)
        </div>

        <div className="overflow-auto border rounded-xl bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">STT</th>
                <th className="p-3 text-left">VTKV</th>
                <th className="p-3 text-left">CNKD</th>
                <th className="p-3 text-left">Account</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">Ngày TN</th>
                <th className="p-3 text-left">Lý do TN</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    Chưa có dữ liệu preview
                  </td>
                </tr>
              ) : (
                rows.slice(0, 100).map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3 font-bold">{r.vtkv}</td>
                    <td className="p-3">{r.cnkd}</td>
                    <td className="p-3 font-bold">{r.account}</td>
                    <td className="p-3">{r.phone}</td>
                    <td className="p-3">{r.suspend_date}</td>
                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          r.suspend_reason === "KHYC"
                            ? "bg-blue-50 text-blue-700"
                            : r.suspend_reason === "Nợ cước"
                            ? "bg-orange-50 text-orange-700"
                            : r.suspend_reason === "KHYC+NC"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {r.suspend_reason || "Thiếu lý do"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

            {Array.isArray(result.errors) && result.errors.length > 0 && (
              <div className="mt-3">
                <div className="font-bold mb-2">Chi tiết lỗi</div>

                <ul className="list-disc pl-6 text-sm text-red-700">
                  {result.errors.slice(0, 20).map((e: any, i: number) => (
                    <li key={i}>
                      Dòng {e.row}: {e.account} - {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}