import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JustSwap",
    short_name: "JustSwap",
    description: "Exchange what you have for what you need without buying or selling.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0E1A",
    theme_color: "#18B66A",
    icons: [
      {
        src: "/brand/justswap-favicon.png",
        sizes: "32x32",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/justswap-app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/justswap-app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/justswap-app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
