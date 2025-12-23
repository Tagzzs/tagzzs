import { Metadata } from 'next'
import { generateMetadata as generateMeta, metadataConfig } from "@/lib/metadata"

export const metadata: Metadata = generateMeta(metadataConfig.dashboard)

// This component doesn't render anything, it just provides metadata
export default function DashboardMetadata() {
  return null
}
