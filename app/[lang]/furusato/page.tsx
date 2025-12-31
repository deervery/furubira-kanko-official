"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Layout } from "@/components/layout"
import { ExternalLink } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useI18n } from "@/components/i18n/i18n-provider"
import { t } from "@/lib/i18n/t"

// ふるさと納税サイトのデータ
const furusatoSites = [
  {
    id: "furusato-choice",
    nameKey: "cms.furusato_choice",
    descriptionKey: "cms.one_of_japan_s_largest_furusato_tax_sites_offering_a_wide_variety_of_return_gifts",
    url: "https://www.furusato-tax.jp/city/product/01406",
    logo: "/furusato/furusato-choice.png",
  },
  {
    id: "rakuten",
    nameKey: "cms.rakuten_furusato_tax",
    descriptionKey: "cms.a_furusato_tax_site_where_you_can_earn_and_use_rakuten_points",
    url: "https://www.rakuten.co.jp/f014061-furubira/?s-id=furusato_pc_area-hokkaido_f014061-furubira",
    logo: "/furusato/rakuten.png",
  },
  {
    id: "satofull",
    nameKey: "cms.satofuru",
    descriptionKey: "cms.a_furusato_tax_site_known_for_no_handling_fees_and_concierge_support",
    url: "https://www.satofull.jp/products/list.php?s4=%E5%8C%97%E6%B5%B7%E9%81%93&s3=%E5%8F%A4%E5%B9%B3%E7%94%BA://www.satofull.jp/city-furubira-hokkaido/",
    logo: "/furusato/satofull.png",
  },
  {
    id: "ana",
    nameKey: "cms.ana_furusato_tax",
    descriptionKey: "cms.a_furusato_tax_site_where_you_can_earn_ana_miles",
    url: "https://furusato.ana.co.jp/donation/top/01406",
    logo: "/furusato/ana.png",
  },
  {
    id: "furunavi",
    nameKey: "cms.furunavi",
    descriptionKey: "cms.making_furusato_tax_donations_more_accessible_and_easier",
    url: "https://furunavi.jp/Municipal/Product/Search?municipalid=69",
    logo: "/furusato/furunavi.png",
  },
]

export default function Furusato() {
  const { lang, messages } = useI18n()

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-center">{t(messages, "header.tax_donation")}</h1>

        <div className="mb-8">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl">{t(messages, "cms.furubira_town_furusato_tax_donation")}</CardTitle>
              <CardDescription>
                {t(messages, "cms.we_offer_furubira_s_finest_local_specialties_as_return_gifts_your_furusato_tax_donation_helps_support_regional_development_in_furubira")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p>{t(messages, "cms.furubira_town_located_on_hokkaidos_sea_of_japan_coast_is_renowned_for_its_fresh_seafood_and_traditional_processed_marine_products_as_return_gifts_for_the_hometown_tax_donation_program_we_offer_locally_caught_fresh_fish_and_shellfish_as_well_as_processed_goods_made_with_traditional_techniques")}</p>
                <p className="font-semibold mt-4">
                  {t(messages, "cms.you_can_donate_to_furubira_town_through_the_furusato_tax_websites_below_please_choose_the_one_that_suits_your_preferences")}
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
                  alt={
                    lang === "ja"
                      ? `${t(messages, site.nameKey)}のロゴ`
                      : `${t(messages, site.nameKey)} logo`
                  }
                  fill
                  className="object-cover w-full"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    // keep default
                  }}
                />
              </div>
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <h3 className="font-bold text-xl mb-4">{t(messages, site.nameKey)}</h3>
                  <p className="text-gray-600 mb-4 flex-grow">{t(messages, site.descriptionKey)}</p>
                  <Link
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary hover:text-primary/80 font-medium"
                  >
                    {t(messages, "cms.visit_site")} <ExternalLink className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl">{t(messages, "cms.about_hometown_tax_program")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p>{t(messages, "cms.the_hometown_tax_donation_program_is_a_system_that_allows_you_to_donate_to_a_municipality_of_your_choice_the_portion_exceeding_2_000_yen_of_your_donation_is_deductible_from_your_income_and_resident_taxes_within_certain_limits")}</p>
                <p className="mt-2">{t(messages, "cms.furubira_town_allocates_donations_to_the_following_initiatives")}</p>
                <ul className="list-disc pl-5 mt-2 space-y-2">
                  <li>
                    <span className="font-semibold">
                      {t(messages, "cms.1_enhancing_educational_environments_promoting_culture_and_supporting_child_rearing")}
                    </span>
                    <br />
                    {t(messages, "cms.we_support_the_growth_and_educational_environment_of_children_who_will_lead_the_next_generation_furubira_town_is_strengthening_child_rearing_support_measures_as_part_of_its_population_decline_countermeasures_donations_are_used_to_fund_these_initiatives")}
                  </li>
                  <li>
                    <span className="font-semibold">{t(messages, "cms.2_enhancing_community_welfare")}</span>
                    <br />
                    {t(messages, "cms.with_over_40_of_the_population_being_elderly_furubira_town_is_improving_welfare_services_and_facilities_to_ensure_residents_can_live_comfortably_and_securely")}
                  </li>
                  <li>
                    <span className="font-semibold">{t(messages, "cms.3_promotion_of_local_industry")}</span>
                    <br />
                    {t(messages, "cms.furubira_is_known_for_its_active_fishing_and_seafood_processing_industries_main_catches_include_atka_mackerel_octopus_shrimp_cod_and_sea_urchin_seafood_processing_focuses_primarily_on_cod_roe")}
                  </li>
                  <li>
                    <span className="font-semibold">{t(messages, "cms.4_other_uses")}</span>
                    <br />
                    {t(messages, "cms.donations_without_specified_uses_are_applied_to_various_community_development_projects_beyond_those_listed_above")}
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


