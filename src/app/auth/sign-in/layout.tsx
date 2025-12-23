import { generateMetadata as generateMeta, metadataConfig } from "@/lib/metadata"

export const metadata = generateMeta(metadataConfig.signIn)

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
