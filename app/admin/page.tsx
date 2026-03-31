"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "payroll" | "employees" | "tips";

type Tip = {
  id: string;
  text: string;
  enabled: boolean;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "payroll", label: "給与計算用" },
  { id: "employees", label: "従業員マスタ" },
  { id: "tips", label: "保健師の一言" },
];

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("payroll");

  // 保健師の一言
  const [tips, setTips] = useState<Tip[]>([]);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsError, setTipsError] = useState("");

  useEffect(() => {
    if (activeTab !== "tips" || tips.length > 0) return;
    setTipsLoading(true);
    fetch("/api/admin/tips")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: Tip[]) => setTips(data))
      .catch(() => setTipsError("取得に失敗しました"))
      .finally(() => setTipsLoading(false));
  }, [activeTab]);

  return (
    <main className="h-[100dvh] flex flex-col bg-[#f7f9fa] px-4 pt-12 pb-8">
      <div className="w-full max-w-[480px] mx-auto flex flex-col h-full">

        {/* ヘッダー */}
        <div className="relative flex items-center justify-center mb-6">
          <button
            onClick={() => router.push("/")}
            className="absolute left-0 flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Top
          </button>
          <h1 className="text-sm font-bold text-gray-500 tracking-widest">管理者画面</h1>
        </div>

        {/* タブ */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-full shadow-inner mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-xs font-bold rounded-full transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-white text-clock-blue shadow-md"
                  : "text-gray-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* アクティブエリア */}
        <div className="flex-1 bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.06)] overflow-hidden">

          {activeTab === "payroll" && (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-gray-300">給与計算用（準備中）</p>
            </div>
          )}

          {activeTab === "employees" && (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-gray-300">従業員マスタ（準備中）</p>
            </div>
          )}

          {activeTab === "tips" && (
            <div className="h-full flex flex-col">
              {/* テーブルヘッダー */}
              <div className="flex items-center px-6 py-3 border-b border-gray-100">
                <span className="flex-1 text-xs font-bold text-gray-400 tracking-wide">一言</span>
                <span className="text-xs font-bold text-gray-400 tracking-wide w-10 text-center">有効</span>
              </div>

              {/* テーブル本体 */}
              <div className="flex-1 overflow-y-auto">
                {tipsLoading && (
                  <div className="flex justify-center py-12">
                    <svg className="w-6 h-6 animate-spin text-clock-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  </div>
                )}
                {tipsError && (
                  <p className="text-sm text-red-400 text-center py-12">{tipsError}</p>
                )}
                {!tipsLoading && !tipsError && tips.map((tip, i) => (
                  <div
                    key={tip.id}
                    className={`flex items-center px-6 py-4 ${i !== tips.length - 1 ? "border-b border-gray-50" : ""}`}
                  >
                    <p className="flex-1 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pr-4">{tip.text}</p>
                    <div className="w-10 flex justify-center">
                      <span className={`w-2.5 h-2.5 rounded-full ${tip.enabled ? "bg-clock-blue" : "bg-gray-200"}`} />
                    </div>
                  </div>
                ))}
                {!tipsLoading && !tipsError && tips.length === 0 && (
                  <p className="text-sm text-gray-300 text-center py-12">データがありません</p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
