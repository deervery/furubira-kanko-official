import { getAccommodations } from "@/lib/cms-service"
import { AccommodationsClient } from "@/components/accommodations-client"

export default async function Accommodations() {
  const accommodationsData = await getAccommodations()

  return <AccommodationsClient accommodationsData={accommodationsData} />
}

