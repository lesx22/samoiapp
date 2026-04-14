import { useSeedsContext } from "../context/SeedsContext";
import { MONTHS, TODAY_M } from "../data/garden";

const LEGEND = [
  { color: "var(--color-green)", code: "S", label: "Sow" },
  { color: "#1d4ed8", code: "T", label: "Transplant" },
  { color: "#b45309", code: "H", label: "Harvest" },
];

export default function CalendarPage() {
  const { seeds } = useSeedsContext();

  return (
    <div className="page">
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <h1 style={{ marginBottom: "var(--space-xs)" }}>Calendar</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)" }}>
          Your full growing season at a glance
        </p>
      </div>

      {seeds.length === 0 ? (
        <div style={{ textAlign: "center", padding: "var(--space-2xl) 0", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "var(--space-md)" }}>▦</div>
          <p>Add seeds to see your planting calendar.</p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: "auto", padding: "var(--space-lg) var(--space-md)" }}>
          <div style={{ minWidth: 640 }}>
            {/* Month headers */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "160px repeat(12, 1fr)",
              gap: 4,
              marginBottom: "var(--space-sm)",
            }}>
              <div />
              {MONTHS.map((m, i) => (
                <div key={m} style={{
                  textAlign: "center",
                  fontSize: "var(--text-nav)",
                  fontWeight: 700,
                  fontFamily: "var(--font-sans)",
                  color: i + 1 === TODAY_M ? "var(--color-green)" : "var(--color-text-muted)",
                  borderBottom: i + 1 === TODAY_M ? "2px solid var(--color-green)" : "2px solid transparent",
                  paddingBottom: 4,
                  letterSpacing: "0.05em",
                }}>
                  {m.toUpperCase()}
                </div>
              ))}
            </div>

            {/* Seed rows */}
            {seeds.map(seed => (
              <div key={seed.id} style={{
                display: "grid",
                gridTemplateColumns: "160px repeat(12, 1fr)",
                gap: 4,
                marginBottom: 4,
                alignItems: "center",
              }}>
                <div style={{
                  fontSize: "var(--text-small)",
                  color: "var(--color-text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  paddingRight: "var(--space-sm)",
                  fontWeight: 500,
                }}>
                  {seed.emoji} {seed.name}
                </div>
                {MONTHS.map((_, i) => {
                  const m = i + 1;
                  const sow = seed.sowMonths?.includes(m);
                  const tx  = seed.transplantMonths?.includes(m);
                  const hv  = seed.harvestMonths?.includes(m);
                  const now = m === TODAY_M;

                  let bg = "var(--color-border)";
                  let label = "";
                  if (sow && hv) { bg = "linear-gradient(135deg, var(--color-green), #b45309)"; label = "S/H"; }
                  else if (sow) { bg = "var(--color-green)"; label = "S"; }
                  else if (tx)  { bg = "#1d4ed8"; label = "T"; }
                  else if (hv)  { bg = "#b45309"; label = "H"; }

                  return (
                    <div key={m} style={{
                      height: 28,
                      background: bg,
                      borderRadius: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: (sow || tx || hv) ? "#fff" : "transparent",
                      border: now ? "2px solid var(--color-green)" : "2px solid transparent",
                      fontFamily: "var(--font-sans)",
                    }}>
                      {label}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div style={{
              display: "flex",
              gap: "var(--space-lg)",
              marginTop: "var(--space-lg)",
              flexWrap: "wrap",
            }}>
              {LEGEND.map(({ color, code, label }) => (
                <div key={code} style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
                  <div style={{ width: 16, height: 16, background: color, borderRadius: 3 }} />
                  <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", fontWeight: 500 }}>
                    {code} — {label}
                  </span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
                <div style={{ width: 16, height: 16, border: "2px solid var(--color-green)", borderRadius: 3 }} />
                <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", fontWeight: 500 }}>
                  Current month
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
