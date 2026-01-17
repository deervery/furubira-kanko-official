# RAG（Supabase pgvector）導入手順まとめ（`furubira_info` ）

このドキュメントは、本プロジェクトのAIチャットを **RAG（Retrieval-Augmented Generation）** 化するための手順を、実装の粒度まで落として箇条書きでまとめたものです。

前提（今回のおすすめ固定）
- データ格納先/検索対象は既存の **`furubira_info` テーブル**を使う
- 対象言語は **日本語のみ**（`lang` フィルタは作らない）
- 情報は **公開されても問題ない**（読み取りは公開でOK）
- 類似検索は **cosine** を使い、インデックスは **IVFFLAT**
- 「それっぽい嘘」を減らすため、サーバー側で **similarity 閾値判定**を必ず入れる

関連ファイル（現状）
- `app/api/chat/route.ts`: 現在はICL（`furubira_info.json` をシステムプロンプトに埋め込み）で応答生成
- `scripts/insertData.mjs`: `furubira_content.json` を embedding して `furubira_info` に投入する旧スクリプト（差分更新なし）
- `app/api/embedding/route.ts`: embedding 生成して `furubira_info` へ insert するAPI（差分更新なし）

---

## 0) 先に決める（ここを曖昧にすると後で破綻しやすい）

- Embeddingモデル（必須）
  - クエリ（ユーザー入力）とナレッジ（チャンク）は **同一モデル**で embedding する
  - 次元（vectorのサイズ）が固定になるため、モデルは途中で変えない前提で進める（変えるなら移行計画が必要）
- チャンク方針（必須）
  - 初期は「段落単位」を基本に、長文は分割・短すぎる断片は結合する方針にする
  - 目安：1チャンク 300〜800文字
- 初期パラメータ（固定で開始）
  - topK: 8
  - similarity閾値: 0.75（嘘が多ければ上げる／答えないなら下げる）
  - IVFFLAT lists: 100（データ量が増えたら見直す）

---

## 1) Supabase側の準備（検索できる状態にする）

目的：`furubira_info` を「ベクトル検索できる」状態にする

- 実行用SQL（おすすめの実行順）
  - `docs/sql/01_inspect_furubira_info_embedding.sql`（pgvector有無・embedding型/次元確認）
  - `docs/sql/02_enable_pgvector_and_ivfflat_index.sql`（pgvector有効化・IVFFLAT(cosine)・ANALYZE）
  - `docs/sql/03_add_content_hash_and_unique.sql`（差分更新用 `content_hash` + unique）
  - `docs/sql/04_rls_public_select_furubira_info.sql`（RLS: SELECTのみ公開）
  - `docs/sql/05_create_match_furubira_info_rpc.sql`（RPC: 類似検索I/Fを固定）
- 拡張の有効化
  - SupabaseのSQL Editorで **pgvector（`vector` 拡張）** を有効化する
- テーブルの前提確認
  - `furubira_info` に、少なくとも `title`, `content`, `embedding` があること
  - `embedding` が vector 型で、次元が固定であること（モデル次元と一致していること）
- 差分更新のための列を追加（おすすめ）
  - `content_hash`（embedding前に正規化した本文から作るハッシュ）
  - `updated_at`（任意：運用・調査が楽になる）
- upsertのためのユニーク制約
  - `content_hash` をユニークにして「同じチャンクは再投入しない」状態にする
- ベクトル検索用インデックス
  - `embedding` に **IVFFLAT + cosine** のインデックスを作る
  - インデックス作成後は **ANALYZE**（統計更新）を実行する
- RLS（公開selectのみ）
  - `furubira_info` は「読み取りだけ」公開できるようにする
  - 書き込み（insert/update/delete）は基本閉じて、ingestは別経路（サービスキー等）で行う方が安全

完了条件
- `furubira_info` に vector 検索のインデックスがある
- anonで `select` ができる（想定どおりの公開）

### 実施結果（今回の作業）
- `embedding` の型/次元：**`vector(1536)`** を確認済み
- 実行したSQL（エラーなし）
  - `docs/sql/02_enable_pgvector_and_ivfflat_index.sql`
  - `docs/sql/03_add_content_hash_and_unique.sql`
  - `docs/sql/04_rls_public_select_furubira_info.sql`
- 期待される状態
  - `furubira_info_embedding_ivfflat` が作成済み（IVFFLAT / cosine）
  - `content_hash` 列 + `furubira_info_content_hash_uidx`（unique）が作成済み
  - RLS有効 + `public read furubira_info`（SELECTのみ）が設定済み

---

## 2) 類似検索のRPC（APIから呼ぶ検索I/Fを固定）

目的：アプリ側が「SQL直書き」ではなく、RPCで `topK` を取れるようにする

- RPC関数を1つ作る（例：`match_furubira_info`）
  - 入力：
    - `query_embedding`（クエリのベクトル）
    - `match_count`（topK）
  - 出力：
    - `title`, `content`, `similarity`
- similarityの定義を固定
  - cosine距離を similarity（0〜1で高いほど近い）に変換する
