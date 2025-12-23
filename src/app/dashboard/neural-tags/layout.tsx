import { generateMetadata as generateMeta, metadataConfig } from "@/lib/metadata"

export const metadata = generateMeta(metadataConfig['neural-tags'])

export default function TagsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="">{children}</div>
}
