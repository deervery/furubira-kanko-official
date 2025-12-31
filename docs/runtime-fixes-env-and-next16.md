# 実行時エラー修正メモ（Supabase / Next.js 16）

このドキュメントは、開発中に発生した以下のエラーを修正した内容と、再発防止の手順をまとめたものです。

- `supabaseUrl is required.`
- `Invalid source map. ... sourceMapURL could not be parsed`
  - ただしこれは「本質原因」ではなく、例外表示時にソースマップ復元に失敗して出ることがあります

---

## 1. `supabaseUrl is required.` の原因と修正

### 症状
起動時や API 呼び出し時に、Supabase クライアント生成で以下が出る。

- `supabaseUrl is required.`

### 原因
アプリは以下の環境変数を参照しています。

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

しかし、Next.js が自動で読み込むのは **`.env.local` / `.env` 系**であり、別名のファイル（例: `.local.env`）に置くと **実行時に `process.env` が空になり**、Supabase 側のバリデーションで落ちます。

#### 追加の落とし穴（Next.js + クライアントバンドル）
`NEXT_PUBLIC_*` はブラウザ側にも公開される環境変数ですが、Next.js は **クライアントバンドルに埋め込む際、静的参照だけを置換**します。

- OK（静的参照）: `process.env.NEXT_PUBLIC_SUPABASE_URL`
- NG（動的参照）: `process.env[name]`

`lib/supabase.ts` のようにクライアントでも読み込まれる可能性がある場所で `process.env[name]` を使うと、`.env.local` が正しくても **実行時に `undefined` になる**ことがあります。

### 修正内容（コード）
`lib/supabase.ts` で環境変数が未設定の場合に、Supabase のエラーより先に **人間が理解できるメッセージ**で落ちるようにしました。

（例）
- どの env が足りないか（`NEXT_PUBLIC_SUPABASE_URL` など）を明示
- `.env.local` を作って `next dev` を再起動するようガイド

### 再発防止（手順）
プロジェクト直下に `.env.local` を作成し、最低限これを設定してください（値は Supabase の Project Settings から取得）。

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

重要:
- `.env.local` は git で無視される設定です（`.gitignore` に `.env*` が入っています）
- **環境変数を変更したら `next dev` は必ず再起動**してください（起動中には反映されません）

---

## 2. `Invalid source map ... sourceMapURL could not be parsed` の原因と修正

### 症状
開発サーバーでエラー表示時に、以下のような Console Error が出る。

- `Invalid source map. Only conformant source maps can be used...`
- `Cause: Error: sourceMapURL could not be parsed`

スタックトレースが `app/layout.tsx` や `app/[lang]/layout.tsx` を指していることがある。

### 原因（本質）
Next.js 16 では `next/headers` の `headers()` が **Promise** になっており、
`headers().get("x-lang")` のように同期的に呼ぶと実行時に落ちます。

その「本来の例外」を Next の開発オーバーレイが表示しようとしたとき、Turbopack 側のソースマップ復元でも失敗して、`Invalid source map` が併発することがあります。

### 修正内容（コード）
`app/layout.tsx` を `async` にし、`await headers()` した結果から `get()` するように変更しました。

```tsx
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const langFromHeader = headersList.get("x-lang")
  // ...
}
```

また、Next.js 16 では `params` も Promise 扱いになるケースがあるため、`app/[lang]/layout.tsx` / `app/[lang]/page.tsx` で以下のように安全に解決するよう修正しました。

```tsx
const { lang } = await Promise.resolve(params)
```

### もし `Invalid source map` が残る場合（補足）
上記の本質エラーが消えた後も警告だけ残る場合は、以下が有効です。

- `.next` を削除してから `next dev` 再起動（キャッシュ破損対策）
- Windows 環境で、プロジェクトパスに日本語/特殊文字があると関連警告が出やすいことがあるため、必要なら ASCII だけのパス配下に移動して再確認

---

## 関連ファイル

- `lib/supabase.ts`
  - Supabase クライアント生成 + env 未設定の早期検知
- `app/api/embedding/route.ts`
  - Supabase クライアント生成を `@/lib/supabase` に統一
- `app/layout.tsx`
  - `x-lang` ヘッダ参照のため `await headers()` を使用（Next.js 16 対応）
- `middleware.ts`
  - `x-lang` ヘッダの付与（`/ja`・`/en` プレフィックスがある場合）


