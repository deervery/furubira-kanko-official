# ふるびら AI ガイド

## 概要

本プロジェクトは、古平町向けの特化型 AI ガイドを提供するシステムです。

従来の **RAG (Retrieval-Augmented Generation)** ではなく、**ICL (In-Context Learning)** を採用しました。

## ICL を採用した理由

### 1. RAG の類似度判定精度の問題

- RAG 方式では、埋め込みベクトルの類似度検索を用いて関連情報を取得し、AI の回答生成を補助します。
- しかし、**類似度判定の精度が十分ではなく**、的外れな情報を取得するケースが発生しました。
- 結果として、誤った内容の回答が生じやすくなりました。

### 2. ICL の安定した応答品質

- ICL 方式では、**情報をプロンプト内に直接埋め込む** ため、応答の一貫性が向上します。
- **ユーザーの質問に対して適切な文脈を持った回答を提供できる** ため、より正確な情報提供が可能です。
- 特に、**gpt-4o-mini でも十分な品質を確保** できることが確認されました。

### 3. コスト面の懸念

- ICL 方式では、情報をプロンプトに含めるため **トークン数が増え、費用が高くなる** 可能性があります。
- ただし、gpt-4o-mini を使用すれば、RAG（Supabase × gpt-4o）と比較してコストを抑えつつ運用できる可能性があります。
- 今後、**RAG（Supabase）× gpt-4o との比較検討** を継続する予定です。

### 4. ストリーミング処理の問題

- `npm ai` を利用してテキストをストリームする設定にした場合、ICL でも適切な応答を返さない現象が発生しました。
- もしかすると、**RAG で期待通りに機能しなかった原因は、ストリーミング処理の影響である可能性** もあるため、今後のテストが必要です。

---

## 実装手順

### 1. データ収集

### `scripts/downloadJson.mjs`（廃止）

`furubira_info.json` のスナップショットをDBから取得する用途でしたが、現在の更新フローでは使用しません。

### `scripts/scrapePage.mjs`

- **目的**: 古平町の Web サイトから指定したページのテキストデータを収集する。
- **処理の流れ**:
  1. Gemini の DeepResearch 機能を使用し、対象ページ一覧 (`urls.mjs`) を取得。
  2. 各ページのタイトル (`title`タグ) と記事本文 (`.column02-inr`) を取得。
  3. `furubira_content.json` に保存。

### 2. データ整形・前処理

### `scripts/getRidOf.mjs`

- **目的**: `furubira_content.json` から、空の`title`または`content`を持つ項目を削除。
- **ICL の場合**: スキップ可能。

### `scripts/fixTitle.mjs`

- **目的**: 古平町 Web サイトの`title`には`|`で区切られた余分な情報が含まれるため、最初のパイプ以降を削除。
- **対象**: `furubira_content.json`

### `scripts/fixContent.mjs`

- **目的**: 記事内の不要な情報を削除し、整形する。
- **処理方法**: `gpt-4o-mini`を利用して自動修正。

### 3. データ格納・利用方法

### **RAG（埋め込み検索）を使用する場合**

- `scripts/ingest-furubira-info.mjs`（推奨）
  - **目的**: `scripts/furubira_content.json`（正本）から、**差分更新**で `furubira_info` を更新する（チャンク化 + `content_hash` + embedding + insert + 任意で削除）
  - **前提**:
    - DBに `content_hash` 列 + unique がある（`docs/sql/03_add_content_hash_and_unique.sql`）
    - RLSは `SELECT` のみ公開（`docs/sql/04_rls_public_select_furubira_info.sql`）
    - 削除（ゴミ残り対策）をする場合は purge RPC を作成（`docs/sql/06_create_purge_furubira_info_rpc.sql`）
  - **embeddingモデル**:
    - `text-embedding-3-small`（1536次元）で統一（`furubira_info.embedding` が `vector(1536)` 前提）
  - **必要な環境変数（ローカル/CI/サーバー限定）**:
    - `OPENAI_API_KEY=...`
    - `SUPABASE_URL=...`（または `NEXT_PUBLIC_SUPABASE_URL`）
    - `SUPABASE_SERVICE_ROLE_KEY=...`（**絶対にクライアントへ露出しない**）
  - **実行例**:

