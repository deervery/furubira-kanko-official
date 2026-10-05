import { getTourData } from "@/lib/cms-service"
import { HomeClient } from "@/components/home-client"
import { notFound } from "next/navigation"
import { isLang } from "@/lib/i18n/lang"

// Git管理の観光データを読み込む公開ページ（DBアクセスなし）
export const revalidate = 3600

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await Promise.resolve(params)

  if (!isLang(lang)) {
    notFound()
  }
  // サーバーコンポーネントでデータを取得
  const tourData = await getTourData(lang)

  // クライアントコンポーネントにデータを渡す
  return <HomeClient tourData={tourData} />
}


