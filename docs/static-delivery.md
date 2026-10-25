# 静的配信

公開ページは output: "export" でHTML/CSS/JS・画像に生成します。SSR、ISR、Edge middleware、画像変換サーバーはありません。Next.js/Reactは生成と既存ブラウザーUIに残っています。通常リンクで遷移し、言語・canonical・本文を配信HTMLで確定します。htmxは追加していません。

## ビルドと配備

クラウド対応系列のNode.js 24.22.1を使用します。自主管理CIをNode 26にする場合は同じ検証を通してから変更します。npm ci後、型検証・既存テスト、npm run build、npm run test:staticを実行します。

npm startはローカル検証専用です。本番で常駐させません。out/は静的成果物、.vercel/output/はCDN転送規則と必要な関数を含むBuild Output API v3形式です。vercel.jsonでNextアダプターを無効化します。GitHub Actionsもビルド・配信境界テスト後に両成果物を保存します。CIのTurnstileテスト公開鍵を本番へ配備してはいけません。

現時点ではVercelへの配備であり、VPSへのDNS切替は別工程です。VPSに移す際も外部CIで生成したout/だけを転送します。Nginxのtry_files設定と404文書、既存の転送・言語選択規則が必要です。サイト用のNext/Node/Goサーバーは不要です。CDN規則はscripts/package-static.mjs、検証用エミュレーターはscripts/serve-static.mjsです。実際のVercel Previewでも転送と関数を確認します。

## 観光協会は関数0件

全施設データはビルド時にHTMLへ含めます。/data/*.jsonは互換用の静的JSONで、旧/api/cms/*と/api/newsはCDNでそこへ書き換えます。廃止したchat/embedding/system_messageは静的JSONを410で返します。問い合わせ受付サーバーはありません。

言語は/jaと/enを生成し、ルートのcookie/Accept-Language転送はCDN規則で処理します。お知らせはcontent/news.jsonを変更して再ビルドします。/admin/newsはブラウザーだけのJSON編集補助で、認証・保存API・即時公開はありません。お知らせ0件でも正常に生成し、存在しない記事は404を返します。施設情報・お知らせは再配備まで更新されません。

## 公開時の確認

レビューしたコミットからビルドし、Previewで本文・日英導線・画像・モバイルメニュー・404・廃止API・旧URLを確認します。会社フォームのテストは隔離した受付モックを使用し、本番への合成問い合わせは送信しません。Productionへ反映後は/release.jsonのrevisionと関数一覧、ドメイン、公開ページを照合します。障害時は前のVercelデプロイを再promoteし、ソース変更をrevertします。公開確認だけではメール等の通知到達を保証しません。