```bash
# まずは dry-run（チャンク数・パラメータ確認）
node scripts/ingest-furubira-info.mjs --dry-run

# 差分投入（同じ content_hash は再embedding/再投入しない）
node scripts/ingest-furubira-info.mjs --source scripts/furubira_content.json

# 差分投入 + 削除（元データから消えたチャンクをDBから削除）
node scripts/ingest-furubira-info.mjs --source scripts/furubira_content.json --delete
```

- `scripts/update-furubira-info.mjs`（推奨）
  - **目的**: 既に `furubira_info` テーブルに存在する行（`title` と `content` のみ）に対して、`content_hash` と `embedding` を生成・更新するバッチ処理スクリプト
  - **用途**: 外部から `title` と `content` を INSERT した後、このスクリプトで hash と embedding を一括生成
  - **前提**: `ingest-furubira-info.mjs` と同様に、`content_hash` 列と embedding 列が存在すること
  - **embeddingモデル**: `text-embedding-3-small`（1536次元）で統一
  - **必要な環境変数**: `ingest-furubira-info.mjs` と同様
  - **実行例**:

```bash
# content_hash が NULL の行を処理（デフォルト）
node scripts/update-furubira-info.mjs

# 特定のIDの行を処理
node scripts/update-furubira-info.mjs --ids 123,456

# チャンク化して処理（長いcontentを分割）
node scripts/update-furubira-info.mjs --chunk --null-hash

# すべての行を再処理（既存のhash/embeddingも上書き）
node scripts/update-furubira-info.mjs --all

# ドライラン（実際には更新しない）
node scripts/update-furubira-info.mjs --null-hash --dry-run
```

- `scripts/insertData.mjs`（旧）
  - 差分更新/削除が無く、RLS構成によっては insert が失敗するため非推奨（互換のため残置）
- `app/api/chat/route.ts`
  - **目的**: Supabase のデータベースと連携し、最も類似度の高い情報を検索し、回答を生成する。

### **ICL（プロンプト内に情報を埋め込む）を使用する場合**

- `app/api/chat/route.ts`
  - **目的**: `furubira_content.json` を直接読み込み、システムプロンプトに含める。

---

## 翻訳辞書（`locales/messages.json`）の同期（Excel基準）

英語対応の Excel（`英語対応_translationPj.xlsx`）を「正」とし、Excel に存在しない **日本語文** を持つエントリは `locales/messages.json` から削除できます。

### 実行コマンド

```bash
npm run prune-translations:excel-ja
```

### 何が起きるか

- Excel の「日本語」列の文字列を抽出（空・重複は除外）
- `messages.json` の `ja` 側の値（日本語文字列）と照合
- Excel に存在しない日本語文のキーを **ja/en 両方から削除**
- `locales/messages.json.bak.<timestamp>` を作ってから書き換え
- `docs/translation-prune-report.<timestamp>.md` に削除一覧を出力

### 注意

- 削除したキーが UI で参照されている場合、表示が崩れる（キー文字が出る等）可能性があります。
- 戻したい場合はバックアップ（`locales/messages.json.bak.<timestamp>`）を `locales/messages.json` に戻してください。

## 今後の検討

- **ICL 方式のトークン数削減方法** の模索（情報量を最適化しつつ、適切な回答を維持する）。
- **RAG 方式の精度向上**（類似度検索のチューニング、ストリーミング処理の見直し）。
- **ICL（gpt-4o-mini） vs. RAG（Supabase × gpt-4o） の比較** を継続し、最適な運用方針を決定する。

## 連携技術

- **Supabase**（データベース、埋め込み検索）
- **OpenAI GPT-4o / GPT-4o-mini**（AI モデル）
- **Next.js API**（チャットエンドポイント）
- **npm `ai`**（ストリーミング処理）

---

この README は **ICL を採用した理由** と **実装手順** を統合し、プロジェクトの全体像を把握しやすくしました。

他に追加・修正したい点があれば教えてください！

