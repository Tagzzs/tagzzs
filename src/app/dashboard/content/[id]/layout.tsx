import { generateMetadata as generateMeta, metadataConfig } from "@/lib/metadata"

export async function generateMetadata({ params }: { params: { id: string } }) {
  // In a real app, you would fetch the actual content data here
  const contentId = params.id
  
  return generateMeta({
    title: `Content Details - ${contentId}`,
    description: `View detailed information about your saved content item ${contentId}. Explore AI-generated tags, insights, and related materials.`,
    keywords: metadataConfig.content.keywords
  })
}

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="">{children}</div>
}
