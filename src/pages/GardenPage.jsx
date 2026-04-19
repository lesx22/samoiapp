import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSeedsContext } from "../context/SeedsContext";

const ZONE_COLOR_PRESETS = [
  { label: "Green",  color: "rgba(34,197,94,0.38)",   borderColor: "rgba(21,128,61,0.85)" },
  { label: "Blue",   color: "rgba(59,130,246,0.38)",  borderColor: "rgba(29,78,216,0.85)" },
  { label: "Purple", color: "rgba(168,85,247,0.38)",  borderColor: "rgba(109,40,217,0.85)" },
  { label: "Orange", color: "rgba(249,115,22,0.38)",  borderColor: "rgba(194,65,12,0.85)" },
  { label: "Red",    color: "rgba(239,68,68,0.38)",   borderColor: "rgba(185,28,28,0.85)" },
  { label: "Yellow", color: "rgba(234,179,8,0.38)",   borderColor: "rgba(161,98,7,0.85)" },
  { label: "Pink",   color: "rgba(236,72,153,0.38)",  borderColor: "rgba(157,23,77,0.85)" },
  { label: "Teal",   color: "rgba(20,184,166,0.38)",  borderColor: "rgba(15,118,110,0.85)" },
];

function loadLS(key, def) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; }
  catch { return def; }
}

// Default image transform: rotate (deg), scale, x/y pan (px)
const DEFAULT_IMG = { r: 0, s: 1, x: 0, y: 0 };

const CORNERS = [
  { id: "nw", style: { top: -6,    left: -6,   cursor: "nw-resize" } },
  { id: "ne", style: { top: -6,    right: -6,  cursor: "ne-resize" } },
  { id: "sw", style: { bottom: -6, left: -6,   cursor: "sw-resize" } },
  { id: "se", style: { bottom: -6, right: -6,  cursor: "se-resize" } },
];

