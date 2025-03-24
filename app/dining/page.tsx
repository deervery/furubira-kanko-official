import { getRestaurants } from "@/lib/cms-service"
import { DiningClient } from "@/components/dining-client"

export default async function Dining() {
  const restaurantsData = await getRestaurants()

  return <DiningClient restaurantsData={restaurantsData} />
}

