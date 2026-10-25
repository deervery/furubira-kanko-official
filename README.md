# 古平町観光協会ウェブサイト

北海道古平町の観光情報を提供する Next.js 16（App Router）/ React 19 / Tailwind CSS の日英サイトです。公開コンテンツは **Git管理の静的TS/JSONとローカル画像** から読み込みます。Supabase CMSは現行の編集・公開方式ではありません。

## 現在のデータと更新先

| 用途 | 正本 | 更新方法 |
| --- | --- | --- |
| 観光スポット・飲食店・宿泊・買い物・イベント | `lib/hardcoded-data.ts` | GitHubのブランチで編集し、PRでレビュー |
| 日英文言 | `locales/messages.json` | 同上 |
| 画像 | `public/` | 同上 |
| お知らせ | `content/news.json` | `/admin/news`で原稿/JSONを作成し、GitHubへ登録してPR |

PRを作成しただけでは本番反映されません。レビュー後のマージとデプロイが必要です。履歴にはVercel Previewの利用が確認できますが、現在のVercelプロジェクト・本番ブランチ・自動デプロイ設定はこのリポジトリだけでは確定できません。

`/admin/news` はJSON編集補助です。独自ログイン・サーバー保存・即時公開はありません。保存先の権限とレビューはGitHubで管理します。旧 `/admin/login` / `/admin/dashboard` 等は旧CMSを起動せず、現行の更新方法を案内します。詳細は [お知らせ運用](docs/news-cms.md) を参照してください。

## ローカル開発・検証

Node.js 24.22.1（.nvmrc）、npmを使用します。

```sh
npm ci
npm run dev
npm run test:news
npm run typecheck
npm run build -- --webpack
npm run test:routes
```

公開サイトとお知らせ編集にSupabase/OpenAI/Geminiの環境変数は不要です。旧SDK・CMS・AIチャット・取り込み/スクレイピングコードは撤去しました。旧チャット・embedding・system_message APIは外部接続せず410を返します。旧管理URLにはGitでの更新案内を表示し、お知らせ編集だけを維持します。Next16非対応だった旧lintコマンドは削除しました。

## 移行の根拠と残存コード

- `91dc5b4`（2026-03-14）：CSVから静的観光データを追加。
- `a7e8429` / `5e6662c`（同日）：`cms-service` / CMS公開APIをSupabaseから静的データに切替。
- `923211c` / `fa0f8aa`（同日）：画像参照のSupabase SDK依存を除去、ローカル画像追加。
- `4d8064d`（同日）：トップページのチャットを非表示。
- `dd0843f`（2026-09-03）：RAGデータ更新workflowを削除。

旧CMS・認証・AI実装やデータ投入/スクレイピングスクリプトのソースはGit履歴を参照してください。残存SQL・JSON・旧構成の資料は履歴であり、現行の起動手順ではありません。翻訳Excel/JSONと翻訳補助スクリプトは維持しています。

`docs/rag-chat-current.md` / `docs/runtime-fixes-env-and-next16.md` / `docs/auto_batch_processing.md` / `docs/scripts-readme.md` は旧構成の記録です。現行の必須手順として参照しないでください。


## 依存削減（2026-10-25）

現在の公開ページ・日英表示・Gitによるお知らせ公開に必要な依存だけを残しました。利用しないCMS、AI SDK、スクレイピング、ドラッグ操作と未参照のUI部品を撤去しています。旧APIは外部に接続せず410を返します。Next.js/Reactの撤去と完全静的配信は後続工程です。

既存CSSは全要素に端末の明朝系フォントを指定しており、旧Interは表示に使われていませんでした。未使用のInter取得処理を撤去し、通常のビルドではGoogle Fontsへ接続しません。既存の解析・外部リンク等まで除去したものではありません。
