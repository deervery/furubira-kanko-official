# ハードコーディング翻訳（/ja・/en）実装ドキュメント

このプロジェクトは、Next.js(App Router)で **URLに言語を固定**する形（`/ja`・`/en`）で多言語対応しています。

- 例: トップページ
  - 日本語: `/ja`
  - 英語: `/en`
- 例: 観光スポット一覧
  - 日本語: `/ja/spots`
  - 英語: `/en/spots`

翻訳文言は **JSON（`locales/messages.json`）を正**として管理します（実行時は辞書を“ハードコード”で参照）。

---

## 全体像（何がどこで起きるか）

### ブラウザがアクセスした時の流れ

1. ユーザーが `/` や `/spots` のように **言語プレフィックス無し**でアクセス
2. `middleware.ts` がブラウザ言語（`Accept-Language`）や cookie を見て `/{ja|en}` へ **リダイレクト**
3. `/ja/...` or `/en/...` に到達すると `app/[lang]/layout.tsx` が `I18nProvider` を用意
4. 画面側（Header/Footer/ページなど）は `useI18n()` で `lang` と `messages` を受け取り、`t(messages, "key.path")` で文言を取得

---

## 重要ファイル一覧

### ルーティング（公開ページ）
- `app/[lang]/layout.tsx`
  - `/ja` と `/en` を `generateStaticParams()` で静的生成
  - `I18nProvider` を設置（この配下で `useI18n()` が使える）
  - Next.js 16 では `params` が Promise 扱いになるケースがあるため、`await Promise.resolve(params)` で安全に `lang` を取得する
- `app/[lang]/page.tsx`
- `app/[lang]/**/page.tsx`（公開ページ群）
- `app/[lang]/not-found.tsx`（公開用404）
  - `app/[lang]/shopping/page.tsx`（買い物ページ）は、`shops` テーブルの `type` を **ラベル無しでそのまま表示**します（`Type:` / `種別:` は付けない）

### 翻訳（i18n）
- `locales/messages.json`
  - 翻訳辞書（JSON）このファイルを直接編集して運用します
- `lib/i18n/messages.ts`
  - JSONの読み込みと型（`Messages`）の定義
- `lib/i18n/getMessages.ts`
  - `getMessages(lang)`（JSON辞書を返す）
- `lib/i18n/t.ts`
  - `t(messages, "a.b.c")` のように **ドットパスで文字列取得**
  - 文字列が存在しない場合は **キー文字列をそのまま返す**（実装上の挙動）
- `lib/i18n/lang.ts`
  - `Lang = 'ja' | 'en'` など

### 言語リダイレクト + `<html lang>`
- `middleware.ts`
  - 言語プレフィックス無しURL → `/{ja|en}` へリダイレクト
  - `x-lang` リクエストヘッダ付与 + `lang` cookie 保存
- `app/layout.tsx`
  - `x-lang` ヘッダを参照して `<html lang="...">` を設定
  - Next.js 16 では `headers()` が Promise のため、`await headers()` を使う

### ナビ/フッター（言語・リンク対応）
- `components/ui/header.tsx`
  - 主要リンクを `/${lang}` 付きに統一
  - `JA | EN` 切替を提供
- `components/ui/footer.tsx`
  - 主要リンクを `/${lang}` 付きに統一

---

## 翻訳辞書（JSON）運用手順

### 1) JSONの場所
ファイル: `locales/messages.json`

- 形式: `{ "ja": { ... }, "en": { ... } }`
- キーはドットパス（例: `cms.about_hometown_tax_program`）として `t(messages, key)` で参照されます。
- **JSON内のカテゴリ分け（Header/Footerなど）は必須ではありません**。運用しやすい形でOKです（フラットでもネストでも可）。
- **JSONに無い文言は翻訳不要**です。翻訳対象にしたい文言だけ `t()` を使い、辞書に追加してください。

### 2) 追加・更新の手順
1. `locales/messages.json` の `ja` / `en` にキーを追加・更新
2. `/ja` と `/en` で表示を確認

> 注意: `t()` はキーが無い場合、キー文字列をそのまま表示します。翻訳不要の文言は `t()` を使わず、そのまま表示してください。

---

## Excel（英語翻訳）と `messages.json` の照合・削除

英語翻訳の Excel（`英語対応_translationPj.xlsx`）を「正」として運用する場合、Excel に存在しない日本語文を持つエントリは `locales/messages.json` から削除してOKです。

### 実行方法

```bash
npm run prune-translations:excel-ja
```

### 生成物

- `locales/messages.json.bak.<timestamp>`（バックアップ）
- `docs/translation-prune-report.<timestamp>.md`（削除レポート）

### 注意

