"use client"

import { ChatWindow } from "@/components/chat/chat-window"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X } from "lucide-react"
import { Header } from "@/components/ui/header"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { useEffect, useState } from "react"
import { useInView } from "react-intersection-observer"
import { Footer } from "@/components/ui/footer"
import FlameParticles from "@/components/flame-particles"
import Image from "next/image"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { renderIcon } from "@/lib/icon-utils"

/* ------------------------------------------------------------------
   DividerSection コンポーネント
   ・ウィンドウサイズに応じて背景画像を切り替え
     － 768px 未満なら hiwatari_sp.jpg
     － 768px 以上なら hiwatari_cross.jpg
------------------------------------------------------------------ */
const DividerSection = () => {
  const [bgImage, setBgImage] = useState<string>("")

  useEffect(() => {
    const updateBg = () => {
      const width = window.innerWidth
      if (width < 768) {
        setBgImage("/hiwatari_sp.jpg")
      } else {
        setBgImage("/hiwatari_cross.jpg")
      }
    }

    updateBg()
    window.addEventListener("resize", updateBg)
    return () => window.removeEventListener("resize", updateBg)
  }, [])

  const dividerStyle = {
    height: "12rem", // h-48 相当
    backgroundAttachment: "fixed" as const,
    backgroundPosition: "right",
    backgroundSize: "cover",
    backgroundImage: `url(${bgImage})`,
    position: "relative" as const,
  }

  return (
    <div style={dividerStyle}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}></div>
    </div>
  )
}

type HomeClientProps = {
  tourData: any
}

