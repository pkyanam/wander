import type { Metadata } from "next";
import Link from "next/link";
import type { InteractionType } from "@wander/shared";
import { getOrCreateUser } from "@/lib/auth";
import { getHistoryItems } from "@/lib/db-helpers";
import { DestinationRow } from "@/components/destination-row";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { ClockIcon } from "@/components/icons";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "History" };

const VERB: Record<InteractionType, string> = {
  viewed: "Seen",
  loved: "Loved",
  skipped: "Skipped",
  saved: "Saved",
  unsaved: "Removed",
  visited: "Visited",
  reported: "Reported",
};

export default async function HistoryPage() {
  const user = await getOrCreateUser();
  const items = user ? await getHistoryItems(user.id) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="History"
        subtitle="Everywhere you've wandered recently."
      />
      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState
            icon={<ClockIcon size={26} />}
            title="No history yet"
            message="Once you start wandering, the places you see will be listed here."
            action={
              <Link href="/wander" className={buttonClasses("primary", "md")}>
                Start wandering
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <DestinationRow
                key={item.destination.id}
                card={item.destination}
                href={`/visit/${item.destination.id}`}
                meta={
                  <span className="whitespace-nowrap">
                    · {VERB[item.type]} {timeAgo(item.at)}
                  </span>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
