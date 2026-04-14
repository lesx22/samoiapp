import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSeedsContext } from "../context/SeedsContext";
import { badge } from "../data/garden";

// ─── Color palette for dots ───────────────────────────────────────────────────

const COLOR_DOTS = {
  "Pink":            "#f9a8d4",
  "Coral pink":      "#fb7185",
  "White":           "#e5e7eb",
  "Yellow":          "#fde047",
  "Orange":          "#fb923c",
  "Black":           "#374151",
  "Multi":           "linear-gradient(135deg, #f9a8d4 0%, #fde047 50%, #86efac 100%)",
  "Green":           "#86efac",
  "Red":             "#f87171",
  "Purple":          "#c084fc",
  "Blue":            "#60a5fa",
  "Grey":            "#9ca3af",
  "Lavender/Purple": "#a78bfa",
};

// ─── SelectWithCaret ──────────────────────────────────────────────────────────
// Wraps a <select> in a relative div and overlays a ▾ caret at a fixed right
// offset — reliable on every browser, no data-URL encoding needed.

function SelectWithCaret({ selectStyle, wrapStyle, value, onChange, children }) {
  return (
    <div style={{ position: "relative", display: "inline-block", ...wrapStyle }}>
      <select
        value={value}
        onChange={onChange}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          cursor: "pointer",
          paddingRight: "2rem",
          ...selectStyle,
        }}
      >
        {children}
      </select>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          fontSize: "24px",
          color: value ? "var(--color-green)" : "var(--color-text-muted)",
          lineHeight: 1,
        }}
      >
        ▾
      </span>
    </div>
  );
}

// ─── Responsive width hook ────────────────────────────────────────────────────

function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return width;
}

// ─── Sort order for status ────────────────────────────────────────────────────

