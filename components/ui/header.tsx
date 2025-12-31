"use client"

import Link from "next/link"
import { Menu, MapPin, Bed, Coffee, Calendar, Compass, ShoppingBag, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useEffect, useState } from "react"
import { useInView } from "react-intersection-observer"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { usePathname, useSearchParams } from "next/navigation"

import { useI18n } from "@/components/i18n/i18n-provider"
import { t } from "@/lib/i18n/t"
import { isLang, type Lang } from "@/lib/i18n/lang"

const navigationItems = [
  { key: "header.tourist_spot", path: "/spots", icon: MapPin },
  { key: "header.accommodations", path: "/accommodations", icon: Bed },
  { key: "header.restaurants", path: "/dining", icon: Coffee },
  { key: "header.events", path: "/events", icon: Calendar },
  { key: "header.access", path: "/access", icon: Compass },
  { key: "header.shopping", path: "/shopping", icon: ShoppingBag },
  { key: "header.tax_donation", path: "/furusato", icon: Gift },
]

export const Header = () => {
  const { lang, messages } = useI18n()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isScrolled, setIsScrolled] = useState(false)
  const { ref: heroRef, inView: heroInView } = useInView({
    threshold: 0.2,
  })
  const [headerVisible, setHeaderVisible] = useState(false)

  useEffect(() => {
    setIsScrolled(!heroInView)
    if (heroInView) {
      setHeaderVisible(true)
    }
  }, [heroInView])

  const withLang = (path: string) => {
    if (path === "/") return `/${lang}`
    return `/${lang}${path}`
  }

  const switchLangHref = (to: Lang) => {
    const parts = pathname.split("/").filter(Boolean)
    if (parts.length > 0 && isLang(parts[0])) {
      parts[0] = to
      const nextPath = "/" + parts.join("/")
      const qs = searchParams.toString()
      return qs ? `${nextPath}?${qs}` : nextPath
    }
    const qs = searchParams.toString()
    const nextPath = pathname === "/" ? `/${to}` : `/${to}${pathname}`
    return qs ? `${nextPath}?${qs}` : nextPath
  }

  return (
    <>
      <div ref={heroRef} />
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-opacity duration-1000",
          headerVisible ? 'opacity-100' : 'opacity-0',
          isScrolled ? "bg-black/90 backdrop-blur-sm border-none" : ""
        )}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href={withLang("/")}
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
            <span
              className={cn(
                "whitespace-nowrap leading-none",
                // Keep the original header layout, but scale down typography in English
                // to avoid wrapping/clipping within the fixed-height header.
                lang === "en" ? "text-base sm:text-lg" : "text-xl"
              )}
              title={t(messages, "header.furubira_tourism_association")}
            >
              {t(messages, "header.furubira_tourism_association")}
            </span>
          </Link>
          <nav
            className={cn(
              "hidden xl:flex items-center",
              // Slightly tighter spacing in English to prevent overflow.
              lang === "en" ? "space-x-2" : "space-x-4"
            )}
          >
            {navigationItems.map(({ key, path, icon: Icon }) => {
              const label = t(messages, key)
              return (
                <Link key={key} href={withLang(path)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex items-center space-x-1 text-white hover:bg-primary/20",
                      // Reduce font size/padding in English to fit long labels.
                      lang === "en" ? "px-2 text-sm" : ""
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="whitespace-nowrap">{label}</span>
                  </Button>
                </Link>
              )
            })}
            <div className="flex items-center gap-1 pl-2 border-l border-white/20">
              <Link href={switchLangHref("ja")}>
                <Button
                  variant="ghost"
                  className={cn("text-white hover:bg-primary/20 px-2", lang === "ja" ? "font-bold underline" : "")}
                >
                  JA
                </Button>
              </Link>
              <span className="text-white/60">|</span>
              <Link href={switchLangHref("en")}>
                <Button
                  variant="ghost"
                  className={cn("text-white hover:bg-primary/20 px-2", lang === "en" ? "font-bold underline" : "")}
                >
                  EN
                </Button>
              </Link>
            </div>
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
                  <SheetTitle className="text-2xl">{t(messages, "footer.tourist_information")}</SheetTitle>
                </SheetHeader>
                <div className="py-4 space-y-2">
                  {navigationItems.map(({ key, path }) => (
                    <Link key={key} href={withLang(path)}>
                      <Button variant="ghost" className="w-full justify-start text-lg">
                        {t(messages, key)}
                      </Button>
                    </Link>
                  ))}
                  <div className="pt-4 mt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Link href={switchLangHref("ja")} className="flex-1">
                        <Button variant="outline" className={cn("w-full", lang === "ja" ? "font-bold" : "")}>
                          JA
                        </Button>
                      </Link>
                      <Link href={switchLangHref("en")} className="flex-1">
                        <Button variant="outline" className={cn("w-full", lang === "en" ? "font-bold" : "")}>
                          EN
                        </Button>
                      </Link>
                    </div>
                  </div>
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

