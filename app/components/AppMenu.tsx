"use client";

import { useRouter } from "next/navigation";

export default function AppMenu({ user }: { user: any }) {
  const router = useRouter();
  const role = String(user?.role || "").toUpperCase();

  function logout() {
    localStorage.removeItem("ftth_token");
    localStorage.removeItem("ftth_user");
    router.push("/login");
  }

  return (
    <div className="flex items-center gap-3 flex-wrap justify-end">
      <button
        onClick={() => router.push("/dashboard")}
        className="bg-white text-[#007f73] rounded-xl px-5 py-3 font-bold shadow"
      >
        Dashboard
      </button>

      <button
        onClick={() => router.push("/subscribers")}
        className="bg-white text-[#007f73] rounded-xl px-5 py-3 font-bold shadow"
      >
        Danh sách thuê bao
      </button>

      {role === "CN" && (
        <button
          onClick={() => router.push("/import")}
          className="bg-yellow-400 text-black rounded-xl px-5 py-3 font-bold shadow"
        >
          Import dữ liệu
        </button>
      )}

      <button
        onClick={logout}
        className="bg-red-600 text-white rounded-xl px-5 py-3 font-bold shadow"
      >
        Đăng xuất
      </button>
    </div>
  );
}