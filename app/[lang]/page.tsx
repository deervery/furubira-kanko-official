import { getTourData } from "@/lib/cms-service"
import { HomeClient } from "@/components/home-client"
import { notFound } from "next/navigation"
import { isLang } from "@/lib/i18n/lang"

// 1時間キャッシュ（ISR）- Supabaseへの呼び出しを大幅削減
export const revalidate = 3600

export default async function Home({ params }: { params: { lang: string } | Promise<{ lang: string }> }) {
  const { lang } = await Promise.resolve(params)

  if (!isLang(lang)) {
    notFound()
  }
  // サーバーコンポーネントでデータを取得
  const tourData = await getTourData(lang)

  // クライアントコンポーネントにデータを渡す
  return <HomeClient tourData={tourData} />
}