export default function GardenPage() {
  const navigate = useNavigate();
  const { zones, getSeedsByZone, createZone, updateZone, deleteZone, uploadGardenImage, gardenBgImage } = useSeedsContext();
  const [hoveredZone, setHoveredZone] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [zoneForm, setZoneForm] = useState(null); // null | { mode: "add"|"edit", zone?: zone }
  const [deleteModal, setDeleteModal] = useState(null); // null | zoneId
  const [imgUploading, setImgUploading] = useState(false);
  const imgUploadRef = useRef();

  // Zone positions: { left%, top%, width%, height%, rotate (deg) }
  const [positions, setPositions] = useState(() => loadLS("jardin-zone-positions", {}));

  // Image transform
  const [imgT, setImgT] = useState(() => loadLS("jardin-img-transform", DEFAULT_IMG));

  const containerRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => { localStorage.setItem("jardin-zone-positions", JSON.stringify(positions)); }, [positions]);
  useEffect(() => { localStorage.setItem("jardin-img-transform", JSON.stringify(imgT)); }, [imgT]);

  function getHotspot(zone) {
    const p = positions[zone.id];
    return p ?? { ...zone.hotspot, rotate: 0 };
  }

  // ── Unified mouse/touch move handler ──────────────────────────────────────
  const onMove = useCallback((clientX, clientY) => {
    const d = dragRef.current;
    if (!d) return;

    if (d.type === "imagePan") {
      setImgT(t => ({ ...t, x: d.startImgX + (clientX - d.startX), y: d.startImgY + (clientY - d.startY) }));
      return;
    }

    if (d.type === "zoneRotate") {
      const angle = Math.atan2(clientY - d.centerY, clientX - d.centerX) * 180 / Math.PI;
      const newRotate = d.startRotate + (angle - d.startAngle);
      setPositions(prev => {
        const cur = prev[d.zoneId] ?? {};
        return { ...prev, [d.zoneId]: { ...cur, rotate: newRotate } };
      });
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((clientX - d.startX) / rect.width) * 100;
    const dy = ((clientY - d.startY) / rect.height) * 100;
    const h = d.h;

    setPositions(prev => {
      let { left, top, width, height } = h;

      if (d.type === "move") {
        left  = Math.max(0, Math.min(100 - width,  left  + dx));
        top   = Math.max(0, Math.min(100 - height, top   + dy));
      } else {
        const c = d.corner;
        if (c === "se") { width = Math.max(4, width + dx); height = Math.max(4, height + dy); }
        if (c === "sw") { const w = Math.max(4, width - dx); left = left + (width - w); width = w; height = Math.max(4, height + dy); }
        if (c === "ne") { width = Math.max(4, width + dx); const hh = Math.max(4, height - dy); top = top + (height - hh); height = hh; }
        if (c === "nw") { const w = Math.max(4, width - dx); const hh = Math.max(4, height - dy); left = left + (width - w); top = top + (height - hh); width = w; height = hh; }
      }

      const cur = prev[d.zoneId] ?? {};
      return { ...prev, [d.zoneId]: { ...cur, left: `${left.toFixed(1)}%`, top: `${top.toFixed(1)}%`, width: `${width.toFixed(1)}%`, height: `${height.toFixed(1)}%` } };
    });
  }, []);

  const onMouseMove = useCallback((e) => onMove(e.clientX, e.clientY), [onMove]);
  const onTouchMove = useCallback((e) => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); }, [onMove]);

  const stopDrag = useCallback(() => {
    dragRef.current = null;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", stopDrag);
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", stopDrag);
  }, [onMouseMove, onTouchMove]);

  function attachDrag(isTouch) {
    if (isTouch) {
      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("touchend", stopDrag);
    } else {
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", stopDrag);
    }
  }

  function startZoneDrag(e, isTouch, zone, type, corner = null) {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    const hs = getHotspot(zone);
    dragRef.current = {
      type, corner, zoneId: zone.id,
      startX: clientX, startY: clientY,
      h: { left: parseFloat(hs.left), top: parseFloat(hs.top), width: parseFloat(hs.width), height: parseFloat(hs.height) },
    };
    attachDrag(isTouch);
  }

  function startRotateDrag(e, isTouch, zone) {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    const rect = containerRef.current.getBoundingClientRect();
    const hs = getHotspot(zone);
    const cx = rect.left + (parseFloat(hs.left) + parseFloat(hs.width) / 2) / 100 * rect.width;
    const cy = rect.top  + (parseFloat(hs.top)  + parseFloat(hs.height) / 2) / 100 * rect.height;
    dragRef.current = {
      type: "zoneRotate", zoneId: zone.id,
      centerX: cx, centerY: cy,
      startX: clientX, startY: clientY,
      startAngle: Math.atan2(clientY - cy, clientX - cx) * 180 / Math.PI,
      startRotate: hs.rotate ?? 0,
    };
    attachDrag(isTouch);
  }

  function startImagePan(e) {
    // Only fires if zones called stopPropagation — so this only triggers on bare image clicks
    if (!editMode) return;
    e.preventDefault();
    dragRef.current = {
      type: "imagePan",
      startX: e.clientX, startY: e.clientY,
      startImgX: imgT.x, startImgY: imgT.y,
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", stopDrag);
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-xl)" }}>
        <div>
          <h1 style={{ marginBottom: "var(--space-xs)" }}>Garden</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)" }}>
            {editMode
              ? "Drag zones to move · corners to resize · ↻ to rotate"
              : "Condé-en-Normandy — tap a zone to explore"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          {editMode && (
            <>
              <button
                className="btn-ghost"
                onClick={() => { setPositions({}); setImgT(DEFAULT_IMG); }}
                style={{ fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-md)", color: "var(--color-text-muted)" }}
              >
                Reset all
              </button>
              <button
                className="btn-secondary"
                onClick={() => setZoneForm({ mode: "add" })}
                style={{ fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-md)" }}
              >
                + Add zone
              </button>
            </>
          )}
          <button
            className={editMode ? "btn-primary" : "btn-secondary"}
            onClick={() => {
              if (editMode) {
                zones.forEach(zone => {
                  const p = positions[zone.id];
                  if (p) updateZone(zone.id, { hotspot: p });
                });
              }
              setEditMode(v => !v);
            }}
            style={{ fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-md)" }}
          >
            {editMode ? "Done" : "Edit zones"}
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: editMode ? "var(--space-md)" : "var(--space-xl)" }}>
        <div
          ref={containerRef}
          style={{ position: "relative", width: "100%", lineHeight: 0, overflow: "hidden", userSelect: "none" }}
          onMouseDown={startImagePan}
        >
          {/* Map image — rotatable, scalable, pannable */}
          <img
            src={gardenBgImage || "/garden-map.jpg"}
            alt="Property map"
            draggable={false}
            style={{
              width: "100%",
              display: "block",
              transformOrigin: "center center",
              transform: `translate(${imgT.x}px, ${imgT.y}px) rotate(${imgT.r}deg) scale(${imgT.s})`,
              cursor: editMode ? "grab" : "default",
              pointerEvents: editMode ? "auto" : "none",
            }}
          />

          {/* Zone overlays */}
          {zones.map(zone => {
            const hs = getHotspot(zone);
            const count = getSeedsByZone(zone.id).length;
            const isHovered = hoveredZone === zone.id;
            const rotation = hs.rotate ?? 0;

            return (
              <div
                key={zone.id}
                style={{
                  position: "absolute",
                  left: hs.left, top: hs.top,
                  width: hs.width, height: hs.height,
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                  cursor: editMode ? "move" : "pointer",
                }}
                onMouseDown={e => startZoneDrag(e, false, zone, "move")}
                onTouchStart={e => startZoneDrag(e, true, zone, "move")}
                onClick={() => !editMode && navigate(`/garden/${zone.id}`)}
                onMouseEnter={() => !editMode && setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
                aria-label={`${zone.name} — ${count} plant${count !== 1 ? "s" : ""}`}
              >
                {/* Zone fill */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: isHovered && !editMode
                    ? zone.color.replace("0.45","0.7").replace("0.38","0.65").replace("0.35","0.6").replace("0.4","0.65")
                    : zone.color,
                  border: editMode ? `2px dashed ${zone.borderColor}` : `2px solid ${zone.borderColor}`,
                  borderRadius: "var(--radius-sm)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                  padding: "var(--space-xs)",
                  backdropFilter: "blur(1px)",
                  transition: editMode ? "none" : "background 0.2s ease, transform 0.15s ease",
                  transform: isHovered && !editMode ? "scale(1.03)" : "scale(1)",
                }}>
                  <span style={{ fontSize: "1rem", lineHeight: 1 }}>{zone.emoji}</span>
                  <span style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "clamp(9px, 1.2vw, 13px)",
                    fontWeight: 700, color: "#fff",
                    textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                    textAlign: "center", lineHeight: 1.2, whiteSpace: "nowrap",
                  }}>
                    {zone.name}
                  </span>
                  {count > 0 && !editMode && (
                    <span style={{ background: "#fff", color: zone.borderColor, fontSize: "clamp(8px,1vw,11px)", fontWeight: 700, padding: "1px 5px", borderRadius: "100px", lineHeight: 1.4 }}>
                      {count}
                    </span>
                  )}
                </div>

                {/* Edit/delete buttons */}
                {editMode && (
                  <div style={{ position: "absolute", top: -28, right: 0, display: "flex", gap: 4, zIndex: 20 }}
                    onMouseDown={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); setZoneForm({ mode: "edit", zone }); }}
                      style={{ background: "#fff", border: `1.5px solid ${zone.borderColor}`, color: zone.borderColor, borderRadius: 4, fontSize: 11, fontWeight: 700, padding: "2px 6px", cursor: "pointer", lineHeight: 1.4, minHeight: "auto" }}
                    >✎</button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteModal(zone.id); }}
                      style={{ background: "#fff", border: "1.5px solid var(--color-error)", color: "var(--color-error)", borderRadius: 4, fontSize: 11, fontWeight: 700, padding: "2px 6px", cursor: "pointer", lineHeight: 1.4, minHeight: "auto" }}
                    >×</button>
                  </div>
                )}

                {/* Resize/rotate handles */}
                {editMode && <>
                  {/* Corner resize handles */}
                  {CORNERS.map(({ id, style }) => (
                    <div
                      key={id}
                      onMouseDown={e => startZoneDrag(e, false, zone, "resize", id)}
                      onTouchStart={e => startZoneDrag(e, true, zone, "resize", id)}
                      style={{
                        position: "absolute",
                        width: 12, height: 12,
                        background: "#fff",
                        border: `2px solid ${zone.borderColor}`,
                        borderRadius: 2,
                        zIndex: 10,
                        ...style,
                      }}
                    />
                  ))}

                  {/* Rotation handle — circle above centre with stem */}
                  <div
                    style={{
                      position: "absolute",
                      top: -30, left: "50%",
                      transform: "translateX(-50%)",
                      display: "flex", flexDirection: "column", alignItems: "center",
                      zIndex: 10, pointerEvents: "none",
                    }}
                  >
                    <div
                      onMouseDown={e => startRotateDrag(e, false, zone)}
                      onTouchStart={e => startRotateDrag(e, true, zone)}
                      style={{
                        width: 16, height: 16,
                        background: "#fff",
                        border: `2px solid ${zone.borderColor}`,
                        borderRadius: "50%",
                        cursor: "grab",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, color: zone.borderColor, fontWeight: 700,
                        pointerEvents: "auto",
                      }}
                    >
                      ↻
                    </div>
                    <div style={{ width: 1, height: 12, background: zone.borderColor }} />
                  </div>
                </>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Image controls — only in edit mode */}
      {editMode && (
        <div className="card" style={{ marginBottom: "var(--space-xl)", padding: "var(--space-md) var(--space-lg)" }}>
          <div style={{ fontSize: "var(--text-nav)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-md)" }}>
            Map image
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xl)", alignItems: "center" }}>

            {/* Rotation */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
              <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", width: 46 }}>Rotate</span>
              {[{ label: "−15°", d: -15 }, { label: "−1°", d: -1 }, { label: "+1°", d: 1 }, { label: "+15°", d: 15 }].map(({ label, d }) => (
                <button key={label} className="btn-ghost" onClick={() => setImgT(t => ({ ...t, r: t.r + d }))}
                  style={{ minHeight: "auto", padding: "var(--space-xs) var(--space-sm)", fontSize: "var(--text-small)" }}>
                  {label}
                </button>
              ))}
              <span style={{ fontSize: "var(--text-small)", fontWeight: 600, minWidth: 36, textAlign: "center" }}>
                {imgT.r.toFixed(1)}°
              </span>
            </div>

            {/* Scale */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
              <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", width: 46 }}>Scale</span>
              {[{ label: "−10%", d: -0.1 }, { label: "−1%", d: -0.01 }, { label: "+1%", d: 0.01 }, { label: "+10%", d: 0.1 }].map(({ label, d }) => (
                <button key={label} className="btn-ghost" onClick={() => setImgT(t => ({ ...t, s: Math.max(0.3, Math.min(4, t.s + d)) }))}
                  style={{ minHeight: "auto", padding: "var(--space-xs) var(--space-sm)", fontSize: "var(--text-small)" }}>
                  {label}
                </button>
              ))}
              <span style={{ fontSize: "var(--text-small)", fontWeight: 600, minWidth: 40, textAlign: "center" }}>
                {Math.round(imgT.s * 100)}%
              </span>
            </div>

            {/* Drag hint + reset + upload */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginLeft: "auto" }}>
              <span style={{ fontSize: "var(--text-nav)", color: "var(--color-text-muted)" }}>Drag image to pan</span>
              <button className="btn-ghost" onClick={() => setImgT(DEFAULT_IMG)}
                style={{ minHeight: "auto", padding: "var(--space-xs) var(--space-md)", fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
                Reset view
              </button>
              <input ref={imgUploadRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                const file = e.target.files[0];
                if (!file) return;
                setImgUploading(true);
                try { await uploadGardenImage(file); } catch (err) { alert("Upload failed: " + err.message); }
                setImgUploading(false);
                e.target.value = "";
              }} />
              <button className="btn-secondary" onClick={() => imgUploadRef.current.click()} disabled={imgUploading}
                style={{ minHeight: "auto", padding: "var(--space-xs) var(--space-md)", fontSize: "var(--text-small)" }}>
                {imgUploading ? "Uploading…" : "📷 Change image"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zone list */}
      <h2 style={{ marginBottom: "var(--space-lg)" }}>Zones</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        {zones.map(zone => {
          const seeds = getSeedsByZone(zone.id);
          return (
            <div
              key={zone.id}
              className="card"
              onClick={() => !editMode && navigate(`/garden/${zone.id}`)}
              style={{ cursor: editMode ? "default" : "pointer", display: "flex", alignItems: "center", gap: "var(--space-lg)", borderLeft: `4px solid ${zone.borderColor}` }}
              onMouseEnter={e => { if (!editMode) e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)"; }}
              onMouseLeave={e => e.currentTarget.style.boxShadow = ""}
            >
              <span style={{ fontSize: "2rem", lineHeight: 1, flexShrink: 0 }}>{zone.emoji}</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ marginBottom: "2px" }}>{zone.name}</h3>
                <p style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", margin: 0 }}>{zone.description}</p>
              </div>
              {editMode ? (
                <div style={{ display: "flex", gap: "var(--space-sm)", flexShrink: 0 }}>
                  <button className="btn-ghost" onClick={() => setZoneForm({ mode: "edit", zone })} style={{ fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-sm)" }}>✎ Edit</button>
                  <button onClick={() => setDeleteModal(zone.id)} style={{ background: "none", border: "1px solid var(--color-error)", color: "var(--color-error)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-sm)", cursor: "pointer" }}>Delete</button>
                </div>
              ) : (
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-h2)", fontWeight: 700, color: zone.borderColor, lineHeight: 1 }}>{seeds.length}</div>
                  <div style={{ fontSize: "var(--text-nav)", color: "var(--color-text-muted)" }}>plant{seeds.length !== 1 ? "s" : ""}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Zone form modal */}
      {zoneForm && (
        <ZoneFormModal
          mode={zoneForm.mode}
          zone={zoneForm.zone}
          onSave={async (data) => {
            if (zoneForm.mode === "add") {
              const newZone = await createZone({ ...data, hotspot: { left: "35%", top: "35%", width: "20%", height: "15%", rotate: 0 } });
            } else {
              await updateZone(zoneForm.zone.id, data);
            }
            setZoneForm(null);
          }}
          onClose={() => setZoneForm(null)}
        />
      )}

      {/* Delete zone modal */}
      {deleteModal && (
        <DeleteZoneModal
          zone={zones.find(z => z.id === deleteModal)}
          plantCount={getSeedsByZone(deleteModal).length}
          onConfirm={async (deletePlants) => {
            await deleteZone(deleteModal, { deletePlants });
            setDeleteModal(null);
          }}
          onClose={() => setDeleteModal(null)}
        />
      )}
    </div>
  );
}

// ─── Zone Form Modal ──────────────────────────────────────────────────────────

function ZoneFormModal({ mode, zone, onSave, onClose }) {
  const [name, setName] = useState(zone?.name ?? "");
  const [emoji, setEmoji] = useState(zone?.emoji ?? "🌿");
  const [description, setDescription] = useState(zone?.description ?? "");
  const [selectedColor, setSelectedColor] = useState(
    zone ? ZONE_COLOR_PRESETS.find(p => p.color === zone.color) ?? ZONE_COLOR_PRESETS[0] : ZONE_COLOR_PRESETS[0]
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), emoji, description: description.trim(), color: selectedColor.color, borderColor: selectedColor.borderColor });
    setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-xl)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-xl)" }}>
          <h2>{mode === "add" ? "Add Zone" : "Edit Zone"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--color-text-muted)", minHeight: "auto", padding: "var(--space-xs)", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "flex", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
          <div style={{ flex: "0 0 80px" }}>
            <label style={{ display: "block", fontSize: "var(--text-small)", fontWeight: 600, marginBottom: "var(--space-sm)" }}>Emoji</label>
            <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)} style={{ textAlign: "center", fontSize: "1.5rem", padding: "var(--space-sm)" }} maxLength={2} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "var(--text-small)", fontWeight: 600, marginBottom: "var(--space-sm)" }}>Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Potager, Ball Court Beds" autoFocus />
          </div>
        </div>

        <div style={{ marginBottom: "var(--space-lg)" }}>
          <label style={{ display: "block", fontSize: "var(--text-small)", fontWeight: 600, marginBottom: "var(--space-sm)" }}>Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description of this zone" />
        </div>

        <div style={{ marginBottom: "var(--space-xl)" }}>
          <label style={{ display: "block", fontSize: "var(--text-small)", fontWeight: 600, marginBottom: "var(--space-sm)" }}>Colour</label>
          <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
            {ZONE_COLOR_PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => setSelectedColor(preset)}
                title={preset.label}
                style={{
                  width: 32, height: 32, borderRadius: "var(--radius-sm)",
                  background: preset.color,
                  border: selectedColor.label === preset.label ? `3px solid ${preset.borderColor}` : `2px solid ${preset.borderColor}`,
                  cursor: "pointer", minHeight: "auto", padding: 0,
                  transform: selectedColor.label === preset.label ? "scale(1.2)" : "scale(1)",
                  transition: "transform 0.1s ease",
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={!name.trim() || saving} style={{ flex: 1, justifyContent: "center" }}>
            {saving ? "Saving…" : mode === "add" ? "Add Zone" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Zone Modal ────────────────────────────────────────────────────────

function DeleteZoneModal({ zone, plantCount, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm(deletePlants) {
    setDeleting(true);
    await onConfirm(deletePlants);
    setDeleting(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-xl)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: "100%", maxWidth: 420 }}>
        <h2 style={{ marginBottom: "var(--space-sm)" }}>Delete {zone?.name}?</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)", marginBottom: "var(--space-xl)" }}>
          This cannot be undone. {plantCount > 0 ? `This zone has ${plantCount} plant${plantCount !== 1 ? "s" : ""}.` : ""}
        </p>

        {plantCount > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", marginBottom: "var(--space-xl)" }}>
            <button
              onClick={() => handleConfirm(false)}
              disabled={deleting}
              style={{ padding: "var(--space-md)", background: "var(--color-bg)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", cursor: "pointer", textAlign: "left", minHeight: "auto" }}
            >
              <div style={{ fontWeight: 600, fontSize: "var(--text-body)", marginBottom: 2 }}>Keep plants, remove from zone</div>
              <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>Plants stay in your garden but become unassigned</div>
            </button>
            <button
              onClick={() => handleConfirm(true)}
              disabled={deleting}
              style={{ padding: "var(--space-md)", background: "rgba(192,57,43,0.05)", border: "1.5px solid var(--color-error)", borderRadius: "var(--radius-sm)", cursor: "pointer", textAlign: "left", minHeight: "auto" }}
            >
              <div style={{ fontWeight: 600, fontSize: "var(--text-body)", color: "var(--color-error)", marginBottom: 2 }}>Delete zone and all plants</div>
              <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>Permanently deletes the zone and {plantCount} plant{plantCount !== 1 ? "s" : ""}</div>
            </button>
          </div>
        )}

        {plantCount === 0 && (
          <button
            className="btn-primary"
            onClick={() => handleConfirm(false)}
            disabled={deleting}
            style={{ width: "100%", justifyContent: "center", marginBottom: "var(--space-md)", background: "var(--color-error)", borderColor: "var(--color-error)" }}
          >
            {deleting ? "Deleting…" : "Delete zone"}
          </button>
        )}

        <button className="btn-ghost" onClick={onClose} style={{ width: "100%", justifyContent: "center" }}>Cancel</button>
      </div>
    </div>
  );
}
