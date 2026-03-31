"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import InputForm from "@/components/InputForm";
import SuccessScreen from "@/components/SuccessScreen";
import type { Employee } from "@/lib/notion";

type StampType = "出勤" | "退勤";
type Phase = "loading" | "input" | "success";

type SuccessData = {
  name: string;
  type: StampType;
  time: Date;
  employeeId: string;
};

export default function Home() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const cardControls = useAnimation();
  const router = useRouter();

  // 管理者モーダル
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      setShowAdminModal(true);
      setAdminPassword("");
      setAdminError("");
    } else {
      tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 1000);
    }
  };

  const handleAdminLogin = async () => {
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });
      if (res.ok) {
        setShowAdminModal(false);
        router.push("/admin");
      } else {
        setAdminError("パスワードが違います");
      }
    } catch {
      setAdminError("通信エラーが発生しました");
    }
  };

  // 初回フェードイン
  useEffect(() => {
    cardControls.start({
      opacity: 1,
      y: 0,
      rotateY: 0,
      transition: { duration: 0.45, ease: "easeOut" },
    });
  }, []);

  // 従業員リスト取得
  useEffect(() => {
    fetch("/api/employees")
      .then((r) => {
        if (!r.ok) throw new Error("従業員データの取得に失敗しました");
        return r.json();
      })
      .then((data: Employee[]) => {
        setEmployees(data);
        setPhase("input");
      })
      .catch((err) => {
        setFetchError(err.message ?? "エラーが発生しました");
        setPhase("input");
      });
  }, []);

  const handleSubmit = async (id: string, name: string, type: StampType) => {
    setSubmitError("");

    try {
      const [res] = await Promise.all([
        fetch("/api/timestamp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageId: id,
            employeeName: name,
            type,
            mockTime: localStorage.getItem("debug_mock_enabled") === "true"
              ? localStorage.getItem("debug_mock_time") ?? undefined
              : undefined,
          }),
        }),
        new Promise((r) => setTimeout(r, 1200)), // 最低1.2秒表示
      ]);
      if (!res.ok) {
        const data = await res.json();
        const msg = data.detail
          ? `${data.error}（${data.detail}）`
          : data.error ?? "エラーが発生しました";
        throw new Error(msg);
      }
      // 成功 → フリップして完了画面
      await cardControls.start({
        rotateY: 90,
        transition: { duration: 0.25, ease: "easeIn" },
      });
      setSuccess({ name, type, time: new Date(), employeeId: id });
      setPhase("success");
      cardControls.set({ rotateY: -90 });
      await cardControls.start({
        rotateY: 0,
        transition: { duration: 0.3, ease: "easeOut" },
      });
    } catch (err: any) {
      setSubmitError(err.message ?? "エラーが発生しました");
    }
  };

  return (
    <main className="h-dvh flex flex-col items-center px-4 overflow-hidden">
      <div className="w-full max-w-[400px] relative h-full">

        {/* ロゴ：3回タップで管理者モーダル */}
        <div
          className={`absolute top-4 left-0 right-0 flex items-center justify-center ${phase === "success" ? "hidden" : ""}`}
          style={{ bottom: "398px" }}
          onClick={handleLogoTap}
        >
          <motion.img
            src="/logo.webp"
            alt="Tap-IN"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45 }}
            className="w-full h-full object-contain"
          />
        </div>

        {/* カード：下辺を常にbottom-10に固定 */}
        <div className="absolute bottom-10 left-0 right-0" style={{ perspective: 1200 }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={cardControls}
            className={`bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.06)] px-6 py-6 sm:px-8 overflow-hidden ${phase === "success" ? "h-dvh-card" : "h-[350px]"}`}
          >
            <div className="h-full flex flex-col justify-center">
              {phase === "loading" && (
                <div className="flex justify-center py-12">
                  <svg className="w-8 h-8 animate-spin text-clock-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                </div>
              )}

              {phase === "input" && (
                <>
                  {fetchError && (
                    <p className="mb-4 text-sm text-center text-red-400">⚠️ {fetchError}</p>
                  )}
                  <InputForm
                    employees={employees}
                    onSubmit={handleSubmit}
                    error={submitError}
                  />
                </>
              )}

              {phase === "success" && success && (
                <SuccessScreen
                  name={success.name}
                  type={success.type}
                  time={success.time}
                  employeeId={success.employeeId}
                />
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* 管理者モーダル */}
      {showAdminModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/40 flex items-center justify-center px-8 z-50"
          onClick={() => setShowAdminModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl px-8 py-8 w-full max-w-[320px] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-gray-500 tracking-wide mb-6 text-center">管理者ログイン</p>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => { setAdminPassword(e.target.value); setAdminError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
              placeholder="パスワード"
              autoFocus
              className="w-full px-4 py-3 text-base rounded-2xl border-2 border-gray-100 bg-gray-50 focus:outline-none focus:border-clock-blue/50 transition-colors mb-2"
            />
            {adminError && (
              <p className="text-xs text-red-400 text-center mb-2">{adminError}</p>
            )}
            <button
              onClick={handleAdminLogin}
              className="w-full py-3 mt-2 text-base font-bold text-white bg-clock-blue rounded-2xl"
            >
              ログイン
            </button>
          </motion.div>
        </motion.div>
      )}
    </main>
  );
}
