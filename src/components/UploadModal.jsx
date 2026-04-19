import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSeedsContext } from "../context/SeedsContext";
import { fromImage, fromText, fromURL, fromURLQuick, fromImageQuick, fromGoogleDoc, groupPhotos } from "../lib/claude";
import { supabase } from "../lib/supabase";

function inferProvider(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return null; }
}

// Approximate dot colours for the bulk review list
const COLOR_DOT = {
  "Pink": "#f9a8d4",
  "Coral pink": "#fb923c",
  "White": "#cbd5e1",
  "Yellow": "#fde68a",
  "Orange": "#fdba74",
  "Black": "#374151",
  "Multi": "#a78bfa",
  "Green": "#86efac",
  "Red": "#fca5a5",
  "Purple": "#c4b5fd",
  "Blue": "#93c5fd",
  "Grey": "#9ca3af",
  "Lavender/Purple": "#c4b5fd",
};

// Build a proxied export URL to avoid CORS — routes via Vite's /gdoc-proxy/ → docs.google.com
function getExportUrl(googleUrl) {
  const docMatch = googleUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  const sheetMatch = googleUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) return `/gdoc-proxy/document/d/${docMatch[1]}/export?format=txt`;
  if (sheetMatch) return `/gdoc-proxy/spreadsheets/d/${sheetMatch[1]}/export?format=csv`;
  return null;
}

async function fetchDocText(googleUrl) {
  const exportUrl = getExportUrl(googleUrl);
  if (!exportUrl) throw new Error("Could not parse Google Doc URL");
  let response;
  try {
    response = await fetch(exportUrl);
  } catch {
    throw new Error("403_ACCESS_DENIED");
  }
  if (response.status === 403 || response.status === 401) throw new Error("403_ACCESS_DENIED");
  if (!response.ok) throw new Error(`Could not fetch document (${response.status}). Make sure your Google Doc is set to "Anyone with the link can view".`);
  return response.text();
}


