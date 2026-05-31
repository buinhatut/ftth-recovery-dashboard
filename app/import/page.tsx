"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppMenu from "../components/AppMenu";

type ImportRow = {
  vtkv: string;
  cnkd: string;
  account: string;
  phone: string;
  suspend_date: string;
};

export default function ImportPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState("");

  const [rows, setRows] = useState<ImportRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("ftth_token");
    const savedUser = localStorage.getItem("ftth_user");

    if (!savedToken || !savedUser) {
      router.push("/login");
      return;
    }

    const u = JSON.parse(savedUser);

    if (String(u.role).toUpperCase() !== "CN") {
      router.push("/dashboard");
      return;
    }

    setToken(savedToken);
    setUser(u);
  }, [router]);

  function handleFile(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const text = String(reader.result || "");

      const parsed = parseCsv(text);

      setRows(parsed);

      setMessage(
        `Đã đọc ${parsed.length} dòng dữ liệu`
      );
    };

    reader.readAsText(file, "UTF-8");
  }

  function parseCsv(text: string): ImportRow[] {
    const lines = text
      .split(/\r?\n/)
      .filter((x) => x.trim());

    if (lines.length < 2) return [];

    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().toLowerCase());

    return lines.slice(1).map((line) => {
      const cols = line
        .split(",")
        .map((c) => c.trim());

      const obj: any = {};

      headers.forEach((h, i) => {
        obj[h] = cols[i] || "";
      });

      return {
        vtkv: obj.vtkv || "",
        cnkd: obj.cnkd || "",
        account: obj.account || "",
        phone: obj.phone || "",
        suspend_date:
          obj.suspend_date || "",
      };
    });
  }

  async function submitImport() {
    if (!rows.length) {
      setMessage(
        "Chưa có dữ liệu để import"
      );
      return;
    }

    setLoading(true);

    setMessage("");

    try {
      const res = await fetch(
        "/api/proxy",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            action: "importSubscribers",
            token,
            rows,
          }),
        }
      );

      const data = await res.json();

      if (data.status !== "OK") {
        setMessage(
          data.message || "Import lỗi"
        );
        return;
      }

      setMessage(
        `Import hoàn tất:
Thành công ${data.success}
Trùng ${data.duplicate}
Lỗi ${data.error_count}`
      );

      setRows([]);
    } catch (err: any) {
      setMessage(
        "Lỗi: " + err.message
      );
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate() {
    const csv =
      "vtkv,cnkd,account,phone,suspend_date\n" +
      "STY,utbv,h004_xxx,098xxxx,2026-06-15\n";

    const blob = new Blob(
      ["\ufeff" + csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download =
      "template_import_subscribers.csv";

    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="rounded-3xl bg-gradient-to-r from-[#007f73] via-[#009688] to-[#00a896] text-white p-6 shadow-xl mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="uppercase tracking-[0.25em] text-sm text-white/80">
              FTTH Recovery Dashboard
            </p>

            <h1 className="text-4xl font-black mt-2">
              Import thuê bao tạm ngưng
            </h1>

            <p className="mt-3 text-white/90">
              {user?.full_name} |
              {" "}
              {user?.role}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={downloadTemplate}
              className="bg-green-600 text-white rounded-xl px-5 py-3 font-bold shadow"
            >
              Tải file mẫu
            </button>

            <AppMenu user={user} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <p className="font-semibold mb-3">
          Chọn file CSV
        </p>

        <input
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="border rounded-lg p-3 w-full"
        />

        <p className="text-sm text-gray-500 mt-3">
          File phải có cột:
        </p>

        <div className="bg-gray-100 rounded-lg p-3 mt-2 font-mono text-sm">
          vtkv, cnkd, account,
          phone, suspend_date
        </div>
      </div>

      {message && (
        <div className="bg-yellow-100 text-yellow-800 rounded-xl p-4 mb-6 whitespace-pre-line">
          {message}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">
              Preview dữ liệu
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Hiển thị tối đa 100 dòng
            </p>
          </div>

          <button
            onClick={submitImport}
            disabled={
              loading ||
              rows.length === 0
            }
            className="bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold disabled:bg-gray-400"
          >
            {loading
              ? "Đang Import..."
              : "Import dữ liệu"}
          </button>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <Th>STT</Th>
                <Th>VTKV</Th>
                <Th>CNKD</Th>
                <Th>Account</Th>
                <Th>Phone</Th>
                <Th>Ngày tạm ngưng</Th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-gray-500"
                  >
                    Chưa có dữ liệu
                  </td>
                </tr>
              ) : (
                rows
                  .slice(0, 100)
                  .map((r, i) => (
                    <tr
                      key={`${r.account}-${i}`}
                      className="border-t hover:bg-gray-50"
                    >
                      <Td>{i + 1}</Td>
                      <Td>{r.vtkv}</Td>
                      <Td>{r.cnkd}</Td>
                      <Td bold>
                        {r.account}
                      </Td>
                      <Td>{r.phone}</Td>
                      <Td>
                        {r.suspend_date}
                      </Td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function Th({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="text-left p-4 font-bold whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({
  children,
  bold,
}: {
  children: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <td
      className={`p-4 whitespace-nowrap ${
        bold
          ? "font-bold"
          : ""
      }`}
    >
      {children}
    </td>
  );
}