# 古平町観光協会サイト

Go標準ライブラリーのhtml/templateでHTML/CSS/JavaScript・画像を生成する静的サイトです。公開ページのビルド・配信にNext.js、React、Tailwind実行環境、Nodeによるサイトサーバーは使いません。htmxは追加していません。

## ビルドと確認

Go 1.27.2を使用します。Goモジュールの外部依存はありません。

    go run ./cmd/sitegen
    go test -race ./...
    go vet ./...
    node --test
    node --test tests/static-check.mjs
    python3 tests/check-dom.py

out/が静的成果物、.vercel/output/がCDN規則と必要な関数を含む配備成果物です。JavaScriptの契約テストとローカル配信確認にはNode 26.12.1を使用します。ローカル確認はPORT=3087 node scripts/serve-static.mjsで起動できます。この検証サーバーは公開成果物に含みません。

公開環境は引き続きVercelです。VPSへのDNS切替は別工程です。VPSへ移す場合も外部CIで完成したout/だけを配備し、GoやNodeによるページサーバーを常駐させません。CDN相当の転送・404/410をNginxに設定する必要があります。

## 編集するファイル

- ページ：templates/pages/
- 共通ヘッダー・フッター：templates/partials/
- 内容：content/のJSON
- スタイル：assets/css/。現行のCSSを保持し、Nodeによる再生成を必要としません。変更時も表示比較を通してください。
- 画像・フォント：public/。既存ライセンスと出典を保持します。
- 転送：config/routes.json

既存CSS・SVGに由来するライセンスはassets/licenses/、フォントのライセンスはpublic/fonts/にあります。資産は内容のハッシュを含むURLへ生成し、配備変更時の古いJavaScriptキャッシュとの混同を避けます。

## 観光情報・日英・お知らせ

施設等37件はcontent/facilities.jsonから生成します。施設一覧と互換用JSONはdisplay_order順、ホームのカルーセルは元の配列順を維持します。日英文言はlocales/messages.jsonを使います。お知らせはcontent/news.jsonから日英一覧・記事・サイトマップを生成します。記事本文はHTMLとして解釈しません。

/admin/newsはブラウザー内の入力・プレビュー・JSON書出／再読込補助です。サーバー保存・ログイン・即時公開はありません。GitHubのPRと再配備が公開手順です。旧データAPIは静的JSONへの転送、廃止APIは410です。サーバー関数は0件です。

既存のカルーセルの操作感を維持するため、Emblaコア8.5.1とAutoplay 8.5.2をローカルに同梱します。React連携部品は使いません。版、出典、SHA-256、MITライセンスはassets/vendor/に記録します。

翻訳Excelの補助ツールは任意の保守作業として分離しています。必要な場合だけnpm ci --prefix tools/translationsを実行し、従来どおりリポジトリのルートからnode scripts/sync-translations-from-excel.mjs、node scripts/prune-messages-by-excel-ja.mjs等を実行します。既存のxlsx 0.18.5を維持し、通常ビルド・配信には含みません。


## リグレッションの公開条件

[比較方法と範囲](docs/go-migration-verification.md)を参照してください。固定した移行前コミットとGo版を別々にビルドし、DOM・本文・リンク・メタデータ・CSS・画像・API契約を比較します。外部CIではChromium/Firefox/WebKitのPC・スマートフォン表示を比較し、定義した状態での画像差分を0ピクセルとします。

これは未知の環境・操作を含むゼロ不具合の保証ではありません。許容していない差分・操作失敗・API差分がある間は本番へ反映しません。比較元を候補版から自動更新して差分を消す運用は行いません。旧Next実装と旧ビルド手順はGit履歴に残ります。
