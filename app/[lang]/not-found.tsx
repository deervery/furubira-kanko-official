"use client"

import Link from "next/link"
import { AlertCircle } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/i18n/i18n-provider"
import { t } from "@/lib/i18n/t"

export default function NotFound() {
  const { lang, messages } = useI18n()

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">{t(messages, "notFound.title")}</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600 mb-6">{t(messages, "notFound.description")}</p>

          <Link href={`/${lang}`}>
            <Button>{t(messages, "notFound.back_to_home")}</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}


