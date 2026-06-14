"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { adminApi, ApiError } from "@/lib/client";

const PLACEHOLDER = `{
  "source": "admin_import",
  "destinations": [
    {
      "url": "https://example.com",
      "title": "Example",
      "hook": "A one-line hook.",
      "tags": ["technology"],
      "status": "approved",
      "qualityScore": 80
    }
  ]
}`;

export function ImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setSubmitting(true);
    setError(null);
    setResult(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError("That isn't valid JSON.");
      setSubmitting(false);
      return;
    }
    const payload = Array.isArray(parsed)
      ? { source: "admin_import", destinations: parsed }
      : (parsed as { source?: string; destinations?: unknown });

    try {
      const res = await adminApi.import({
        source: payload.source ?? "admin_import",
        destinations: (payload.destinations ?? []) as never,
      });
      setResult(
        `Imported ${res.total} — ${res.created} created, ${res.updated} updated.`,
      );
      onImported();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Import failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Import destinations"
      description="Paste a JSON object with a destinations array (or a bare array)."
    >
      <div className="space-y-4">
        <textarea
          rows={10}
          spellCheck={false}
          className="w-full rounded-xl border border-line-strong bg-paper px-3.5 py-2.5 font-mono text-xs text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
        />
        {error && (
          <p className="text-sm text-love" role="alert">
            {error}
          </p>
        )}
        {result && <p className="text-sm text-compass-strong">{result}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={run} disabled={submitting || !text.trim()}>
            {submitting ? "Importing\u2026" : "Import"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
