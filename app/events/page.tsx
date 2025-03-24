import { getEvents } from "@/lib/cms-service"
import { EventsClient } from "@/components/events-client"

export default async function Events() {
  const eventsData = await getEvents()

  return <EventsClient eventsData={eventsData} />
}