const STATUS_ORDER = { "SOW NOW": 0, "TRANSPLANT NOW": 1, "HARVEST NOW": 2, "SEASON DONE": 99 };

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SeedsPage({ onUpload }) {
  const { seeds } = useSeedsContext();
  const navigate = useNavigate();
  const width = useWindowWidth();
  const isDesktop = width >= 768;

  // View — persisted across sessions
  const [view, setView] = useState(() => localStorage.getItem("jardin-view") || "list");

  // Filters — session only, reset on page load
  const [search, setSearch]                   = useState("");
  const [filterCategory, setFilterCategory]   = useState("");
  const [filterPlantType, setFilterPlantType] = useState("");
  const [filterColor, setFilterColor]         = useState("");
  const [filterStatus, setFilterStatus]       = useState("");
  const [filterZone, setFilterZone]           = useState("");
  const [sort, setSort]                       = useState("newest");
  const [showFilters, setShowFilters]         = useState(false);

  // Derived filter options — only what's present in the data
  const categories = useMemo(
    () => [...new Set(seeds.map(s => s.category).filter(Boolean))].sort(),
    [seeds],
  );
  const plantTypes = useMemo(
    () => [...new Set(seeds.map(s => s.plantType).filter(Boolean))].sort(),
    [seeds],
  );
  const colors = useMemo(
    () => [...new Set(seeds.map(s => s.color).filter(Boolean))],
    [seeds],
  );
  const zones = useMemo(
    () => [...new Set(seeds.map(s => s.zoneId).filter(Boolean))].sort(),
    [seeds],
  );
  const statuses = useMemo(
    () => [...new Set(seeds.map(s => badge(s).t))],
    [seeds],
  );

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let r = seeds;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.variety?.toLowerCase().includes(q) ||
        s.brand?.toLowerCase().includes(q),
      );
    }
    if (filterCategory)  r = r.filter(s => s.category === filterCategory);
    if (filterPlantType) r = r.filter(s => s.plantType === filterPlantType);
    if (filterColor)     r = r.filter(s => s.color === filterColor);
    if (filterStatus)   r = r.filter(s => badge(s).t === filterStatus);
    if (filterZone)     r = r.filter(s => s.zoneId === filterZone);

    r = [...r];
    if (sort === "newest") {
      r.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    } else if (sort === "az") {
      r.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sort === "status") {
      r.sort((a, b) => {
        const ao = STATUS_ORDER[badge(a).t] ?? 50;
        const bo = STATUS_ORDER[badge(b).t] ?? 50;
        return ao !== bo ? ao - bo : (a.name || "").localeCompare(b.name || "");
      });
    } else if (sort === "zone") {
      r.sort((a, b) => (a.zoneId || "zzz").localeCompare(b.zoneId || "zzz"));
    }
    return r;
  }, [seeds, search, filterCategory, filterColor, filterStatus, filterZone, sort]);

  const activeFilterCount = [filterCategory, filterPlantType, filterColor, filterStatus, filterZone].filter(Boolean).length;
  const hasAnyFilter = activeFilterCount > 0 || search.trim().length > 0;

  function handleViewToggle(v) {
    setView(v);
    localStorage.setItem("jardin-view", v);
  }

  const stickyTop = isDesktop ? "var(--nav-height)" : 0;

  return (
    <div className="page">

      {/* ── Sticky sub-nav ─────────────────────────────────────────────── */}
      <div style={{
        position: "sticky",
        top: stickyTop,
        zIndex: 10,
        background: "var(--color-bg)",
        borderBottom: "1.5px solid var(--color-border)",
        marginLeft: "calc(-1 * var(--space-md))",
        marginRight: "calc(-1 * var(--space-md))",
        paddingLeft: "var(--space-md)",
        paddingRight: "var(--space-md)",
        paddingTop: "var(--space-md)",
        paddingBottom: "var(--space-md)",
        marginBottom: "var(--space-md)",
      }}>

        {/* Row 1: Title · count · view toggle · add button */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          marginBottom: "var(--space-sm)",
        }}>
          <h1 style={{ flex: 1, fontSize: "var(--text-h2)", margin: 0, lineHeight: 1.2 }}>Plants</h1>
          <span style={{
            color: "var(--color-text-muted)",
            fontSize: "var(--text-nav)",
            flexShrink: 0,
          }}>
            {filtered.length}
            {filtered.length !== seeds.length ? `\u202f/\u202f${seeds.length}` : ""}
          </span>
          <ViewToggle view={view} onChange={handleViewToggle} />
          <button
            className="btn-primary"
            onClick={onUpload}
            style={{ minHeight: 40, padding: "0 var(--space-md)", fontSize: "var(--text-nav)", fontWeight: 600, flexShrink: 0 }}
          >
            + Add
          </button>
        </div>

        {/* Row 2: Search · filter toggle (mobile) · sort */}
        <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
          <input
            type="search"
            placeholder="Search plants…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minHeight: 40, padding: "0 var(--space-md)", fontSize: "var(--text-small)" }}
          />
          {!isDesktop && (
            <button
              className="btn-ghost"
              onClick={() => setShowFilters(f => !f)}
              style={{ minHeight: 40, padding: "0 var(--space-md)", fontSize: "var(--text-small)", flexShrink: 0 }}
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
          )}
          <SelectWithCaret
            value={sort}
            onChange={e => setSort(e.target.value)}
            wrapStyle={{ flexShrink: 0 }}
            selectStyle={{
              minHeight: 40,
              padding: "0 2rem 0 var(--space-md)",
              fontSize: "var(--text-small)",
              border: "2px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-bg)",
              color: "var(--color-text)",
            }}
          >
            <option value="newest">Newest</option>
            <option value="az">A – Z</option>
            <option value="status">By status</option>
            {zones.length > 0 && <option value="zone">By zone</option>}
          </SelectWithCaret>
        </div>

        {/* Filter dropdowns — always on desktop, toggled on mobile */}
        {(isDesktop || showFilters) && (
          <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-sm)", flexWrap: "wrap" }}>
            {categories.length > 0 && (
              <FilterSelect
                label="Category"
                value={filterCategory}
                onChange={v => { setFilterCategory(v); setFilterPlantType(""); }}
                options={categories}
              />
            )}
            {plantTypes.length > 0 && (
              <FilterSelect
                label="Plant type"
                value={filterPlantType}
                onChange={setFilterPlantType}
                options={plantTypes}
              />
            )}
            {colors.length > 0 && (
              <FilterSelect
                label="Color"
                value={filterColor}
                onChange={setFilterColor}
                options={colors}
              />
            )}
            {zones.length > 0 && (
              <FilterSelect
                label="Zone"
                value={filterZone}
                onChange={setFilterZone}
                options={zones}
              />
            )}
            {statuses.length > 0 && (
              <FilterSelect
                label="Status"
                value={filterStatus}
                onChange={setFilterStatus}
                options={statuses}
              />
            )}
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setFilterCategory("");
                  setFilterPlantType("");
                  setFilterColor("");
                  setFilterStatus("");
                  setFilterZone("");
                }}
                style={{
                  minHeight: 36,
                  padding: "0 var(--space-sm)",
                  fontSize: "var(--text-small)",
                  background: "transparent",
                  border: "none",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap", marginTop: "var(--space-sm)" }}>
            {filterCategory && (
              <FilterChip label={filterCategory} onRemove={() => setFilterCategory("")} />
            )}
            {filterPlantType && (
              <FilterChip label={filterPlantType} onRemove={() => setFilterPlantType("")} />
            )}
            {filterColor && (
              <FilterChip
                label={filterColor}
                dotColor={COLOR_DOTS[filterColor]}
                isWhite={filterColor === "White"}
                onRemove={() => setFilterColor("")}
              />
            )}
            {filterStatus && (
              <FilterChip label={filterStatus} onRemove={() => setFilterStatus("")} />
            )}
            {filterZone && (
              <FilterChip label={filterZone} onRemove={() => setFilterZone("")} />
            )}
          </div>
        )}
      </div>

      {/* ── Empty state (no plants at all) ─────────────────────────────── */}
      {seeds.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "var(--space-2xl) 0",
          color: "var(--color-text-muted)",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "var(--space-md)" }}>🌱</div>
          <h3 style={{ marginBottom: "var(--space-sm)", color: "var(--color-text-muted)" }}>
            No plants yet
          </h3>
          <p style={{ marginBottom: "var(--space-lg)" }}>
            Upload seed packet photos, paste a product URL or Google Doc, or search by name.
          </p>
          <button className="btn-secondary" onClick={onUpload}>
            Add your first plant
          </button>
        </div>
      )}

      {/* ── No results from filter ──────────────────────────────────────── */}
      {seeds.length > 0 && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "var(--space-2xl) 0", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "var(--space-md)" }}>🔍</div>
          <p>No plants match your filters.</p>
          <button
            onClick={() => {
              setSearch("");
              setFilterCategory("");
              setFilterPlantType("");
              setFilterColor("");
              setFilterStatus("");
              setFilterZone("");
            }}
            style={{
              marginTop: "var(--space-md)",
              background: "none",
              border: "none",
              color: "var(--color-green)",
              cursor: "pointer",
              fontSize: "var(--text-small)",
              textDecoration: "underline",
              minHeight: "auto",
            }}
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* ── Plant list or grid ──────────────────────────────────────────── */}
      {filtered.length > 0 && (
        view === "list" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", marginBottom: "var(--space-xl)" }}>
            {filtered.map(seed => (
              <PlantListRow
                key={seed.id}
                seed={seed}
                onClick={() => navigate(`/seeds/${seed.id}`)}
              />
            ))}
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "var(--space-md)",
            marginBottom: "var(--space-xl)",
          }}>
            {filtered.map(seed => (
              <SeedCard key={seed.id} seed={seed} onClick={() => navigate(`/seeds/${seed.id}`)} />
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ─── PlantListRow ─────────────────────────────────────────────────────────────

function PlantListRow({ seed, onClick }) {
  const b = badge(seed);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === "Enter" && onClick()}
      className="card animate-fade-up"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        padding: "var(--space-md) var(--space-lg)",
        cursor: "pointer",
        minHeight: "var(--touch-target)",
        transition: "box-shadow 0.15s ease, background 0.1s ease",
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = ""}
    >
      {/* Emoji */}
      <span style={{ fontSize: "1.5rem", lineHeight: 1, flexShrink: 0, width: 32, textAlign: "center" }}>
        {seed.emoji || "🌱"}
      </span>

      {/* Name + variety + days */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600,
          fontSize: "var(--text-body)",
          lineHeight: 1.3,
          display: "flex",
          alignItems: "center",
          gap: "var(--space-xs)",
        }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {seed.name}
          </span>
          {seed.loading && (
            <span style={{
              fontSize: "var(--text-small)",
              color: "var(--color-text-muted)",
              fontWeight: 400,
              fontStyle: "italic",
              flexShrink: 0,
            }}>
              Identifying…
            </span>
          )}
          {seed.enriching && (
            <span style={{
              fontSize: "var(--text-small)",
              color: "var(--color-text-muted)",
              fontWeight: 400,
              fontStyle: "italic",
              flexShrink: 0,
            }}>
              Enriching…
            </span>
          )}
        </div>
        {(seed.variety && seed.variety !== "Standard") || seed.daysToMaturity ? (
          <div style={{
            fontSize: "var(--text-small)",
            color: "var(--color-text-muted)",
            lineHeight: 1.3,
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {seed.variety && seed.variety !== "Standard" && (
              <span style={{ fontStyle: "italic" }}>{seed.variety}</span>
            )}
            {seed.variety && seed.variety !== "Standard" && seed.daysToMaturity && (
              <span> · </span>
            )}
            {seed.daysToMaturity && <span>{seed.daysToMaturity}</span>}
          </div>
        ) : null}
      </div>

      {/* Color dot */}
      {seed.color && COLOR_DOTS[seed.color] && (
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            flexShrink: 0,
            background: COLOR_DOTS[seed.color],
            border: seed.color === "White" ? "1px solid var(--color-border)" : "none",
          }}
          title={seed.color}
        />
      )}

      {/* Status badge — bordered pill */}
      <span style={{
        fontSize: "11px",
        fontWeight: 700,
        color: seed.fetchError ? "var(--color-error)" : b.color,
        border: `1.5px solid ${seed.fetchError ? "var(--color-error)" : b.color}`,
        borderRadius: "100px",
        padding: "3px 8px",
        flexShrink: 0,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}>
        {seed.fetchError ? "Error" : b.t}
      </span>
    </div>
  );
}

// ─── SeedCard (grid view) ─────────────────────────────────────────────────────

function SeedCard({ seed, onClick }) {
  if (seed.loading) {
    return (
      <div
        className="card animate-fade-up"
        onClick={onClick}
        style={{ cursor: "pointer", opacity: 0.75, transition: "box-shadow 0.15s ease" }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)"}
        onMouseLeave={e => e.currentTarget.style.boxShadow = ""}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-md)" }}>
          <span style={{ fontSize: "2.5rem", lineHeight: 1 }}>🌱</span>
          <span style={{ fontSize: "var(--text-nav)", color: "var(--color-text-muted)", fontStyle: "italic" }}>Identifying…</span>
        </div>
        <h3 style={{ marginBottom: "var(--space-sm)" }}>{seed.name}</h3>
        <div style={{ height: 3, background: "var(--color-border)", borderRadius: 2, overflow: "hidden" }}>
          <div className="animate-pulse" style={{ height: "100%", width: "40%", background: "var(--color-green)", borderRadius: 2 }} />
        </div>
      </div>
    );
  }

  if (seed.fetchError) {
    return (
      <div
        className="card animate-fade-up"
        onClick={onClick}
        style={{ cursor: "pointer", borderColor: "rgba(192,57,43,0.3)", transition: "box-shadow 0.15s ease" }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)"}
        onMouseLeave={e => e.currentTarget.style.boxShadow = ""}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          <span style={{ fontSize: "2.5rem", lineHeight: 1 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{seed.name}</div>
            <div style={{ fontSize: "var(--text-small)", color: "var(--color-error)" }}>Tap to see details</div>
          </div>
        </div>
      </div>
    );
  }

  const b = badge(seed);

  return (
    <div
      className="card animate-fade-up"
      onClick={onClick}
      style={{ cursor: "pointer", transition: "box-shadow 0.15s ease" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = ""}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-md)" }}>
        <span style={{ fontSize: "2.5rem", lineHeight: 1 }}>{seed.emoji || "🌱"}</span>
        <span style={{
          fontSize: "var(--text-nav)",
          fontWeight: 700,
          color: b.color,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          border: `1.5px solid ${b.color}`,
          borderRadius: "100px",
          padding: "2px var(--space-sm)",
        }}>
          {b.t}
        </span>
      </div>

      <h3 style={{ marginBottom: "4px" }}>{seed.name}</h3>
      {seed.variety && seed.variety !== "Standard" && (
        <p style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          color: "var(--color-green)",
          fontSize: "var(--text-small)",
          margin: "0 0 var(--space-sm)",
        }}>
          '{seed.variety}'
        </p>
      )}

      <div style={{
        display: "flex",
        gap: "var(--space-md)",
        fontSize: "var(--text-nav)",
        color: "var(--color-text-muted)",
        marginTop: "var(--space-sm)",
        flexWrap: "wrap",
      }}>
        {seed.daysToMaturity && <span>⏱ {seed.daysToMaturity}</span>}
        {seed.brand && <span>🏷 {seed.brand}</span>}
      </div>

      {seed.immediateNextStep && (
        <p style={{
          marginTop: "var(--space-md)",
          fontSize: "var(--text-small)",
          color: "var(--color-text-muted)",
          lineHeight: 1.5,
          borderTop: "1px solid var(--color-border)",
          paddingTop: "var(--space-md)",
          margin: "var(--space-md) 0 0",
        }}>
          {seed.immediateNextStep}
        </p>
      )}

      {seed.enriching && (
        <div style={{ height: 3, background: "var(--color-border)", borderRadius: 2, overflow: "hidden", marginTop: "var(--space-md)" }}>
          <div className="animate-pulse" style={{ height: "100%", width: "65%", background: "var(--color-green)", borderRadius: 2 }} />
        </div>
      )}
    </div>
  );
}

