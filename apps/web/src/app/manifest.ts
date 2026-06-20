import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JustSwap",
    short_name: "JustSwap",
    description: "Exchange what you have for what you need without buying or selling.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F7F8",
    theme_color: "#18B66A",
    icons: [
      {
        src: "/brand/justswap-favicon-32.png",
        sizes: "32x32",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/justswap-app-icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/justswap-mark.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
