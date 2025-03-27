"use client"

import Link from "next/link"
import { Menu, MapPin, Bed, Coffee, Calendar, Compass, ShoppingBag, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useEffect, useState } from "react"
import { useInView } from "react-intersection-observer"
import Image from "next/image"
import { cn } from "@/lib/utils"

const navigationItems = [
  { text: "観光スポット", path: "/spots", icon: MapPin },
  { text: "宿泊施設", path: "/accommodations", icon: Bed },
  { text: "飲食店", path: "/dining", icon: Coffee },
  { text: "イベント", path: "/events", icon: Calendar },
  { text: "アクセス", path: "/access", icon: Compass },
  { text: "買い物", path: "/shopping", icon: ShoppingBag },
  { text: "ふるさと納税", path: "/furusato", icon: Gift },
]

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const { ref: heroRef, inView: heroInView } = useInView({
    threshold: 0.2,
  })

  useEffect(() => {
    setIsScrolled(!heroInView)
  }, [heroInView])

  return (
    <>
      <div ref={heroRef} />
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-colors duration-300",
          isScrolled ? "bg-black/90 backdrop-blur-sm border-none" : "",
        )}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-1 hover:opacity-80 transition-colors",
              isScrolled ? "text-white" : "text-white",
            )}
          >
            <div className="relative w-8 h-8">
              <Image
                src="/logo_icon.png"
                alt="古平町観光協会ロゴ"
                fill
                className="object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = "/no_photo.jpg?height=32&width=32"
                }}
              />
            </div>
            <span className="text-xl">古平町観光協会</span>
          </Link>
          <nav className="hidden xl:flex space-x-4">
            {navigationItems.map(({ text, path, icon: Icon }) => (
              <Link key={text} href={path}>
                <Button variant="ghost" className="flex items-center space-x-1 text-white hover:bg-primary/20">
                  <Icon className="h-5 w-5" />
                  <span>{text}</span>
                </Button>
              </Link>
            ))}
          </nav>
          <div className="xl:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(isScrolled ? "text-white" : "text-white", "hover:bg-primary/20")}
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle className="text-2xl">古平町観光案内</SheetTitle>
                </SheetHeader>
                <div className="py-4 space-y-2">
                  {navigationItems.map(({ text, path }) => (
                    <Link key={text} href={path}>
                      <Button variant="ghost" className="w-full justify-start text-lg">
                        {text}
                      </Button>
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  )
}

export default Header

