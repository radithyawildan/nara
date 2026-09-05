import { ImageResponse } from "next/og";

export const alt = "NARA — Neural Adaptive Responsive Avatar";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background:
          "radial-gradient(circle at 75% 15%, rgba(124,58,237,.33), transparent 32%), radial-gradient(circle at 20% 85%, rgba(6,182,212,.18), transparent 28%), #050714",
        color: "white",
        padding: "72px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "86px",
          height: "86px",
          borderRadius: "28px",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(124,58,237,.14)",
          border: "1px solid rgba(167,139,250,.35)",
          fontSize: "40px",
          fontWeight: 700,
        }}
      >
        N
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: "18px",
            letterSpacing: "5px",
            color: "rgba(196,181,253,.75)",
            textTransform: "uppercase",
          }}
        >
          Neural Adaptive Responsive Avatar
        </div>

        <div
          style={{
            display: "flex",
            marginTop: "18px",
            fontSize: "76px",
            lineHeight: 1,
            fontWeight: 700,
            letterSpacing: "-3px",
          }}
        >
          NARA
        </div>

        <div
          style={{
            display: "flex",
            marginTop: "22px",
            maxWidth: "850px",
            fontSize: "28px",
            lineHeight: 1.4,
            color: "rgba(226,232,240,.68)",
          }}
        >
          Voice-first conversational AI with persistent memory, grounded
          knowledge, adaptive personality, and long-thread intelligence.
        </div>
      </div>
    </div>,
    size,
  );
}
