import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSeedsContext } from "../context/SeedsContext";
import { badge, taskGuidance } from "../data/garden";
import { EMPTY_FILTERS, activeFilters, filterPlants, sortPlants, statusLabel, statusRank } from "../lib/plantFilters";
import {
  Button, Card, SearchInput, Select, Tag, Chip, Segmented, Sheet, OptionGroup, Field, Icon, useHideOnScroll,
} from "../ui";

// ─── Colour dots ──────────────────────────────────────────────────────────────

const COLOR_DOTS = {
  "Pink":            "#f9a8d4",
  "Coral pink":      "#fb7185",
  "White":           "#ffffff",
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

const STATUS_TONE = { sow: "green", harvest: "warn" };
const PAGE_SIZE = 40;
const VIEW_KEY = "jardin-view";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "az", label: "A to Z" },
  { value: "status", label: "Status" },
  { value: "zone", label: "Zone" },
];

function savedView() {
  try { return localStorage.getItem(VIEW_KEY) || "list"; } catch { return "list"; }
}

const uniq = values => [...new Set(values.filter(Boolean))];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SeedsPage({ onUpload }) {
  const { seeds, zones } = useSeedsContext();
  const toolbarHidden = useHideOnScroll();

  const [view, setView] = useState(savedView);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState("newest");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_FILTERS);

  const zoneName = id => zones.find(z => z.id === id)?.name ?? id;
  const zoneOrder = useMemo(() => zones.map(z => z.id), [zones]);

  const filtered = useMemo(
    () => sortPlants(filterPlants(seeds, search, filters), sort, zoneOrder),
    [seeds, search, filters, sort, zoneOrder],
  );
  const draftCount = useMemo(() => filterPlants(seeds, search, draft).length, [seeds, search, draft]);
  const applied = activeFilters(filters);

  // Changing what's listed starts paging again from the top
  const update = setter => value => { setter(value); setShown(PAGE_SIZE); };
  const applyFilters = update(setFilters);

  function changeView(v) {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* private mode: view just isn't remembered */ }
  }

  function openSheet() { setDraft(filters); setSheetOpen(true); }

  const chipLabel = (key, value) =>
    key === "zone" ? zoneName(value) : key === "status" ? statusLabel(value) : value;

  return (
    <div className="ui-page ui-page--with-actions">
      <div className="ui-page-header">
        <div>
          <h1 className="ui-display">Plants</h1>
          <p className="ui-small">
            {filtered.length === seeds.length
              ? `${seeds.length} plant${seeds.length === 1 ? "" : "s"}`
              : `${filtered.length} of ${seeds.length} plants`}
          </p>
        </div>
        <Button icon="plus" onClick={onUpload} className="hide-on-phone">Add plants</Button>
      </div>

      {seeds.length > 0 && (
        <div className={`ui-toolbar${toolbarHidden ? " ui-toolbar--hidden" : ""}`}>
          <div className="ui-toolbar__grid">
            <div className="ui-toolbar__search">
              <SearchInput
                label="Search plants"
                placeholder="Search name, variety or brand"
                value={search}
                onChange={e => update(setSearch)(e.target.value)}
              />
            </div>
            <Button variant="secondary" icon="filter" onClick={openSheet} aria-haspopup="dialog" className="ui-toolbar__filter">
              Filter
              {applied.length > 0 && <span className="ui-tag ui-tag--green" aria-label={`${applied.length} on`}>{applied.length}</span>}
            </Button>
            <div className="ui-row ui-toolbar__end">
              <Select
                aria-label="Sort plants"
                value={sort}
                onChange={e => update(setSort)(e.target.value)}
                style={{ width: "auto", minHeight: "var(--control-h-sm)", fontSize: "var(--type-small)" }}
              >
                {SORTS.filter(s => s.value !== "zone" || zones.length > 0).map(s => (
                  <option key={s.value} value={s.value}>Sort: {s.label}</option>
                ))}
              </Select>
              <Segmented label="View" value={view} onChange={changeView}
                options={[{ value: "list", label: "List" }, { value: "grid", label: "Grid" }]} />
            </div>
            {applied.length > 0 && <div className="ui-row ui-toolbar__chips">
              {applied.map(([key, value]) => (
                <Chip key={key} onRemove={() => applyFilters({ ...filters, [key]: "" })}>
                  {chipLabel(key, value)}
                </Chip>
              ))}
              {applied.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => applyFilters(EMPTY_FILTERS)}>Clear all</Button>
              )}
            </div>}
          </div>
        </div>
      )}

      {seeds.length === 0 && (
        <Card variant="muted" className="ui-stack" style={{ alignItems: "center", textAlign: "center", padding: "var(--space-12) var(--space-6)" }}>
          <h2 className="ui-title">No plants yet</h2>
          <p className="ui-small">Upload seed packet photos, paste a product link or Google Doc, or search by name.</p>
          <Button icon="plus" onClick={onUpload}>Add your first plant</Button>
        </Card>
      )}

      {seeds.length > 0 && filtered.length === 0 && (
        <Card variant="muted" className="ui-stack" style={{ alignItems: "center", textAlign: "center", padding: "var(--space-10) var(--space-6)" }}>
          <p>No plants match your search and filters.</p>
          <Button variant="secondary" onClick={() => { setSearch(""); applyFilters(EMPTY_FILTERS); }}>Clear search and filters</Button>
        </Card>
      )}

      {filtered.length > 0 && (view === "list" ? (
        <Card variant="flush">
          <ul className="ui-list">
            {filtered.slice(0, shown).map(seed => (
              <li key={seed.id}><PlantRow seed={seed} zoneName={seed.zoneId ? zoneName(seed.zoneId) : null} /></li>
            ))}
          </ul>
        </Card>
      ) : (
        <ul className="ui-grid" style={{ listStyle: "none", padding: 0 }}>
          {filtered.slice(0, shown).map(seed => <li key={seed.id} style={{ display: "flex" }}><PlantCard seed={seed} /></li>)}
        </ul>
      ))}

      {filtered.length > PAGE_SIZE && (
        <div className="ui-stack" style={{ alignItems: "center", gap: "var(--space-2)", marginTop: "var(--stack)" }}>
          <p className="ui-small" aria-live="polite">Showing {Math.min(shown, filtered.length)} of {filtered.length}</p>
          {shown < filtered.length && (
            <Button variant="secondary" onClick={() => setShown(n => n + PAGE_SIZE)}>
              Show {Math.min(PAGE_SIZE, filtered.length - shown)} more
            </Button>
          )}
        </div>
      )}

      {/* Phones: the main action stays at the bottom of the screen */}
      <div className="ui-action-bar hide-on-desktop">
        <Button icon="plus" onClick={onUpload}>Add plants</Button>
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        seeds={seeds}
        zones={zones}
        draft={draft}
        setDraft={setDraft}
        count={draftCount}
        onApply={() => { applyFilters(draft); setSheetOpen(false); }}
      />
    </div>
  );
}

