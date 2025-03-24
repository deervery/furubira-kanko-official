import { getSpots } from "@/lib/cms-service"
import { SpotsClient } from "@/components/spots-client"

export default async function Spots() {
  const spotsData = await getSpots()

  return <SpotsClient spotsData={spotsData} />
}

