"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { Employee } from "@/lib/notion";

type StampType = "出勤" | "退勤";

type Props = {
  employees: Employee[];
  onSubmit: (id: string, name: string, type: StampType) => void;
  error?: string;
};

const FALLBACK_TIPS = [
  "深呼吸をひとつ。\n肩の力を抜いてみましょう。",
  "お水飲みましたか？\nこまめな水分補給を。",
  "無理なく続いてたら\nそれで100点満点！",
];

export default function InputForm({ employees, onSubmit, error }: Props) {
  // 店舗一覧（重複排除）
  const stores = Array.from(new Set(employees.map((e) => e.store).filter(Boolean))).sort((a, b) => b.localeCompare(a));

  const [selectedStore, setSelectedStore] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("saved_store") ?? "";
  });
  const [selectedId, setSelectedId] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("saved_employee_id") ?? "";
  });
  const [selectedName, setSelectedName] = useState("");
  const [mode, setMode] = useState<StampType>("出勤");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tip, setTip] = useState("");
  const [tips, setTips] = useState<string[]>(FALLBACK_TIPS);

  useEffect(() => {
    fetch("/api/tips")
      .then((r) => r.ok ? r.json() : null)
      .then((data: string[] | null) => { if (data && data.length > 0) setTips(data); })
      .catch(() => {});
  }, []);

  const updateModeByPunchStatus = (id: string) => {
    if (!id) return;
    fetch(`/api/punches?employeeId=${id}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          console.error("[punches] API error", r.status, body);
          return [];
        }
        return r.json();
      })
      .then((punches: { type: string }[]) => {
        console.log("[punches]", punches);
        const hasClockedIn  = punches.some((p) => p.type === "出勤");
        const hasClockedOut = punches.some((p) => p.type === "退勤");
        setMode(hasClockedIn && !hasClockedOut ? "退勤" : "出勤");
      })
      .catch((e) => console.error("[punches] fetch error", e));
  };

  // 従業員リスト読み込み後に保存済み選択を復元
  useEffect(() => {
    if (employees.length === 0) return;

    // 保存済み店舗が有効でなければ先頭店舗をセット
    const validStore = stores.includes(selectedStore) ? selectedStore : (stores[0] ?? "");
    if (validStore !== selectedStore) setSelectedStore(validStore);

    // 保存済み従業員IDが現在の店舗の従業員に含まれるか確認
    if (selectedId) {
      const found = employees.find((e) => e.id === selectedId);
      if (found) {
        // 従業員の店舗に合わせて店舗を設定
        if (found.store && found.store !== validStore) setSelectedStore(found.store);
        setSelectedName(found.name);
        updateModeByPunchStatus(selectedId);
      } else {
        setSelectedId("");
      }
    }
  }, [employees]);

  // 店舗が変わったら従業員選択をリセット
  const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStore(e.target.value);
    setSelectedId("");
    setSelectedName("");
  };

  const filteredEmployees = selectedStore
    ? employees.filter((e) => e.store === selectedStore)
    : employees;

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const emp = employees.find((x) => x.id === id);
    setSelectedId(id);
    setSelectedName(emp?.name ?? "");
    updateModeByPunchStatus(id);
  };

  const handleConfirmRequest = () => {
    if (!selectedId || submitting) return;
    setConfirming(true);
  };

  const handleConfirm = () => {
    setTip(tips[Math.floor(Math.random() * tips.length)]);
    setSubmitting(true);
    setConfirming(false);
    localStorage.setItem("saved_employee_id", selectedId);
    localStorage.setItem("saved_store", selectedStore);
    onSubmit(selectedId, selectedName, mode);
  };

  const handleCancel = () => setConfirming(false);

  useEffect(() => {
    if (error) { setSubmitting(false); setConfirming(false); }
  }, [error]);

  const isReady = !!selectedId && !submitting && !confirming;
  const btnColor = mode === "出勤" ? "bg-clock-blue" : "bg-clock-red";
  const accentColor = mode === "出勤" ? "text-clock-blue" : "text-clock-red";

  return (
    <div className="flex flex-col gap-5">

      {/* ── 通常フォーム ── */}
      <motion.div
        animate={{ opacity: confirming || submitting ? 0 : 1, pointerEvents: confirming || submitting ? "none" : "auto" }}
        transition={{ duration: 0.2 }}
        className="flex flex-col gap-5"
      >
        {/* ① 店舗を選択 */}
        {stores.length > 1 && (
          <div>
            <span className="block text-xs text-gray-500 font-semibold tracking-wide mb-2">店舗を選択</span>
            <div className="relative">
              <select
                value={selectedStore}
                onChange={handleStoreChange}
                className="w-full px-4 py-4 text-base rounded-2xl border-2 border-gray-100 bg-gray-50 appearance-none focus:outline-none focus:border-clock-blue/50 transition-colors"
              >
                {stores.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-clock-blue">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5H7z" />
                </svg>
              </span>
            </div>
          </div>
        )}

        {/* ② 名前を選択 */}
        <div>
          <span className="block text-xs text-gray-500 font-semibold tracking-wide mb-2">名前を選択</span>
          <div className="relative">
            <select
              value={selectedId}
              onChange={handleSelect}
              className="w-full px-4 py-4 text-base rounded-2xl border-2 border-gray-100 bg-gray-50 appearance-none focus:outline-none focus:border-clock-blue/50 transition-colors"
            >
              <option value="" disabled>名前を選んでください</option>
              {filteredEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-clock-blue">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5H7z" />
              </svg>
            </span>
          </div>
        </div>

        {/* ② 種別を選択 */}
        <div>
          <span className="block text-xs text-gray-500 font-semibold tracking-wide mb-2">種別を選択</span>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-full shadow-inner">
            {(["出勤", "退勤"] as StampType[]).map((t) => (
              <button
                key={t}
                onClick={() => setMode(t)}
                className={`flex-1 py-4 text-base font-bold rounded-full transition-all duration-300 ${
                  mode === t
                    ? t === "出勤"
                      ? "bg-white text-clock-blue shadow-md scale-[1.02]"
                      : "bg-white text-clock-red shadow-md scale-[1.02]"
                    : "text-gray-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ③ 打刻ボタン */}
        <motion.button
          onClick={handleConfirmRequest}
          disabled={!isReady}
          whileTap={isReady ? { scale: 0.96 } : {}}
          className={`w-full py-5 text-lg font-bold text-white rounded-2xl transition-all duration-300 ${
            isReady
              ? `${btnColor} shadow-lg shadow-black/10 cursor-pointer`
              : "bg-gray-200 cursor-not-allowed text-gray-400"
          }`}
        >
          {mode}を打刻する
        </motion.button>
      </motion.div>

      {/* ── 確認画面（インライン） ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: confirming ? 1 : 0, pointerEvents: confirming ? "auto" : "none" }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 flex flex-col bg-white px-6 pb-8"
      >
        {/* テキスト：ボタン上の余白の中央 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="font-extrabold text-gray-700 mb-1" style={{ fontSize: "5.5vw" }}>{selectedName}さん</p>
            <p className={`font-extrabold ${accentColor}`} style={{ fontSize: "13vw", lineHeight: 1.1 }}>{mode}</p>
            <p className="text-gray-400 mt-3" style={{ fontSize: "3.5vw" }}>でよいですか？</p>
          </div>
        </div>

        {/* ボタン：フォームと同じ高さに自然配置 */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 py-5 text-lg font-bold text-gray-400 bg-gray-100 rounded-2xl"
          >
            もどる
          </button>
          <motion.button
            onClick={handleConfirm}
            whileTap={{ scale: 0.96 }}
            className={`flex-1 py-5 text-lg font-bold text-white rounded-2xl ${btnColor} shadow-lg shadow-black/10`}
          >
            打刻する
          </motion.button>
        </div>
      </motion.div>

      {/* ── 送信中オーバーレイ ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: submitting ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 flex flex-col bg-white pointer-events-none px-8 pb-8"
      >
        {/* 一言テキスト：余白の中央 */}
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 px-2">
          <p className="text-[4.8vw] leading-[1.9] text-gray-600 font-medium whitespace-pre-wrap">
            {tip}
          </p>
          <span className="text-[10px] font-medium tracking-[0.2em] text-gray-300">
            — 保健師より
          </span>
        </div>

        {/* ローディングドット */}
        <div className="flex justify-center gap-1.5">
          {[0, 0.2, 0.4].map((delay) => (
            <motion.div
              key={delay}
              className="w-1.5 h-1.5 rounded-full bg-gray-200"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay, ease: "easeInOut" }}
            />
          ))}
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-center text-red-400 font-medium"
        >
          ⚠️ {error}
        </motion.div>
      )}
    </div>
  );
}
