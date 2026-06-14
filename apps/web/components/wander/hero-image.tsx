"use client";

import { useState } from "react";
import { faviconUrl, pickHero } from "@/lib/utils";

/**
 * Destination hero. Renders the enriched `imageUrl` (OpenGraph or screenshot)
 * when available, falling back to the branded gradient + favicon treatment when
 * there's no image or the image fails to load. A client island so the onError
 * fallback works without shipping JS for the rest of the card.
 */
export function HeroImage({
  domain,
  imageUrl,
}: {
  domain: string;
  imageUrl: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const hero = pickHero(domain);
  const showImage = Boolean(imageUrl) && !failed;

  return (
    <div
      className="relative h-44 overflow-hidden sm:h-52"
      style={{
        backgroundImage: `linear-gradient(135deg, ${hero.from}, ${hero.to})`,
      }}
    >
      {showImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl!}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        </>
      ) : (
        <>
          <div
            className="absolute inset-0 opacity-20 mix-blend-overlay"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-paper-raised/90 shadow-pop backdrop-blur-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={faviconUrl(domain, 128)}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-md"
                loading="lazy"
              />
            </div>
          </div>
        </>
      )}

      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" />
      <span className="absolute bottom-3 left-4 text-sm font-medium text-white/95 drop-shadow-sm">
        {domain}
      </span>
    </div>
  );
}
