# チャットRAG（現行実装）まとめ（使い方・注意事項）

このプロジェクトのチャットAPI（`/api/chat`）は、Supabase（pgvector）を使った **RAG（検索→根拠→回答）** で動きます。

## 1) いまのRAGの流れ（サーバー側）

実装: `app/api/chat/route.ts`

- 入力: `content`（ユーザー入力）, `sessionId`
- 入力正規化: `normalizeText()`（NFKC/改行/空白/ゼロ幅文字の正規化）
- クエリembedding生成:
  - OpenAI embedding model: **`text-embedding-3-small`**
- 類似検索（RPC）:
  - `supabase.rpc("match_furubira_info", { query_embedding, match_count: 8 })`
- 閾値判定（現在値）:
  - `SIMILARITY_THRESHOLD = 0.4`
  - `top1.similarity < 0.4`（または similarity が取れない）場合は **「該当なし」** を返して終了（推測回答しない）
- 根拠付き回答生成:
  - system prompt に `buildContext(matches)` を「根拠」として埋め込む
  - ルール: **根拠にない情報は推測しない**
- 返却:
  - OpenAI chat completion を **ストリーミング**で返す
  - 生成結果は `chat` テーブルへ保存
- ログ（最低限）:
  - `[rag] retrieval`: `queryRaw`, `queryNormalized`, `matchCount`, `top1Similarity`, `selectedHashes`
  - `[rag] answer`: `top1Similarity`, `selectedHashes`, `finalAnswer`

## 2) 使い方（ローカル開発）

### 必要な環境変数（例: `.env.local`）

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（ingest用。クライアントに露出しない）
- `OPENAI_API_KEY`

### まず動かす（チャット）

- `npm run dev`
- チャットUIから質問する（`/api/chat` が呼ばれる）
- コンソールで `[rag] retrieval` / `[rag] answer` を確認する

## 3) Supabase側（RPC）

### `match_furubira_info`（戻り値に `content_hash` を含む）

SQL: `docs/sql/05_create_match_furubira_info_rpc.sql`

- 既存関数の OUT パラメータ（戻り値）を変える場合、Postgresの制約で `create or replace` できません。
- そのため、このSQLは **先に `DROP FUNCTION`** を実行してから作り直します（ファイルに含めています）。

## 4) ingest（ナレッジ投入 / 再作成）

実装: `scripts/ingest-furubira-info.mjs`

### 更新のしかた（おすすめ運用）

RAGの検索対象（`furubira_info`）を更新したい場合は、基本的に **DBを手で直すのではなく**、以下の流れで更新します。

1. **元データ（正本）を更新**
   - `scripts/furubira_content.json` を編集（追記・修正）

2. **ingestを実行してDBへ反映**
   - 正規化 → チャンク化 → `content_hash` 生成 → embedding生成（`text-embedding-3-small`）→ `furubira_info` へ insert

PowerShell（`.env.local` を読む）:

```powershell
$env:DOTENV_CONFIG_PATH=".env.local"
node -r dotenv/config scripts/ingest-furubira-info.mjs --source scripts/furubira_content.json
```

### 削除も同期したい場合（注意）

元データから削除した内容をDBからも削除したい場合は `--delete` を付けます。

```powershell
$env:DOTENV_CONFIG_PATH=".env.local"
node -r dotenv/config scripts/ingest-furubira-info.mjs --source scripts/furubira_content.json --delete
```

注意:
- **削除は取り返しがつかない**ので、最初は `--delete` なしで運用し、問題なければ導入がおすすめです。

### 目的

- `furubira_info` に **`content_hash`** と **`text-embedding-3-small` のembedding** を入れて、検索品質と差分更新を安定させます。

### 実行例（PowerShell / `.env.local` を読む）

```powershell
$env:DOTENV_CONFIG_PATH=".env.local"
node -r dotenv/config scripts/ingest-furubira-info.mjs --source scripts/furubira_content.json
```

### 注意（ヘッダ上限）

- `content_hash`（64文字）を大量に `.in("content_hash", hashes)` に渡すと、NodeのHTTPクライアント（undici）側で **`HeadersOverflowError`** になる場合があります。
- その対策として、このリポジトリでは `fetchExistingHashes()` の **バッチサイズを小さめ** にしています。

## 5) 重要な注意事項（詰まりどころ）

### embeddingモデルは必ず一致させる

- DB側の `furubira_info.embedding` と、`/api/chat` のクエリembeddingが **別モデル**だと、類似度が極端に低くなり（例: 0.01台）検索が成立しません。
- このプロジェクトの現行方針は **`text-embedding-3-small` に統一**です。

### `content_hash` が null の行が混ざると壊れやすい

- `content_hash` が入っていない古い行が残っていると、検索/運用/ログが不安定になります。
- 可能なら ingest を正として、`content_hash` 前提で運用してください。

### 閾値を下げるほど「拾う」が、ノイズも増える

- `SIMILARITY_THRESHOLD` を下げると答える範囲は広がりますが、根拠の関連性が下がりやすいです。
- 嘘・ズレが増えるなら閾値を上げてください。

## 6) 簡易チェック（RAGできているか）

- `[rag] retrieval` に `top1Similarity` が出ること
- `selectedHashes` が `null` ではなく、hashが入ること
- 回答文が `根拠:` に含まれる内容に沿っていること


