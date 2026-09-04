import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NARA — Neural Adaptive Responsive Avatar",
    short_name: "NARA",
    description:
      "A voice-first adaptive conversational AI with memory, knowledge grounding, and responsive avatar interaction.",
    start_url: "/",
    display: "standalone",
    background_color: "#050714",
    theme_color: "#080b17",
    orientation: "portrait-primary",
    categories: ["productivity", "utilities"],
  };
}