- **コードで参照されているキーは削除しない**ようにしています（`t(messages, "x.y")` や `{ key: "x.y" }` を静的解析して保護）。
- それでも `header.events` のような **キー文字列が画面に出る場合**は、該当キーが辞書から消えているサインです。
- 復元する場合は、バックアップを `locales/messages.json` に戻してください。
  - もしくは以下で「最新バックアップからコード参照キーだけ」復元できます。

```bash
npm run restore-translations:latest-backup
```

---

## 画面側での使い方（t() / useI18n）

### 基本
`app/[lang]/layout.tsx` 配下（公開ページ側）では以下が使えます。

- `useI18n()` → `{ lang, messages }`
- `t(messages, "cms.about_hometown_tax_program")` → 文字列

例（クライアントコンポーネント）:

```tsx
import { useI18n } from "@/components/i18n/i18n-provider"
import { t } from "@/lib/i18n/t"

export function Example() {
  const { messages } = useI18n()
  return <h1>{t(messages, "cms.about_hometown_tax_program")}</h1>
}
```

### 内部リンクは `/${lang}` を必ず付ける
公開側の内部リンクは `/${lang}` を付けるルールです。

- OK: `/${lang}/spots`
- NG: `/spots`（middleware が付け直すが、意図しないリダイレクトが増える）

ヘッダー/フッターはすでに `/${lang}` 付きに統一済みです。

---

## 言語切替（JA/EN）

`components/ui/header.tsx` が現在URLの先頭セグメントを見て、

- `/ja/...` → `/en/...`
- `/en/...` → `/ja/...`

に切り替えるリンク（`JA | EN`）を表示します。

クエリ（`?x=y`）がある場合は保持します。

---

## middleware のリダイレクト仕様（公開ページだけ）

ファイル: `middleware.ts`

### 対象外（リダイレクトしない）
- `/_next/**`
- `/api/**`
- `/admin/**`
- 拡張子付きパス（例: `/favicon.ico`, `/*.png` など）

### ルール
- すでに `/ja` or `/en` で始まる場合
  - **そのまま通す**
  - `x-lang` ヘッダを付与（RootLayoutの `<html lang>` 用）
  - `lang` cookie を保存
- 言語プレフィックス無しの場合（例: `/` `/spots`）
  - cookie `lang` があればそれを採用
  - 無ければ `Accept-Language` の先頭から `ja/en` を判定（それ以外は `ja`）
  - `/{lang}` もしくは `/{lang}{pathname}` に **302 リダイレクト**

---

## よくある作業

### 新しい翻訳文言を追加する
1. `locales/messages.json` の `ja` / `en` にキーを追加・更新
2. 画面で `t(messages, "key.path")` が期待どおり表示されるか確認する

### 公開ページを追加する
1. `app/[lang]/new-page/page.tsx` を作る
2. Header/Footer にリンクを追加する場合は `components/ui/header.tsx` / `components/ui/footer.tsx` を編集
3. 文言は `t()` 経由にする

---

## 注意点

- `locales/messages.json` が翻訳の正です（直接編集して運用）。
- 管理画面（`/admin`）と API（`/api`）は今回の多言語化対象外です。
- `t()` はキーが無い場合 **キー文字列を返す**ため、翻訳不要の文言には `t()` を使わないでください。

---

## 英語表示時のUI調整

### ヘッダー（英語時のフォントサイズ・余白調整）

`components/ui/header.tsx` では、英語（`lang === "en"`）のときだけ以下の調整を行い、長い英語ラベルが切れないようにしています。

- **サイト名**: 英語時は `text-base sm:text-lg`（日本語は `text-xl`）でフォントサイズを小さめにし、`whitespace-nowrap` で折り返しを防止
- **ナビゲーションメニュー**: 英語時は `space-x-2`（日本語は `space-x-4`）で項目間の余白を詰め、ボタンは `px-2 text-sm` で横幅を節約

これにより、元のヘッダーレイアウト（メニュー文字が常に表示される形）を維持しつつ、英語表示でも文字が切れないようにしています。

### Google Maps の英語化

`app/[lang]/access/page.tsx` と `components/home-client.tsx` の Google Maps 埋め込みでは、言語に応じて以下を切り替えています。

- **英語（`/en`）**: `q=Furubira Town Hall, Hokkaido, Japan` + `hl=en`
- **日本語（`/ja`）**: `q=〒046-0121 北海道古平郡古平町浜町50番地 古平町役場` + `hl=ja`

これにより、地図のUI（「ルート」「拡大地図を表示」など）と地名表示が英語ページでは英語寄りになります。

> 注意: Google Maps の地名表示は Google 側のデータに依存するため、一部の地名が日本語のままになる場合があります。


