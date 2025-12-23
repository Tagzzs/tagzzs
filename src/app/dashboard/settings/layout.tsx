import { generateMetadata as generateMeta, metadataConfig } from "@/lib/metadata"

export const metadata = generateMeta(metadataConfig.settings)

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div>{children}</div>
}
