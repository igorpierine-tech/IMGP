import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export default async function TenantRoot({ params }: Props) {
  const { slug } = await params;
  redirect(`/t/${slug}/legacy`);
}
