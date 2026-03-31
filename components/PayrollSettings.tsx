"use client";

import { useEffect, useState } from "react";

type Settings = {
  id: string;
  startTime: string;       // 始業標準時刻
  endTime: string;         // 終業標準時刻
  deemedOvertimeHours: number; // みなし残業時間（時間/月）
  alertThreshold: number;  // アラート閾値（%）
};

const DEFAULT_SETTINGS: Settings = {
  id: "",
  startTime: "09:00",
  endTime: "18:00",
  deemedOvertimeHours: 30,
  alertThreshold: 80,
};

type FieldConfig =
  | { type: "time"; key: keyof Settings; label: string; unit?: string }
  | { type: "number"; key: keyof Settings; label: string; unit: string; min: number; max: number };

const FIELDS: { section: string; desc: string; items: FieldConfig[] }[] = [
  {
    section: "所定労働時間",
    desc: "給与計算打刻に使用する標準時刻を設定します",
    items: [
      { type: "time", key: "startTime", label: "始業標準時刻" },
      { type: "time", key: "endTime",   label: "終業標準時刻" },
    ],
  },
  {
    section: "みなし残業管理",
    desc: "実打刻と給与計算用打刻の差分がアラート閾値を超えた場合に通知します",
    items: [
      { type: "number", key: "deemedOvertimeHours", label: "みなし残業時間", unit: "時間／月", min: 0, max: 80 },
      { type: "number", key: "alertThreshold",      label: "アラート閾値",   unit: "%",       min: 0, max: 100 },
    ],
  },
];

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

export default function PayrollSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/payroll")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Settings) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // デバッグ用モック時刻（SSRと一致させるため初期値は固定、mount後にlocalStorageを読む）
  const [mockEnabled, setMockEnabled] = useState(false);
  const [mockTime, setMockTime] = useState("09:00");

  useEffect(() => {
    setMockEnabled(localStorage.getItem("debug_mock_enabled") === "true");
    setMockTime(localStorage.getItem("debug_mock_time") ?? "09:00");
  }, []);
  const applyMock = (val: string) => {
    setMockTime(val);
    localStorage.setItem("debug_mock_time", val);
  };
  const toggleMockEnabled = (val: boolean) => {
    setMockEnabled(val);
    localStorage.setItem("debug_mock_enabled", String(val));
    if (!val) localStorage.removeItem("debug_mock_time");
    else localStorage.setItem("debug_mock_time", mockTime);
  };
  const [editing, setEditing] = useState<keyof Settings | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [saved, setSaved] = useState(false);

  const startEdit = (key: keyof Settings) => {
    setEditing(key);
    setDraft(String(settings[key]));
    setSaved(false);
  };

  const commitEdit = () => {
    if (!editing) return;
    setSettings((prev) => ({ ...prev, [editing]: typeof prev[editing] === "number" ? Number(draft) : draft }));
    setEditing(null);
  };

  const handleSave = async () => {
    try {
      const res = await fetch("/api/admin/payroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("保存に失敗しました");
    }
  };

  // みなし残業のアラート発動ライン（時間）
  const alertAt = Math.round(settings.deemedOvertimeHours * settings.alertThreshold / 100);

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
        {FIELDS.map((group) => (
          <div key={group.section}>
            {/* セクションヘッダー */}
            <p className="text-xs font-bold text-gray-400 tracking-wide mb-0.5">{group.section}</p>
            <p className="text-[11px] text-gray-300 mb-3">{group.desc}</p>

            <div className="bg-gray-50 rounded-2xl overflow-hidden">
              {group.items.map((item, i) => (
                <div
                  key={item.key}
                  className={`flex items-center px-4 py-3.5 ${i !== group.items.length - 1 ? "border-b border-gray-100" : ""}`}
                >
                  <span className="flex-1 text-sm text-gray-600">{item.label}</span>

                  {editing === item.key ? (
                    <div className="flex items-center gap-2">
                      <input
                        type={item.type}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                        autoFocus
                        {...(item.type === "number" ? { min: item.min, max: item.max } : {})}
                        className="w-24 px-2 py-1 text-sm text-right rounded-lg border-2 border-clock-blue/40 bg-white focus:outline-none"
                      />
                      {item.unit && <span className="text-xs text-gray-400">{item.unit}</span>}
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(item.key)}
                      className="flex items-center gap-2 group"
                    >
                      <span className="text-sm font-bold text-clock-blue">
                        {String(settings[item.key])}{item.unit ? ` ${item.unit}` : ""}
                      </span>
                      <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* みなし残業のサマリー */}
            {group.section === "みなし残業管理" && (
              <div className="mt-2 px-4 py-3 bg-blue-50 rounded-2xl space-y-1">
                <p className="text-xs text-blue-300">
                  累積（実打刻 − 給与計算用打刻）&gt; {settings.deemedOvertimeHours}時間 × {settings.alertThreshold}% = {alertAt}時間／月
                </p>
                <p className="text-xs text-clock-blue">
                  月間 <span className="font-bold">{alertAt}時間</span> を超えるとアラートが発動します
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* デバッグ：テスト打刻時刻 */}
      <div className="px-6 pb-4">
        <p className="text-xs font-bold text-gray-300 tracking-wide mb-2">デバッグ</p>
        <div className="bg-gray-50 rounded-2xl overflow-hidden">
          {/* 有効/無効トグル */}
          <div className="flex items-center px-4 py-3.5 border-b border-gray-100">
            <span className="text-sm text-gray-500 flex-1">テスト打刻時刻を有効にする</span>
            <Toggle value={mockEnabled} onChange={() => toggleMockEnabled(!mockEnabled)} />
          </div>
          {/* 時刻入力 */}
          <div className={`flex items-center px-4 py-3.5 gap-3 transition-opacity ${mockEnabled ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
            <span className="text-sm text-gray-500 flex-1">時刻</span>
            <input
              type="time"
              value={mockTime}
              onChange={(e) => applyMock(e.target.value)}
              className="text-sm text-clock-blue font-bold bg-transparent focus:outline-none"
            />
          </div>
        </div>
        {mockEnabled && (
          <p className="text-xs text-amber-400 mt-1.5 px-1">
            ⚠ モック時刻使用中 — 打刻は {mockTime} として記録されます
          </p>
        )}
      </div>

      {/* 保存ボタン */}
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
