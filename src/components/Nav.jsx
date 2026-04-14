import { NavLink } from "react-router-dom";
import { useSeedsContext } from "../context/SeedsContext";
import { badge, getActiveTasks } from "../data/garden";

const NAV_ITEMS = [
  { to: "/",         label: "Home",     icon: "⌂" },
  { to: "/seeds",    label: "Plants",   icon: "✦" },
  { to: "/today",    label: "Today",    icon: "◎" },
  { to: "/garden",   label: "Garden",   icon: "⬡" },
  { to: "/calendar", label: "Calendar", icon: "▦" },
  { to: "/zone",     label: "Zone",     icon: "◈" },
];

export default function Nav() {
  const { seeds, isTaskDone } = useSeedsContext();
  const urgentCount = seeds.flatMap(s =>
    getActiveTasks(s).filter(t => !isTaskDone(s.id, t.type))
  ).length;

  return (
    <>
      <TopNav seeds={seeds} urgentCount={urgentCount} />
      <BottomNav urgentCount={urgentCount} />
    </>
  );
}

function TopNav({ seeds, urgentCount }) {
  return (
    <nav style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height: "var(--nav-height)",
      background: "var(--color-bg)",
      borderBottom: "1.5px solid var(--color-border)",
      zIndex: 100,
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 var(--space-lg)",
    }}
      className="top-nav"
    >
      <NavLink to="/" style={{ textDecoration: "none" }}>
        <span style={{
          fontFamily: "var(--font-serif)",
          fontSize: "1.375rem",
          fontWeight: 700,
          color: "var(--color-text)",
          letterSpacing: "-0.5px",
        }}>
          Jardin<span style={{ color: "var(--color-green)" }}>·</span>Planner
        </span>
      </NavLink>

      <div style={{ display: "flex", gap: "var(--space-xs)" }}>
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink key={to} to={to} end={to === "/"} style={({ isActive }) => ({
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-small)",
            fontWeight: 600,
            color: isActive ? "var(--color-green)" : "var(--color-text-muted)",
            textDecoration: "none",
            padding: "var(--space-xs) var(--space-md)",
            borderRadius: "var(--radius-sm)",
            background: isActive ? "var(--color-green-pale)" : "transparent",
            minHeight: "var(--touch-target)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-xs)",
            transition: "all 0.15s ease",
          })}>
            {label}
            {label === "Today" && urgentCount > 0 && (
              <Badge count={urgentCount} />
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function BottomNav({ urgentCount }) {
  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: "var(--bottom-nav-height)",
      background: "var(--color-bg)",
      borderTop: "1.5px solid var(--color-border)",
      zIndex: 100,
      alignItems: "center",
      justifyContent: "space-around",
      padding: "0 var(--space-sm)",
    }}
      className="bottom-nav"
    >
      {NAV_ITEMS.map(({ to, label, icon }) => (
        <NavLink key={to} to={to} end={to === "/"} style={({ isActive }) => ({
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
          textDecoration: "none",
          color: isActive ? "var(--color-green)" : "var(--color-text-muted)",
          flex: 1,
          padding: "var(--space-xs) 0",
          minHeight: "var(--touch-target)",
          justifyContent: "center",
          position: "relative",
        })}>
          <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{icon}</span>
          <span style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-nav)",
            fontWeight: 600,
            lineHeight: 1,
          }}>
            {label}
          </span>
          {label === "Today" && urgentCount > 0 && (
            <span style={{
              position: "absolute",
              top: 4,
              right: "calc(50% - 18px)",
              background: "var(--color-green)",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 700,
              padding: "1px 5px",
              borderRadius: "100px",
              lineHeight: 1.4,
            }}>
              {urgentCount}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function Badge({ count }) {
  return (
    <span style={{
      background: "var(--color-green)",
      color: "#fff",
      fontSize: "11px",
      fontWeight: 700,
      padding: "1px 6px",
      borderRadius: "100px",
      lineHeight: 1.4,
    }}>
      {count}
    </span>
  );
}
