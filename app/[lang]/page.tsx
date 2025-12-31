import { getTourData } from "@/lib/cms-service"
import { HomeClient } from "@/components/home-client"
import { notFound } from "next/navigation"
import { isLang } from "@/lib/i18n/lang"

export default async function Home({ params }: { params: { lang: string } }) {
  if (!isLang(params.lang)) {
    notFound()
  }
  // サーバーコンポーネントでデータを取得
  const tourData = await getTourData(params.lang)

  // クライアントコンポーネントにデータを渡す
  return <HomeClient tourData={tourData} />
}


