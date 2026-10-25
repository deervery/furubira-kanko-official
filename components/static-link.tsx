import type { AnchorHTMLAttributes } from "react"
// Ordinary document navigation keeps exported HTML, language and metadata authoritative.
export default function StaticLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />
}
