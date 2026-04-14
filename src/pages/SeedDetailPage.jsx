import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSeedsContext } from "../context/SeedsContext";
import { badge, MONTHS, TODAY_M } from "../data/garden";
import { chatAboutPlant } from "../lib/claude";
import { ZONES, getZone } from "../data/zones";

const DETAIL_TABS = ["Overview", "Today", "Diary", "Chat"];

export default function SeedDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getSeed, removeSeed, assignZone, addDiaryEntry, getDiaryEntries, loadDiaryEntries } = useSeedsContext();

  useEffect(() => {
    if (id) loadDiaryEntries(id);
  }, [id]);
  const [activeTab, setActiveTab] = useState(0);
  const seed = getSeed(id);

  if (!seed) {
    return (
      <div className="page" style={{ textAlign: "center", padding: "var(--space-2xl) 0" }}>
        <p style={{ color: "var(--color-text-muted)" }}>Seed not found.</p>
        <button className="btn-secondary" onClick={() => navigate("/seeds")} style={{ marginTop: "var(--space-md)" }}>
          Back to Seeds
        </button>
      </div>
    );
  }

  if (seed.loading) {
    return (
      <div className="page">
        <button className="btn-ghost" onClick={() => navigate("/seeds")} style={{ fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-md)", marginBottom: "var(--space-lg)" }}>
          ← Seeds
        </button>
        <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "flex-start", marginBottom: "var(--space-xl)" }}>
          <span style={{ fontSize: "3rem", lineHeight: 1 }}>🌱</span>
          <div>
            <h1 style={{ fontSize: "var(--text-h2)", marginBottom: "var(--space-xs)" }}>{seed.name}</h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)", margin: 0 }} className="animate-pulse">Identifying plant…</p>
          </div>
        </div>
        {["Plant name and variety", "Growing calendar", "Normandy advice", "YouTube guides"].map(label => (
          <div key={label} className="card" style={{ marginBottom: "var(--space-md)", opacity: 0.55 }}>
            <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", marginBottom: "var(--space-xs)" }} className="animate-pulse">{label}</div>
            <div style={{ height: 3, background: "var(--color-border)", borderRadius: 2, overflow: "hidden" }}>
              <div className="animate-pulse" style={{ height: "100%", width: "55%", background: "var(--color-green)", borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (seed.fetchError) {
    return (
      <div className="page">
        <button className="btn-ghost" onClick={() => navigate("/seeds")} style={{ fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-md)", marginBottom: "var(--space-lg)" }}>
          ← Seeds
        </button>
        <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "flex-start", marginBottom: "var(--space-xl)" }}>
          <span style={{ fontSize: "3rem", lineHeight: 1 }}>⚠️</span>
          <div>
            <h1 style={{ fontSize: "var(--text-h2)", marginBottom: "var(--space-xs)" }}>{seed.name}</h1>
            <p style={{ color: "var(--color-error)", fontSize: "var(--text-small)", margin: 0 }}>{seed.fetchError}</p>
          </div>
        </div>
        <button className="btn-secondary" onClick={() => navigate("/seeds")}>Back to Seeds</button>
      </div>
    );
  }

  const b = badge(seed);

  return (
    <div className="page">
      {/* Back + remove */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-lg)" }}>
        <button className="btn-ghost" onClick={() => navigate("/seeds")} style={{ fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-md)" }}>
          ← Seeds
        </button>
        <button
          onClick={() => { removeSeed(id); navigate("/seeds"); }}
          style={{ fontSize: "var(--text-small)", background: "none", border: "1px solid var(--color-error)", color: "var(--color-error)", borderRadius: "var(--radius-sm)", padding: "var(--space-xs) var(--space-md)", minHeight: "auto", cursor: "pointer" }}
        >
          Remove
        </button>
      </div>

      {/* Hero */}
      <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "flex-start", marginBottom: "var(--space-xl)" }}>
        <span style={{ fontSize: "3rem", lineHeight: 1 }}>{seed.emoji || "🌱"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-sm)", flexWrap: "wrap", marginBottom: "var(--space-xs)" }}>
            <h1 style={{ fontSize: "var(--text-h2)" }}>{seed.name}</h1>
            {seed.variety && seed.variety !== "Standard" && (
              <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--color-green)", fontSize: "var(--text-body)" }}>
                '{seed.variety}'
              </span>
            )}
          </div>
          <span style={{
            display: "inline-block",
            fontSize: "var(--text-nav)",
            fontWeight: 700,
            color: b.color,
            border: `1.5px solid ${b.color}`,
            borderRadius: "100px",
            padding: "2px var(--space-sm)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            {b.t}
          </span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{
        display: "flex",
        borderBottom: "1.5px solid var(--color-border)",
        marginBottom: "var(--space-xl)",
        overflowX: "auto",
      }}>
        {DETAIL_TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === i ? "3px solid var(--color-green)" : "3px solid transparent",
              color: activeTab === i ? "var(--color-green)" : "var(--color-text-muted)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-small)",
              fontWeight: 600,
              padding: "var(--space-sm) var(--space-md)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              minHeight: "auto",
              marginBottom: "-1.5px",
              transition: "color 0.15s ease",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Enriching banner — full detail still loading in background */}
      {seed.enriching && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", background: "var(--color-green-pale)", border: "1.5px solid var(--color-green)", borderRadius: "var(--radius-sm)", padding: "var(--space-sm) var(--space-md)", marginBottom: "var(--space-lg)" }}>
          <div className="animate-spin" style={{ width: 14, height: 14, border: "2px solid var(--color-green)", borderTop: "2px solid transparent", borderRadius: "50%", flexShrink: 0 }} />
          <span style={{ fontSize: "var(--text-small)", color: "var(--color-green)", fontWeight: 500 }}>Loading growing guides, YouTube videos and Normandy advice…</span>
        </div>
      )}

      {/* Tab content */}
      {activeTab === 0 && <OverviewTab seed={seed} assignZone={assignZone} />}
      {activeTab === 1 && <TodayTab seed={seed} />}
      {activeTab === 2 && <DiaryTab seedId={id} seed={seed} addDiaryEntry={addDiaryEntry} getDiaryEntries={getDiaryEntries} />}
      {activeTab === 3 && <ChatTab seed={seed} />}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ seed, assignZone }) {
  const [showZonePicker, setShowZonePicker] = useState(false);
  const currentZone = seed.zoneId ? getZone(seed.zoneId) : null;

  return (
    <div>
      {/* Garden zone */}
      <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: (currentZone && !showZonePicker) ? 0 : "var(--space-md)" }}>
          <div style={{ fontSize: "var(--text-nav)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Garden Zone</div>
          {currentZone && !showZonePicker && (
            <button className="btn-ghost" onClick={() => setShowZonePicker(true)} style={{ fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-sm)" }}>Change</button>
          )}
        </div>

        {!showZonePicker && (
          currentZone ? (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
              <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>{currentZone.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: "var(--text-body)" }}>{currentZone.name}</div>
                <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>{currentZone.description}</div>
              </div>
            </div>
          ) : (
            <button className="btn-ghost" onClick={() => setShowZonePicker(true)} style={{ width: "100%", justifyContent: "center", display: "flex", fontSize: "var(--text-small)" }}>
              + Assign to a zone
            </button>
          )
        )}

        {showZonePicker && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            {ZONES.map(zone => (
              <button
                key={zone.id}
                onClick={() => { assignZone(seed.id, zone.id); setShowZonePicker(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: "var(--space-md)",
                  padding: "var(--space-sm) var(--space-md)",
                  background: seed.zoneId === zone.id ? zone.color : "var(--color-bg)",
                  border: `2px solid ${zone.borderColor}`,
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer", textAlign: "left", width: "100%",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={e => { if (seed.zoneId !== zone.id) e.currentTarget.style.background = zone.color; }}
                onMouseLeave={e => { if (seed.zoneId !== zone.id) e.currentTarget.style.background = "var(--color-bg)"; }}
              >
                <span style={{ fontSize: "1.25rem", lineHeight: 1, flexShrink: 0 }}>{zone.emoji}</span>
                <span style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "var(--text-small)", flex: 1 }}>{zone.name}</span>
                {seed.zoneId === zone.id && <span style={{ color: zone.borderColor, fontWeight: 700, fontSize: "var(--text-small)" }}>✓</span>}
              </button>
            ))}
            <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-xs)" }}>
              {seed.zoneId && (
                <button className="btn-ghost" onClick={() => { assignZone(seed.id, null); setShowZonePicker(false); }} style={{ fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-sm)", color: "var(--color-text-muted)" }}>
                  Remove zone
                </button>
              )}
              <button className="btn-ghost" onClick={() => setShowZonePicker(false)} style={{ fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-sm)" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Provider link */}
      {seed.brandWebsite && (
        <div className="card" style={{ marginBottom: "var(--space-lg)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-md)", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "var(--text-nav)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Seed Provider</div>
            <div style={{ fontSize: "var(--text-body)", fontWeight: 600 }}>{seed.brand}</div>
          </div>
          <a href={seed.brandWebsite} target="_blank" rel="noreferrer" className="btn-secondary" style={{ textDecoration: "none", fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-md)", display: "inline-flex", alignItems: "center" }}>
            View product page ↗
          </a>
        </div>
      )}

      {/* Description */}
      {seed.description && (
        <div style={{ marginBottom: "var(--space-xl)" }}>
          <p style={{ fontSize: "var(--text-body)", lineHeight: 1.7 }}>{seed.description}</p>
        </div>
      )}

      {/* Key stats */}
      <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
        <h3 style={{ marginBottom: "var(--space-md)" }}>Key Facts</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
          {[
            ["Days to maturity", seed.daysToMaturity],
            ["Zone", seed.zoneCompatibility],
            ["Start method", seed.startMethod],
            ["Germination temp", seed.germinationTempC],
            ["Germination time", seed.germinationDays],
            ["Scientific name", seed.scientific],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: "var(--text-nav)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{label}</div>
              <div style={{ fontSize: "var(--text-body)", fontWeight: 500, fontStyle: label === "Scientific name" ? "italic" : "normal" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Planting calendar */}
      <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
        <h3 style={{ marginBottom: "var(--space-md)" }}>Planting Calendar</h3>
        <MonthBar months={seed.sowMonths} color="var(--color-green)" label="Sow" />
        <MonthBar months={seed.transplantMonths} color="#1d4ed8" label="Transplant" />
        <MonthBar months={seed.harvestMonths} color="#b45309" label="Harvest" />
      </div>

      {/* Companions */}
      {(seed.companions?.length > 0 || seed.avoid?.length > 0) && (
        <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
          <h3 style={{ marginBottom: "var(--space-md)" }}>Companion Planting</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xs)" }}>
            {seed.companions?.map(c => (
              <span key={c} className="tag" style={{ background: "var(--color-green-pale)", color: "var(--color-green)" }}>✓ {c}</span>
            ))}
            {seed.avoid?.map(c => (
              <span key={c} className="tag" style={{ background: "rgba(192,57,43,0.08)", color: "var(--color-error)" }}>✗ {c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Video resources */}
      {seed.youtubeVideos?.length > 0 && (
        <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
          <h3 style={{ marginBottom: "var(--space-md)" }}>Video Guides</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {seed.youtubeVideos.map((v, i) => (
              <a key={i} href={v.url} target="_blank" rel="noreferrer" style={{
                display: "flex",
                gap: "var(--space-md)",
                alignItems: "flex-start",
                padding: "var(--space-md)",
                background: "rgba(220,0,0,0.04)",
                border: "1.5px solid rgba(220,0,0,0.15)",
                borderRadius: "var(--radius-sm)",
                textDecoration: "none",
              }}>
                <div style={{ width: 36, height: 36, background: "#c00", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1rem", flexShrink: 0 }}>▶</div>
                <div>
                  <div style={{ fontSize: "var(--text-small)", fontWeight: 600, color: "var(--color-text)", marginBottom: "2px" }}>{v.title}</div>
                  <div style={{ fontSize: "var(--text-nav)", color: "var(--color-text-muted)" }}>{v.why}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {seed.sources?.length > 0 && (
        <div style={{ marginBottom: "var(--space-lg)" }}>
          <div style={{ fontSize: "var(--text-nav)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-sm)" }}>Sources</div>
          {seed.sources.map((s, i) => (
            <a key={i} href={s} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: "var(--text-small)", color: "var(--color-green)", marginBottom: 4, wordBreak: "break-all" }}>↗ {s}</a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Today Tab ────────────────────────────────────────────────────────────────

function TodayTab({ seed }) {
  const b = badge(seed);
  return (
    <div>
      {/* Status */}
      <div className="card" style={{ marginBottom: "var(--space-lg)", borderLeft: `4px solid ${b.color}` }}>
        <div style={{ fontSize: "var(--text-nav)", fontWeight: 700, color: b.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-sm)" }}>
          {b.t}
        </div>
        <p style={{ fontSize: "var(--text-body)", lineHeight: 1.7, margin: 0 }}>{seed.currentAdvice}</p>
      </div>

      {/* Immediate next step */}
      {seed.immediateNextStep && (
        <div className="card" style={{ marginBottom: "var(--space-lg)", background: "var(--color-green-pale)", borderColor: "var(--color-green)" }}>
          <div style={{ fontSize: "var(--text-nav)", fontWeight: 700, color: "var(--color-green)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-sm)" }}>
            Next step today
          </div>
          <p style={{ fontSize: "var(--text-body)", lineHeight: 1.7, margin: 0, fontWeight: 500 }}>{seed.immediateNextStep}</p>
        </div>
      )}

      {/* Indoor care if relevant */}
      {seed.indoorCare && (
        <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
          <h3 style={{ marginBottom: "var(--space-md)" }}>Indoor Care Right Now</h3>
          <InfoRow label="Temperature" value={seed.indoorCare.temperature} />
          <InfoRow label="Light" value={seed.indoorCare.light} />
          <InfoRow label="Watering" value={seed.indoorCare.watering} />
          <InfoRow label="Fertilizing" value={seed.indoorCare.fertilizing} />
          {seed.indoorCare.notes && (
            <p style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", fontStyle: "italic", borderLeft: "2px solid var(--color-border)", paddingLeft: "var(--space-md)", marginTop: "var(--space-md)", lineHeight: 1.6 }}>
              {seed.indoorCare.notes}
            </p>
          )}
        </div>
      )}

      {/* Hardening off */}
      {seed.hardeningOff && (
        <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
          <h3 style={{ marginBottom: "var(--space-md)" }}>Hardening Off</h3>
          <InfoRow label="Duration" value={seed.hardeningOff.durationDays ? `${seed.hardeningOff.durationDays} days` : null} />
          <InfoRow label="Min. night temp" value={seed.hardeningOff.minNightTempC != null ? `${seed.hardeningOff.minNightTempC}°C` : null} />
          <p style={{ fontSize: "var(--text-body)", lineHeight: 1.7, marginTop: "var(--space-md)" }}>{seed.hardeningOff.method}</p>
          {seed.hardeningOff.warnings && (
            <div style={{ background: "rgba(192,57,43,0.06)", border: "1.5px solid rgba(192,57,43,0.2)", borderRadius: "var(--radius-sm)", padding: "var(--space-md)", marginTop: "var(--space-md)" }}>
              <div style={{ fontSize: "var(--text-nav)", fontWeight: 700, color: "var(--color-error)", marginBottom: "var(--space-xs)" }}>Warning</div>
              <p style={{ fontSize: "var(--text-small)", color: "var(--color-text)", margin: 0, lineHeight: 1.6 }}>{seed.hardeningOff.warnings}</p>
            </div>
          )}
        </div>
      )}

      {/* Transplanting */}
      {seed.transplanting && (
        <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
          <h3 style={{ marginBottom: "var(--space-md)" }}>Transplanting</h3>
          <InfoRow label="Target date" value={seed.transplanting.targetDate} />
          <InfoRow label="Min. soil temp" value={seed.transplanting.soilTempMinC != null ? `${seed.transplanting.soilTempMinC}°C` : null} />
          <InfoRow label="Spacing" value={seed.transplanting.spacing} />
          <InfoRow label="Row spacing" value={seed.transplanting.rowSpacing} />
          {seed.transplanting.technique && <p style={{ fontSize: "var(--text-body)", lineHeight: 1.7, marginTop: "var(--space-md)" }}>{seed.transplanting.technique}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Diary Tab ────────────────────────────────────────────────────────────────

function DiaryTab({ seedId, seed, addDiaryEntry, getDiaryEntries }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const entries = getDiaryEntries(seedId);
  const fileRef = useRef();

  function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    addDiaryEntry(seedId, { text: text.trim(), photo: null });
    setText("");
    setSaving(false);
  }

  return (
    <div>
      {/* New entry */}
      <div className="card" style={{ marginBottom: "var(--space-xl)" }}>
        <h3 style={{ marginBottom: "var(--space-md)" }}>Add a note</h3>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What happened with your plant today?"
          rows={3}
          style={{ marginBottom: "var(--space-md)", resize: "vertical" }}
        />
        <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} />
          <button className="btn-ghost" onClick={() => fileRef.current.click()} style={{ fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-md)" }}>
            📷 Add photo
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!text.trim() || saving}
            style={{ fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-lg)" }}
          >
            Save entry
          </button>
        </div>
      </div>

      {/* Entry list */}
      {entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "var(--space-2xl) 0", color: "var(--color-text-muted)" }}>
          <p>No diary entries yet. Add your first note above.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          {entries.map(entry => (
            <div key={entry.id} className="card">
              <div style={{ fontSize: "var(--text-nav)", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "var(--space-sm)" }}>
                {new Date(entry.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <p style={{ fontSize: "var(--text-body)", lineHeight: 1.7, margin: 0 }}>{entry.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

function ChatTab({ seed }) {
  const storageKey = `jardin-chat-${seed.id}`;
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  const isFirstVisit = messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages)); }
    catch { /* storage full */ }
  }, [messages, storageKey]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const reply = await chatAboutPlant(seed.name, newMessages.map(m => ({
        role: m.role,
        content: m.content,
      })));
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `Sorry, I couldn't reach the AI. (${err.message})` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Opening message */}
      {isFirstVisit && (
        <div className="card" style={{ marginBottom: "var(--space-lg)", background: "var(--color-green-pale)", borderColor: "var(--color-green)" }}>
          <p style={{ fontSize: "var(--text-body)", lineHeight: 1.7, margin: 0, color: "var(--color-green)" }}>
            Hi, I'm your assistant for {seed.name}{seed.variety && seed.variety !== "Standard" ? ` '${seed.variety}'` : ""}. Ask me anything about growing this plant in your garden.
          </p>
        </div>
      )}

      {/* Message history */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", marginBottom: "var(--space-lg)", minHeight: 100 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            <div style={{
              maxWidth: "85%",
              padding: "var(--space-md) var(--space-lg)",
              borderRadius: msg.role === "user" ? "var(--radius-md) var(--radius-md) var(--space-xs) var(--radius-md)" : "var(--radius-md) var(--radius-md) var(--radius-md) var(--space-xs)",
              background: msg.role === "user" ? "var(--color-green)" : "var(--color-border)",
              color: msg.role === "user" ? "#fff" : "var(--color-text)",
              fontSize: "var(--text-body)",
              lineHeight: 1.6,
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "var(--space-md) var(--space-lg)", background: "var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-body)", color: "var(--color-text-muted)" }}>
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: "var(--space-sm)", position: "sticky", bottom: "calc(var(--bottom-nav-height) + var(--space-md))" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={`Ask about your ${seed.name}...`}
          style={{ flex: 1 }}
          disabled={loading}
        />
        <button
          className="btn-primary"
          onClick={send}
          disabled={!input.trim() || loading}
          style={{ flexShrink: 0, fontSize: "var(--text-small)", padding: "var(--space-sm) var(--space-lg)" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function MonthBar({ months, color, label }) {
  if (!months?.length) return null;
  return (
    <div style={{ marginBottom: "var(--space-md)" }}>
      <div style={{ fontSize: "var(--text-nav)", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "var(--space-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        {MONTHS.map((m, i) => {
          const on = months.includes(i + 1);
          const now = i + 1 === TODAY_M;
          return (
            <div key={m} title={m} style={{
              width: 28, height: 28, borderRadius: 5,
              background: on ? color : "var(--color-border)",
              border: now ? "2px solid var(--color-green)" : "2px solid transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "11px", fontWeight: 700,
              color: on ? "#fff" : "var(--color-text-muted)",
            }}>
              {m[0]}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: "var(--space-sm)" }}>
      <span style={{ fontSize: "var(--text-small)", fontWeight: 600, color: "var(--color-text-muted)" }}>{label}: </span>
      <span style={{ fontSize: "var(--text-small)", color: "var(--color-text)" }}>{value}</span>
    </div>
  );
}
