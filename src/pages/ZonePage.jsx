import { LOC } from "../data/garden";

const ZONE_DETAILS = [
  { key: "name",        label: "Location" },
  { key: "zone",        label: "Growing Zone" },
  { key: "climate",     label: "Climate Type" },
  { key: "lastFrost",   label: "Last Frost" },
  { key: "firstFrost",  label: "First Frost" },
  { key: "season",      label: "Frost-Free Season" },
  { key: "plot",        label: "Plot Size" },
];

const NORMANDY_NOTES = [
  "Oceanic climate — mild and wet. Brassicas, roots, and salads thrive year-round.",
  "Warm-season crops (melons, squash, peppers) need black plastic mulch and row cover.",
  "Choose early-maturing varieties for heat-lovers — summers are cooler than southern France.",
  "Main threats: slugs, blight, downy mildew. Mulch well, water at soil level only.",
  "Start tender crops under glass or LED grow lights from early March for best results.",
  "Around 200 frost-free days — a very long season for cool-weather crops.",
];

export default function ZonePage() {
  return (
    <div className="page">
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <h1 style={{ marginBottom: "var(--space-xs)" }}>Your Zone</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)" }}>
          All growing advice is calibrated to your location
        </p>
      </div>

      {/* Garden data */}
      <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
        <h3 style={{ marginBottom: "var(--space-md)" }}>Garden Profile</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-md)",
        }}>
          {ZONE_DETAILS.map(({ key, label }) => (
            <div key={key}>
              <div style={{
                fontSize: "var(--text-nav)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--color-text-muted)",
                marginBottom: "4px",
              }}>
                {label}
              </div>
              <div style={{
                fontSize: "var(--text-body)",
                color: "var(--color-green)",
                fontWeight: 500,
              }}>
                {LOC[key]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Normandy notes */}
      <div className="card" style={{ borderLeft: "4px solid var(--color-green)" }}>
        <h3 style={{ marginBottom: "var(--space-md)" }}>Normandy Growing Notes</h3>
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          {NORMANDY_NOTES.map((note, i) => (
            <li key={i} style={{ display: "flex", gap: "var(--space-md)", alignItems: "flex-start" }}>
              <span style={{
                color: "var(--color-green)",
                fontWeight: 700,
                fontSize: "var(--text-body)",
                flexShrink: 0,
                lineHeight: 1.6,
              }}>
                ✓
              </span>
              <p style={{ fontSize: "var(--text-body)", color: "var(--color-text)", lineHeight: 1.6, margin: 0 }}>
                {note}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
