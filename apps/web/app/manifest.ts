import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wander — wander into wonder",
    short_name: "Wander",
    description:
      "One tap. Beautiful discovery. A calm, curated way to rediscover the web's most delightful corners.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f0e4",
    theme_color: "#f6f0e4",
    categories: ["lifestyle", "education", "entertainment"],
    icons: [
      {
        src: "/wander-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/wander-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/wander-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
