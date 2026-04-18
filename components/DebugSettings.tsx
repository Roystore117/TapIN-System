"use client";

import { useEffect, useState } from "react";

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

export default function DebugSettings() {
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

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        <div>
          <p className="text-xs font-bold text-gray-400 tracking-wide mb-0.5">テスト打刻時刻</p>
          <p className="text-[11px] text-gray-300 mb-3">打刻時刻をモックに差し替えます。本番前に必ず無効化してください</p>

          <div className="bg-gray-50 rounded-2xl overflow-hidden">
            <div className="flex items-center px-4 py-3.5 border-b border-gray-100">
              <span className="flex-1 text-sm text-gray-600">テスト打刻時刻を有効にする</span>
              <Toggle value={mockEnabled} onChange={() => toggleMockEnabled(!mockEnabled)} />
            </div>
            <div className={`flex items-center px-4 py-3.5 transition-opacity ${mockEnabled ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
              <span className="flex-1 text-sm text-gray-600">時刻</span>
              <input
                type="time"
                value={mockTime}
                onChange={(e) => applyMock(e.target.value)}
                className="text-sm text-clock-blue font-bold bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {mockEnabled && (
            <div className="mt-2 px-4 py-3 bg-amber-50 rounded-2xl">
              <p className="text-xs text-amber-500">
                モック時刻使用中 — 打刻は <span className="font-bold">{mockTime}</span> として記録されます
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
