"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!username.trim()) {
      setError("Vui lòng nhập tài khoản");
      return;
    }

    if (!password.trim()) {
      setError("Vui lòng nhập mật khẩu");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/proxy?action=login&username=${encodeURIComponent(
          username.trim()
        )}&password=${encodeURIComponent(password)}`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (data.status !== "OK") {
        setError(data.message || "Đăng nhập không thành công");
        return;
      }

      localStorage.setItem("ftth_token", data.token);
      localStorage.setItem("ftth_user", JSON.stringify(data.user));

      if (
        data.user?.must_change_password === true ||
        String(data.user?.must_change_password || "").toUpperCase() === "TRUE"
      ) {
        router.push("/change-password");
        return;
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <form
        onSubmit={handleLogin}
        className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-slate-900">
            FTTH Recovery
          </h1>

          <p className="text-slate-500 mt-2">
            Đăng nhập hệ thống quản lý khôi phục thuê bao
          </p>
        </div>

        <label className="block mb-2 font-bold text-slate-700">
          Tài khoản
        </label>

        <input
          type="text"
          autoComplete="username"
          placeholder="Nhập tài khoản"
          className="w-full border border-slate-300 rounded-xl p-3 mb-5 outline-none focus:border-blue-500"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label className="block mb-2 font-bold text-slate-700">
          Mật khẩu
        </label>

        <input
          type="password"
          autoComplete="current-password"
          placeholder="Nhập mật khẩu"
          className="w-full border border-slate-300 rounded-xl p-3 mb-5 outline-none focus:border-blue-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <div className="bg-red-100 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white rounded-xl p-3 font-bold disabled:opacity-50"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        <div className="text-center text-xs text-slate-400 mt-5">
          FTTH Recovery Dashboard
        </div>
      </form>
    </main>
  );
}