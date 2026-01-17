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

1. **統合スクリプトの作成（オプション）**
   - 既存のスクリプトを順次実行する統合スクリプトを作成
   - 実装: `scripts/update-furubira-data.mjs`（作成が必要）
   - または、既存のスクリプトを個別に実行することも可能

2. **GitHub Secrets の設定**
   - リポジトリの Settings > Secrets and variables > Actions に以下を追加
     - `SUPABASE_URL`（または `NEXT_PUBLIC_SUPABASE_URL`）
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `OPENAI_API_KEY`

3. **GitHub Actions ワークフローの作成**
   - `.github/workflows/update-furubira-data.yml` を作成
   - スケジュール設定:
     - 古平町公式Webサイト（ニュース）: 毎週月曜日（または希望日時）
     - 古平町観光協会Webサイト: 半年に1回（手動実行またはスケジュール設定）
   - 手動実行（workflow_dispatch）も有効化

## 実行フロー（自動実行時）

既存のスクリプトを順次実行します：

1. **スクレイピング**
   - 既存スクリプト: `scripts/scrapePage.mjs` を実行
   - **事前準備**: `scripts/url.mjs` を更新して、対象URLのみを含める
     - 古平町公式Webサイト: https://www.town.furubira.lg.jp/info/ のニュースページ
     - 古平町観光協会Webサイト: https://furubira-kanko.com/ja の観光情報ページ
   - 処理内容:
     - `.column02-inr`クラスからコンテンツを抽出
     - タイトルも抽出されるが、コンテンツのみを使用する場合は空文字列でも可
     - `scripts/furubira_content.json` に `{title, content}` 形式で保存
   - **注意**: `ingest-furubira-info.mjs`は`title`フィールドを期待しているため、空文字列でも`title`フィールドは必要

2. **コンテンツ修正（オプション）**
   - 既存スクリプト: `scripts/fixContent.mjs` を実行（必要に応じて）
   - 不要な情報を削除し整形

3. **データ投入（差分更新）**
   - 既存スクリプト: `scripts/ingest-furubira-info.mjs` を実行
   - `furubira_content.json` を読み込み
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

1. **`scripts/scrapePage.mjs`** 利用可能（要修正）
   - 機能: スクレイピング（`.column02-inr`クラスからコンテンツを抽出）
   - 現在の実装: タイトルとコンテンツの両方を抽出
   - **注意**: `ingest-furubira-info.mjs`は`title`フィールドを期待しているため、タイトル抽出は残す必要がある（ただし、コンテンツのみを使用する場合は空文字列でも可）
   - 出力: `scripts/furubira_content.json`（`{title, content}`形式の配列）

2. **`scripts/ingest-furubira-info.mjs`** 利用可能
   - 機能: データ投入（差分更新対応）
   - 入力: `furubira_content.json`（`title`と`content`フィールドが必要）
   - オプション: `--source`, `--min-chars`, `--max-chars`, `--dry-run`, `--delete`
   - 差分更新: `content_hash`による重複チェック機能あり

3. **`scripts/fixContent.mjs`** 利用可能（オプション）
   - 機能: OpenAI（gpt-4o-mini）を使用してコンテンツをクリーンアップ
   - 入力: `furubira_content.json`
   - 注意: OpenAI APIキーが必要、コストがかかる

### 修正が必要なスクリプト

1. **`scripts/url.mjs`** 要修正
   - 現在: 古平町公式Webサイトの様々なページ（life, health, rearing, construction, tourism, townなど）が含まれている
   - **必要な修正**: 以下のURLのみに更新
     - 古平町公式Webサイト（ニュース）: https://www.town.furubira.lg.jp/info/ 配下のページ
     - 古平町観光協会Webサイト: https://furubira-kanko.com/ja 配下のページ

### 使用しないスクリプト

- **`scripts/fixTitle.mjs`**: タイトル修正用だが、コンテンツのみを使用する場合は不要（ただし、`ingest-furubira-info.mjs`が`title`フィールドを期待しているため、空文字列でも可）

## 既存スクリプトの制約事項

- **`ingest-furubira-info.mjs`の制約**: 
  - `title`と`content`の両方のフィールドが必要（219行目で`x.title && x.content`でフィルタリング）
  - タイトルが空の場合はフィルタリングされる可能性がある
  - コンテンツのみを使用する場合でも、`title`フィールドは空文字列で提供する必要がある

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

