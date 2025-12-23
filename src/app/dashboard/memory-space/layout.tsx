import { generateMetadata as generateMeta, metadataConfig } from "@/lib/metadata"

export const metadata = generateMeta(metadataConfig['memory-space'])

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="">{children}</div>
}
