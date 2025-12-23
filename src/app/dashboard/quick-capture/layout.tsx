import { generateMetadata as generateMeta, metadataConfig } from "@/lib/metadata"

export const metadata = generateMeta(metadataConfig['quick-capture'])

export default function AddLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="">{children}</div>
}
