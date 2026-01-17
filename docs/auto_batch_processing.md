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

1. **統合スクリプトの作成**
   - スクレイピング、タイトル修正、データ投入を順次実行する統合スクリプトを作成
   - 実装: `scripts/update-furubira-data.mjs`（作成が必要）

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

1. **スクレイピング**
   - `scripts/scrapePage.mjs` を実行
   - `scripts/url.mjs` のURL一覧から各ページを取得
     - 古平町公式Webサイト: https://www.town.furubira.lg.jp/info/ のニュースページ
     - 古平町観光協会Webサイト: https://furubira-kanko.com/ja の観光情報ページ
   - タイトル（`<head>`内の`<title>`タグ）とコンテンツ（`.column02-inr`クラス）を抽出
   - `scripts/furubira_content.json` に保存

2. **タイトル修正**
   - `scripts/fixTitle.mjs` を実行
   - タイトルから余分な「｜」以降を削除
   - `furubira_content.json` を更新

3. **コンテンツ修正（オプション）**
   - `scripts/fixContent.mjs` を実行（必要に応じて）
   - 不要な情報を削除し整形

4. **データ投入（差分更新）**
   - `scripts/ingest-furubira-info.mjs` を実行
   - `furubira_content.json` を読み込み
   - チャンク化、`content_hash` 生成、embedding 生成
   - Supabase の `furubira_info` テーブルに差分投入
     - 既存の `content_hash` はスキップ（embedding生成・挿入をスキップ）
     - 新規チャンクのみ embedding 生成・挿入
   - 削除オプション（`--delete`）が有効な場合は、元データから消えたチャンクをDBから削除

5. **結果の確認**
   - GitHub Actions のログで各ステップの成功/失敗を確認
   - エラー時は通知を設定（オプション）

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

