"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("admin_hni");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/proxy?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (data.status !== "OK") {
        setError(data.message || "Đăng nhập không thành công");
        return;
      }

      localStorage.setItem("ftth_token", data.token);
      localStorage.setItem("ftth_user", JSON.stringify(data.user));

      if (data.user?.must_change_password === true) {
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
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white rounded-2xl shadow-xl p-8 w-[420px]"
      >
        <h1 className="text-3xl font-bold text-center mb-2">
          FTTH Recovery
        </h1>

        <p className="text-center text-gray-500 mb-8">
          Đăng nhập hệ thống
        </p>

        <label className="block mb-2 font-semibold">Tài khoản</label>
        <input
          className="w-full border rounded-lg p-3 mb-4"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label className="block mb-2 font-semibold">Mật khẩu</label>
        <input
          type="password"
          className="w-full border rounded-lg p-3 mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <div className="bg-red-100 text-red-700 rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white rounded-lg p-3 font-bold disabled:opacity-50"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </main>
  );
}