export default function UploadModal({ isOpen, onClose, editSeedId = null, editSeedName = "" }) {
  const { addSeed, addSeeds, updateSeed, seeds, zones } = useSeedsContext();
  const navigate = useNavigate();

  // Input step state
  const [images, setImages] = useState([]);
  const [urlVal, setUrlVal] = useState("");
  const [nameVal, setNameVal] = useState("");
  const [selectedCatalogEntry, setSelectedCatalogEntry] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [error, setLocalError] = useState(null);

  // Step machine: "input" | "zone" | "bulkReview"
  const [step, setStep] = useState("input");
  const [zoneData, setZoneData] = useState(null); // { displayName, inputs }
  const [lastUsedZoneId, setLastUsedZoneId] = useState(null);

  // Bulk review state
  const [bulkItems, setBulkItems] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState(null);
  const [bulkTruncated, setBulkTruncated] = useState(null); // original count if > 200
  const [bulkDocText, setBulkDocText] = useState(""); // resolved text passed to Claude
  const [bulkMode, setBulkMode] = useState(null); // "doc" | "photos"
  const [bulkPhotos, setBulkPhotos] = useState([]); // captured photos for grouping

  const fileRef = useRef();

  const hasInput = images.length > 0 || urlVal.trim() || selectedCatalogEntry;
  const isGoogleDocUrl = urlVal.trim().includes("docs.google.com/document") || urlVal.trim().includes("docs.google.com/spreadsheets");
  const isBulkImport = isGoogleDocUrl;

  // Autocomplete: query Supabase live as user types
  useEffect(() => {
    if (!nameVal.trim() || nameVal.length < 2) { setSuggestions([]); setHighlightedIndex(-1); return; }
    // Already selected — don't re-query
    if (selectedCatalogEntry && nameVal === selectedCatalogEntry.name) { setSuggestions([]); return; }
    if (selectedCatalogEntry) setSelectedCatalogEntry(null);
    let cancelled = false;
    supabase.from("catalog_entries")
      .select("name, category, provider, url")
      .ilike("name", `%${nameVal}%`)
      .limit(6)
      .then(({ data }) => {
        if (!cancelled) { setSuggestions(data || []); setHighlightedIndex(-1); }
      });
    return () => { cancelled = true; };
  }, [nameVal]);

  // Pre-fill name when opening in edit mode
  useEffect(() => {
    if (isOpen && editSeedId && editSeedName) {
      setNameVal(editSeedName);
    }
  }, [isOpen]);

  // Trigger bulk parse/group when step becomes bulkReview
  useEffect(() => {
    if (step !== "bulkReview") return;
    setBulkLoading(true);
    setBulkError(null);
    setBulkItems([]);
    setBulkTruncated(null);

    if (bulkMode === "photos") {
      // ── Photo grouping path ────────────────────────────────────────────────
      Promise.all(bulkPhotos.map(async img => ({
        b64: await fileToBase64(img.file),
        mime: img.file.type,
        filename: img.file.name,
        preview: img.preview,
      })))
        .then(async b64Photos => {
          const groups = await groupPhotos(b64Photos);
          const existingNames = new Set(seeds.map(s => s.name.toLowerCase()));
          // Phase 1 for each group's primary photo to get name/emoji quickly
          const items = await Promise.all(groups.map(async (group, i) => {
            const primary = b64Photos[group.indices[0]];
            let quickData = {};
            try { quickData = await fromImageQuick(primary.b64, primary.mime, primary.filename); } catch { /* keep empty */ }
            const name = quickData.name || `Photo group ${i + 1}`;
            return {
              _id: `bulk-photo-${i}`,
              name,
              colorGroup: null,
              height: null,
              photos: group.indices.map(idx => b64Photos[idx]),
              quickData,
              catalogMatch: null,
              isDuplicate: existingNames.has(name.toLowerCase()),
              zoneId: lastUsedZoneId,
              error: !quickData.name,
              rawText: !quickData.name ? `Group ${i + 1}: ${group.indices.length} photo(s)` : null,
            };
          }));
          setBulkItems(items);
        })
        .catch(err => setBulkError(err.message))
        .finally(() => setBulkLoading(false));
    } else {
      // ── Doc import path ────────────────────────────────────────────────────
      const getText = bulkDocText
        ? Promise.resolve(bulkDocText)
        : fetchDocText(urlVal.trim());

      getText
        .then(text => fromGoogleDoc(text))
        .then(parsed => {
          const original = parsed.length;
          const limited = parsed.slice(0, 200);
          if (original > 200) setBulkTruncated(original);
          const existingNames = new Set(seeds.map(s => s.name.toLowerCase()));
          setBulkItems(limited.map((item, i) => ({
            ...item,
            _id: `bulk-${i}`,
            catalogMatch: null,
            isDuplicate: item.error ? false : existingNames.has(item.name.toLowerCase()),
            zoneId: lastUsedZoneId,
          })));
        })
        .catch(err => setBulkError(err.message))
        .finally(() => setBulkLoading(false));
    }
  }, [step]); // intentionally only re-runs when step changes

  function handleFileChange(e) {
    const files = Array.from(e.target.files);
    setImages(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))]);
    e.target.value = "";
  }

  function removeImage(index) {
    setImages(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function selectSuggestion(s) {
    setNameVal(s.name);
    setSelectedCatalogEntry(s);
    setSuggestions([]);
    setHighlightedIndex(-1);
  }

  function handleClose() {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setUrlVal("");
    setNameVal("");
    setSelectedCatalogEntry(null);
    setSuggestions([]);
    setLocalError(null);
    setStep("input");
    setZoneData(null);
    setBulkItems([]);
    setBulkLoading(false);
    setBulkError(null);
    setBulkTruncated(null);
    setBulkDocText("");
    setBulkMode(null);
    setBulkPhotos([]);
    onClose();
  }

  async function handleZoneSelect(zoneId) {
    if (!zoneData) return;
    const { displayName, inputs } = zoneData;
    const zone = zoneId ? { zoneId } : {};
    if (zoneId) setLastUsedZoneId(zoneId);

    let seedId;
    try {
      seedId = await addSeed({ name: displayName, emoji: "🌱", loading: true, ...zone });
    } catch (err) {
      setLocalError(`Failed to save plant: ${err.message}`);
      return;
    }
    handleClose();

    try {
      const quickData = await resolveQuickData(inputs);
      updateSeed(seedId, { ...quickData, loading: false, enriching: true, ...zone });

      // Auto-contribute to catalog if this URL isn't already there
      if (inputs.urlVal && !inputs.selectedCatalogEntry && quickData.name) {
        supabase.from("catalog_entries").insert({
          name: quickData.name,
          category: quickData.category || null,
          provider: inferProvider(inputs.urlVal),
          url: inputs.urlVal,
          verified: false,
        }).then(); // fire and forget — ignore errors (e.g. duplicate URL)
      }

      const fullData = await resolveSeedData(inputs);
      updateSeed(seedId, { ...fullData, enriching: false, ...zone });
    } catch (err) {
      updateSeed(seedId, { loading: false, enriching: false, fetchError: err.message });
    }
  }

  function handleSubmit() {
    if (!hasInput || step !== "input") return;
    setLocalError(null);

    // Edit mode: update existing plant, skip zone step entirely
    if (editSeedId) {
      const inputs = { images: [...images], urlVal, nameVal, selectedCatalogEntry };
      handleClose();
      updateSeed(editSeedId, { enriching: true, fetchError: null });
      (async () => {
        try {
          const quickData = await resolveQuickData(inputs);
          updateSeed(editSeedId, { ...quickData, enriching: true });
          const fullData = await resolveSeedData(inputs);
          updateSeed(editSeedId, { ...fullData, enriching: false });
        } catch (err) {
          updateSeed(editSeedId, { enriching: false, fetchError: err.message });
        }
      })();
      return;
    }

    // Multiple photos → group with Claude then show bulk review
    if (images.length > 1) {
      setBulkMode("photos");
      setBulkPhotos([...images]);
      setStep("bulkReview");
      return;
    }
    // Google Doc URL path: fetch will happen in the useEffect
    if (isGoogleDocUrl) {
      setBulkMode("doc");
      setBulkDocText(""); // clear any previous paste
      setStep("bulkReview");
      return;
    }
    const displayName =
      selectedCatalogEntry?.name ||
      (urlVal.trim() ? "Fetching from URL…" : null) ||
      (images.length > 0 ? "Photo upload" : null) ||
      nameVal.trim() || "your plant";
    setZoneData({ displayName, inputs: { images: [...images], urlVal, nameVal, selectedCatalogEntry } });
    setStep("zone");
  }

  function updateBulkItem(id, changes) {
    setBulkItems(prev => prev.map(i => i._id === id ? { ...i, ...changes } : i));
  }

  function removeBulkItem(id) {
    setBulkItems(prev => prev.filter(i => i._id !== id));
  }

  async function handleBulkImport() {
    const validItems = bulkItems.filter(i => !i.error);
    if (validItems.length === 0) return;

    const stubs = validItems.map(item => ({
      name: item.catalogMatch?.name || item.name,
      emoji: "🌱",
      loading: true,
      color: item.colorGroup || null,
      ...(item.zoneId ? { zoneId: item.zoneId } : {}),
    }));

    let seedIds;
    try {
      seedIds = await addSeeds(stubs);
    } catch (err) {
      setBulkError(`Failed to save plants: ${err.message}`);
      return;
    }
    handleClose();
    navigate("/seeds");

    // Enrich sequentially — one plant at a time to stay within API rate limits.
    // All stubs are already visible on the plants list; cards fill in as each completes.
    (async () => {
      for (let i = 0; i < seedIds.length; i++) {
        const seedId = seedIds[i];
        const item = validItems[i];
        const zone = item.zoneId ? { zoneId: item.zoneId } : {};
        const inputs = item.photos?.length
          ? { images: item.photos.map(p => ({ file: { ...p, type: p.mime }, ...p })), urlVal: "", nameVal: item.name, selectedCatalogEntry: null }
          : { images: [], urlVal: item.catalogMatch?.url || "", nameVal: item.catalogMatch?.name || item.name, selectedCatalogEntry: item.catalogMatch || null };

        try {
          const quickData = await resolveQuickData(inputs);
          updateSeed(seedId, { ...quickData, loading: false, enriching: true, color: item.colorGroup || null, ...zone });
          const fullData = await resolveSeedData(inputs);
          updateSeed(seedId, { ...fullData, enriching: false, color: item.colorGroup || null, ...zone });
        } catch (err) {
          updateSeed(seedId, { loading: false, enriching: false, fetchError: err.message });
          // Continue to the next plant even if this one failed
        }
      }
    })();
  }

  if (!isOpen) return null;

  const hasUnresolvedErrors = bulkItems.some(i => i.error);
  const importableCount = bulkItems.filter(i => !i.error).length;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "var(--color-overlay)", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-md)" }}
      onClick={e => e.target === e.currentTarget && handleClose()}
    >
      <div style={{ background: "var(--color-bg)", borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-md) var(--radius-md)", width: "100%", maxWidth: "var(--max-width)", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}>

        {/* Scrollable content */}
        <div style={{ overflow: "auto", flex: 1, padding: "var(--space-xl)" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-xl)" }}>
            <h2>{editSeedId ? "Edit Plant" : "Add Plants"}</h2>
            <button onClick={handleClose} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--color-text-muted)", minHeight: "auto", padding: "var(--space-xs)", lineHeight: 1 }}>×</button>
          </div>

          {/* Zone assignment step */}
          {step === "zone" && zoneData && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "var(--space-xl)" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "var(--space-sm)", color: "var(--color-green)" }}>✓</div>
                <h2 style={{ marginBottom: "var(--space-xs)" }}>{zoneData.displayName}</h2>
                <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)", margin: 0 }}>Which garden zone does it belong to?</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", marginBottom: "var(--space-xl)" }}>
                {zones.map(zone => (
                  <button
                    key={zone.id}
                    onClick={() => handleZoneSelect(zone.id)}
                    style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", padding: "var(--space-md) var(--space-lg)", background: "var(--color-bg)", border: `2px solid ${zone.borderColor}`, borderRadius: "var(--radius-md)", cursor: "pointer", textAlign: "left", minHeight: "var(--touch-target)", transition: "background 0.15s ease", width: "100%" }}
                    onMouseEnter={e => e.currentTarget.style.background = zone.color}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--color-bg)"}
                  >
                    <span style={{ fontSize: "1.5rem", lineHeight: 1, flexShrink: 0 }}>{zone.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "var(--text-body)" }}>{zone.name}</div>
                      <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>{zone.description}</div>
                    </div>
                  </button>
                ))}
              </div>
              {error && (
                <p style={{ color: "var(--color-error)", fontSize: "var(--text-small)", textAlign: "center", marginBottom: "var(--space-md)" }}>{error}</p>
              )}
              <button className="btn-ghost" onClick={() => handleZoneSelect(null)} style={{ width: "100%", justifyContent: "center", display: "flex" }}>Skip for now</button>
            </div>
          )}

          {/* Bulk review step */}
          {step === "bulkReview" && (
            <BulkReviewStep
              loading={bulkLoading}
              error={bulkError}
              items={bulkItems}
              truncated={bulkTruncated}
              zones={zones}
              onUpdateItem={updateBulkItem}
              onRemoveItem={removeBulkItem}
              onBack={() => setStep("input")}
            />
          )}

          {/* Input form */}
          {step === "input" && <>

            {/* Method 1: Name search */}
            <div style={{ marginBottom: "var(--space-xl)", position: "relative" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)", fontSize: "var(--text-body)" }}>
                Search by plant name
                <span style={{ fontSize: "var(--text-nav)", color: "var(--color-text-muted)", fontWeight: 400 }}>Optional</span>
              </label>
              <input
                type="text"
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                placeholder="e.g. Sun Gold Tomato, Genovese Basil..."
                autoComplete="off"
                onKeyDown={e => {
                  if (!suggestions.length) return;
                  if (e.key === "ArrowDown") { e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, suggestions.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, 0)); }
                  else if (e.key === "Enter" && highlightedIndex >= 0) { e.preventDefault(); selectSuggestion(suggestions[highlightedIndex]); }
                  else if (e.key === "Escape") { setSuggestions([]); setHighlightedIndex(-1); }
                }}
              />
              {suggestions.length > 0 && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% - var(--space-xs))",
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  border: "1.5px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  maxHeight: 240,
                  overflowY: "auto",
                  background: "var(--color-bg)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                }}>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => selectSuggestion(s)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "var(--space-sm) var(--space-md)", background: i === highlightedIndex ? "var(--color-green-pale)" : "none", border: "none", borderBottom: i < suggestions.length - 1 ? "1px solid var(--color-border)" : "none", cursor: "pointer", textAlign: "left", minHeight: "var(--touch-target)", borderRadius: 0 }}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      onMouseLeave={() => setHighlightedIndex(-1)}
                    >
                      <span style={{ fontSize: "var(--text-body)", color: "var(--color-text)", fontWeight: 500 }}>{s.name}</span>
                      <span style={{ fontSize: "var(--text-nav)", color: "var(--color-text-muted)" }}>{s.provider}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <hr className="divider" />

            {/* Method 2: Photos */}
            <div style={{ marginBottom: "var(--space-xl)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)", fontSize: "var(--text-body)" }}>
                Upload seed packet photos
                <span style={{ fontSize: "var(--text-nav)", color: "var(--color-text-muted)", fontWeight: 400 }}>Optional</span>
              </label>
              <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" onChange={handleFileChange} style={{ display: "none" }} />
              {images.length === 0 ? (
                <button className="btn-ghost" onClick={() => fileRef.current.click()} style={{ width: "100%", justifyContent: "center", display: "flex", gap: "var(--space-sm)" }}>
                  📷 Upload photos
                </button>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
                  {images.map((img, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <img src={img.preview} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--color-border)" }} />
                      <button onClick={() => removeImage(i)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "var(--color-error)", color: "#fff", border: "none", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, minHeight: "auto", padding: 0 }}>×</button>
                    </div>
                  ))}
                  <button className="btn-ghost" onClick={() => fileRef.current.click()} style={{ width: 72, height: 72, justifyContent: "center", display: "flex", alignItems: "center", flexDirection: "column", gap: 4, fontSize: "var(--text-nav)", minHeight: "auto", padding: 0 }}>+<br />Add</button>
                </div>
              )}
            </div>

            <hr className="divider" />

            {/* Method 3: URL or Google Doc */}
            <div style={{ marginBottom: "var(--space-md)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)", fontSize: "var(--text-body)" }}>
                Paste a URL or Google Doc link
                <span style={{ fontSize: "var(--text-nav)", color: "var(--color-text-muted)", fontWeight: 400 }}>Optional</span>
              </label>
              <input type="url" value={urlVal} onChange={e => setUrlVal(e.target.value)} placeholder="Seed page URL or Google Doc / Sheet link…" />
              {isGoogleDocUrl && (
                <p style={{ fontSize: "var(--text-nav)", color: "var(--color-green)", marginTop: "var(--space-xs)" }}>
                  Google Doc detected — will import as a list of plants
                </p>
              )}
            </div>
          </>}

        </div>

        {/* Sticky footer — input step */}
        {step === "input" && (
          <div style={{ padding: "var(--space-md) var(--space-xl) var(--space-xl)", borderTop: "1.5px solid var(--color-border)", background: "var(--color-bg)", borderRadius: "0 0 var(--radius-md) var(--radius-md)" }}>
            {error && (
              <div style={{ background: "rgba(192,57,43,0.06)", border: "1.5px solid rgba(192,57,43,0.3)", borderRadius: "var(--radius-sm)", padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
                <div style={{ fontSize: "var(--text-nav)", fontWeight: 700, color: "var(--color-error)", marginBottom: "var(--space-xs)" }}>Error</div>
                <p style={{ fontSize: "var(--text-small)", color: "var(--color-text)", margin: 0 }}>{error}</p>
              </div>
            )}
            <button className="btn-primary" onClick={handleSubmit} disabled={!hasInput} style={{ width: "100%", justifyContent: "center", fontSize: "var(--text-body)", padding: "var(--space-md)" }}>
              {editSeedId ? "Update Plant" : isBulkImport ? "Import Plants" : "Add Plant"}
            </button>
          </div>
        )}

        {/* Sticky footer — bulk review step */}
        {step === "bulkReview" && !bulkLoading && !bulkError && bulkItems.length > 0 && (
          <div style={{ padding: "var(--space-md) var(--space-xl) var(--space-xl)", borderTop: "1.5px solid var(--color-border)", background: "var(--color-bg)", borderRadius: "0 0 var(--radius-md) var(--radius-md)" }}>
            <button
              className="btn-primary"
              onClick={handleBulkImport}
              disabled={hasUnresolvedErrors || importableCount === 0}
              style={{ width: "100%", justifyContent: "center", fontSize: "var(--text-body)", padding: "var(--space-md)" }}
            >
              {hasUnresolvedErrors
                ? `Remove ${bulkItems.filter(i => i.error).length} error${bulkItems.filter(i => i.error).length !== 1 ? "s" : ""} to continue`
                : `Import ${importableCount} plant${importableCount !== 1 ? "s" : ""}`}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Bulk review sub-components ───────────────────────────────────────────────

function BulkReviewStep({ loading, error, items, truncated, zones, onUpdateItem, onRemoveItem, onBack }) {
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "var(--space-2xl) 0" }}>
        <div style={{ fontSize: "2rem", marginBottom: "var(--space-md)" }}>📄</div>
        <p style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>Reading your document and identifying plants…</p>
        <p style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", marginTop: "var(--space-sm)" }}>This may take 10–20 seconds</p>
        <div style={{ height: 3, background: "var(--color-border)", borderRadius: 2, overflow: "hidden", marginTop: "var(--space-xl)", maxWidth: 200, margin: "var(--space-xl) auto 0" }}>
          <div className="animate-pulse" style={{ height: "100%", width: "60%", background: "var(--color-green)", borderRadius: 2 }} />
        </div>
      </div>
    );
  }

  if (error === "403_ACCESS_DENIED") {
    return (
      <div>
        <div style={{ background: "rgba(245,158,11,0.06)", border: "1.5px solid rgba(245,158,11,0.4)", borderRadius: "var(--radius-sm)", padding: "var(--space-lg)", marginBottom: "var(--space-xl)" }}>
          <div style={{ fontWeight: 700, color: "#92400e", marginBottom: "var(--space-sm)" }}>Your Google Doc needs to be set to public</div>
          <p style={{ fontSize: "var(--text-small)", margin: "0 0 var(--space-md)", color: "var(--color-text)" }}>
            This app can only read documents that are shared publicly. Follow these steps in Google Docs, then try again:
          </p>
          <ol style={{ fontSize: "var(--text-small)", paddingLeft: "var(--space-lg)", margin: 0, lineHeight: 2, color: "var(--color-text)" }}>
            <li>Open your document in Google Docs</li>
            <li>Click <strong>Share</strong> in the top-right corner</li>
            <li>Under "General access", change it to <strong>Anyone with the link</strong></li>
            <li>Make sure the role is set to <strong>Viewer</strong></li>
            <li>Click <strong>Done</strong>, then paste the link here again</li>
          </ol>
        </div>
        <button className="btn-ghost" onClick={onBack} style={{ width: "100%", justifyContent: "center", display: "flex" }}>← Back</button>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div style={{ background: "rgba(192,57,43,0.06)", border: "1.5px solid rgba(192,57,43,0.3)", borderRadius: "var(--radius-sm)", padding: "var(--space-lg)", marginBottom: "var(--space-xl)" }}>
          <div style={{ fontWeight: 700, color: "var(--color-error)", marginBottom: "var(--space-sm)" }}>Could not read document</div>
          <p style={{ fontSize: "var(--text-small)", margin: 0 }}>{error}</p>
        </div>
        <button className="btn-ghost" onClick={onBack} style={{ width: "100%", justifyContent: "center", display: "flex" }}>← Back</button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--space-2xl) 0" }}>
        <p style={{ color: "var(--color-text-muted)" }}>No plants found in the document.</p>
        <button className="btn-ghost" onClick={onBack} style={{ marginTop: "var(--space-md)" }}>← Back</button>
      </div>
    );
  }

  const errorCount = items.filter(i => i.error).length;

  return (
    <div>
      {/* Summary */}
      <div style={{ marginBottom: "var(--space-lg)" }}>
        <p style={{ fontWeight: 600, color: "var(--color-text)" }}>{items.length} plant{items.length !== 1 ? "s" : ""} found in your document</p>
        {errorCount > 0 && (
          <p style={{ fontSize: "var(--text-small)", color: "var(--color-error)", marginTop: "var(--space-xs)" }}>
            {errorCount} entr{errorCount !== 1 ? "ies" : "y"} couldn't be identified — remove them to continue
          </p>
        )}
        {truncated && (
          <p style={{ fontSize: "var(--text-small)", color: "#b45309", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "var(--radius-sm)", padding: "var(--space-sm) var(--space-md)", marginTop: "var(--space-sm)" }}>
            Your document has {truncated} plants — showing the first 200. Run another import for the rest.
          </p>
        )}
      </div>

      {/* Plant rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
        {items.map(item =>
          item.error ? (
            <ErrorRow key={item._id} item={item} onRemove={() => onRemoveItem(item._id)} />
          ) : (
            <PlantRow key={item._id} item={item} zones={zones} onUpdate={changes => onUpdateItem(item._id, changes)} onRemove={() => onRemoveItem(item._id)} />
          )
        )}
      </div>
    </div>
  );
}

function PlantRow({ item, zones, onUpdate, onRemove }) {
  const dot = COLOR_DOT[item.colorGroup] || null;
  const matchLabel = item.catalogMatch?.provider || null;
  // indent meta line to sit under the name text (past the dot)
  const metaIndent = (!item.photos?.length && dot) ? 16 : 0;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "var(--space-md)",
      padding: "10px var(--space-md)",
      border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)",
      background: item.isDuplicate ? "rgba(245,158,11,0.04)" : "var(--color-bg)",
    }}>

      {/* Thumbnail stack for photo-group items */}
      {item.photos?.length > 0 && (
        <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
          {item.photos.slice(0, 2).map((p, i) => (
            <img key={i} src={p.preview} alt="" style={{ position: "absolute", top: i * 4, left: i * 4, width: 28, height: 28, objectFit: "cover", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--color-border)" }} />
          ))}
        </div>
      )}

      {/* Left: name (with inline dot) + meta line */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name row — dot is inline so it naturally aligns with the text */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!item.photos?.length && dot && (
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />
          )}
          <span style={{
            fontWeight: 600, fontSize: "var(--text-body)", color: "var(--color-text)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {item.name}
          </span>
        </div>

        {/* Meta row — colour · height · status, indented under name */}
        <div style={{
          display: "flex", alignItems: "center", flexWrap: "wrap",
          gap: "var(--space-xs)", marginTop: 3, paddingLeft: metaIndent,
        }}>
          {item.colorGroup && (
            <span style={{ fontSize: "var(--text-nav)", color: "var(--color-text-muted)" }}>{item.colorGroup}</span>
          )}
          {item.colorGroup && item.height && <span style={{ color: "var(--color-border)", fontSize: "var(--text-nav)" }}>·</span>}
          {item.height && (
            <span style={{ fontSize: "var(--text-nav)", color: "var(--color-text-muted)" }}>↕ {item.height}</span>
          )}
          {(item.colorGroup || item.height) && <span style={{ color: "var(--color-border)", fontSize: "var(--text-nav)" }}>·</span>}
          {item.isDuplicate && (
            <span style={{ fontSize: "var(--text-nav)", color: "#b45309" }}>Already added</span>
          )}
          {!item.isDuplicate && matchLabel && (
            <span style={{ fontSize: "var(--text-nav)", color: "var(--color-green)" }}>✓ {matchLabel}</span>
          )}
          {!item.isDuplicate && !matchLabel && (
            <span style={{ fontSize: "var(--text-nav)", color: "var(--color-text-muted)" }}>New</span>
          )}
        </div>
      </div>

      {/* Right: zone picker + remove
          TODO: smart zone defaults by plant type (vegetables → Potager,
          flowers → Ball Court Beds). Will improve as usage patterns emerge. */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexShrink: 0 }}>
        <select
          value={item.zoneId || ""}
          onChange={e => onUpdate({ zoneId: e.target.value || null })}
          style={{
            fontSize: "var(--text-small)", padding: "6px 10px",
            borderRadius: "var(--radius-sm)", border: "1.5px solid var(--color-border)",
            background: "var(--color-bg)",
            color: item.zoneId ? "var(--color-text)" : "var(--color-text-muted)",
            cursor: "pointer", maxWidth: 148,
          }}
        >
          <option value="">No zone</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.emoji} {z.name}</option>)}
        </select>
        <button
          onClick={onRemove}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "1.1rem", lineHeight: 1, padding: "4px", minHeight: "auto", display: "flex", alignItems: "center" }}
        >×</button>
      </div>
    </div>
  );
}

