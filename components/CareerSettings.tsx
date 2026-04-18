"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";

type CareerEmployee = {
  id: string;
  name: string;
  department: string;
  status: string;
  rank: string;
  nominationFee: string;
  careerTarget: string;
  joinType: string;
  joinDate: string;
  careerUpdateDate: string;
  careerInterviewDate: string;
  probationSalary: number | null;
  regularSalary: number | null;
};

// Lv数字を抽出してランク順を決定
function parseRankNum(r: string): number {
  const m = r.match(/Lv(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

// ── date helpers ───────────────────────────────
function pad(n: number) { return String(n).padStart(2, "0"); }
function todayDate() {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}
function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function daysUntil(dateStr: string): number | null {
  const d = parseDate(dateStr);
  if (!d) return null;
  return Math.round((d.getTime() - todayDate().getTime()) / 86400000);
}
function monthsSince(dateStr: string): number | null {
  const d = parseDate(dateStr);
  if (!d) return null;
  const t = todayDate();
  return (t.getFullYear() - d.getFullYear()) * 12 + (t.getMonth() - d.getMonth());
}
function formatDate(dateStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return "—";
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}
function addMonths(dateStr: string, months: number): string {
  const d = parseDate(dateStr);
  if (!d) return "";
  const r = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
  return `${r.getFullYear()}-${pad(r.getMonth() + 1)}-${pad(r.getDate())}`;
}
function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}日前`;
  if (days === 0) return "本日";
  return `あと${days}日`;
}
function rankIndex(rank: string, ranksAsc: string[]): number {
  return ranksAsc.findIndex((r) => r === rank);
}
function splitRank(rank: string): { lv: string; name: string } {
  if (!rank) return { lv: "", name: "" };
  const idx = rank.indexOf(" ");
  if (idx < 0) return { lv: rank, name: "" };
  return { lv: rank.slice(0, idx), name: rank.slice(idx + 1) };
}

type Urgency = "high" | "mid" | "none";
function urgencyLevel(emp: CareerEmployee): Urgency {
  const dates = [emp.careerInterviewDate, emp.careerUpdateDate];
  const allDays = dates.map((d) => daysUntil(d)).filter((d): d is number => d !== null && d >= 0);
  if (allDays.length === 0) return "none";
  const min = Math.min(...allDays);
  if (min <= 7) return "high";
  if (min <= 30) return "mid";
  return "none";
}

// ── UI atoms ───────────────────────────────────
function Spinner() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-3">
      <svg className="w-7 h-7 animate-spin text-clock-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em]">NOTION 連携中</p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-gray-300 tracking-[0.25em] uppercase">{children}</p>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-400 mb-1 tracking-wide">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 text-sm rounded-2xl border border-gray-100 bg-white focus:outline-none focus:border-clock-blue/60 transition-colors appearance-none"
      >
        <option value="" hidden></option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-400 mb-1 tracking-wide">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 text-sm rounded-2xl border border-gray-100 bg-white focus:outline-none focus:border-clock-blue/60 transition-colors"
      />
    </div>
  );
}

function NumberField({ label, value, onChange, prefix }: { label: string; value: number | null; onChange: (v: number | null) => void; prefix?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-400 mb-1 tracking-wide">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">{prefix}</span>}
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className={`w-full py-2.5 text-sm rounded-2xl border border-gray-100 bg-white focus:outline-none focus:border-clock-blue/60 transition-colors tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] ${prefix ? "pl-8 pr-4" : "px-4"}`}
        />
      </div>
    </div>
  );
}

// ── Rank map ───────────────────────────────────
function RankMap({ rank, ranksAsc }: { rank: string; ranksAsc: string[] }) {
  const idx = rankIndex(rank, ranksAsc);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <SectionLabel>Rank</SectionLabel>
        <p className="text-sm font-extrabold text-gray-700">{rank || "未設定"}</p>
      </div>
      <div className="flex items-end gap-1.5">
        {ranksAsc.map((r, i) => {
          const isCurrent = i === idx;
          const isPassed = idx >= 0 && i < idx;
          return (
            <div key={r} className="flex-1 flex flex-col items-center gap-2">
              <div className={`w-full rounded-full transition-all ${
                isCurrent ? "h-6 bg-clock-blue" :
                isPassed  ? "h-3 bg-clock-blue/50" :
                            "h-1.5 bg-gray-100"
              }`} />
              <p className={`text-[10px] font-bold ${
                isCurrent ? "text-clock-blue" :
                isPassed  ? "text-gray-500" :
                            "text-gray-300"
              }`}>Lv{i + 1}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Timeline ───────────────────────────────────
function Timeline({ emp }: { emp: CareerEmployee }) {
  const events = [
    { key: "join",      label: "入社",               date: emp.joinDate,             extra: emp.joinType || "", pos: 0,   align: "start"  as const },
    { key: "interview", label: "キャリアアップ面談", date: emp.careerInterviewDate,  extra: "",                  pos: 50,  align: "center" as const },
    { key: "regular",   label: "正社員切替",         date: emp.careerUpdateDate,     extra: "",                  pos: 100, align: "end"    as const },
  ];
  const hasAnyDate = events.some((e) => parseDate(e.date) !== null);
  if (!hasAnyDate) {
    return (
      <div>
        <SectionLabel>Timeline</SectionLabel>
        <p className="mt-3 text-center py-8 text-sm text-gray-300">日付情報が未設定です</p>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel>Timeline</SectionLabel>
      <div className="mt-4 px-4">
        {/* トラック */}
        <div className="relative h-4">
          <div className="absolute inset-x-0 top-1/2 h-[2px] bg-gray-100 -translate-y-1/2 rounded-full" />
          {/* イベントドット */}
          {events.map((ev) => {
            const d = parseDate(ev.date);
            if (!d) {
              return (
                <div key={ev.key} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10" style={{ left: `${ev.pos}%` }}>
                  <div className="w-4 h-4 rounded-full border-2 bg-white border-gray-200" />
                </div>
              );
            }
            return (
              <div key={ev.key} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10" style={{ left: `${ev.pos}%` }}>
                <div className="w-4 h-4 rounded-full border-2 bg-white border-gray-300" />
              </div>
            );
          })}
        </div>

        {/* ラベル */}
        <div className="relative mt-3 h-16">
          {events.map((ev) => {
            const d = parseDate(ev.date);
            const days = d ? daysUntil(ev.date)! : null;
            const isCurrent = days !== null && days >= 0 && days <= 30;
            const isPast = days !== null && days < 0;
            const translate = ev.align === "start" ? "translateX(0)" : ev.align === "end" ? "translateX(-100%)" : "translateX(-50%)";
            const textAlign = ev.align === "start" ? "text-left" : ev.align === "end" ? "text-right" : "text-center";
            return (
              <div key={ev.key} className="absolute top-0 w-28" style={{ left: `${ev.pos}%`, transform: translate }}>
                <p className={`text-[10px] font-bold tracking-wide ${textAlign} ${
                  isCurrent ? "text-clock-blue" : isPast ? "text-gray-500" : "text-gray-400"
                }`}>{ev.label}</p>
                <p className={`text-xs font-extrabold tabular-nums mt-0.5 ${textAlign} ${d ? "text-gray-700" : "text-gray-300"}`}>{d ? formatDate(ev.date) : "—"}</p>
                {days !== null && (
                  <p className={`text-[10px] font-bold mt-0.5 ${textAlign} ${isCurrent ? "text-clock-blue" : "text-gray-400"}`}>{daysLabel(days)}</p>
                )}
                {ev.extra && (
                  <p className={`text-[10px] font-bold text-gray-400 mt-0.5 ${textAlign}`}>{ev.extra}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Summary chips ──────────────────────────────
function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 min-w-0 px-3">
      <p className="text-[10px] font-bold text-gray-400 tracking-wide mb-1 truncate">{label}</p>
      <p className="text-sm font-extrabold text-gray-700 truncate">{value || "—"}</p>
    </div>
  );
}

// ── Conditions ─────────────────────────────────
function monthsAndDaysBetween(fromStr: string, toStr: string): { months: number; days: number } | null {
  const from = parseDate(fromStr);
  const to = parseDate(toStr);
  if (!from || !to) return null;
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  let days = to.getDate() - from.getDate();
  if (days < 0) {
    months -= 1;
    const prev = new Date(to.getFullYear(), to.getMonth(), 0);
    days += prev.getDate();
  }
  if (months < 0) return null;
  return { months, days };
}

function Conditions({ emp }: { emp: CareerEmployee }) {
  const period = monthsAndDaysBetween(emp.joinDate, emp.careerUpdateDate);
  const periodText = period ? `${period.months}ヶ月${period.days}日` : "—";
  const transitionDate = emp.careerUpdateDate ? formatDate(emp.careerUpdateDate) : "—";
  const raiseRate = (emp.probationSalary && emp.regularSalary && emp.probationSalary > 0)
    ? `+${(((emp.regularSalary - emp.probationSalary) / emp.probationSalary) * 100).toFixed(1)}%`
    : "—";
  const hasRaise = raiseRate !== "—";

  const probation = emp.probationSalary ? `¥${emp.probationSalary.toLocaleString()}` : "—";
  const regular   = emp.regularSalary   ? `¥${emp.regularSalary.toLocaleString()}`   : "—";

  return (
    <div>
      <SectionLabel>Conditions</SectionLabel>
      <div className="mt-2 flex divide-x divide-slate-200 rounded-2xl bg-slate-100 py-3">
        <div className="flex-1 px-3 min-w-0">
          <p className="text-[10px] font-bold text-gray-400 tracking-wide mb-1 truncate">試用期間</p>
          <p className="text-sm font-extrabold text-gray-700 tabular-nums truncate">{periodText}</p>
        </div>
        <div className="flex-1 px-3 min-w-0">
          <p className="text-[10px] font-bold text-gray-400 tracking-wide mb-1 truncate">転換予定日</p>
          <p className="text-sm font-extrabold text-gray-700 tabular-nums truncate">{transitionDate}</p>
        </div>
        <div className="flex-1 px-3 min-w-0">
          <p className="text-[10px] font-bold text-gray-400 tracking-wide mb-1 truncate">試用期間給与</p>
          <p className="text-sm font-extrabold text-gray-700 tabular-nums truncate">{probation}</p>
        </div>
        <div className="flex-1 px-3 min-w-0">
          <p className="text-[10px] font-bold text-gray-400 tracking-wide mb-1 truncate">正社員給与</p>
          <p className="text-sm font-extrabold text-gray-700 tabular-nums truncate">{regular}</p>
        </div>
        <div className="flex-1 px-3 min-w-0">
          <p className="text-[10px] font-bold text-gray-400 tracking-wide mb-1 truncate">賃金上昇率</p>
          <p className={`text-sm font-extrabold tabular-nums truncate ${hasRaise ? "text-clock-blue" : "text-gray-700"}`}>{raiseRate}</p>
        </div>
      </div>
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return "—";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function EventCompact({ label, date }: { label: string; date: string }) {
  const d = parseDate(date);
  if (!d) {
    return (
      <div className="text-[10px] font-bold text-gray-300 tabular-nums">
        <span className="text-gray-300">{label}</span> —
      </div>
    );
  }
  const days = daysUntil(date)!;
  const isPast = days < 0;
  const isSoon = days >= 0 && days <= 30;
  return (
    <div className={`text-[10px] font-bold tabular-nums whitespace-nowrap ${
      isPast ? "text-gray-300" : isSoon ? "text-clock-blue" : "text-gray-500"
    }`}>
      <span className={isSoon ? "text-clock-blue" : "text-gray-400"}>{label}</span>
      {" "}{formatShortDate(date)}{" "}
      <span className={isSoon ? "text-clock-blue" : ""}>{daysLabel(days)}</span>
    </div>
  );
}

// ── Career All List ────────────────────────────
function CareerAllList({ employees, selectedDept, ranksAsc, onEdit }: {
  employees: CareerEmployee[];
  selectedDept: string;
  ranksAsc: string[];
  onEdit: (emp: CareerEmployee) => void;
}) {
  const list = employees
    .filter((e) => !selectedDept || e.department === selectedDept)
    .sort((a, b) => {
      const ta = a.careerTarget === "対象" ? 0 : 1;
      const tb = b.careerTarget === "対象" ? 0 : 1;
      if (ta !== tb) return ta - tb;
      return rankIndex(b.rank, ranksAsc) - rankIndex(a.rank, ranksAsc);
    });

  return (
    <div className="flex-1 overflow-auto">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="flex items-center px-6 py-3 min-w-max">
          <span className="w-28 text-xs font-bold text-gray-400 tracking-wide shrink-0">名前</span>
          <span className="w-px bg-gray-100 mx-2 self-stretch shrink-0" />
          <span className="w-20 text-xs font-bold text-gray-400 tracking-wide shrink-0 text-center">対象</span>
          <span className="w-px bg-gray-100 mx-2 self-stretch shrink-0" />
          <span className="w-20 text-xs font-bold text-gray-400 tracking-wide shrink-0 text-center">新卒/中途</span>
          <span className="w-px bg-gray-100 mx-2 self-stretch shrink-0" />
          <span className="w-16 text-xs font-bold text-gray-400 tracking-wide shrink-0 text-center">RANK</span>
          <span className="w-px bg-gray-100 mx-2 self-stretch shrink-0" />
          <span className="w-32 text-xs font-bold text-gray-400 tracking-wide shrink-0">RANK名</span>
          <span className="w-px bg-gray-100 mx-2 self-stretch shrink-0" />
          <span className="w-28 text-xs font-bold text-gray-400 tracking-wide shrink-0 text-center">入社日</span>
          <span className="w-px bg-gray-100 mx-2 self-stretch shrink-0" />
          <span className="w-28 text-xs font-bold text-gray-400 tracking-wide shrink-0 text-center">キャリアアップ面談日</span>
          <span className="w-px bg-gray-100 mx-2 self-stretch shrink-0" />
          <span className="w-28 text-xs font-bold text-gray-400 tracking-wide shrink-0 text-center">正社員切替日</span>
        </div>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-gray-300 text-center py-16">データがありません</p>
      ) : (
        list.map((emp, i, arr) => {
          const r = splitRank(emp.rank);
          const isTarget = emp.careerTarget === "対象";
          return (
            <button
              key={emp.id}
              onClick={() => onEdit(emp)}
              className={`w-full text-left flex items-center px-6 py-3.5 min-w-max hover:bg-gray-50 transition-colors ${i !== arr.length - 1 ? "border-b border-gray-50" : ""}`}
            >
              <span className="w-28 text-sm font-extrabold text-gray-700 shrink-0 truncate">{emp.name}</span>
              <span className="w-px bg-gray-100 mx-2 self-stretch shrink-0" />
              <span className="w-20 text-center shrink-0">
                {isTarget ? (
                  <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-clock-blue/10 text-clock-blue">対象</span>
                ) : (
                  <span className="inline-block text-[11px] font-bold text-gray-300">—</span>
                )}
              </span>
              <span className="w-px bg-gray-100 mx-2 self-stretch shrink-0" />
              <span className="w-20 text-sm text-gray-500 shrink-0 text-center">{emp.joinType || "—"}</span>
              <span className="w-px bg-gray-100 mx-2 self-stretch shrink-0" />
              <span className={`w-16 text-sm font-extrabold shrink-0 text-center tabular-nums ${isTarget ? "text-clock-blue" : "text-gray-400"}`}>{r.lv || "—"}</span>
              <span className="w-px bg-gray-100 mx-2 self-stretch shrink-0" />
              <span className="w-32 text-sm text-gray-500 shrink-0 truncate">{r.name || "—"}</span>
              <span className="w-px bg-gray-100 mx-2 self-stretch shrink-0" />
              <span className="w-28 text-sm text-gray-500 shrink-0 text-center tabular-nums">{emp.joinDate ? formatDate(emp.joinDate) : "—"}</span>
              <span className="w-px bg-gray-100 mx-2 self-stretch shrink-0" />
              <span className="w-28 text-sm text-gray-500 shrink-0 text-center tabular-nums">{emp.careerInterviewDate ? formatDate(emp.careerInterviewDate) : "—"}</span>
              <span className="w-px bg-gray-100 mx-2 self-stretch shrink-0" />
              <span className="w-28 text-sm text-gray-500 shrink-0 text-center tabular-nums">{emp.careerUpdateDate ? formatDate(emp.careerUpdateDate) : "—"}</span>
            </button>
          );
        })
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────
type Options = {
  ranks: string[];
  nominationFees: string[];
  careerTargets: string[];
  joinTypes: string[];
};

export default function CareerSettings() {
  const [employees, setEmployees] = useState<CareerEmployee[]>([]);
  const [stores, setStores] = useState<string[]>([]);
  const [options, setOptions] = useState<Options>({ ranks: [], nominationFees: [], careerTargets: [], joinTypes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<"target" | "all">("target");

  // ランクは Lv 番号順にソート（Lv1→Lv7）
  const ranksAsc = useMemo(
    () => [...options.ranks].sort((a, b) => parseRankNum(a) - parseRankNum(b)),
    [options.ranks]
  );
  const ranksDesc = useMemo(() => [...ranksAsc].reverse(), [ranksAsc]);

  const [editing, setEditing] = useState(false);
  const [rank, setRank] = useState("");
  const [nominationFee, setNominationFee] = useState("");
  const [careerTarget, setCareerTarget] = useState("");
  const [joinType, setJoinType] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [careerUpdateDate, setCareerUpdateDate] = useState("");
  const [careerInterviewDate, setCareerInterviewDate] = useState("");
  const [probationSalary, setProbationSalary] = useState<number | null>(null);
  const [regularSalary, setRegularSalary] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      adminFetch("/api/admin/employees").then((r) => r.ok ? r.json() : Promise.reject()),
      adminFetch("/api/admin/store-settings").then((r) => r.ok ? r.json() : Promise.reject()),
      adminFetch("/api/admin/employees/options").then((r) => r.ok ? r.json() : Promise.reject()),
    ])
      .then(([empData, storeData, optData]: [CareerEmployee[], { storeName: string }[], Options]) => {
        const active = empData.filter((e) => e.status !== "退職");
        setEmployees(active);
        const storeList = storeData.map((s) => s.storeName).filter(Boolean).sort((a, b) => b.localeCompare(a));
        setStores(storeList);
        setOptions(optData);
        // 従業員がいる店舗の中から初期選択する
        const firstStore = storeList.find((s) => active.some((e) => e.department === s));
        if (firstStore) {
          setSelectedDept(firstStore);
          const first = active.find((e) => e.department === firstStore && e.careerTarget === "対象")
            ?? active.find((e) => e.department === firstStore);
          if (first) selectEmployee(first);
        }
      })
      .catch(() => setError("取得に失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  // 編集終了時に選択中の人が非対象なら、最初の対象者にフォーカスを戻す
  useEffect(() => {
    if (editing) return;
    const sel = employees.find((e) => e.id === selectedId);
    if (!sel) return;
    if (sel.careerTarget === "対象") return;
    const firstTarget = employees.find((e) =>
      (!selectedDept || e.department === selectedDept) && e.careerTarget === "対象"
    );
    if (firstTarget) selectEmployee(firstTarget);
    else setSelectedId(null);
  }, [editing]);

  const selectEmployee = (emp: CareerEmployee) => {
    setSelectedId(emp.id);
    setRank(emp.rank ?? "");
    setNominationFee(emp.nominationFee ?? "");
    setCareerTarget(emp.careerTarget ?? "");
    setJoinType(emp.joinType ?? "");
    setJoinDate(emp.joinDate ?? "");
    setCareerUpdateDate(emp.careerUpdateDate ?? "");
    setCareerInterviewDate(emp.careerInterviewDate ?? "");
    setProbationSalary(emp.probationSalary ?? null);
    setRegularSalary(emp.regularSalary ?? null);
    setEditing(false);
    setSaveError("");
    setSaved(false);
  };

  const hasUnsavedChanges = (): boolean => {
    if (!editing || !selectedEmp) return false;
    return (
      (selectedEmp.rank ?? "") !== rank ||
      (selectedEmp.nominationFee ?? "") !== nominationFee ||
      (selectedEmp.careerTarget ?? "") !== careerTarget ||
      (selectedEmp.joinType ?? "") !== joinType ||
      (selectedEmp.joinDate ?? "") !== joinDate ||
      (selectedEmp.careerUpdateDate ?? "") !== careerUpdateDate ||
      (selectedEmp.careerInterviewDate ?? "") !== careerInterviewDate ||
      (selectedEmp.probationSalary ?? null) !== probationSalary ||
      (selectedEmp.regularSalary ?? null) !== regularSalary
    );
  };

  const trySelectEmployee = (emp: CareerEmployee): boolean => {
    if (hasUnsavedChanges()) {
      if (!confirm("未保存の変更があります。破棄して切り替えますか？")) return false;
    }
    selectEmployee(emp);
    return true;
  };

  const save = async () => {
    if (!selectedId) return;
    setSaving(true); setSaveError(""); setSaved(false);
    try {
      const res = await adminFetch(`/api/admin/employees/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rank, nominationFee, careerTarget, joinType, joinDate, careerUpdateDate, careerInterviewDate, probationSalary, regularSalary }),
      });
      if (!res.ok) throw new Error();
      setEmployees((prev) => prev.map((e) => e.id === selectedId
        ? { ...e, rank, nominationFee, careerTarget, joinType, joinDate, careerUpdateDate, careerInterviewDate, probationSalary, regularSalary }
        : e
      ));
      setSaved(true);
      setTimeout(() => { setSaved(false); setEditing(false); }, 1500);
    } catch {
      setSaveError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const filteredSorted = useMemo(() => {
    const filtered = employees
      .filter((e) => !selectedDept || e.department === selectedDept)
      .filter((e) => e.careerTarget === "対象" || (e.id === selectedId && editing));
    const proximity = (e: CareerEmployee) => {
      const days = [daysUntil(e.careerInterviewDate), daysUntil(e.careerUpdateDate)]
        .filter((d): d is number => d !== null && d >= 0);
      return days.length > 0 ? Math.min(...days) : Infinity;
    };
    return [...filtered].sort((a, b) => {
      const da = proximity(a);
      const db = proximity(b);
      if (da !== db) return da - db;
      return rankIndex(b.rank, ranksAsc) - rankIndex(a.rank, ranksAsc);
    });
  }, [employees, selectedDept, selectedId, editing, ranksAsc]);

  const selectedEmp = employees.find((e) => e.id === selectedId);
  const livePreview = selectedEmp ? {
    ...selectedEmp,
    rank, nominationFee, careerTarget, joinType, joinDate, careerUpdateDate, careerInterviewDate, probationSalary, regularSalary,
  } : null;

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-100 shrink-0 flex items-center gap-3">
        <div className="relative shrink-0">
          <select
            value={selectedDept}
            onChange={(e) => {
              const newDept = e.target.value;
              const first = employees.find((emp) => emp.department === newDept && emp.careerTarget === "対象")
                ?? employees.find((emp) => emp.department === newDept);
              if (first && !trySelectEmployee(first)) return;
              setSelectedDept(newDept);
            }}
            className="appearance-none pl-8 pr-7 py-1.5 text-sm font-bold text-white bg-gray-600 rounded-full focus:outline-none cursor-pointer"
          >
            {stores.filter((s) => employees.some((e) => e.department === s)).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </span>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1 bg-gray-100 p-1 rounded-full shadow-inner">
          <button
            onClick={() => setSubTab("target")}
            className={`px-4 py-1 text-xs font-bold rounded-full transition-all ${
              subTab === "target" ? "bg-white text-clock-blue shadow-sm" : "text-gray-400"
            }`}
          >
            キャリアアップ対象
          </button>
          <button
            onClick={() => setSubTab("all")}
            className={`px-4 py-1 text-xs font-bold rounded-full transition-all ${
              subTab === "all" ? "bg-white text-clock-blue shadow-sm" : "text-gray-400"
            }`}
          >
            全従業員一覧
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 flex overflow-hidden">
        {loading && <div className="flex-1 flex items-center justify-center"><Spinner /></div>}
        {error && <p className="flex-1 text-sm text-gray-400 text-center py-12">{error}</p>}
        {!loading && !error && subTab === "all" && (
          <CareerAllList
            employees={employees}
            selectedDept={selectedDept}
            ranksAsc={ranksAsc}
            onEdit={(emp) => {
              if (!trySelectEmployee(emp)) return;
              setSubTab("target");
              setEditing(true);
            }}
          />
        )}
        {!loading && !error && subTab === "target" && (
          <>
            {/* 左：従業員リスト */}
            <div className="w-[26%] min-w-[220px] max-w-[300px] shrink-0 border-r border-gray-100 flex flex-col overflow-y-auto">
              {filteredSorted.map((emp) => {
                const urgency = urgencyLevel(emp);
                const isSelected = emp.id === selectedId;
                return (
                  <button
                    key={emp.id}
                    onClick={() => trySelectEmployee(emp)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors flex items-center gap-3 ${
                      isSelected ? "bg-clock-blue/5" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className={`text-sm font-extrabold truncate ${isSelected ? "text-clock-blue" : "text-gray-700"}`}>
                          {emp.name}
                        </p>
                        {urgency === "high" && <span className="w-1.5 h-1.5 rounded-full bg-clock-blue shrink-0" />}
                        {urgency === "mid"  && <span className="w-1.5 h-1.5 rounded-full border border-clock-blue shrink-0" />}
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 truncate">
                        {emp.rank || "ランク未設定"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right space-y-0.5">
                      <EventCompact label="面談" date={emp.careerInterviewDate} />
                      <EventCompact label="切替" date={emp.careerUpdateDate} />
                    </div>
                  </button>
                );
              })}
              {filteredSorted.length === 0 && (
                <p className="text-sm text-gray-300 text-center py-12">データがありません</p>
              )}
            </div>

            {/* 右：ダッシュボード */}
            {selectedEmp && livePreview ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  {/* Profile：名前 + 3チップ + 編集ボタン */}
                  <div className="px-8 pt-5 pb-1 flex items-end gap-8">
                    <div className="shrink-0">
                      <p className="text-[10px] font-bold text-gray-300 tracking-[0.25em] uppercase mb-1">Profile</p>
                      <p className="text-2xl font-extrabold text-gray-800 leading-none">{selectedEmp.name}</p>
                      <p className="text-[11px] font-bold text-gray-400 mt-1.5">{selectedEmp.department}</p>
                    </div>
                    <div className="flex w-[340px] shrink-0 divide-x divide-gray-100">
                      <SummaryChip label="キャリアアップ" value={selectedEmp.careerTarget} />
                      <SummaryChip label="新卒 / 中途" value={selectedEmp.joinType} />
                      <SummaryChip label="指名料" value={selectedEmp.nominationFee ? `¥${selectedEmp.nominationFee}` : "—"} />
                    </div>
                    <div className="flex-1" />
                    <button
                      onClick={() => {
                        if (editing && selectedEmp) {
                          if (hasUnsavedChanges() && !confirm("未保存の変更があります。破棄して閉じますか？")) return;
                          selectEmployee(selectedEmp);
                        } else {
                          setEditing(true);
                        }
                      }}
                      className={`shrink-0 px-5 py-1.5 text-xs font-bold rounded-full transition-all ${
                        editing
                          ? "bg-clock-blue text-white"
                          : "text-clock-blue border border-clock-blue/20 hover:bg-clock-blue/5"
                      }`}
                    >
                      {editing ? "閉じる" : "編集"}
                    </button>
                  </div>

                  <div className="px-8 py-4 space-y-5">
                    {!editing && (
                      <>
                        <RankMap rank={rank} ranksAsc={ranksAsc} />
                        <Timeline emp={livePreview} />
                        <Conditions emp={livePreview} />
                      </>
                    )}

                    {editing && (
                      <div className="space-y-4">
                        <SectionLabel>Edit</SectionLabel>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <SelectField label="ランク" value={rank} options={ranksDesc} onChange={setRank} />
                          <SelectField label="指名料" value={nominationFee} options={options.nominationFees} onChange={setNominationFee} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <SelectField label="キャリアアップ対象" value={careerTarget} options={options.careerTargets} onChange={setCareerTarget} />
                          <SelectField label="中途 or 新卒" value={joinType} options={options.joinTypes} onChange={setJoinType} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <DateField label="入社時期" value={joinDate} onChange={setJoinDate} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <DateField label="キャリアアップ更新時期" value={careerUpdateDate} onChange={setCareerUpdateDate} />
                          <DateField label="キャリアアップ面談時期" value={careerInterviewDate} onChange={setCareerInterviewDate} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <NumberField label="試用期間給与" value={probationSalary} onChange={setProbationSalary} prefix="¥" />
                          <NumberField label="正社員給与" value={regularSalary} onChange={setRegularSalary} prefix="¥" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 保存バー */}
                {editing && (
                  <div className="px-8 py-4 border-t border-gray-100 shrink-0">
                    {saveError && <p className="text-xs text-gray-500 text-center mb-2">{saveError}</p>}
                    <button
                      onClick={save}
                      disabled={saving}
                      className="w-full py-3 text-sm font-bold rounded-2xl bg-clock-blue text-white hover:bg-clock-blue/90 disabled:opacity-50 transition-all"
                    >
                      {saving ? "保存中..." : saved ? "保存しました ✓" : "保存"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-gray-300">従業員を選択してください</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
