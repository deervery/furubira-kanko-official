"use client"

import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Phone, Clock } from "lucide-react"
import { Layout } from "@/components/layout"

export default function Access() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">アクセス</h1>

        <Card className="border-primary/20 mb-8">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">古平町へのアクセス方法</h2>
            <ul className="space-y-2 text-gray-600">
              <li>札幌から車で約2時間（道央自動車道余市ICから約40分）</li>
              <li>小樽から車で約1時間</li>
            </ul>

            <h3 className="text-xl font-bold mt-6 mb-2">駐車場情報</h3>
            <ul className="space-y-2 text-gray-600">
              <li>古平町観光協会付近に無料駐車場あり</li>
              <li>各観光スポット近くにも駐車スペースあり</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">観光案内所・観光協会</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                <p className="text-gray-600">0135-42-2181</p>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <p className="text-gray-600">北海道古平郡古平町大字浜町50番地</p>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <p className="text-gray-600">月〜金 8:30〜17:00</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 aspect-video rounded-lg overflow-hidden shadow-lg">
          <iframe
            src="https://maps.google.com/maps?q=〒046-0121%20北海道古平郡古平町浜町50番地%20古平町役場&output=embed"
            title="古平町役場の地図"
            className="w-full h-96 object-cover"
            allowFullScreen
            loading="lazy"
          ></iframe>
        </div>
      </div>
    </Layout>
  )
}