export function HomeClient({ tourData }: HomeClientProps) {
  const [showChat, setShowChat] = useState(false)
  const { ref: heroRef, inView: heroInView } = useInView({
    threshold: 0.5,
  })
  const { ref: introRef, inView: introInView } = useInView({ threshold: 0.2, triggerOnce: true });
  const [introDelayed, setIntroDelayed] = useState(false);
  const [autoplay, setAutoplay] = useState<any>(null)
  const [heroBg, setHeroBg] = useState<string>("")
  const [heroImageVersion] = useState(Date.now())
  const [captionVisible, setCaptionVisible] = useState(false)
  const [imageVisible, setImageVisible] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(false)
  const [bannerSize, setBannerSize] = useState({ width: 360, height: 96 })
  const [bannerVisible, setBannerVisible] = useState(true)

  useEffect(() => {
    setShowChat(!heroInView)

    // Dynamic import for autoplay
    import("embla-carousel-autoplay").then((Autoplay) => {
      setAutoplay(Autoplay.default({ delay: 5000 }))
    })

    const updateHeroBg = () => {
      const width = window.innerWidth
      if (width < 1000) {
        setHeroBg("/hiwatari_sp.jpg")
      } else {
        setHeroBg("/hiwatari_cross.jpg")
      }
    }

    updateHeroBg()
    window.addEventListener("resize", updateHeroBg)
    return () => window.removeEventListener("resize", updateHeroBg)
  }, [heroInView])

  useEffect(() => {
    if (heroBg) {
      setHeaderVisible(true)
    }
  }, [heroBg])

  // バナーのサイズ調整（デフォルト: 幅 360px, 高さ 96px → 比率 96/360）
  useEffect(() => {
    const updateBannerSize = () => {
      const screenWidth = window.innerWidth
      if (screenWidth < 360) {
        // 画面幅に合わせ、高さは比率で計算
        setBannerSize({ width: screenWidth, height: screenWidth * (96 / 360) })
      } else {
        setBannerSize({ width: 360, height: 96 })
      }
    }

    updateBannerSize()
    window.addEventListener("resize", updateBannerSize)
    return () => window.removeEventListener("resize", updateBannerSize)
  }, [])

  useEffect(() => {
    if (introInView) {
      const timer = setTimeout(() => setIntroDelayed(true), 500); // 500ms遅延
      return () => clearTimeout(timer);
    } else {
      setIntroDelayed(false);
    }
  }, [introInView]);

  return (
    <div className="min-h-screen bg-black">
      <div className={`transition-opacity duration-1000 ${headerVisible ? 'opacity-100' : 'opacity-0'}`}>
        <Header />
      </div>

      {/* Hero Section */}
      <div ref={heroRef} className="relative h-screen">
        <div className="absolute inset-0 bg-black/10 z-10" />
        <div className="absolute inset-0 w-full h-full">
          {heroBg && (
            <Image
              src={heroBg}
              alt="獅子舞の火渡り"
              fill
              className={`object-cover transition-opacity duration-1000 ${imageVisible ? 'opacity-100' : 'opacity-0'}`}
              priority
              onLoadingComplete={() => {
                setImageVisible(true);
                setTimeout(() => {
                  setCaptionVisible(true);
                }, 1000); // 画像のフェードイン完了後、1秒の遅延を設定（必要に応じて調整してください）
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/no_photo.jpg?height=1080&width=1920";
              }}
            />
          )}
        </div>
        <div className="relative z-20 h-full flex flex-col items-center justify-center pr-0">
          <h1
            className={`writing-vertical-rl text-6xl mb-4 text-white drop-shadow-lg h-[400px] transition-opacity duration-1000 ${captionVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            熱く燃ゆる町
          </h1>
        </div>
      </div>

      {/* Introduction Section */}
      <section ref={introRef} className="py-12 md:py-20 bg-black">
        <div className="text-center mb-16">
          <div className={`inline-block px-12 transition-opacity duration-1000 ${introDelayed ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-s md:text-sm text-white mb-1 md:mb-2">-FIRE WALKING RITUAL-</p>
            <h2 className="text-2xl md:text-4xl font-bold text-white">天狗の火渡り</h2>
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-4 w-full">
          <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-center">
            <div className={`space-y-4 md:space-y-6 order-2 md:order-1 w-full md:w-1/2 transition-opacity duration-1000 ${introDelayed ? 'opacity-100' : 'opacity-0'}`}>
              <p className="text-sm text-white">
                古平町は、北海道の日本海側に位置する漁業の町です。300年以上の歴史を持つ「天狗の火渡り」は、
                漁師たちの大漁と安全を祈願する神聖な儀式として、今日まで大切に受け継がれてきました。
                朱色の装束に身を包んだ天狗が炎の上を渡る姿は、町の人々の祈りと願いの象徴として、
                古平の夜空を照らし続けています。
              </p>
            </div>
            <div className={`w-full md:w-1/2 order-1 md:order-2 aspect-[3/4] relative transition-opacity duration-1000 ${introDelayed ? 'opacity-100' : 'opacity-0'}`}>
              <div className="relative w-full h-full">
                <Image
                  src="/hiwatari_tengu.jpg"
                  alt="火渡りする天狗"
                  fill
                  className="object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/no_photo.jpg?height=800&width=600";
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <DividerSection />

      {/* Tour Proposal Section */}
      <section className="py-12 md:py-20 bg-primary/5 bg-[url('/washi_background.webp')]">
        <div className="w-full mx-auto px-4 max-w-3xl">
          <div className="text-center mb-8 md:mb-16">
            <div className="inline-block px-6 md:px-12">
              <p className="text-s md:text-md text-gray-500 mb-1 md:mb-2">-TOUR PROPOSAL-</p>
              <h2 className="text-2xl md:text-4xl font-bold">旅行プラン</h2>
            </div>
          </div>

          <Card className="rounded-lg shadow-lg w-full">
            <CardContent className="p-2 md:p-8 space-y-8 md:space-y-12">
              {Object.entries(tourData).map(([category, { name, description, items }]: [string, any]) => {
                const randomStartIndex = Math.floor(Math.random() * items.length)
                return (
                  <div key={category}>
                    <div className="mb-4 md:mb-6 px-2">
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1 md:mb-2">{name}</h3>
                      <p className="text-s md:text-sm text-gray-500">{description}</p>
                    </div>
                    <div className="relative w-full">
                      <Carousel
                        opts={{
                          startIndex: randomStartIndex,
                          loop: true,
                        }}
                        plugins={autoplay ? [autoplay] : []}
                        className="w-full"
                      >
                        <CarouselContent>
                          {items.map((item: any) => (
                            <CarouselItem key={item.id} className="p-2 md:p-4">
                              <Card className="shadow-lg">
                                <CardContent className="p-4 md:p-6 grid md:grid-cols-2 gap-4 md:gap-6">
                                  <div className="flex flex-col justify-center">
                                    <div className="flex items-center gap-2 mb-2 md:mb-3">
                                      {renderIcon(item.icon)}
                                      <h4 className="font-bold text-sm md:text-base">{item.name}</h4>
                                    </div>
                                    <p className="text-xs md:text-sm text-[#333] mb-3 md:mb-4">{item.description}</p>
                                    {item.url ? (
                                      <Link href={item.url} target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline" size="sm" className="w-full">
                                          詳しくはこちら
                                        </Button>
                                      </Link>
                                    ) : (
                                      <Button variant="outline" size="sm" className="w-full" disabled>
                                        詳しくはこちら
                                      </Button>
                                    )}
                                  </div>
                                  <div className="aspect-video rounded-lg overflow-hidden relative">
                                    <Image
                                      src={item.image || "/no_photo.jpg"}
                                      alt={item.name}
                                      fill
                                      className="object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.src = "/no_photo.jpg?height=300&width=400"
                                      }}
                                    />
                                  </div>
                                </CardContent>
                              </Card>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4" />
                        <CarouselNext className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4" />
                      </Carousel>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </section>

      <DividerSection />

      {/* Map Section */}
      <section className="py-12 md:py-20 bg-[url('/washi_background.webp')]">
        <div className="w-full mx-auto px-4 max-w-3xl">
          <div className="text-center mb-8 md:mb-16">
            <div className="inline-block px-6 md:px-12">
              <p className="text-s md:text-sm text-gray-500 mb-1 md:mb-2">-ACCESS-</p>
              <h2 className="text-2xl md:text-4xl font-bold">アクセス</h2>
            </div>
          </div>

          <Card className="rounded-lg border-primary/20 mb-8">
            <CardContent className="p-4 md:p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-2">自動車でのアクセス</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>札幌から車で約2時間（道央自動車道余市ICから約40分）</li>
                    <li>小樽から車で約1時間</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-2">駐車場情報</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>古平町観光協会付近に無料駐車場あり</li>
                    <li>各観光スポット近くにも駐車スペースあり</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-lg overflow-hidden shadow-lg">
            <iframe
              src="https://maps.google.com/maps?q=〒046-0121%20北海道古平郡古平町浜町50番地%20古平町役場&output=embed"
              title="古平町役場の地図"
              className="w-full h-96 object-cover"
              allowFullScreen
              loading="lazy"
            ></iframe>
          </div>
        </div>
      </section>

      <DividerSection />

      {/* Footer */}
      <Footer />

      {/* Fixed Position Banner (動的サイズ調整) */}
      {heroInView && bannerVisible && captionVisible && (
        <div className="fixed rounded bottom-4 left-0 z-30 transition-opacity duration-300 group opacity-100">
          <a href="https://www.furubira-tarakomuseum.com/" target="_blank" rel="noopener noreferrer">
            <div className="relative bg-white/90 rounded-tr-lg shadow-lg hover:bg-white transition-colors flex items-center gap-4">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setBannerVisible(false);
                }}
                className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
              <div style={{ position: "relative", width: `${bannerSize.width}px`, height: `${bannerSize.height}px` }}>
                <Image
                  src="/banner.png"
                  alt="道の駅ふるびら たらこミュージアム"
                  fill
                  className="object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/no_photo.jpg?height=96&width=360";
                  }}
                />
              </div>
            </div>
          </a>
        </div>
      )}

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-4 right-4 transition-opacity duration-500",
          showChat ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChatWindow />
      </div>

      {/* FlameParticles コンポーネント */}
      <FlameParticles />
    </div>
  )
}

