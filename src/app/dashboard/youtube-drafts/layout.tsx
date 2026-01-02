import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "YouTube Drafts | Tagzzs",
    description: "View your pending and completed YouTube video extractions",
};

export default function DraftsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
