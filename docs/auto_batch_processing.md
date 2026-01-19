# 自動更新フロー（バッチ処理）

RAGの検索対象（`furubira_info`）を自動で更新するためのフローです。

## データソース

以下の2つのWebサイトからデータを取得します：

1. **古平町公式Webサイト（ニュース）**
   - URL: https://www.town.furubira.lg.jp/info/
   - 更新頻度: **週次**（毎週1回）
   - 対象: ニュース情報のみ

2. **古平町観光協会Webサイト**
   - URL: https://furubira-kanko.com/ja
   - 更新頻度: **半年に1回**
   - 対象: 観光情報全般

## 準備段階

1. **統合スクリプト（推奨）**
   - 既存のスクリプトを順次実行する統合スクリプトを使用します
   - 実装: `scripts/update-furubira-data.mjs`
   - GitHub Actions / ローカル実行ともに、この統合スクリプトから実行するのが最も安全です

2. **GitHub Secrets の設定**
   - リポジトリの Settings > Secrets and variables > Actions に以下を追加
     - `SUPABASE_URL`（または `NEXT_PUBLIC_SUPABASE_URL`）
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `OPENAI_API_KEY`

3. **GitHub Actions ワークフローの作成**
   - `.github/workflows/update-furubira-data.yml`
   - スケジュール設定（UTC）:
     - 古平町公式Webサイト（ニュース）: 毎週月曜日に自動実行（`/info/` の新着情報）
     - 古平町観光協会Webサイト: 半年に1回を目安に **手動実行**（workflow_dispatch推奨）
   - 手動実行（workflow_dispatch）も利用できます（scope / dry-run / delete などを指定可能）

## 実行フロー（自動実行時）

既存のスクリプトを順次実行します：

1. **スクレイピング**
   - スクリプト: `scripts/scrapePage.mjs`
   - URLの決め方（重要）:
     - **古平町公式 `/info/` は自動**: `https://www.town.furubira.lg.jp/info/` の一覧ページから、`/info/detail.php?id=...` を自動収集（ページネーションも追跡、上限あり）
     - **観光協会 `/ja` はルーティング由来**: このリポジトリの `app/[lang]/**/page.tsx`（静的ルート）から `/ja/...` を自動生成
   - 処理内容:
     - `.column02-inr`クラスからコンテンツを抽出
     - タイトルも抽出されるが、コンテンツのみを使用する場合は空文字列でも可
     - `scripts/furubira_content.json` に `{title, content}` 形式で保存（`--out` で変更可能）
   - **注意（重要）**: `ingest-furubira-info.mjs` は `title` が空だとフィルタで落ちます（`title` と `content` 両方が必須）

2. **コンテンツ修正（オプション）**
   - スクリプト: `scripts/fixContent.mjs` を実行（必要に応じて）
   - 不要な情報を削除し整形
   - `--source` / `--out` で入出力ファイルを指定可能（デフォルト: `scripts/furubira_content.json`）

3. **データ投入（差分更新）**
   - 既存スクリプト: `scripts/ingest-furubira-info.mjs` を実行
   - `scripts/furubira_content.json` を読み込み（`--source` で変更可能）
   - チャンク化、`content_hash` 生成、embedding 生成
   - Supabase の `furubira_info` テーブルに差分投入
     - 既存の `content_hash` はスキップ（embedding生成・挿入をスキップ）
     - 新規チャンクのみ embedding 生成・挿入
   - 削除オプション（`--delete`）が有効な場合は、元データから消えたチャンクをDBから削除

4. **結果の確認**
   - GitHub Actions のログで各ステップの成功/失敗を確認
   - エラー時は通知を設定（オプション）

## 既存スクリプトの確認結果

### 利用可能なスクリプト

1. **`scripts/scrapePage.mjs`** 利用可能
   - 機能: スクレイピング（`.column02-inr`クラスからコンテンツを抽出）
   - 現在の実装: タイトルとコンテンツの両方を抽出
   - **注意**: `ingest-furubira-info.mjs` は `title` が空だと投入対象から除外されます（空文字列はNG）
   - 出力: `scripts/furubira_content.json`（`{title, content}`形式の配列、`--out` で変更可能）

2. **`scripts/ingest-furubira-info.mjs`** 利用可能
   - 機能: データ投入（差分更新対応）
   - 入力: `furubira_content.json`（`title`と`content`フィールドが必要）
   - オプション: `--source`, `--min-chars`, `--max-chars`, `--dry-run`, `--delete`
   - 差分更新: `content_hash`による重複チェック機能あり

3. **`scripts/fixContent.mjs`** 利用可能（オプション）
   - 機能: OpenAI（gpt-4o-mini）を使用してコンテンツをクリーンアップ
   - 入力: `scripts/furubira_content.json`（`--source` で変更可能）
   - 注意: OpenAI APIキーが必要、コストがかかる

### URLリスト（`scripts/url.mjs`）の方針

- **町公式 `/info/`**: 一覧ページからリンクを自動収集（上限あり）
- **観光協会 `/ja`**: このリポジトリの `app/[lang]` ルーティング（静的ページ）から自動生成
- 手動でURLを列挙する必要はありません（ルーティングを追加すれば、URLも自動で増えます）

### 使用しないスクリプト

- **`scripts/fixTitle.mjs`**: タイトル修正用だが、コンテンツのみを使用する場合は不要（ただし、`ingest-furubira-info.mjs`が`title`フィールドを期待しているため、空文字列でも可）

## 既存スクリプトの制約事項

- **`ingest-furubira-info.mjs`の制約**: 
  - `title`と`content`の両方のフィールドが必要（219行目で`x.title && x.content`でフィルタリング）
  - **タイトルが空だと確実に除外される**（空文字列はNG）

## 実行例（ローカル/CI 共通）

### 統合スクリプト（推奨）

```bash
# 町公式のみ（dry-run）
node scripts/update-furubira-data.mjs --scope town --dry-run

# 両方（DBに書き込み）
node scripts/update-furubira-data.mjs --scope both

# 両方 + コンテンツ整形（コスト注意）
node scripts/update-furubira-data.mjs --scope both --run-fix-content

# 両方 + delete（初回は非推奨。RPCが必要）
node scripts/update-furubira-data.mjs --scope both --delete
```

## 差分更新の仕組み

- **content_hash による重複チェック**
  - 各チャンクの `content_hash`（SHA-256）を生成
  - DB内の既存ハッシュと照合
  - 既存のハッシュはスキップ（embedding生成・挿入をスキップ）

- **新規データのみ処理**
  - 既存でないハッシュのみ embedding を生成
  - 新規チャンクのみ DB に挿入
  - ログで既存数と新規挿入数を確認可能

- **削除オプション（--delete）**
  - `--delete` を指定すると、元データにないチャンクをDBから削除
  - `purge_furubira_info_not_in_hashes` RPC を使用
  - 初回は `--delete` なしで運用し、問題なければ有効化を推奨

## 差分更新のメリット

- **コスト削減**: 既存データの再embeddingをスキップ
- **処理時間短縮**: 新規・変更分のみ処理
- **安全性**: `content_hash` による重複防止

## 運用上の注意点

- 初回は `--delete` なしで実行し、問題なければ有効化
- 実行ログを定期的に確認
- エラー時の通知設定を検討（Slack/Discord など）
- 手動実行も可能にしておく（緊急時の再実行用）
- **更新頻度の違いに注意**:
  - 古平町公式Webサイト（ニュース）: 週次で自動実行
  - 古平町観光協会Webサイト: 半年に1回の手動実行または別スケジュール設定を推奨

