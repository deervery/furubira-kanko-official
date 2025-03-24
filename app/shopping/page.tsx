import { getShops } from "@/lib/cms-service"
import { ShoppingClient } from "@/components/shopping-client"

export default async function Shopping() {
  const shopsData = await getShops()

  return <ShoppingClient shopsData={shopsData} />
}

