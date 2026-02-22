# 3枠限定予約ページ MVP

Instagram ストーリーなどからの流入を想定した「表示する3枠だけを見せて予約を促す」スマホファーストの予約 MVP です。

## 技術スタック

- **Next.js 14+** (App Router) + TypeScript
- **Supabase**（DB + Auth、Storage は未使用）
- **Tailwind CSS**
- デプロイ: **Vercel** 想定

> **Node.js**: Supabase クライアントは Node 20 以上を推奨します。Node 18 以下ではビルド時に警告が出ます。

## ゴール（MVP）

- 管理者が「表示する3つの予約枠」だけを登録/更新できる
- ユーザーはその3枠から1つ選んで予約を確定できる
- 予約が入った枠は残り枠が減り、0 になったら選択不可
- 希少性・限定感のある文言で表示（「空き」「いつでも」は使わない）
- `/today` でシンプル URL を提供（ストーリー貼り付け用）
- **予約の流れ**: 3枠から1つ選択 → フォーム入力・送信 → 登録メールに確認リンク送信 → リンクをクリックで予約確定 → 美容師に「予約確定」メール通知

---

## セットアップ手順

### 1. リポジトリのクローンと依存関係

```bash
git clone <your-repo>
cd reservation-mvp
npm install
```

### 2. 環境変数

`.env.local` をプロジェクトルートに作成し、以下を設定します。

```bash
# .env.local の例（すべての環境変数）

# Supabase（必須）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 管理者メール（Supabase Auth のユーザーと一致させる）
ADMIN_EMAIL=admin@example.com

# 本番のサイト URL（ログアウト後のリダイレクトなどに使用）
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app

# 他の日時希望用リンク（任意・LINE/DM など）
NEXT_PUBLIC_OTHER_INQUIRY_URL=https://line.me/ti/p/xxxxx

# 予約確認メール送信（Resend）
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@your-domain.com
```

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ○ | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ○ | Supabase 匿名キー（公開可） |
| `SUPABASE_SERVICE_ROLE_KEY` | ○ | サービスロールキー（**絶対に公開しない**） |
| `ADMIN_EMAIL` | ○ | 管理画面にログインできるメールアドレス |
| `NEXT_PUBLIC_SITE_URL` | △ | 本番のサイト URL（確認リンク・ログアウト先に使用） |
| `NEXT_PUBLIC_OTHER_INQUIRY_URL` | - | 「他の日時希望はこちら」のリンク（LINE/DM） |
| `RESEND_API_KEY` | ○ | [Resend](https://resend.com) の API キー（確認メール・美容師通知に使用） |
| `EMAIL_FROM` | △ | 送信元メールアドレス（未設定時は Resend の onboarding 用ドメイン） |

### 3. Supabase 設定手順

1. **Supabase プロジェクト作成**  
   [Supabase](https://supabase.com) で新規プロジェクトを作成する。

2. **SQL の実行**  
   - Dashboard → SQL Editor を開く  
   - このリポジトリの `supabase/schema.sql` の内容をすべてコピーして実行する  
   - テーブル `slots` / `reservations`、RPC `create_reservation` / `get_public_slots`、RLS ポリシーが作成される。

3. **管理者ユーザーの作成**  
   - Dashboard → Authentication → Users → 「Add user」  
   - メール + パスワードでユーザーを作成する  
   - そのメールアドレスを `.env.local` の `ADMIN_EMAIL` に設定する  

4. **環境変数への反映**  
   - Dashboard → Settings → API で、Project URL と anon key / service_role key を確認  
   - それぞれ `.env.local` の `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` に設定する  

### 4. 開発サーバー起動

```bash
npm run dev
```

- 公開ページ: http://localhost:3000/today  
- 管理画面: http://localhost:3000/admin（上記 ADMIN_EMAIL でログイン）

---

## 管理画面の使い方

1. `/admin` にアクセスし、`ADMIN_EMAIL` のメール + パスワードでログインする。
2. 「新規枠を追加」で枠を作成する。  
   - **日時**（start_at）、**ラベル**（最短 / 人気 / 仕事終わり）、**定員**（1〜3）、**メモ**（任意）、**表示する**（is_active）を設定。
3. 表示する枠だけ **is_active** を ON にし、未来の日時にする。  
   - 公開ページでは「is_active=true かつ 未来の枠」から **最大3件** が `get_public_slots` で取得され、`/today` に表示される。
4. 枠の編集・削除は一覧の「編集」から行う。

---

## デプロイ手順（Vercel・Git 連携）

**Git のリモートに push するたびに Vercel が自動でビルド・デプロイします。**

### 1. リポジトリを GitHub / GitLab / Bitbucket に push

```bash
git remote -v   # すでに origin があればそのまま
git push -u origin main
```

（まだリモートがない場合: GitHub で新規リポジトリを作成し、`git remote add origin https://github.com/<user>/<repo>.git` で追加してから push）

### 2. Vercel でプロジェクトを Import（Git 連携）

1. [Vercel](https://vercel.com) にログインする。
2. 「Add New…」→「Project」を選ぶ。
3. **Import Git Repository** で GitHub / GitLab / Bitbucket を連携し、このリポジトリを選択して「Import」する。
4. **Configure Project** 画面で:
   - **Environment Variables** に以下を追加（Production にチェック）。
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `ADMIN_EMAIL`
     - `NEXT_PUBLIC_SITE_URL`（いったん `https://your-app.vercel.app` でよい。デプロイ後に実際の URL に更新）
     - `RESEND_API_KEY`
     - （任意）`NEXT_PUBLIC_OTHER_INQUIRY_URL`、`EMAIL_FROM`
5. 「Deploy」をクリックする。

### 3. デプロイ後の設定

1. デプロイが完了したら Vercel の URL（例: `https://reservation-mvp-xxx.vercel.app`）を控える。
2. Vercel の **Settings → Environment Variables** で `NEXT_PUBLIC_SITE_URL` をその URL に更新し、**Redeploy** する。
3. Supabase の **Authentication → URL Configuration** で、**Site URL** に上記 URL を設定する。

### 4. Node.js バージョン（推奨）

Vercel の **Settings → General → Node.js Version** で **20.x** を選ぶ（Supabase クライアント推奨）。変更後は再デプロイされる。

---

以降は **main ブランチに push するたびに本番へ自動デプロイ**されます。プレビュー用のブランチを push すると、そのブランチ用のプレビュー URL も発行されます。

---

## 主なルート

| パス | 説明 |
|------|------|
| `/` | `/today` へリダイレクト |
| `/today` | 公開ページ（本日のご案内可能枠・3択から選択して予約） |
| `/confirm-sent` | 確認メール送信完了（「リンクをクリックして確定」の案内） |
| `/confirm/[token]` | 確認リンク（メール内リンクを踏むと予約確定・美容師に通知メール） |
| `/thanks` | 予約確定後のサンクスページ |
| `/admin` | 管理画面（ログイン必須） |
| `/admin/login` | 管理画面ログイン |
| `/admin/slots/new` | 新規枠追加 |
| `/admin/slots/[id]/edit` | 枠編集 |

---

## セキュリティ（RLS）

- **slots**: 匿名ユーザーは `is_active = true` の行のみ SELECT 可能。INSERT/UPDATE/DELETE は認証済み（管理者判定はアプリ側で `ADMIN_EMAIL` と照合）。
- **reservations**: 匿名のテーブル直 INSERT は不可。予約は RPC `create_reservation` 経由のみ（原子性・残り枠チェックあり）。SELECT は認証済み（管理者）のみ。

---

## ライセンス

MIT
