import Link from "next/link"
import { Phone, Mail } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-black text-white py-16">
      <div className="mx-auto max-w-3xl px-4">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Logo and Description */}
          <div>
            <h3 className="text-xl font-bold mb-4">古平町観光協会</h3>
            <p className="text-sm text-gray-400">
              北海道の日本海側に位置する漁業の町、古平町。 伝統と自然が織りなす魅力をご紹介します。
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-4">観光案内</h4>
            <nav className="space-y-2">
              {[
                { text: "観光スポット", path: "/spots" },
                { text: "宿泊施設", path: "/accommodations" },
                { text: "飲食店", path: "/dining" },
                { text: "イベント", path: "/events" },
                { text: "買い物", path: "/shopping" },
                { text: "アクセス", path: "/access" },
                { text: "ふるさと納税", path: "/furusato" },
              ].map(({ text, path }) => (
                <div key={path}>
                  <Link href={path} className="text-sm text-gray-400 hover:text-primary transition-colors">
                    {text}
                  </Link>
                </div>
              ))}
            </nav>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-lg font-bold mb-4">お問い合わせ</h4>
            <div className="space-y-2">
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                0135-48-9840(役場産業課観光室内)
              </p>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                shoukankou@furubira.lg.jp
              </p>
              <p className="text-sm text-gray-400 mt-2">
                〒046-0121
                <br />
                北海道古平郡古平町大字浜町932-2
              </p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-gray-800 text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} 古平町観光協会. All rights reserved.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            「天狗の火渡り」の画像は
            <a
              href="https://www.instagram.com/yuya_7photo/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-primary transition-colors"
            >
              Yuyaさん(Instagram)
            </a>
            によって撮影されました。
          </p>
        </div>
      </div>
    </footer>
  )
}

