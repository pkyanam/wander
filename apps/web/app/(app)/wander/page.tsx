import type { Metadata } from "next";
import { WanderDeck } from "@/components/wander/wander-deck";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Wander" };

export default function WanderPage() {
  return (
    <div className="mx-auto max-w-xl">
      <WanderDeck />
    </div>
  );
}
