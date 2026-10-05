import { ArrowDown, ArrowRight, FileDown, GitPullRequest, Globe2, PenLine } from "lucide-react"

const steps = [
  {
    title: "原稿を準備",
    icon: PenLine,
    description: "入力してプレビューを確認。最後に「編集内容を一覧へ追加」を押します。",
    status: "サイト未反映",
  },
  {
    title: "ファイルを書き出す",
    icon: FileDown,
    description: "タブを閉じる前に news.json を書き出します。新規・既存の全記事が入ります。",
    status: "サイト未反映",
  },
  {
    title: "GitHubで確認依頼",
    icon: GitPullRequest,
    description: "新しいブランチで登録し、PR（変更の確認依頼）を作成。他の記事を消していないか差分を確認します。",
    status: "サイト未反映",
  },
  {
    title: "反映して公開確認",
    icon: Globe2,
    description: "確認後にマージ（変更を取り込む）。自動反映が完了したら、お知らせ一覧を確認します。",
    status: "反映完了後に公開",
  },
]

export function NewsPublicationFlow() {
  return (
    <section aria-labelledby="publication-flow-heading" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-6">
        <h2 id="publication-flow-heading" className="text-xl font-bold text-slate-900">お知らせを公開するまで</h2>
        <p className="mt-2 text-sm text-slate-600">この画面での編集だけでは、公開サイトに反映されません。</p>
      </div>
      <ol role="list" className="grid gap-8 lg:grid-cols-4 lg:gap-6">
        {steps.map((step, index) => (
          <li key={step.title} data-flow-step={index + 1} className="relative flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{index + 1}</span>
              <step.icon aria-hidden="true" className="h-5 w-5 text-slate-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-700">{step.description}</p>
            <p className={`mt-4 self-start rounded px-2 py-1 text-xs font-semibold ${index === 3 ? "bg-emerald-100 text-emerald-900" : "bg-white text-slate-600"}`}>{step.status}</p>
            {index < steps.length - 1 && <>
              <ArrowDown aria-hidden="true" className="absolute -bottom-7 left-1/2 h-5 w-5 -translate-x-1/2 text-slate-400 lg:hidden" />
              <ArrowRight aria-hidden="true" className="absolute -right-6 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-slate-400 lg:block" />
            </>}
          </li>
        ))}
      </ol>
      <div className="mt-6 space-y-2 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-600">
        <p><strong className="font-semibold text-slate-800">原稿はこのタブ内だけ。</strong>自動保存されません。閉じる前に一覧へ追加し、ファイルを書き出してください。</p>
        <p>GitHubに登録した原稿は、サイト反映前のPR段階でも第三者が閲覧できます。</p>
        <p>記事の「表示日」は掲載する日付です。予約公開の設定ではありません。</p>
      </div>
    </section>
  )
}
