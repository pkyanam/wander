import { Fraunces, Inter } from "next/font/google";

/**
 * Display face: Fraunces — a soft, characterful "old style" serif. `opsz` gives
 * it optical sizing so large headlines get the expressive display letterforms.
 */
export const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["opsz"],
});

/** UI / body face: Inter — clean, highly legible at small sizes. */
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