function ErrorRow({ item, onRemove }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", padding: "var(--space-sm) var(--space-md)", border: "1.5px solid rgba(192,57,43,0.3)", borderRadius: "var(--radius-sm)", background: "rgba(192,57,43,0.04)" }}>
      <span style={{ flexShrink: 0 }}>⚠️</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--text-small)", color: "var(--color-error)", fontWeight: 600 }}>Couldn't identify</div>
        <div style={{ fontSize: "var(--text-nav)", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.rawText}</div>
      </div>
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "1.25rem", lineHeight: 1, padding: 0, minHeight: "auto", flexShrink: 0 }}>×</button>
    </div>
  );
}

// ─── Phase 1 + 2 resolution helpers ──────────────────────────────────────────

async function resolveQuickData({ images, urlVal, nameVal, selectedCatalogEntry }) {
  if (urlVal.trim()) return fromURLQuick(urlVal.trim());
  if (selectedCatalogEntry?.url) {
    return { name: selectedCatalogEntry.name, brand: selectedCatalogEntry.provider, brandWebsite: selectedCatalogEntry.url, emoji: "🌱" };
  }
  if (images.length > 0) {
    const img = images[0];
    const b64 = await fileToBase64(img.file);
    return fromImageQuick(b64, img.file.type, img.file.name);
  }
  return { name: nameVal.trim(), emoji: "🌱" };
}

async function resolveSeedData({ images, urlVal, nameVal, selectedCatalogEntry }) {
  if (images.length > 0) {
    const img = images[0];
    const b64 = await fileToBase64(img.file);
    return fromImage(b64, img.file.type, img.file.name);
  }
  if (urlVal.trim()) {
    const url = urlVal.trim();
    if (!url.startsWith("http")) throw new Error("Please enter a full URL starting with https://");
    return fromURL(url);
  }
  if (selectedCatalogEntry?.url) return fromURL(selectedCatalogEntry.url);
  return fromText(nameVal);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