// ─── Filter sheet ─────────────────────────────────────────────────────────────
// Choices are a draft until "Show N plants", so the list doesn't jump while picking

function FilterSheet({ open, onClose, seeds, zones, draft, setDraft, count, onApply }) {
  const set = key => value => setDraft(d => ({
    ...d,
    [key]: value,
    // A plant type from another category would match nothing
    ...(key === "category" ? { plantType: "" } : {}),
  }));

  const usedZones = new Set(seeds.map(s => s.zoneId));
  const statuses = uniq(seeds.map(s => badge(s).t)).sort((a, b) => statusRank(a) - statusRank(b));
  const categories = uniq(seeds.map(s => s.category)).sort();
  const plantTypes = uniq(seeds.filter(s => !draft.category || s.category === draft.category).map(s => s.plantType)).sort();
  const colors = uniq(seeds.map(s => s.color));

  return (
    <Sheet
      open={open}
      title="Filter plants"
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={() => setDraft(EMPTY_FILTERS)}>Clear all</Button>
        <Button onClick={onApply} disabled={count === 0}>
          {count === 0 ? "No matches" : `Show ${count} plant${count === 1 ? "" : "s"}`}
        </Button>
      </>}
    >
      <OptionGroup label="Status" value={draft.status} onChange={set("status")}
        options={statuses.map(t => ({ value: t, label: statusLabel(t) }))} />
      {zones.length > 0 && (
        <OptionGroup label="Zone" value={draft.zone} onChange={set("zone")}
          options={zones.filter(z => usedZones.has(z.id)).map(z => ({ value: z.id, label: z.name }))} />
      )}
      <OptionGroup label="Category" value={draft.category} onChange={set("category")}
        options={categories.map(c => ({ value: c, label: c }))} />
      <Field label="Plant type">
        <Select value={draft.plantType} onChange={e => set("plantType")(e.target.value)}>
          <option value="">Any plant type</option>
          {plantTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
      </Field>
      <OptionGroup label="Colour" value={draft.color} onChange={set("color")}
        options={colors.map(c => ({ value: c, label: c, dot: COLOR_DOTS[c] }))} />
    </Sheet>
  );
}

