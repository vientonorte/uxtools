import type { Lang, Config, Park } from "./types"
import { TR, FLOWER_BG } from "./data"

interface Props {
  lang: Lang
  park: Park | null
  config: Config
  flyerRef: React.RefObject<HTMLDivElement | null>
}

export default function FlyerCard({ lang, park, config, flyerRef }: Props) {
  const tr = TR[lang]
  return (
    <div
      ref={flyerRef}
      style={{ width: 300, background: "#fff", borderRadius: 16, overflow: "hidden", fontFamily: "Nunito,sans-serif", flexShrink: 0, boxShadow: "0 8px 40px rgba(30,58,138,.18)" }}
    >
      {/* Photo area */}
      <div style={{ position: "relative", height: 248, backgroundImage: `url(${FLOWER_BG})`, backgroundSize: "cover", backgroundPosition: "center 40%" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(170deg,rgba(29,78,216,.68) 0%,rgba(14,116,144,.32) 100%)" }} />
        <div style={{ position: "absolute", top: 12, left: 14, color: "rgba(255,255,255,.7)", fontSize: 18, fontFamily: "Caveat,cursive" }}>✦</div>
        <div style={{ position: "absolute", top: 8, left: 30, color: "rgba(255,255,255,.4)", fontSize: 11, fontFamily: "Caveat,cursive" }}>✦</div>
        <div style={{ position: "absolute", top: 12, right: 14, fontSize: 26, filter: "drop-shadow(0 2px 4px rgba(0,0,0,.4))" }}>📷</div>
        <div style={{ position: "absolute", top: 20, left: 14, right: 14, fontFamily: "Caveat,cursive", fontWeight: 700, fontSize: 40, lineHeight: 1.05, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,.4)", whiteSpace: "pre-line" }}>
          {tr.heroTitle}
        </div>
        <div style={{ position: "absolute", top: 126, left: 14, width: 190, height: 2, background: "rgba(255,255,255,.55)", borderRadius: 2 }} />
        <div style={{ position: "absolute", bottom: 16, left: 14, right: 14, fontFamily: "Caveat,cursive", fontSize: 20, fontWeight: 600, color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,.35)", lineHeight: 1.3 }}>
          {config.tagline[lang]} <span style={{ fontSize: 17 }}>♡</span>
        </div>
      </div>

      {/* White bottom */}
      <div style={{ padding: "14px 16px 18px", background: "#fff" }}>
        {/* Prices */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ background: "#dbeafe", borderRadius: 10, padding: "7px 12px", textAlign: "center", flex: 1 }}>
            <div style={{ fontFamily: "Caveat,cursive", fontWeight: 700, fontSize: 24, color: "#1e3a8a", lineHeight: 1 }}>{config.price1}</div>
            <div style={{ fontSize: 11, color: "#1e40af", fontWeight: 700, marginTop: 2 }}>{config.price1lbl[lang]}</div>
          </div>
          <div style={{ color: "#3b82f6", fontSize: 18, fontFamily: "Caveat,cursive", fontWeight: 700, flexShrink: 0 }}>/</div>
          <div style={{ background: "#dbeafe", borderRadius: 10, padding: "7px 12px", textAlign: "center", flex: 1 }}>
            <div style={{ fontFamily: "Caveat,cursive", fontWeight: 700, fontSize: 22, color: "#1e3a8a", lineHeight: 1 }}>{config.price2}</div>
            <div style={{ fontSize: 11, color: "#1e40af", fontWeight: 700, marginTop: 2 }}>{config.price2lbl[lang]}</div>
          </div>
          <span style={{ color: "#93c5fd", fontSize: 15, flexShrink: 0 }}>♡</span>
        </div>

        <div style={{ borderTop: "1.5px dashed #bfdbfe", margin: "8px 0" }} />

        {/* Payment */}
        <div style={{ border: "1.5px solid #bfdbfe", borderRadius: 20, padding: "6px 12px", boxSizing: "border-box", width: "100%", overflow: "hidden" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#1e40af", whiteSpace: "nowrap", display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
            💳  {config.payment[lang]}
          </span>
        </div>

        {/* Pago adelantado + sin devoluciones */}
        <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
          <div style={{ flex: 1, background: "#fef9c3", border: "1.5px solid #fde68a", borderRadius: 10, padding: "5px 8px", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 12 }}>⚡</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#92400e", lineHeight: 1.2, whiteSpace: "nowrap" }}>
              {{ es: "Pago adelantado", en: "Pay in advance", pt: "Pague adiantado" }[lang]}
            </span>
          </div>
          <div style={{ flex: 1, background: "#fee2e2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "5px 8px", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 12 }}>🚫</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#991b1b", lineHeight: 1.2, whiteSpace: "nowrap" }}>
              {{ es: "Sin devoluciones", en: "No refunds", pt: "Sem reembolsos" }[lang]}
            </span>
          </div>
        </div>

        {/* Park */}
        {park && (
          <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 12 }}>📍</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#1e3a8a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{park.names[lang]} · {park.area}</span>
          </div>
        )}

        {/* Instagram */}
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, opacity: 0.8 }}>
          <span style={{ fontSize: 11 }}>📸</span>
          <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 700 }}>{config.instagram}</span>
        </div>
      </div>
    </div>
  )
}
