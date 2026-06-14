import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { isSaved, loadCard } from "@/lib/db-helpers";
import { Viewer } from "@/components/visit/viewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Visiting" };

export default async function VisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getOrCreateUser();
  const card = await loadCard(id);
  if (!card) notFound();

  const saved = user ? await isSaved(user.id, id) : false;
  return <Viewer card={card} initiallySaved={saved} />;
}
