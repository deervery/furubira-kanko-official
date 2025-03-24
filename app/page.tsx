import { getTourData } from "@/lib/cms-service"
import { HomeClient } from "@/components/home-client"

export default async function Home() {
  // サーバーコンポーネントでデータを取得
  const tourData = await getTourData()

  // クライアントコンポーネントにデータを渡す
  return <HomeClient tourData={tourData} />
}

