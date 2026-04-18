"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

type StampType = "出勤" | "退勤";

type Props = {
  name: string;
  type: StampType;
  time: Date;
  employeeId?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function SuccessScreen({ name, type, time, employeeId }: Props) {
  const router = useRouter();
  const isIn = type === "出勤";
  const accentColor = isIn ? "#3498db" : "#e74c3c";
  const subMsg = isIn ? "一日頑張りましょう！" : "お疲れさまでした！";

  const h = pad(time.getHours());
  const min = pad(time.getMinutes());
  const y = time.getFullYear();
  const m = pad(time.getMonth() + 1);
  const d = pad(time.getDate());

  const item = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.07 }}
      className="h-full flex flex-col"
    >
      {/* ── メインコンテンツ ── */}
      <div className="flex-1 flex flex-col items-center justify-center">

        {/* ① チェックサークル（小さく、添え物） */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.25, 0.9, 1], opacity: 1 }}
          transition={{ duration: 0.45, times: [0, 0.5, 0.75, 1], ease: "easeOut" }}
          className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
          style={{ backgroundColor: accentColor }}
        >
          <motion.svg viewBox="0 0 52 52" className="w-7 h-7">
            <motion.path
              fill="none" stroke="white" strokeWidth="5.5"
              strokeLinecap="round" strokeLinejoin="round"
              d="M14 27 L22 35 L38 18"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.28, delay: 0.35, ease: "easeOut" }}
            />
          </motion.svg>
        </motion.div>

        {/* ② 名前（最重要：誰の打刻か） */}
        <motion.p
          variants={item}
          className="text-[9vw] font-bold text-gray-800 leading-none mb-1.5"
        >
          {name}
        </motion.p>

        {/* ③ 種別（何をしたか） */}
        <motion.p
          variants={item}
          className="text-[4.5vw] font-semibold tracking-[0.15em] mb-4"
          style={{ color: accentColor }}
        >
          {type}完了
        </motion.p>

        {/* ④ 時刻（記録データ） */}
        <motion.div
          variants={item}
          className="text-[18vw] font-light leading-none tracking-tight text-gray-700 mb-1.5"
        >
          {h}:{min}
        </motion.div>

        {/* ⑤ 日付（補足） */}
        <motion.p
          variants={item}
          className="text-[3.5vw] tracking-[0.2em] text-gray-400"
        >
          {y}.{m}.{d}
        </motion.p>

        {/* ⑥ 早出・残業申請（退勤時のみ） */}
        {type === "退勤" && employeeId && (
          <motion.button
            variants={item}
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push(`/apply?employeeId=${employeeId}&name=${encodeURIComponent(name)}&checkoutTime=${h}:${min}`)}
            className="mt-4 px-5 py-2 text-[3.5vw] font-semibold rounded-full"
            style={{ color: accentColor, border: `1.5px solid ${accentColor}40` }}
          >
            早出・残業申請
          </motion.button>
        )}
      </div>

      {/* ── ボトム ── */}
      <motion.div variants={item} className="flex flex-col gap-3 pt-2">
        <p className="text-base text-center font-medium text-gray-500">{subMsg}</p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => window.location.reload()}
          className="w-full py-4 rounded-2xl text-sm font-semibold text-gray-400 bg-gray-50 active:bg-gray-100 transition-colors"
        >
          Topに戻る
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
