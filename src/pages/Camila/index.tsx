import { useRef, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import html2canvas from "html2canvas"
import { useLocalStorage } from "../../hooks/useLocalStorage"
import type { Lang, Tab, Config, Park, MeetingPoint, Task, HistorialEntry, RoiSession } from "./types"
import {
  TR,
  INITIAL_CONFIG,
  DEFAULT_PARKS,
  DEFAULT_MEETING_POINTS,
  DEFAULT_TASKS,
} from "./data"
import FlyerCard from "./FlyerCard"
import ApoyoPanel from "./ApoyoPanel"
import HistorialPanel from "./HistorialPanel"
import "./camila.css"

const STORAGE_KEY = "camila-v1"

interface CamilaState {
  config: Config
  parks: Park[]
  meetingPoints: MeetingPoint[]
  tasks: Task[]
  historial: HistorialEntry[]
  totalPoints: number
}

const DEFAULT_STATE: CamilaState = {
  config: INITIAL_CONFIG,
  parks: DEFAULT_PARKS,
  meetingPoints: DEFAULT_MEETING_POINTS,
  tasks: DEFAULT_TASKS,
  historial: [],
  totalPoints: 0,
}

export default function Camila() {
  const [state, setState] = useLocalStorage<CamilaState>(STORAGE_KEY, DEFAULT_STATE)
  const [lang, setLang] = useLocalStorage<Lang>("camila-lang", "es")
  const [tab, setTab] = useState<Tab>("flyer")
  const [selectedParkId, setSelectedParkId] = useLocalStorage<string | null>("camila-park", null)
  const [downloading, setDownloading] = useState(false)
  const [roiSingles, setRoiSingles] = useState(0)
  const [roiDoubles, setRoiDoubles] = useState(0)
  const [roiNotes, setRoiNotes] = useState("")
  const flyerRef = useRef<HTMLDivElement | null>(null)

  const tr = TR[lang]
  const selectedPark = state.parks.find((p) => p.id === selectedParkId) ?? null

  function setTasks(tasks: Task[]) {
    setState({ ...state, tasks })
  }

  function addHistorial(entry: HistorialEntry) {
    setState({
      ...state,
      historial: [entry, ...state.historial],
      totalPoints: state.totalPoints + entry.points,
    })
  }

  function setHistorial(historial: HistorialEntry[]) {
    const pts = historial.reduce((a, e) => a + e.points, 0)
    setState({ ...state, historial, totalPoints: pts })
  }

  async function handleDownload() {
    if (!flyerRef.current) return
    setDownloading(true)
    try {
      const canvas = await html2canvas(flyerRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const link = document.createElement("a")
      link.download = `flyer-camila-${lang}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
      addHistorial({
        id: Date.now().toString(),
        ts: Date.now(),
        kind: "download",
        lang,
        parkId: selectedParkId,
        thumbnail: canvas.toDataURL("image/png", 0.3),
        points: 5,
      })
    } finally {
      setDownloading(false)
    }
  }

  function saveRoiSession() {
    if (roiSingles === 0 && roiDoubles === 0) return
    const session: RoiSession = {
      id: Date.now().toString(),
      ts: Date.now(),
      parkId: selectedParkId,
      singles: roiSingles,
      doubles: roiDoubles,
      notes: roiNotes,
      points: roiSingles * 10 + roiDoubles * 15,
    }
    addHistorial({
      id: Date.now().toString(),
      ts: Date.now(),
      kind: "roi",
      parkId: selectedParkId,
      session,
      points: session.points,
    })
    setRoiSingles(0)
    setRoiDoubles(0)
    setRoiNotes("")
  }

  const TABS: Tab[] = ["flyer", "edit", "map", "roi", "apoyo", "historial"]

  return (
    <div className="camila-overlay">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1e3a8a,#1d4ed8)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ fontFamily: "Caveat,cursive", fontSize: 22, fontWeight: 700, color: "#fff" }}>📷 Camila</div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["es", "en", "pt"] as Lang[]).map((l) => (
            <button key={l} onClick={() => setLang(l)} style={{ padding: "3px 8px", borderRadius: 8, border: "none", background: lang === l ? "#fff" : "rgba(255,255,255,.2)", color: lang === l ? "#1e3a8a" : "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", overflowX: "auto", background: "#f8faff", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 14px", border: "none", borderBottom: `2px solid ${tab === t ? "#2563eb" : "transparent"}`, background: "transparent", color: tab === t ? "#1d4ed8" : "#6b7280", fontWeight: tab === t ? 800 : 600, fontSize: 13, cursor: "pointer", flexShrink: 0, fontFamily: "Nunito,sans-serif" }}>
            {tr.tabs[t]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div id="main" tabIndex={-1} style={{ flex: 1, overflowY: "auto", padding: 16, background: "#f0f4ff" }}>

        {/* FLYER TAB */}
        {tab === "flyer" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <FlyerCard lang={lang} park={selectedPark} config={state.config} flyerRef={flyerRef} />
            <button onClick={handleDownload} disabled={downloading} style={{ padding: "12px 28px", borderRadius: 14, border: "none", background: downloading ? "#93c5fd" : "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", fontFamily: "Caveat,cursive", fontSize: 20, fontWeight: 700, cursor: downloading ? "default" : "pointer", width: "100%", maxWidth: 300 }}>
              {downloading ? tr.downloading : tr.download}
            </button>
            <div style={{ background: "#fff", borderRadius: 14, padding: "12px 16px", width: "100%", maxWidth: 300, boxSizing: "border-box" }}>
              <div style={{ fontFamily: "Caveat,cursive", fontSize: 16, fontWeight: 700, color: "#1e3a8a", marginBottom: 8 }}>{tr.rulesTitle}</div>
              {tr.rules.map(([icon, text]) => (
                <div key={text} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <span style={{ fontSize: 13, color: "#374151" }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EDIT TAB */}
        {tab === "edit" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480, margin: "0 auto" }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontFamily: "Caveat,cursive", fontSize: 18, fontWeight: 700, color: "#1e3a8a", marginBottom: 12 }}>{tr.editTitle}</div>
              {(
                [
                  { key: "name", label: tr.fieldName },
                  { key: "instagram", label: tr.fieldInsta },
                  { key: "price1", label: tr.fieldPrice1 },
                  { key: "price2", label: tr.fieldPrice2 },
                ] as { key: keyof Config; label: string }[]
              ).map(({ key, label }) => (
                <div key={key} style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 3 }}>{label}</label>
                  <input
                    value={state.config[key] as string}
                    onChange={(e) => setState({ ...state, config: { ...state.config, [key]: e.target.value } })}
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "Nunito,sans-serif", outline: "none" }}
                  />
                </div>
              ))}
            </div>

            <div style={{ background: "#fff", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontFamily: "Caveat,cursive", fontSize: 18, fontWeight: 700, color: "#1e3a8a", marginBottom: 8 }}>{tr.meetingTitle}</div>
              {state.meetingPoints.map((mp) => (
                <div key={mp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: 13, color: "#374151" }}>{mp.names[lang]}</span>
                  <button
                    onClick={() => setState({ ...state, meetingPoints: state.meetingPoints.map((m) => m.id === mp.id ? { ...m, active: !m.active } : m) })}
                    style={{ padding: "3px 10px", borderRadius: 12, border: "none", background: mp.active ? "#dcfce7" : "#f1f5f9", color: mp.active ? "#16a34a" : "#9ca3af", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    {mp.active ? tr.meetingActive : tr.meetingInactive}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MAP TAB */}
        {tab === "map" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480, margin: "0 auto" }}>
            <div style={{ fontFamily: "Caveat,cursive", fontSize: 20, fontWeight: 700, color: "#1e3a8a" }}>{tr.mapTitle}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{tr.mapSub}</div>
            <div style={{ borderRadius: 14, overflow: "hidden", height: 300, border: "1px solid #e2e8f0" }}>
              <MapContainer center={[-33.437, -70.644]} zoom={13} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {state.parks.map((park) => (
                  <Marker key={park.id} position={[park.lat, park.lng]}>
                    <Popup>
                      <strong>{park.emoji} {park.names[lang]}</strong><br />
                      {park.area}
                      <br />
                      <button onClick={() => setSelectedParkId(park.id)} style={{ marginTop: 4, padding: "4px 8px", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", fontSize: 11, cursor: "pointer" }}>
                        Seleccionar
                      </button>
                    </Popup>
                  </Marker>
                ))}
                {state.meetingPoints.filter((m) => m.active).map((mp) => (
                  <Marker key={mp.id} position={[mp.lat, mp.lng]}>
                    <Popup>{mp.names[lang]}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {state.parks.map((park) => (
                <button
                  key={park.id}
                  onClick={() => setSelectedParkId(selectedParkId === park.id ? null : park.id)}
                  style={{ padding: "7px 12px", borderRadius: 12, border: `1.5px solid ${selectedParkId === park.id ? "#2563eb" : "#e2e8f0"}`, background: selectedParkId === park.id ? "#eff6ff" : "#fff", color: selectedParkId === park.id ? "#1d4ed8" : "#374151", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  {park.emoji} {park.names[lang]}
                </button>
              ))}
            </div>
            {selectedParkId && (
              <button onClick={() => setSelectedParkId(null)} style={{ padding: "8px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, color: "#6b7280", cursor: "pointer" }}>
                ✕ {tr.clearPark}
              </button>
            )}
          </div>
        )}

        {/* ROI TAB */}
        {tab === "roi" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480, margin: "0 auto" }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontFamily: "Caveat,cursive", fontSize: 18, fontWeight: 700, color: "#1e3a8a", marginBottom: 12 }}>{tr.roiTitle}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{tr.roiToday}</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, background: "#f0f9ff", borderRadius: 12, padding: "12px", textAlign: "center" }}>
                  <div style={{ fontFamily: "Caveat,cursive", fontSize: 28, fontWeight: 700, color: "#0369a1" }}>{roiSingles}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>× $3.000</div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                    <button onClick={() => setRoiSingles((n) => Math.max(0, n - 1))} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 16, cursor: "pointer" }}>−</button>
                    <button onClick={() => setRoiSingles((n) => n + 1)} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "#0369a1", color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: 700 }}>+</button>
                  </div>
                  <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>{tr.roiAdd1}</div>
                </div>
                <div style={{ flex: 1, background: "#f5f3ff", borderRadius: 12, padding: "12px", textAlign: "center" }}>
                  <div style={{ fontFamily: "Caveat,cursive", fontSize: 28, fontWeight: 700, color: "#7c3aed" }}>{roiDoubles}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>× $5.000</div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                    <button onClick={() => setRoiDoubles((n) => Math.max(0, n - 1))} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 16, cursor: "pointer" }}>−</button>
                    <button onClick={() => setRoiDoubles((n) => n + 1)} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: 700 }}>+</button>
                  </div>
                  <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>{tr.roiAdd2}</div>
                </div>
              </div>
              <div style={{ background: "#f8faff", borderRadius: 10, padding: "10px 14px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{tr.roiTotal}</span>
                <span style={{ fontFamily: "Caveat,cursive", fontSize: 22, fontWeight: 700, color: "#16a34a" }}>${(roiSingles * 3000 + roiDoubles * 5000).toLocaleString("es-CL")}</span>
              </div>
              <textarea
                value={roiNotes}
                onChange={(e) => setRoiNotes(e.target.value)}
                placeholder={tr.roiNotes}
                rows={2}
                style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "Nunito,sans-serif", resize: "none", outline: "none", marginBottom: 10 }}
              />
              <button
                onClick={saveRoiSession}
                disabled={roiSingles === 0 && roiDoubles === 0}
                style={{ width: "100%", padding: "11px", borderRadius: 12, border: "none", background: roiSingles === 0 && roiDoubles === 0 ? "#e5e7eb" : "linear-gradient(135deg,#16a34a,#15803d)", color: roiSingles === 0 && roiDoubles === 0 ? "#9ca3af" : "#fff", fontWeight: 700, fontSize: 14, cursor: roiSingles === 0 && roiDoubles === 0 ? "default" : "pointer" }}
              >
                {tr.roiSave}
              </button>
            </div>
          </div>
        )}

        {/* APOYO TAB */}
        {tab === "apoyo" && (
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <ApoyoPanel
              lang={lang}
              totalPoints={state.totalPoints}
              addHistorial={addHistorial}
              tasks={state.tasks}
              setTasks={setTasks}
            />
          </div>
        )}

        {/* HISTORIAL TAB */}
        {tab === "historial" && (
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <HistorialPanel
              lang={lang}
              entries={state.historial}
              setEntries={setHistorial}
              totalPoints={state.totalPoints}
            />
          </div>
        )}
      </div>
    </div>
  )
}
