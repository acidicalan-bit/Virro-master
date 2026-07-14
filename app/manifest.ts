import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Virro",
    short_name: "Virro",
    description: "Infraestructura empresarial de entendimiento operativo digital.",
    start_url: "/",
    display: "standalone",
    background_color: "#080b10",
    theme_color: "#080b10",
    icons: [{ src: "/brand/virro-icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
