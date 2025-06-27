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
- ただし、gpt-4o-mini を使用すれば、RAG（Firestore × gpt-4o）と比較してコストを抑えつつ運用できる可能性があります。
- 今後、**RAG（Firestore）× gpt-4o との比較検討** を継続する予定です。

### 4. ストリーミング処理の問題

- `npm ai` を利用してテキストをストリームする設定にした場合、ICL でも適切な応答を返さない現象が発生しました。
- もしかすると、**RAG で期待通りに機能しなかった原因は、ストリーミング処理の影響である可能性** もあるため、今後のテストが必要です。

---

## 実装手順

### 1. データ収集

### `scripts/downloadJson.mjs`

- **目的**: Firestore の`furubira_info`コレクションからすべてのドキュメントを取得し、JSON データ (`furubira_info.json`) に変換する。
- **出力**: `furubira_info.json` (title, content を含む)

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

- `scripts/insertData.mjs`
  - **目的**: `furubira_content.json` のデータを Firestore に挿入し、ベクトル検索を可能にする。
  - **処理方法**:
    1. `text-embedding-ada-002` で各`content`をベクトル化 (`embedding`生成)。
    2. `title, content, embedding` を Firestore (`furubira_info`コレクション) に保存。
- `app/api/chat/route.ts`
  - **目的**: Firestore のデータベースと連携し、最も類似度の高い情報を検索し、回答を生成する。

### **ICL（プロンプト内に情報を埋め込む）を使用する場合**

- `app/api/chat/route.ts`
  - **目的**: `furubira_content.json` を直接読み込み、システムプロンプトに含める。

### 4. データ移行

### `scripts/migrate-firestore.js`

- **目的**: CSVファイルからFirestoreへのデータ移行を行う。
- **処理方法**: 
  1. `tmp/csv_data`ディレクトリ内のCSVファイルを読み込み
  2. データ型を適切に変換（文字列→数値、日付→Timestamp等）
  3. Firestoreの対応するコレクションに保存

## 今後の検討

- **ICL 方式のトークン数削減方法** の模索（情報量を最適化しつつ、適切な回答を維持する）。
- **RAG 方式の精度向上**（類似度検索のチューニング、ストリーミング処理の見直し）。
- **ICL（gpt-4o-mini） vs. RAG（Firestore × gpt-4o） の比較** を継続し、最適な運用方針を決定する。

## 連携技術

- **Firebase Firestore**（データベース、埋め込み検索）
- **OpenAI GPT-4o / GPT-4o-mini**（AI モデル）
- **Next.js API**（チャットエンドポイント）
- **npm `ai`**（ストリーミング処理）

---

この README は **ICL を採用した理由** と **実装手順** を統合し、プロジェクトの全体像を把握しやすくしました。

他に追加・修正したい点があれば教えてください！
