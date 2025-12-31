"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Layout } from "@/components/layout"
import { useI18n } from "@/components/i18n/i18n-provider"
import { t } from "@/lib/i18n/t"

export default function Access() {
  const { messages } = useI18n()

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">{t(messages, "home.access")}</h1>

        <Card className="border-primary/20 mb-8">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">{t(messages, "accessPage.how_to_reach")}</h2>
            <ul className="space-y-2 text-gray-600">
              <li>{t(messages, "home.about_2_hours_by_car_from_sapporo_about_40_minutes_from_the_yoichi_ic_on_the_d_expressway")}</li>
              <li>{t(messages, "home.about_1_hour_by_car_from_otaru")}</li>
            </ul>

            <h3 className="text-xl font-bold mt-6 mb-2">{t(messages, "home.parking_information")}</h3>
            <ul className="space-y-2 text-gray-600">
              <li>{t(messages, "home.free_parking_is_available_near_the_furubira_town_hall")}</li>
              <li>{t(messages, "home.parking_spaces_are_also_available_near_each_sightseeing_spot")}</li>
            </ul>
          </CardContent>
        </Card>

        <div className="mt-8 aspect-video rounded-lg overflow-hidden shadow-lg">
          <iframe
            src="https://maps.google.com/maps?q=〒046-0121%20北海道古平郡古平町浜町50番地%20古平町役場&output=embed"
            title={t(messages, "accessPage.map_title")}
            className="w-full h-96 object-cover"
            allowFullScreen
            loading="lazy"
          ></iframe>
        </div>
      </div>
    </Layout>
  )
}


