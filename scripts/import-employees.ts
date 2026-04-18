/**
 * 一回限りの従業員CSVインポートスクリプト
 * 既存Notion従業員を全てアーカイブ → CSVから新規追加
 *
 * 実行: npx tsx scripts/import-employees.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Client } from "@notionhq/client";
import fs from "fs";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const CSV_PATH = "c:/Users/roycr/RoyFolder/06_Hplus/01_Tap-IN/03_MFインポート/インプット用.csv";

// 部門名の別名マッピング（CSV値 → 店舗設定DB値）
const DEPT_ALIAS: Record<string, string> = {
  "ROMMY.": "ROMMY.ロミー本厚木",
};

// 簡易CSVパーサ（ダブルクォート対応）
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"') inQuote = false;
      else cur += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ",") { result.push(cur); cur = ""; }
      else cur += c;
    }
  }
  result.push(cur);
  return result;
}

async function main() {
  // ── 1. 店舗設定DBから {storeName: pageId} マップを構築 ──
  const storeRes = await notion.databases.query({ database_id: process.env.STORE_SETTINGS_DB_ID! });
  const storeNameToId: Record<string, string> = {};
  for (const page of storeRes.results as any[]) {
    const name = page.properties["店舗名"]?.title?.[0]?.plain_text ?? "";
    if (name) storeNameToId[name] = page.id;
  }
  console.log("📍 店舗マップ:", Object.keys(storeNameToId));

  // ── 2. 既存従業員を全てアーカイブ ──
  const existing = await notion.databases.query({ database_id: process.env.EMPLOYEE_DB_ID!, page_size: 100 });
  console.log(`\n🗑 既存 ${existing.results.length} 件をアーカイブ...`);
  for (const page of existing.results as any[]) {
    await notion.pages.update({ page_id: page.id, archived: true });
    const last = page.properties["姓"]?.rich_text?.[0]?.text?.content ?? "";
    const first = page.properties["名"]?.rich_text?.[0]?.text?.content ?? "";
    console.log(`  ✓ アーカイブ: ${last} ${first}`);
  }

  // ── 3. CSV読み込み（Shift-JIS）──
  const buf = fs.readFileSync(CSV_PATH);
  const text = new TextDecoder("shift-jis").decode(buf);
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = parseCSVLine(lines[0]);
  console.log("\n📋 CSVヘッダー:", header);

  const COL = {
    identifier:     header.indexOf("従業員識別子"),
    employeeNumber: header.indexOf("従業員番号"),
    lastName:       header.indexOf("姓"),
    firstName:      header.indexOf("名"),
    storeName:      header.indexOf("事業所名"),
    department:     header.indexOf("部門名"),
    jobTitle:       header.indexOf("職種名"),
    contractType:   header.indexOf("契約種別"),
  };

  // ── 4. 各行を登録 ──
  console.log(`\n➕ ${lines.length - 1} 件を追加...`);
  let success = 0;
  let skipped: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const identifier     = cols[COL.identifier].replace(/[\t\n\r\s]+/g, "").trim();
    const employeeNumber = cols[COL.employeeNumber].trim();
    const lastName       = cols[COL.lastName].trim();
    const firstName      = cols[COL.firstName].trim();
    const storeName      = cols[COL.storeName].trim();
    const csvDept        = cols[COL.department].trim();
    const jobTitle       = cols[COL.jobTitle].trim();
    const contractType   = cols[COL.contractType].trim();

    // 部門名のRelation解決（別名対応 + 未マッチは空欄）
    const mappedDept = DEPT_ALIAS[csvDept] ?? csvDept;
    const deptPageId = storeNameToId[mappedDept];

    const props: Record<string, any> = {
      "従業員識別子":   { title:     [{ text: { content: identifier } }] },
      "従業員番号":     { rich_text: [{ text: { content: employeeNumber } }] },
      "姓":             { rich_text: [{ text: { content: lastName } }] },
      "名":             { rich_text: [{ text: { content: firstName } }] },
      "ステータス":     { select:    { name: "在職" } },
    };
    if (storeName)    props["事業所名"]   = { select: { name: storeName } };
    if (jobTitle)     props["職種名"]     = { select: { name: jobTitle } };
    if (contractType) props["契約職種"]   = { select: { name: contractType } };
    if (deptPageId)   props["部門名"]     = { relation: [{ id: deptPageId }] };

    try {
      await notion.pages.create({
        parent: { database_id: process.env.EMPLOYEE_DB_ID! },
        properties: props,
      });
      const deptMark = deptPageId ? `(→ ${mappedDept})` : csvDept ? `(⚠️ ${csvDept} 未マッチ・空欄)` : "";
      console.log(`  ✓ ${employeeNumber} ${lastName} ${firstName} ${deptMark}`);
      success++;
    } catch (e: any) {
      console.error(`  ✗ ${employeeNumber} ${lastName} ${firstName}: ${e.message}`);
      skipped.push(`${employeeNumber} ${lastName} ${firstName}`);
    }
  }

  console.log(`\n🎉 完了: 成功 ${success} 件, 失敗 ${skipped.length} 件`);
  if (skipped.length > 0) console.log("失敗:", skipped);
}

main().catch((e) => { console.error("💥 エラー:", e); process.exit(1); });
