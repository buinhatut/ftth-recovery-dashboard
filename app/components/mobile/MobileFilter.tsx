"use client";

type Props = {
  keyword: string;
  onKeywordChange: (v: string) => void;
  status?: string;
  onStatusChange?: (v: string) => void;
  vtkv?: string;
  onVtkvChange?: (v: string) => void;
  vtkvOptions?: string[];
};

export default function MobileFilter({
  keyword,
  onKeywordChange,
  status = "ALL",
  onStatusChange,
  vtkv = "ALL",
  onVtkvChange,
  vtkvOptions = [],
}: Props) {
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
          value={vtkv}
          onChange={(e) => onVtkvChange?.(e.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-3 bg-white"
        >
          <option value="ALL">Tất cả VTKV</option>
          {vtkvOptions.map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => onStatusChange?.(e.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-3 bg-white"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="NEW">Chưa xử lý</option>
          <option value="NOT_CONTACTED">Chưa tiếp xúc</option>
          <option value="CONTACTED">Đã tiếp xúc</option>
          <option value="RECOVERED">Đã khôi phục</option>
          <option value="COMPLETED">Đã đóng việc</option>
        </select>
      </div>
    </section>
  );
}
