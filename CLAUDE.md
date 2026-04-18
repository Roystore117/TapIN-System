# Tap-IN 開発者ノート

## Claude への指示

- 開発中に気づいたバグ・設計ミス・UXの問題・教訓は、メモリ（feedback または project タイプ）に記録すること
- 「なぜそうなったか」「次にどう防ぐか」まで含めて記録すること
- プロジェクトをまたいで活かせる知見は特に積極的に保存すること

## プロジェクト概要

美容院向け勤怠打刻Webアプリ。Next.js (App Router) + Tailwind CSS + Notion API。

---

## セキュリティ設計

### 管理者認証の仕組み

```
[ブラウザ]                    [サーバー]                  [Notion]
    |                             |                           |
    | POST /api/admin/auth        |                           |
    | { password: "****" }  →    | ADMIN_PASSWORD(env)と照合 |
    |                        ←   | httpOnly cookie 発行       |
    |                             |                           |
    | GET /api/admin/tips         |                           |
    | (cookie自動送信)       →    | cookie検証                |
    |                        ←   | Notionから取得してレスポンス|
```

### ポイント

- **パスワードは環境変数 `ADMIN_PASSWORD` のみに存在**。フロントのコードには含まれない。
- **APIルートはcookieを検証**。管理者画面を経由しない直接リクエストは403を返す。
- cookieは `httpOnly`（JSから読めない）・`sameSite: strict`。

### 残存リスク（許容済み・デモ段階）

| リスク | 内容 | 対応方針 |
|--------|------|---------|
| cookieの有効期限 | 現状は1日。長すぎると乗っ取りリスク | 本番時に短縮検討 |
| HTTPSのみ | VercelはHTTPS必須なので問題なし。ローカル開発はHTTP | ローカルは許容 |
| パスワード強度 | オーナーが設定。弱いパスワードは運用でカバー | 本番時に注意喚起 |

### 保護対象のAPIルート

`/api/admin/*` 配下はすべてcookie認証が必要。

| エンドポイント | 操作内容 |
|--------------|---------|
| GET /api/admin/tips | 保健師の一言 全件取得 |
| PATCH /api/admin/tips/[id] | 保健師の一言 更新 |
| GET /api/admin/employees | 従業員マスタ 取得 |
| GET /api/admin/payroll | 店舗別設定 取得 |
| GET /api/admin/store-settings | 店舗一覧 取得 |
| GET /api/admin/holiday | 公休・有給レコード 取得 |
| PATCH /api/admin/records/[pageId] | 月次レコード 更新 |

### 保護不要のAPIルート（従業員向け）

| エンドポイント | 理由 |
|--------------|------|
| GET /api/employees | 打刻画面で従業員リストを表示するため認証不要 |
| POST /api/timestamp | 打刻登録。認証なしだが悪用しても打刻ログが増えるだけ |
| GET /api/tips | 打刻画面で一言表示するため認証不要 |

---

## 環境変数

| 変数名 | 用途 |
|--------|------|
| NOTION_API_KEY | Notion APIキー |
| TIMELOG_DB_ID | 勤怠ログDB（打刻・公休・有給） |
| EMPLOYEE_DB_ID | 従業員マスタDB |
| STORE_SETTINGS_DB_ID | 店舗設定DB（店舗名・定休曜日・給与計算設定） |
| TIPS_DB_ID | 保健師の一言DB |
| OVERTIME_REQUEST_DB_ID | 時間外申請DB |
| ADMIN_PASSWORD | 管理者パスワード |

---

## 今後の課題（本番移行時）

- [ ] パスワードをオーナーが変更できる仕組み
- [ ] 管理者セッションのログアウト機能
- [ ] APIレート制限（Notionへの過剰リクエスト防止）

## ⚠ 本番前に必ず削除するデバッグ機能

### モック時刻機能（打刻時刻の偽装）

| ファイル | 該当箇所 |
|---------|---------|
| `components/DebugSettings.tsx` | テスト打刻時刻UI（管理画面デバッグタブ） |
| `app/page.tsx` | `localStorage.getItem("debug_mock_time")` をAPIに送る処理 |
| `app/api/timestamp/route.ts` | `mockTime` パラメーターの受け取り |
| `lib/notion.ts` | `registerTimestamp()` の `mockTime` 引数とその適用ロジック |
