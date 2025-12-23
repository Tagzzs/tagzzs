import { generateMetadata as generateMeta, metadataConfig } from "@/lib/metadata"

export const metadata = generateMeta(metadataConfig.signUp)

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
