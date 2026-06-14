import type { Metadata } from "next";
import { listDestinationsAdmin } from "@/lib/db-helpers";
import { listCandidates } from "@/lib/curation";
import { PageHeader } from "@/components/ui/page-header";
import { AdminTabs } from "@/components/admin/admin-tabs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Catalog admin" };

export default async function AdminPage() {
  const [catalogInitial, candidatesInitial] = await Promise.all([
    listDestinationsAdmin({ limit: 100 }),
    listCandidates({ status: "needs_review", limit: 100 }),
  ]);

  return (
    <div>
      <PageHeader
        title="Catalog"
        subtitle="Curate, review, and grow the Wander catalog."
      />
      <div className="mt-6">
        <AdminTabs catalog={catalogInitial} candidates={candidatesInitial} />
      </div>
    </div>
  );
}
