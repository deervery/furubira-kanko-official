# ふるびら特化 AI（ICL/RAG）の実装手順

## スクリプト一覧

このディレクトリには、ふるびら AI ガイドの構築に必要なデータ処理スクリプトが含まれています。

---

### 1. データ収集

#### `scripts/downloadJson.mjs`

- **目的**: Supabase の`furubira_info`テーブルからすべての行を取得し、JSON データ (`furubira_info.json`) に変換する。
- **出力**: `furubira_info.json` (title, content を含む)

#### `scripts/scrapePage.mjs`

- **目的**: 古平町の Web サイトから指定したページのテキストデータを収集する。
- **処理の流れ**:
  1. Gemini の DeepResearch 機能を使用し、対象ページ一覧 (`urls.mjs`) を取得。
  2. 各ページのタイトル (`title`タグ) と記事本文 (`.column02-inr`) を取得。
  3. `furubira_content.json` に保存。

---

### 2. データ整形・前処理

#### `scripts/getRidOf.mjs`

- **目的**: `furubira_content.json` から、空の`title`または`content`を持つ項目を削除。
- **ICL の場合**: スキップ可能。

#### `scripts/fixTitle.mjs`

- **目的**: 古平町 Web サイトの`title`には`|`で区切られた余分な情報が含まれるため、最初のパイプ以降を削除。
- **対象**: `furubira_content.json`

#### `scripts/fixContent.mjs`

- **目的**: 記事内の不要な情報を削除し、整形する。
- **処理方法**: `gpt-4o-mini`を利用して自動修正。

---

### 3. データ格納・利用方法

#### **RAG（埋め込み検索）を使用する場合**

- `scripts/insertData.mjs`

  - **目的**: `furubira_content.json` のデータを Supabase に挿入し、ベクトル検索を可能にする。
  - **処理方法**:
    1. `text-embedding-ada-002` で各`content`をベクトル化 (`embedding`生成)。
    2. `title, content, embedding` を Supabase (`furubira_info`テーブル) に保存。

- `app/api/chat/route.ts`
  - **目的**: Supabase のデータベースと連携し、最も類似度の高い情報を検索し、回答を生成する。

#### **ICL（プロンプト内に情報を埋め込む）を使用する場合**

- `app/api/chat/route.ts`
  - **目的**: `furubira_content.json` を直接読み込み、システムプロンプトに含める。

---

## 注意点

- RAG 方式の精度向上には、埋め込みベクトルの類似度計算のチューニングが必要。
- ICL 方式はトークン数が増加しやすく、コストが高くなる可能性がある。
- `npm ai` を利用したストリーミング時に適切な応答が得られなかったため、RAG の動作不良との関連を要調査。
