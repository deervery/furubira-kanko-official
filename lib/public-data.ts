import { spotsData, restaurantsData, accommodationsData, eventsData, shopsData } from "./hardcoded-data"
export const publicData: Record<string, readonly any[]> = {
  spots: spotsData, restaurants: restaurantsData, accommodations: accommodationsData, events: eventsData, shops: shopsData,
}
