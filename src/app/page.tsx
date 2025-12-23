import { redirect } from "next/navigation";
import { generateMetadata as generateMeta, metadataConfig } from "@/lib/metadata";

export const metadata = generateMeta(metadataConfig.home);

export default function LandingPage() {
  return redirect("/auth/sign-in");
}
