"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("ftth_token");
    const userText = localStorage.getItem("ftth_user");

    if (!token || !userText) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userText));
  }, [router]);

  function logout() {
    localStorage.removeItem("ftth_token");
    localStorage.removeItem("ftth_user");
    router.push("/login");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const token = localStorage.getItem("ftth_token");

    if (!token) {
      router.push("/login");
      return;
    }

    if (!currentPassword.trim()) {
      setError("Vui lòng nhập mật khẩu hiện tại");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "changePassword",
          token,
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();

      if (data.status !== "OK") {
        setError(data.message || "Không đổi được mật khẩu");
        return;
      }

      localStorage.setItem("ftth_token", data.token || token);
      localStorage.setItem("ftth_user", JSON.stringify(data.user));

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-xl p-8 w-[460px]"
      >
        <h1 className="text-3xl font-black text-center mb-2">
          Đổi mật khẩu
        </h1>

        <p className="text-center text-gray-500 mb-6">
          {user?.full_name || user?.username || "User"} cần đổi mật khẩu trước khi sử dụng hệ thống.
        </p>

        <label className="block mb-2 font-semibold">Mật khẩu hiện tại</label>
        <input
          type="password"
          className="w-full border rounded-lg p-3 mb-4"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />

        <label className="block mb-2 font-semibold">Mật khẩu mới</label>
        <input
          type="password"
          className="w-full border rounded-lg p-3 mb-4"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <label className="block mb-2 font-semibold">Nhập lại mật khẩu mới</label>
        <input
          type="password"
          className="w-full border rounded-lg p-3 mb-4"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {error && (
          <div className="bg-red-100 text-red-700 rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg p-3 font-bold disabled:opacity-50"
        >
          {loading ? "Đang cập nhật..." : "Đổi mật khẩu"}
        </button>

        <button
          type="button"
          onClick={logout}
          className="w-full mt-3 bg-slate-100 text-slate-700 rounded-lg p-3 font-bold"
        >
          Đăng xuất
        </button>
      </form>
    </main>
  );
}
