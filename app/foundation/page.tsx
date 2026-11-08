import { requirePageUser } from "@/lib/server/authz";
import FoundationClient from "./foundation-client";

export default async function FoundationPage() {
  await requirePageUser("/foundation");
  return <FoundationClient />;
}
