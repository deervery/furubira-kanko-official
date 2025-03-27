export interface BaseItemType {
  image_path: string
  id: string
  name: string
  description: string
  icon: string
  image: string
  url?: string
  display_order: number
}

export interface SpotType extends BaseItemType {
  address?: string
  facilities?: string
}

export interface RestaurantType extends BaseItemType {}

export interface ShopType extends BaseItemType {
  type: string
}

export interface AccommodationType extends BaseItemType {}

export interface EventType extends BaseItemType {
  date: string
}

export interface TourCategoryType extends BaseItemType {
  key: string
  name: string
} 