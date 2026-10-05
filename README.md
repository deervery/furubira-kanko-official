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

Node.js 22.18以上（テストのTypeScript直接実行に対応）、npmを使用します。

```sh
npm ci
npm run dev
npm run test:news
npx tsc --noEmit
npm run build -- --webpack
```

公開サイトとお知らせ編集にSupabase/OpenAI/Geminiの環境変数は不要です。旧API用クライアントは呼出時にのみ初期化します。`package.json` の `lint` はNext16に非対応の旧コマンドなので、現在の検証コマンドとして使用しません。

## 移行の根拠と残存コード

- `91dc5b4`（2026-03-14）：CSVから静的観光データを追加。
- `a7e8429` / `5e6662c`（同日）：`cms-service` / CMS公開APIをSupabaseから静的データに切替。
- `923211c` / `fa0f8aa`（同日）：画像参照のSupabase SDK依存を除去、ローカル画像追加。
- `4d8064d`（同日）：トップページのチャットを非表示。
- `dd0843f`（2026-09-03）：RAGデータ更新workflowを削除。

`lib/supabase.ts`、旧CMSコンポーネント、旧チャット/embedding API、関連SQLやスクリプトは履歴として残っています。存在していても現在使用中とは限りません。旧コード全撤去は今回の変更範囲外です。旧APIを再利用する場合は認証・権限・キー管理を別途再設計してください。

`docs/rag-chat-current.md` / `docs/runtime-fixes-env-and-next16.md` / `docs/auto_batch_processing.md` / `docs/scripts-readme.md` は旧構成の記録です。現行の必須手順として参照しないでください。
