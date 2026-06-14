import type { Metadata } from "next";
import { getOrCreateUser } from "@/lib/auth";
import { getSavedItems } from "@/lib/db-helpers";
import { PageHeader } from "@/components/ui/page-header";
import { SavedList } from "@/components/saved/saved-list";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  const user = await getOrCreateUser();
  const items = user ? await getSavedItems(user.id) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Saved"
        subtitle="Destinations you've kept for later."
      />
      <div className="mt-6">
        <SavedList initialItems={items} />
      </div>
    </div>
  );
}
