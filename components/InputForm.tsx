"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import type { Employee } from "@/lib/notion";

type StampType = "出勤" | "退勤";

type Props = {
  employees: Employee[];
  onSubmit: (id: string, name: string, type: StampType) => void;
  error?: string;
};

const TIPS = [
  "深呼吸をひとつ。\n肩の力を抜いてみましょう。",
  "お水飲みましたか？\nこまめな水分補給を。",
  "無理なく続いてたら\nそれで100点満点！",
  "滑り台を心から楽しめる\n大人でありたいですね。",
  "『何もしない』というのも\n立派な予定のひとつです。",
  "ため息をつくのは\n悪いものを出している証拠です。",
  "大人だって\nプリンをご褒美に買っていい。",
  "疲れたら\n30秒だけ目を閉じてみましょう。",
  "背筋をぐーっと\n伸ばしてみましょう！",
  "あなたの笑顔が\n誰かの元気になっています！",
];

export default function InputForm({ employees, onSubmit, error }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [mode, setMode] = useState<StampType>("出勤");
  const [submitting, setSubmitting] = useState(false);
  const [tip, setTip] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("saved_employee_id");
    if (saved) {
      const found = employees.find((e) => e.id === saved);
      if (found) {
        setSelectedId(found.id);
        setSelectedName(found.name);
      }
    }
  }, [employees]);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const emp = employees.find((x) => x.id === id);
    setSelectedId(id);
    setSelectedName(emp?.name ?? "");
  };

  const handleSubmit = () => {
    if (!selectedId || submitting) return;
    setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
    setSubmitting(true);
    localStorage.setItem("saved_employee_id", selectedId);
    onSubmit(selectedId, selectedName, mode);
  };

  // 親からエラーが来たら送信中を解除
  useEffect(() => {
    if (error) setSubmitting(false);
  }, [error]);

  const isReady = !!selectedId && !submitting;
  const btnColor = mode === "出勤" ? "bg-clock-blue" : "bg-clock-red";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };
  const itemVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.35 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="text-left flex flex-col min-h-[320px]"
    >
      {/* 上半分：通常時はフォーム、送信中は保健師さんの一言 */}
      <div className="flex-1 mb-7 flex flex-col">
        <AnimatePresence mode="wait">
          {!submitting ? (
            <motion.div
              key="form-fields"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* 名前選択 */}
              <motion.div variants={itemVariants}>
                <span className="block text-xs text-gray-500 font-semibold tracking-wide mb-2">
                  名前を選択
                </span>
                <div className="relative mb-6">
                  <select
                    value={selectedId}
                    onChange={handleSelect}
                    className="w-full px-4 py-4 text-base rounded-2xl border-2 border-gray-100 bg-gray-50 appearance-none focus:outline-none focus:border-clock-blue/50 transition-colors"
                  >
                    <option value="" disabled>名前を選んでください</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-clock-blue">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 10l5 5 5-5H7z" />
                    </svg>
                  </span>
                </div>
              </motion.div>

              {/* 種別選択 */}
              <motion.div variants={itemVariants}>
                <span className="block text-xs text-gray-500 font-semibold tracking-wide mb-2">
                  種別を選択
                </span>
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
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="nurse-tip"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex items-center justify-center"
            >
              <div className="text-left border-l-4 border-blue-100 pl-5">
                <span className="block text-[12px] text-blue-300 font-bold tracking-wider mb-3">
                  保健師さんの一言
                </span>
                <p className="text-[22px] leading-relaxed text-clock-blue font-bold whitespace-pre-wrap">
                  {tip}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 下半分：打刻ボタン（常に表示） */}
      <motion.button
        variants={itemVariants}
        onClick={handleSubmit}
        disabled={!isReady}
        whileTap={isReady ? { scale: 0.96 } : {}}
        className={`w-full py-5 text-lg font-bold text-white rounded-2xl transition-all duration-300 ${
          isReady
            ? `${btnColor} shadow-lg shadow-black/10 cursor-pointer`
            : "bg-gray-200 cursor-not-allowed text-gray-400"
        }`}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            送信中...
          </span>
        ) : (
          `${mode}を打刻する`
        )}
      </motion.button>

      {/* エラー */}
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-sm text-center text-red-400"
        >
          ⚠️ {error}
        </motion.p>
      )}
    </motion.div>
  );
}
