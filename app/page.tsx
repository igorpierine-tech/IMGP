import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/authz";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? "/legacy" : "/login");
}
