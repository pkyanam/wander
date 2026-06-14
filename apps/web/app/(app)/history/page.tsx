import type { Metadata } from "next";
import { HistoryList } from "@/components/history/history-list";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="History"
        subtitle="Everywhere you've wandered recently."
      />
      <div className="mt-6">
        <HistoryList />
      </div>
    </div>
  );
}
