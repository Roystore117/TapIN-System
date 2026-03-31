# Tap-IN 開発者ノート

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
| GET /api/admin/employees | 従業員マスタ 取得（未実装） |
| GET /api/admin/payroll | 給与計算設定 取得（未実装） |

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
| DATABASE_ID | 打刻ログDB |
| EMPLOYEE_DB_ID | 従業員マスタDB |
| TIPS_DB_ID | 保健師の一言DB |
| ADMIN_PASSWORD | 管理者パスワード |

---

## 今後の課題（本番移行時）

- [ ] パスワードをオーナーが変更できる仕組み
- [ ] 管理者セッションのログアウト機能
- [ ] APIレート制限（Notionへの過剰リクエスト防止）
