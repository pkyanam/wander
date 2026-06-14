import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { SavedList } from "@/components/saved/saved-list";

export const metadata: Metadata = { title: "Saved" };

export default function SavedPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Saved"
        subtitle="Destinations you've kept for later."
      />
      <div className="mt-6">
        <SavedList />
      </div>
    </div>
  );
}
