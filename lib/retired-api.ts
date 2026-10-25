export function retiredApi() {
  return Response.json(
    { error: "この旧APIは公開を終了しました。観光情報はサイト、お知らせの更新は /admin/news をご利用ください。" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  )
}