- filterは今回は作らない（日本語のみのため）
  - 将来必要になったら `category` などを追加する（今は過剰設計にしない）

完了条件
- RPCを叩くと `topK` と similarity が返る

### 実施結果（今回の作業）
- 実行したSQL（エラーなし）
  - `docs/sql/05_create_match_furubira_info_rpc.sql`
  - Supabase SQL Editorの表示：`Success. No rows returned`（DDLのため正常）
- 関数作成の確認（例：`pg_proc` 照会）
  - `public.match_furubira_info` が存在することを確認済み
- 動作確認（戻り値）
  - `title`, `content`, `similarity` が返ることを確認済み
  - 例（top5の similarity）：`1.000`, `0.959`, `0.957`, `0.935`, `0.913`（概ね 0.91〜1.00）

補足（呼び出し例: supabase-js）
- `supabase.rpc("match_furubira_info", { query_embedding, match_count: 8 })`

---

## 3) Ingest（元データ→チャンク→embedding→upsert）を運用できる形にする

目的：ナレッジを「再現性ある手順」で生成し、差分更新できるようにする

### 3-1. 元データを確定する
- 「検索対象の正本」を1つに決める（例：`furubira_content.json` を正とする 等）
- 元データの更新頻度（毎日/週次/手動）を決める

### 3-2. 正規化（embedding前に必ず実施）
- 文字種ゆれの抑制（例：全角半角、記号、空白、改行の統一）
- ノイズ除去（メニュー/フッタ/誘導文/コピーライト等）
- 目的：同じ内容なのにembeddingがブレるのを減らし、差分判定も安定させる

### 3-3. チャンク化
- 原則：段落単位
- 長い段落：
  - 文の切れ目（句点や改行）で分割して 300〜800文字へ収める
- 短すぎる断片：
  - 近い段落と結合して「単独で意味が通る」単位にする

### 3-4. `content_hash` を作る（差分更新の核）
- `hash = sha256(normalize(content))` のように、正規化済み本文から作る
- `content_hash` が同じなら：
  - embedding を再生成しない（コスト削減）
  - DB更新もしない（不要な更新を減らす）

### 3-5. upsert（投入）
- 1チャンク=1行として `furubira_info` に upsert する
- 競合キーは `content_hash` を使う（編集・並び替えに強い）

### 3-6. 削除（ゴミ残り対策）
- ingestを繰り返すと「元データから消えたチャンク」がDBに残る問題が起きる
- 対策（おすすめ順）
  - 今回の ingest で生成した `content_hash` の集合を作り、集合に含まれない行を削除/無効化する
  - 削除が怖ければ「無効フラグ」運用（検索対象から外す）にする

完了条件
- ingestを複数回回しても、差分だけ更新され、不要な行が残らない

---

## 4) Next.js API（検索→回答）をRAGの流れにする（サーバー側）

目的：`/api/chat` が「検索→根拠を添付→回答生成」になる

- 入力を受け取る
  - `content`（ユーザー入力）
  - `sessionId`（既存仕様どおりでOK）
- 入力の正規化
  - ingestと同等の方針で、クエリも正規化する（検索ブレ対策）
- クエリembedding生成
  - ユーザー入力を embedding 化する
- RPCでtopK取得
  - `match_count = topK` で類似チャンクを取得する
- 閾値判定（最重要）
  - `top1.similarity < threshold` の場合：
    - 「該当する情報が見つからない」旨を返す（推測回答を禁止）
    - 可能なら追加質問（場所/時期/対象など）を促す
- 生成プロンプト構築
  - systemに必ず入れるルール
    - 与えたコンテキスト以外は推測しない
    - 根拠が無い場合は不明と言う
  - コンテキスト（topKチャンク）は番号付きで渡す（引用しやすくする）
- ストリーミングで返す
  - 既存のストリーミング実装は維持し、前段に「検索」を挟む
- ログ（最低限）
  - `query`, `top1 similarity`, 採用したチャンク（件数/上位数件の識別子）, 最終回答

完了条件
- DBに根拠がある質問は、根拠に沿って回答できる
- DBに無い質問は、閾値により「該当なし」で止まる

---

## 5) 品質調整（やることを作業単位に）

### 5-1. 評価セットを作る
- 30件から開始（慣れたら100件）
- 「答えがDBにある」質問と「無い」質問を混ぜる

### 5-2. 調整の順番（おすすめ）
- 閾値
  - 嘘が出る → 上げる
  - 答えない → 下げる
- チャンク
  - ノイズ混入 → 段落単位の徹底 / 短い断片の結合
  - 取り逃し → 分割を細かく / 必要なら軽いオーバーラップ
- topK
  - 根拠不足 → 上げる
  - ノイズ増加 → 下げる
- それでも厳しい場合のみ
  - rerank（再ランキング）導入を検討（最後の手段）

---

## 6) 運用メモ（地味に効く）
- Embeddingモデルを途中で変えると、vector次元や分布が変わり、検索品質が崩れやすい
- ingestは「差分更新・削除」が肝（やらないとDBが徐々に汚れる）
- 公開読み取りにする場合も、書き込みは閉じたままが安全（誤投入・荒らし防止）


