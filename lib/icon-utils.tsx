// lib/icon-utils.tsx
import { MapPin, Coffee, Utensils, BedDouble, Calendar, ShoppingBag, Compass } from 'lucide-react'

export function renderIcon(iconName: string) {
  switch (iconName) {
    case "MapPin":
      return <MapPin className="h-5 w-5 text-primary" />
    case "Coffee":
      return <Coffee className="h-5 w-5 text-primary" />
    case "Utensils":
      return <Utensils className="h-5 w-5 text-primary" />
    case "BedDouble":
      return <BedDouble className="h-5 w-5 text-primary" />
    case "Calendar":
      return <Calendar className="h-5 w-5 text-primary" />
    case "ShoppingBag":
      return <ShoppingBag className="h-5 w-5 text-primary" />
    case "Compass":
      return <Compass className="h-5 w-5 text-primary" />
    default:
      return <MapPin className="h-5 w-5 text-primary" />
  }
}