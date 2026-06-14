"use client";

import { useEffect, useState } from "react";
import {
  DESTINATION_STATUSES,
  SOURCE_TYPES,
  type DestinationAdmin,
  type DestinationInput,
  type DestinationStatus,
  type SourceType,
} from "@wander/shared";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { adminApi, ApiError } from "@/lib/client";

const field =
  "w-full rounded-xl border border-line-strong bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none";
const label =
  "block text-xs font-semibold uppercase tracking-wide text-ink-faint";

const csv = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export function DestinationDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: DestinationAdmin;
  onSaved: (item: DestinationAdmin) => void;
}) {
  const editing = Boolean(initial);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [summary, setSummary] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("seed");
  const [status, setStatus] = useState<DestinationStatus>("approved");
  const [qualityScore, setQualityScore] = useState(70);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever the dialog opens (or the target changes).
  useEffect(() => {
    if (!open) return;
    setError(null);
    setUrl(initial?.url ?? "");
    setTitle(initial?.title ?? "");
    setHook(initial?.hook ?? "");
    setSummary(initial?.summary ?? "");
    setImageUrl(initial?.imageUrl ?? "");
    setTags(initial ? initial.tags.map((t) => t.slug).join(", ") : "");
    setSourceType(initial?.sourceType ?? "seed");
    setStatus(initial?.status ?? "approved");
    setQualityScore(initial?.qualityScore ?? 70);
  }, [open, initial]);

  async function save() {
    setSubmitting(true);
    setError(null);
    const input: DestinationInput = {
      url: url.trim(),
      title: title.trim(),
      hook: hook.trim(),
      summary: summary.trim() || null,
      imageUrl: imageUrl.trim() || null,
      tags: csv(tags),
      sourceType,
      status,
      qualityScore,
      contentFlags: initial?.contentFlags ?? [],
    };
    try {
      const res = editing
        ? await adminApi.update(initial!.id, input)
        : await adminApi.create(input);
      onSaved(res.item);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Edit destination" : "Add destination"}
    >
      <div className="space-y-4">
        <div>
          <label className={label} htmlFor="d-url">
            URL
          </label>
          <input
            id="d-url"
            className={`${field} mt-1.5`}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
        <div>
          <label className={label} htmlFor="d-title">
            Title
          </label>
          <input
            id="d-title"
            className={`${field} mt-1.5`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className={label} htmlFor="d-hook">
            Hook
          </label>
          <input
            id="d-hook"
            className={`${field} mt-1.5`}
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            placeholder="One delightful sentence"
          />
        </div>
        <div>
          <label className={label} htmlFor="d-summary">
            Summary <span className="font-normal lowercase">(optional)</span>
          </label>
          <textarea
            id="d-summary"
            rows={2}
            className={`${field} mt-1.5 resize-none`}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
        <div>
          <label className={label} htmlFor="d-tags">
            Tags{" "}
            <span className="font-normal lowercase">
              (comma separated slugs)
            </span>
          </label>
          <input
            id="d-tags"
            className={`${field} mt-1.5`}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="design, technology, weird-internet"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="d-status">
              Status
            </label>
            <select
              id="d-status"
              className={`${field} mt-1.5`}
              value={status}
              onChange={(e) => setStatus(e.target.value as DestinationStatus)}
            >
              {DESTINATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="d-source">
              Source
            </label>
            <select
              id="d-source"
              className={`${field} mt-1.5`}
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as SourceType)}
            >
              {SOURCE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={label} htmlFor="d-quality">
            Quality score: {qualityScore}
          </label>
          <input
            id="d-quality"
            type="range"
            min={0}
            max={100}
            className="mt-2 w-full accent-accent"
            value={qualityScore}
            onChange={(e) => setQualityScore(Number(e.target.value))}
          />
        </div>

        {error && (
          <p className="text-sm text-love" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={submitting || !url || !title || !hook}
          >
            {submitting ? "Saving\u2026" : editing ? "Save changes" : "Add"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
