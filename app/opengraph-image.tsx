import { ImageResponse } from "next/og";

export const alt = "Virro — Reduce el costo de trabajar con información mal entendida";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "62px 70px", background: "radial-gradient(circle at 72% 30%, #18345f 0%, #0b111b 42%, #070b11 100%)", color: "#f7f9fc", fontFamily: "Arial, sans-serif" }}><div style={{ display: "flex", alignItems: "center", gap: 18 }}><div style={{ width: 48, height: 48, borderRadius: 16, background: "linear-gradient(135deg,#0969ff,#d93630)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800 }}>V</div><span style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-1px" }}>Virro</span></div><div style={{ display: "flex", flexDirection: "column", width: 880 }}><span style={{ color: "#6ea5ff", fontSize: 18, textTransform: "uppercase", letterSpacing: "4px", marginBottom: 22 }}>Infraestructura empresarial de entendimiento operativo digital</span><strong style={{ fontSize: 68, lineHeight: 1.03, letterSpacing: "-4px" }}>Reduce el costo de trabajar con información mal entendida.</strong></div><div style={{ display: "flex", justifyContent: "space-between", color: "#9aa7b7", fontSize: 18 }}><span>Contexto · criterio · claridad · readiness</span><span>virro.app</span></div></div>, size);
}
