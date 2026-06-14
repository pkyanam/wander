import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadCard } from "@/lib/db-helpers";
import { Viewer } from "@/components/visit/viewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Visiting" };

export default async function VisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const card = await loadCard(id);
  if (!card) notFound();

  // Saved state lives in localStorage; the Viewer resolves it on mount.
  return <Viewer card={card} />;
}