// ─── ViewToggle ───────────────────────────────────────────────────────────────

function ViewToggle({ view, onChange }) {
  const btnStyle = (active) => ({
    minHeight: 36,
    width: 36,
    padding: 0,
    background: active ? "var(--color-green-pale)" : "transparent",
    color: active ? "var(--color-green)" : "var(--color-text-muted)",
    border: "none",
    fontSize: "1.1rem",
    cursor: "pointer",
    borderRadius: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.1s ease, color 0.1s ease",
  });

  return (
    <div style={{
      display: "flex",
      border: "1.5px solid var(--color-border)",
      borderRadius: "var(--radius-sm)",
      overflow: "hidden",
      flexShrink: 0,
    }}>
      <button
        onClick={() => onChange("list")}
        style={btnStyle(view === "list")}
        title="List view"
        aria-label="List view"
      >
        ☰
      </button>
      <button
        onClick={() => onChange("grid")}
        style={btnStyle(view === "grid")}
        title="Grid view"
        aria-label="Grid view"
      >
        ⊞
      </button>
    </div>
  );
}

// ─── FilterSelect ─────────────────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options }) {
  return (
    <SelectWithCaret
      value={value}
      onChange={e => onChange(e.target.value)}
      selectStyle={{
        minHeight: 36,
        padding: "0 2rem 0 var(--space-md)",
        fontSize: "var(--text-small)",
        border: value ? "2px solid var(--color-green)" : "2px solid var(--color-border)",
        borderRadius: "var(--radius-sm)",
        background: value ? "var(--color-green-pale)" : "var(--color-bg)",
        color: value ? "var(--color-green)" : "var(--color-text)",
        fontWeight: value ? 600 : 400,
      }}
    >
      <option value="">{label}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </SelectWithCaret>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────────────────

function FilterChip({ label, dotColor, isWhite, onRemove }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-xs)",
      background: "var(--color-green-pale)",
      color: "var(--color-green)",
      border: "1.5px solid var(--color-green-light)",
      borderRadius: "100px",
      padding: "2px var(--space-sm)",
      fontSize: "var(--text-small)",
      fontWeight: 500,
    }}>
      {dotColor && (
        <span style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: dotColor,
          border: isWhite ? "1px solid var(--color-border)" : "none",
          flexShrink: 0,
        }} />
      )}
      {label}
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0 0 0 2px",
          minHeight: "auto",
          fontSize: "1rem",
          color: "var(--color-green)",
          lineHeight: 1,
          fontWeight: 400,
        }}
        aria-label={`Remove ${label} filter`}
      >
        ×
      </button>
    </span>
  );
}