// ─── List row ─────────────────────────────────────────────────────────────────

function StatusTag({ seed }) {
  if (seed.fetchError) return <Tag tone="error">Couldn't add</Tag>;
  if (seed.loading) return <Tag>Identifying…</Tag>;
  const b = badge(seed);
  return <Tag tone={STATUS_TONE[b.type]}>{statusLabel(b.t)}</Tag>;
}

const hasVariety = seed => seed.variety && seed.variety !== "Standard";

function PlantRow({ seed, zoneName }) {
  return (
    <Link to={`/seeds/${seed.id}`} className="ui-list-row ui-list-row--link">
      <span aria-hidden="true" style={{ fontSize: "1.25rem", width: 28, textAlign: "center", flexShrink: 0 }}>
        {seed.fetchError ? "⚠️" : seed.emoji || "🌱"}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="ui-subtitle ui-truncate">{seed.name}</span>
        <span className="ui-small ui-truncate">
          {[hasVariety(seed) && seed.variety, seed.daysToMaturity, seed.enriching && "Adding details…"].filter(Boolean).join(" · ")}
        </span>
      </span>
      <span className="ui-small hide-on-phone ui-truncate" style={{ width: 140 }}>{zoneName || "No zone"}</span>
      <span className="ui-small hide-on-phone ui-truncate" style={{ width: 130 }}>{seed.category}</span>
      {seed.color && COLOR_DOTS[seed.color] && (
        <span className="ui-dot hide-on-phone" style={{ background: COLOR_DOTS[seed.color] }} title={seed.color} />
      )}
      <StatusTag seed={seed} />
      <Icon name="chevronRight" width="16" height="16" style={{ color: "var(--color-text-subtle)", flexShrink: 0 }} />
    </Link>
  );
}

// ─── Grid card ────────────────────────────────────────────────────────────────

function PlantCard({ seed }) {
  const guidance = !seed.loading && !seed.fetchError && taskGuidance(seed, badge(seed).type);
  const details = [seed.daysToMaturity, seed.brand].filter(Boolean).join(" · ");
  return (
    <Card as={Link} to={`/seeds/${seed.id}`} interactive className="ui-stack" style={{ gap: "var(--space-2)", flex: 1 }}>
      <span className="ui-row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
        <span aria-hidden="true" style={{ fontSize: "1.75rem", lineHeight: 1 }}>{seed.fetchError ? "⚠️" : seed.emoji || "🌱"}</span>
        <StatusTag seed={seed} />
      </span>
      <span>
        <span className="ui-subtitle">{seed.name}</span>
        {hasVariety(seed) && <span className="ui-small">{seed.variety}</span>}
      </span>
      {details && <span className="ui-small ui-truncate">{details}</span>}
      {guidance && <span className="ui-small ui-clamp-2" style={{ color: "var(--color-text)" }}>{guidance}</span>}
    </Card>
  );
}
