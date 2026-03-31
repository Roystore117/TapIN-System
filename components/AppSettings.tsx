"use client";

import { useEffect, useState } from "react";

type Settings = {
  id: string;
  autoSwitch: boolean;
  switchTime: string;
};

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-12 h-6 rounded-full transition-colors duration-300 relative ${value ? "bg-clock-blue" : "bg-gray-200"}`}
    >
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${value ? "left-7" : "left-1"}`} />
    </button>
  );
}

export default function AppSettings() {
  const [settings, setSettings] = useState<Settings>({ id: "", autoSwitch: true, switchTime: "12:00" });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/payroll")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => {
        setSettings({ id: data.id, autoSwitch: data.autoSwitch, switchTime: data.switchTime });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    // 全設定をPATCHするため、まず現在の全設定を取得してマージ
    try {
      const current = await fetch("/api/admin/payroll").then((r) => r.json());
      const res = await fetch("/api/admin/payroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...current, ...settings }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("保存に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <svg className="w-6 h-6 animate-spin text-clock-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        <div>
          <p className="text-xs font-bold text-gray-400 tracking-wide mb-0.5">出退勤ボタンのデフォルト</p>
          <p className="text-[11px] text-gray-300 mb-3">打刻画面を開いたときに選択される種別を自動で切り替えます</p>

          <div className="bg-gray-50 rounded-2xl overflow-hidden">
            {/* 自動切替トグル */}
            <div className="flex items-center px-4 py-3.5 border-b border-gray-100">
              <span className="flex-1 text-sm text-gray-600">時刻で自動切替する</span>
              <Toggle
                value={settings.autoSwitch}
                onChange={() => setSettings((s) => ({ ...s, autoSwitch: !s.autoSwitch }))}
              />
            </div>

            {/* 切替時刻 */}
            <div className={`flex items-center px-4 py-3.5 transition-opacity ${settings.autoSwitch ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
              <span className="flex-1 text-sm text-gray-600">切替時刻</span>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={settings.switchTime}
                  onChange={(e) => setSettings((s) => ({ ...s, switchTime: e.target.value }))}
                  className="text-sm text-clock-blue font-bold bg-transparent focus:outline-none"
                />
              </div>
            </div>
          </div>

          {settings.autoSwitch && (
            <div className="mt-2 px-4 py-3 bg-blue-50 rounded-2xl">
              <p className="text-xs text-clock-blue">
                <span className="font-bold">{settings.switchTime}</span> より前は <span className="font-bold">出勤</span>、以降は <span className="font-bold">退勤</span> がデフォルト選択されます
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-100">
        <button
          onClick={handleSave}
          className={`w-full py-3 text-sm font-bold rounded-2xl transition-all duration-300 ${
            saved ? "bg-green-400 text-white" : "bg-clock-blue text-white"
          }`}
        >
          {saved ? "保存しました ✓" : "保存"}
        </button>
      </div>
    </div>
  );
}
