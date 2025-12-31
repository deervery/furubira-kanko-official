"use client"

import Link from "next/link"
import { Phone, Mail, Clock } from "lucide-react"

import { useI18n } from "@/components/i18n/i18n-provider"
import { t } from "@/lib/i18n/t"

export function Footer() {
  const { lang, messages } = useI18n()

  const withLang = (path: string) => {
    if (path === "/") return `/${lang}`
    return `/${lang}${path}`
  }

  return (
    <footer className="bg-black text-white py-16">
      <div className="mx-auto max-w-3xl px-4">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Logo and Description */}
          <div>
            <h3 className="text-xl font-bold mb-4">{t(messages, "footer.furubira_town_tourism_association")}</h3>
            <p className="text-sm text-gray-400">{t(messages, "footer.furubira_is_a_fishing_town_located_on_the_sea_of_japan_coast_of_hokkaido_here_we_introduce_the_charms_woven_together_by_its_traditions_and_natural_beauty")}</p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-4">{t(messages, "footer.tourist_information")}</h4>
            <nav className="space-y-2">
              {[
                { key: "header.tourist_spot", path: "/spots" },
                { key: "footer.accommodations", path: "/accommodations" },
                { key: "footer.restaurants", path: "/dining" },
                { key: "footer.events", path: "/events" },
                { key: "footer.shopping", path: "/shopping" },
                { key: "footer.access", path: "/access" },
                { key: "footer.tax_donation", path: "/furusato" },
              ].map(({ key, path }) => (
                <div key={path}>
                  <Link href={withLang(path)} className="text-sm text-gray-400 hover:text-primary transition-colors">
                    {t(messages, key)}
                  </Link>
                </div>
              ))}
            </nav>
            
            {/* External Links */}
            <div className="mt-6">
              <h5 className="text-sm font-semibold mb-2 text-gray-300">{t(messages, "footer.further_links")}</h5>
              <div className="space-y-2">
                <div>
                  <a
                    href="https://www.town.furubira.lg.jp/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-primary transition-colors"
                  >
                    {t(messages, "footer.furubira_town")}
                  </a>
                </div>
                <div>
                  <a
                    href="https://www.furubira-tarakomuseum.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-primary transition-colors"
                  >
                    {t(messages, "footer.michi_no_eki_furubira_tarako_museum_roadside_station")}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-lg font-bold mb-4">{t(messages, "footer.contact_us")}</h4>
            <div className="space-y-2">
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                0135-48-9840<br />(役場産業課観光室内)
              </p>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                shoukankou@furubira.lg.jp
              </p>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t(messages, "footer.weekdays")} 8:45~17:30
              </p>
              <p className="text-sm text-gray-400 mt-2">
                〒046-0121
                <br />
                北海道古平郡古平町大字浜町50番地
              </p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-gray-800 text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} {t(messages, "footer.furubira_town_tourism_association_2")}. All rights reserved.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {t(messages, "footer.the_image_of_the_tengu_fire_walking_ritual_was_taken_by_yuya_instagram")}
            <a
              href="https://www.instagram.com/yuya_7photo/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-primary transition-colors"
            >
              {lang === "ja" ? "Yuyaさん(Instagram)" : "Yuya (Instagram)"}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

