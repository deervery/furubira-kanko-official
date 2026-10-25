# Go移行の比較基準

移行前コミット：e68826e387e092540fec1a05aa0058ecc2ff4747。比較データはこのコミットの静的出力から固定しました。

## 自動確認

- HTML構造、表示テキスト、見出し、リンク、画像属性、言語、canonical/hreflang等を比較します。Node/Nextの内部スクリプト、CSS取得URL、実行時に変わる内部IDは比較から分離します。ページ・フラグメントIDは比較します。
- 既存CSSと画像・フォントはSHA-256で照合します。public/index.htmlの旧下書きは生成ページで上書きされるため、公開版のDOMを比較します。
- JSONの配列順・値とサイトマップのURL・頻度・優先度を比較します。ビルド時刻のlastmodは固定比較から除外します。
- GoとブラウザーJavaScriptで同じお知らせ入力コーパスの許可／拒否を検証します。新規記事・日英記事・不正なJSON・失敗ビルドが正常成果物を破壊しないことも確認します。
- 観光協会サイトはサーバー関数を生成しないことと、既存の廃止APIが410を返すことを検証します。会社フォームの検証記録は会社リポジトリで管理します。

## ブラウザー比較

tests/browser/だけに検証用Playwrightを固定しています。通常ビルド・配信に含めません。CIは固定した移行前コミットを別worktreeで生成し、その出力を参照画像にします。候補版から参照画像は作りません。

Chromium、Firefox、WebKit、1440×1000と390×844で、定義したページの画像と操作を比較します。画像差分の許容値は原則0ピクセルです。末尾に記した承認済みのWebKit 1画面だけ例外とします。外部サービスへの問い合わせを送らず、フォーム・TurnstileはCIの隔離モックだけを使用します。このモックは公開成果物に含めません。

ランダムな装飾用の炎キャンバスは画像比較時だけ非表示とし、アルゴリズムをそのまま移植します。外部地図iframeは画像比較から外し、埋込URLをHTML契約で比較します。カルーセルは同じスライドへ操作で揃えてから比較し、ドラッグ・ループ・自動再生は既存の同一版コアを使用します。画像は検証時だけeagerに読み込み、空白の遅延画像で比較が通らないようにします。

## 公開

Goビルド、race/vet、契約テスト、ブラウザー比較、実際の配備Previewが合格してから反映します。公開後もコミット番号、ドメイン、静的API、言語判定と転送を照合します。前の配備を保持し、障害時にpromoteを戻せるようにします。

全利用環境や将来の変更に対するゼロ不具合の保証ではありません。公開条件を満たした確認範囲と、未確認の条件は区別して記録します。

外部SNS画像はサイト外で失効し、旧React版のWebKitでは初回エラーがhydrationより先に発生すると壊れた画像のままになる場合があります。外観比較では同じローカル画像を外部画像の応答fixtureとして両版へ渡します。外部画像URL自体はDOM比較で保持を確認し、hydration後の取得失敗と既存/no_photo.jpgへの代替を両版で別に検証します。外部Google Mapsは比較時に非表示、URLを契約として検証します。粒子描画は比較から分け、同一乱数・イベント・80フレームの描画命令3,829件の旧実装との一致を別途確認しました。

画像比較は旧版・Go版の双方で連続2回同じ描画結果になるまで安定を確認します。旧版だけを初回の1回撮影で比較する非対称な条件は使用しません。WebKitの角丸境界の調査では、対象ページ内の93要素の位置・寸法・主要描画スタイルが一致していることも確認しています。既知の角丸差以外の差分許容値は変更しません。

page.screenshotの既定はdevice、toHaveScreenshotの既定はcssのため、両版の撮影オプションにscale: "css"を明示します。WebKitの撮影バックエンドではこの設定が別のsnapshotフラグに対応するため、表示寸法が同じでも既定値の混在を認めません。

両版は同じstableCapture関数でpage.screenshotを呼び、scale: "css"・同じ画像安定条件で採取します。固定旧版から得た画像だけを期待値とし、画像バッファ同士をtoMatchSnapshotで原則maxDiffPixels: 0/threshold: 0として比較します。APIごとのフレーム待ち・既定値の混在を避けます。


## Approved WebKit rendering exception (2026-10-25)

The user approved the existing rounded-card antialiasing difference on WebKit,
390px mobile, Japanese /ja/furusato only, conditional on matching functionality.
The comparator permits at most one differing pixel with threshold 0 for that
single capture. It also requires all 93 main descendants to have identical tags,
classes, geometry and computed rendering properties. All other screenshots retain
maxDiffPixels 0 and threshold 0. Reference images still come from the pinned
pre-migration implementation, never from the candidate. Raw antialiasing channel
differences may occupy several edge pixels; the approved limit refers to the
Playwright comparator's differing-pixel count.
