"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Layout } from "@/components/layout"
import { ExternalLink } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

// ふるさと納税サイトのデータ
const furusatoSites = [
  {
    id: "furusato-choice",
    name: "ふるさとチョイス",
    description: "日本最大級のふるさと納税サイト。豊富な返礼品から選べます。",
    url: "https://www.furusato-tax.jp/city/product/01406",
    logo: "/furusato/furusato-choice.png",
  },
  {
    id: "rakuten",
    name: "楽天ふるさと納税",
    description: "楽天ポイントが貯まる・使えるふるさと納税サイト。",
    url: "https://www.rakuten.co.jp/f014061-furubira/?s-id=furusato_pc_area-hokkaido_f014061-furubira",
    logo: "/furusato/rakuten.png",
  },
  {
    id: "satofull",
    name: "さとふる",
    description: "手数料無料、専門コンシェルジュによるサポートが特徴のふるさと納税サイト。",
    url: "https://www.satofull.jp/products/list.php?s4=%E5%8C%97%E6%B5%B7%E9%81%93&s3=%E5%8F%A4%E5%B9%B3%E7%94%BA://www.satofull.jp/city-furubira-hokkaido/",
    logo: "/furusato/satofull.png",
  },
  {
    id: "ana",
    name: "ANAのふるさと納税",
    description: "ANAのマイルが貯まるふるさと納税サイト。",
    url: "https://furusato.ana.co.jp/donation/top/01406",
    logo: "/furusato/ana.png",
  },
  {
    id: "furunavi",
    name: "ふるなび",
    description: "ふるさと納税をもっと身近に、もっと簡単に。",
    url: "https://furunavi.jp/Municipal/Product/Search?municipalid=69",
    logo: "/furusato/furunavi.png",
  },
]

export default function Furusato() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-center">ふるさと納税</h1>

        <div className="mb-8">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl">古平町へのふるさと納税</CardTitle>
              <CardDescription>
                古平町の魅力ある特産品を返礼品としてお届けします。ふるさと納税で古平町の地域振興にご協力ください。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p>
                  北海道日本海側に位置する古平町は、新鮮な海産物や伝統的な水産加工品が特産です。
                  ふるさと納税の返礼品には、地元で獲れた新鮮な魚介類や、伝統の技で作られた加工品などをご用意しています。
                </p>
                <p className="font-semibold mt-4">
                  以下のふるさと納税サイトから古平町への寄付が可能です。各サイトの特徴に合わせてお選びください。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {furusatoSites.map((site) => (
            <Card key={site.id} className="border-primary/20 hover:border-primary transition-colors overflow-hidden">
              <div className="relative w-full h-[180px] bg-white">
                <Image
                  src={site.logo}
                  alt={`${site.name}のロゴ`}
                  fill
                  className="object-cover w-full"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                  }}
                />
              </div>
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <h3 className="font-bold text-xl mb-4">{site.name}</h3>
                  <p className="text-gray-600 mb-4 flex-grow">{site.description}</p>
                  <Link
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary hover:text-primary/80 font-medium"
                  >
                    サイトを見る <ExternalLink className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl">ふるさと納税について</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p>
                  ふるさと納税とは、自分の選んだ自治体に寄付ができる制度です。
                  寄付額のうち2,000円を超える部分については、所得税と住民税から控除されます（一定の上限あり）。
                </p>
                <p className="mt-2">古平町では、寄付金を以下の事業に活用させていただきます：</p>
                <ul className="list-disc pl-5 mt-2 space-y-2">
                  <li>
                    <span className="font-semibold">（１）教育環境の充実・文化の振興・子育て支援</span><br />
                    次世代を担う子どもたちの成長と学習環境の充実を図ります。
                    古平町では、人口減少対策として子育て支援策を強化しております。
                    その支援策を実施する経費に対して、寄附金を使わせていただいております。
                  </li>
                  <li>
                    <span className="font-semibold">（２）地域福祉の充実</span><br />
                    古平町は、高齢化率が４割を越えており、これらの方が安心して暮らせるような施策や福祉施設の整備などを進めていきます。
                  </li>
                  <li>
                    <span className="font-semibold">（３）産業の振興</span><br />
                    古平町は、漁業と水産加工業が盛んなまちです。主に獲れる魚種はホッケ・タコ・エビ・タラ・ウニです。水産加工業は、タラコを中心に製造をしております。
                  </li>
                  <li>
                    <span className="font-semibold">（４）その他</span><br />
                    使途を指定されなかった寄附金については、上記以外の様々なまちづくり事業に活用させていただいております。
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

