"use client";

import dynamic from "next/dynamic";

export const TechnicalArsenal = dynamic(
  () => import("@/components/TechnicalArsenal"),
  {
    ssr: false,
    loading: () => <div aria-hidden style={{ width: "100%", height: "100vh", background: "#0a0a0a" }} />,
  }
);

/** Start downloading the Arsenal code early so it never pops in while scrolling. */
export const prefetchArsenal = () => import("@/components/TechnicalArsenal");
