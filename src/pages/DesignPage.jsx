import { useState } from "react";
import { useSeedsContext } from "../context/SeedsContext";
import { badge } from "../data/garden";
import {
  Button, Card, Field, Input, Textarea, Select, SearchInput, Checkbox,
  Tag, Chip, Segmented, Icon, useHideOnScroll,
} from "../ui";

// Preview of the shared building blocks, for review before pages move onto them.
// Read-only: nothing here saves anything.

const TONE = { sow: "green", transplant: undefined, harvest: "warn" };

function Section({ title, note, children }) {
  return (
    <section className="ui-stack" style={{ paddingTop: "var(--space-8)" }}>
      <div style={{ display: "grid", gap: "var(--space-1)" }}>
        <h2 className="ui-title">{title}</h2>
        {note && <p className="ui-small">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export default function DesignPage() {
  const { seeds } = useSeedsContext();
  const headerHidden = useHideOnScroll();
  const [view, setView] = useState("list");
  const [filters, setFilters] = useState(["Potager", "Harvest now"]);
  const [shown, setShown] = useState(4);
  const sample = seeds.filter(s => !s.fetchError && !s.loading);

  return (
    <>
      <header className={`ui-app-header hide-on-desktop${headerHidden ? " ui-app-header--hidden" : ""}`}>
        <span className="ui-subtitle" style={{ flex: 1 }}>Design preview</span>
        <Button variant="ghost" size="sm" iconOnly icon="search" aria-label="Search" />
      </header>

      <div className="ui-page ui-page--with-actions">
        <div className="ui-page-header">
          <div style={{ display: "grid", gap: "var(--space-2)" }}>
            <p className="ui-label">Design rebuild, first pass</p>
            <h1 className="ui-display">Building blocks</h1>
            <p className="ui-small">Every page will be built from these. Phone sizes are roomier; desktop is denser.</p>
          </div>
        </div>

        <Section title="Type" note="Serif only for page titles; everything else in Inter.">
          <Card className="ui-stack">
            <p className="ui-label">Label</p>
            <p className="ui-display">Display: page title</p>
            <p className="ui-title">Title: section heading</p>
            <p className="ui-subtitle">Subtitle: card heading</p>
            <p className="ui-body">Body: the default text for descriptions and guidance, set for comfortable reading.</p>
            <p className="ui-small">Small: secondary details such as counts and dates.</p>
          </Card>
        </Section>

        <Section title="Colour, spacing and corners" note="Colours are today's; the brand kit replaces them later.">
          <div className="ui-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
            {[["Green", "var(--color-green)"], ["Green tint", "var(--color-green-tint)"], ["Surface", "var(--color-surface)"],
              ["Line", "var(--line-color)"], ["Text", "var(--color-text)"], ["Subtle text", "var(--color-text-subtle)"],
              ["Error", "var(--color-error)"]].map(([name, v]) => (
              <div key={name} className="ui-swatch"><span style={{ background: v }} /><span>{name}</span></div>
            ))}
          </div>
          <Card className="ui-stack" style={{ gap: "var(--space-2)" }}>
            {[1, 2, 3, 4, 6, 8, 12].map(n => (
              <div key={n} className="ui-row" style={{ flexWrap: "nowrap" }}>
                <span className="ui-small" style={{ width: 64 }}>{n * 4}px</span>
                <span className="ui-space-bar" style={{ width: `var(--space-${n})` }} />
              </div>
            ))}
          </Card>
          <div className="ui-row">
            {[["Control 8px", "var(--radius-control)"], ["Card 12px", "var(--radius-card)"], ["Sheet 16px", "var(--radius-sheet)"]].map(([name, r]) => (
              <div key={name} className="ui-card ui-card--muted ui-small" style={{ borderRadius: r, minWidth: 120, textAlign: "center" }}>{name}</div>
            ))}
          </div>
        </Section>

        <Section title="Buttons" note="One primary action per screen. Hover, press and keyboard focus are all styled.">
          <Card className="ui-stack">
            <div className="ui-row">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Delete</Button>
            </div>
            <div className="ui-row">
              <Button icon="plus">Add plants</Button>
              <Button variant="secondary" icon="filter">Filter</Button>
              <Button loading>Saving</Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className="ui-row">
              <Button size="sm">Small primary</Button>
              <Button size="sm" variant="secondary">Small secondary</Button>
              <Button size="sm" variant="ghost">Small ghost</Button>
              <Button variant="secondary" iconOnly icon="close" aria-label="Close" />
              <Button variant="ghost" size="sm" iconOnly icon="chevronRight" aria-label="Open" />
            </div>
          </Card>
        </Section>

        <Section title="Inputs">
          <Card>
            <div className="ui-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "var(--space-4)" }}>
              <Field label="Plant name" hint="The common name, for example Celosia">
                <Input placeholder="Plant name" />
              </Field>
              <Field label="Variety" error="Enter a variety or leave it blank">
                <Input defaultValue="Flamingo Feather!!" />
              </Field>
              <Field label="Zone">
                <Select defaultValue="potager">
                  <option value="potager">Potager</option>
                  <option value="none">No zone</option>
                </Select>
              </Field>
              <Field label="Disabled">
                <Input disabled value="Can't edit this" readOnly />
              </Field>
            </div>
            <div className="ui-stack" style={{ marginTop: "var(--space-4)" }}>
              <Field label="Notes">
                <Textarea placeholder="What did you notice today?" />
              </Field>
              <Checkbox label="Show finished plants" />
            </div>
          </Card>
        </Section>

        <Section title="Tags and chips" note="Tags describe a thing. Chips are filters you've applied, and the cross removes them.">
          <div className="ui-row">
            <Tag tone="green">Sow now</Tag>
            <Tag tone="warn">Harvest now</Tag>
            <Tag>Season done</Tag>
            <Tag tone="error">Couldn't load</Tag>
          </div>
        </Section>

        <Section title="List toolbar" note="The same search, filter, sort and view pattern for Plants, Today and Calendar. Filters open in a sheet; applied ones stay on the page.">
          <div className="ui-stack" style={{ gap: "var(--space-3)" }}>
            <div className="ui-row" style={{ flexWrap: "nowrap" }}>
              <SearchInput placeholder="Search plants" label="Search plants" />
              <Button variant="secondary" icon="filter">Filter<span className="ui-tag ui-tag--green">{filters.length}</span></Button>
            </div>
            <div className="ui-row" style={{ justifyContent: "space-between" }}>
              <div className="ui-row">
                {filters.map(f => (
                  <Chip key={f} onRemove={() => setFilters(fs => fs.filter(x => x !== f))}>{f}</Chip>
                ))}
                {filters.length > 0 && <Button variant="ghost" size="sm" onClick={() => setFilters([])}>Clear all</Button>}
                {filters.length === 0 && <Button variant="ghost" size="sm" onClick={() => setFilters(["Potager", "Harvest now"])}>Reset demo</Button>}
              </div>
              <div className="ui-row">
                <Select aria-label="Sort" defaultValue="name" style={{ width: "auto", minHeight: "var(--control-h-sm)" }}>
                  <option value="name">Sort: Name</option>
                  <option value="due">Sort: Due date</option>
                </Select>
                <Segmented label="View" value={view} onChange={setView}
                  options={[{ value: "list", label: "List" }, { value: "grid", label: "Grid" }]} />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Cards" note="Your real plants, shown as a list and as a grid. Tap targets are the whole row or card.">
          {view === "list" ? (
            <Card variant="flush">
              <ul className="ui-list">
                {sample.slice(0, shown).map(seed => {
                  const b = badge(seed);
                  return (
                    <li key={seed.id}>
                      <div className="ui-list-row">
                        <span aria-hidden="true">{seed.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="ui-subtitle">{seed.name}</div>
                          {seed.variety && <div className="ui-small">{seed.variety}</div>}
                        </div>
                        <Tag tone={TONE[b.type]}>{b.t.charAt(0) + b.t.slice(1).toLowerCase()}</Tag>
                        <Icon name="chevronRight" width="16" height="16" style={{ color: "var(--color-text-subtle)" }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : (
            <div className="ui-grid">
              {sample.slice(0, shown).map(seed => {
                const b = badge(seed);
                return (
                  <Card key={seed.id} interactive className="ui-stack" style={{ gap: "var(--space-2)" }}>
                    <div className="ui-row" style={{ justifyContent: "space-between" }}>
                      <span aria-hidden="true" style={{ fontSize: "1.5rem" }}>{seed.emoji}</span>
                      <Tag tone={TONE[b.type]}>{b.t.charAt(0) + b.t.slice(1).toLowerCase()}</Tag>
                    </div>
                    <div>
                      <div className="ui-subtitle">{seed.name}</div>
                      {seed.variety && <div className="ui-small">{seed.variety}</div>}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          <div className="ui-stack" style={{ alignItems: "center", gap: "var(--space-2)" }}>
            <p className="ui-small">Showing {Math.min(shown, sample.length)} of {sample.length}</p>
            {shown < sample.length && (
              <Button variant="secondary" onClick={() => setShown(n => n + 8)}>Show 8 more</Button>
            )}
          </div>
        </Section>

        <Section title="Content card">
          <Card>
            <div className="ui-card__header">
              <h3 className="ui-subtitle">Today</h3>
              <Button variant="ghost" size="sm">See all</Button>
            </div>
            <p className="ui-small">Card padding, header spacing and the "See all" link are the same on every card.</p>
          </Card>
        </Section>

        <div className="ui-action-bar">
          <Button variant="secondary">Cancel</Button>
          <Button icon="plus">Add plants</Button>
        </div>
      </div>
    </>
  );
}
