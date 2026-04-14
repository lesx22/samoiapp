import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const GARDEN_NAME = "Grand Samoï";
const SeedsContext = createContext(null);

// ─── Column mapping: Supabase (snake_case) ↔ App (camelCase) ─────────────────

function toApp(row) {
  return {
    id: row.id,
    gardenId: row.garden_id,
    zoneId: row.zone_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    name: row.name,
    variety: row.variety ?? null,
    scientific: row.scientific ?? null,
    brand: row.brand ?? null,
    brandWebsite: row.brand_website ?? null,
    emoji: row.emoji ?? "🌱",
    category: row.category ?? null,
    plantType: row.plant_type ?? null,
    color: row.color ?? null,
    description: row.description ?? null,
    sowMonths: row.sow_months ?? [],
    transplantMonths: row.transplant_months ?? [],
    harvestMonths: row.harvest_months ?? [],
    daysToMaturity: row.days_to_maturity ?? null,
    startMethod: row.start_method ?? null,
    zoneCompatibility: row.zone_compatibility ?? null,
    germinationTempC: row.germination_temp_c ?? null,
    germinationDays: row.germination_days ?? null,
    currentAdvice: row.current_advice ?? null,
    immediateNextStep: row.immediate_next_step ?? null,
    indoorCare: row.indoor_care ?? null,
    hardeningOff: row.hardening_off ?? null,
    transplanting: row.transplanting ?? null,
    inGroundManagement: row.in_ground_management ?? null,
    harvest: row.harvest ?? null,
    companions: row.companions ?? [],
    avoid: row.avoid ?? [],
    sources: row.sources ?? [],
    youtubeVideos: row.youtube_videos ?? [],
    // Always reset loading/enriching on load — enrichment can't resume after refresh
    loading: false,
    enriching: false,
    fetchError: row.fetch_error ?? null,
  };
}

const APP_TO_DB = {
  gardenId: "garden_id",
  zoneId: "zone_id",
  createdBy: "created_by",
  name: "name",
  variety: "variety",
  scientific: "scientific",
  brand: "brand",
  brandWebsite: "brand_website",
  emoji: "emoji",
  category: "category",
  plantType: "plant_type",
  color: "color",
  description: "description",
  sowMonths: "sow_months",
  transplantMonths: "transplant_months",
  harvestMonths: "harvest_months",
  daysToMaturity: "days_to_maturity",
  startMethod: "start_method",
  zoneCompatibility: "zone_compatibility",
  germinationTempC: "germination_temp_c",
  germinationDays: "germination_days",
  currentAdvice: "current_advice",
  immediateNextStep: "immediate_next_step",
  indoorCare: "indoor_care",
  hardeningOff: "hardening_off",
  transplanting: "transplanting",
  inGroundManagement: "in_ground_management",
  harvest: "harvest",
  companions: "companions",
  avoid: "avoid",
  sources: "sources",
  youtubeVideos: "youtube_videos",
  loading: "loading",
  enriching: "enriching",
  fetchError: "fetch_error",
};

function toDb(seed) {
  const row = {};
  for (const [appKey, dbKey] of Object.entries(APP_TO_DB)) {
    if (seed[appKey] !== undefined) row[dbKey] = seed[appKey];
  }
  return row;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SeedsProvider({ children }) {
  const [seeds, setSeeds] = useState([]);
  const [diary, setDiary] = useState({});
  const [gardenId, setGardenId] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [error, setError] = useState(null);
  const [completedTasks, setCompletedTasks] = useState(new Set());

  // Load garden, plants, and task completions on mount
  useEffect(() => {
    async function init() {
      const { data: garden, error: gErr } = await supabase
        .from("gardens")
        .select("id")
        .eq("name", GARDEN_NAME)
        .single();

      if (gErr || !garden) {
        setError("Could not connect to garden database. Check your Supabase credentials.");
        setInitializing(false);
        return;
      }
      setGardenId(garden.id);

      const { data: plants, error: pErr } = await supabase
        .from("plants")
        .select("*")
        .eq("garden_id", garden.id)
        .order("created_at", { ascending: false });

      if (pErr) {
        setError(pErr.message);
      } else {
        setSeeds((plants || []).map(toApp));
      }

      const { data: completions } = await supabase
        .from("task_completions")
        .select("plant_id, task_type");

      if (completions) {
        setCompletedTasks(new Set(completions.map(c => `${c.plant_id}-${c.task_type}`)));
      }

      setInitializing(false);
    }
    init();
  }, []);

  // ── Plants ──────────────────────────────────────────────────────────────────

  async function addSeed(seed) {
    const row = toDb({ ...seed, gardenId });
    const { data, error } = await supabase
      .from("plants")
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const appSeed = toApp(data);
    setSeeds(prev => [appSeed, ...prev]);
    return appSeed.id;
  }

  async function addSeeds(plantsArray) {
    const rows = plantsArray.map(p => toDb({ ...p, gardenId }));
    const { data, error } = await supabase
      .from("plants")
      .insert(rows)
      .select();
    if (error) throw new Error(error.message);
    const appSeeds = (data || []).map(toApp);
    setSeeds(prev => [...appSeeds, ...prev]);
    return appSeeds.map(s => s.id);
  }

  async function updateSeed(id, updates) {
    // Optimistic local update so UI stays responsive during enrichment
    setSeeds(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    const row = toDb(updates);
    if (Object.keys(row).length > 0) {
      const { error } = await supabase.from("plants").update(row).eq("id", id);
      if (error) console.error("updateSeed:", error.message);
    }
  }

  async function removeSeed(id) {
    setSeeds(prev => prev.filter(s => s.id !== id));
    const { error } = await supabase.from("plants").delete().eq("id", id);
    if (error) console.error("removeSeed:", error.message);
  }

  function getSeed(id) {
    return seeds.find(s => s.id === id) ?? null;
  }

  async function assignZone(seedId, zoneId) {
    setSeeds(prev => prev.map(s => s.id === seedId ? { ...s, zoneId } : s));
    const { error } = await supabase.from("plants").update({ zone_id: zoneId }).eq("id", seedId);
    if (error) console.error("assignZone:", error.message);
  }

  function getSeedsByZone(zoneId) {
    return seeds.filter(s => s.zoneId === zoneId);
  }

  // ── Diary ───────────────────────────────────────────────────────────────────

  async function loadDiaryEntries(seedId) {
    if (diary[seedId] !== undefined) return; // already loaded
    const { data, error } = await supabase
      .from("diary_entries")
      .select("*")
      .eq("plant_id", seedId)
      .order("created_at", { ascending: false });
    if (error) { console.error("loadDiaryEntries:", error.message); return; }
    setDiary(prev => ({
      ...prev,
      [seedId]: (data || []).map(r => ({
        id: r.id,
        date: r.date,
        text: r.text,
        photo: r.photo_url ?? null,
        userId: r.user_id ?? null,
      })),
    }));
  }

  async function addDiaryEntry(seedId, entry) {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("diary_entries")
      .insert({
        garden_id: gardenId,
        plant_id: seedId,
        date: today,
        text: entry.text,
        photo_url: entry.photo ?? null,
      })
      .select()
      .single();
    if (error) { console.error("addDiaryEntry:", error.message); return; }
    setDiary(prev => ({
      ...prev,
      [seedId]: [
        { id: data.id, date: data.date, text: data.text, photo: data.photo_url ?? null },
        ...(prev[seedId] ?? []),
      ],
    }));
  }

  function getDiaryEntries(seedId) {
    return diary[seedId] ?? [];
  }

  // ── Tasks ───────────────────────────────────────────────────────────────────

  async function toggleTask(seedId, taskType) {
    const key = `${seedId}-${taskType}`;
    const isDone = completedTasks.has(key);
    // Optimistic update
    setCompletedTasks(prev => {
      const next = new Set(prev);
      isDone ? next.delete(key) : next.add(key);
      return next;
    });
    if (isDone) {
      const { error } = await supabase
        .from("task_completions")
        .delete()
        .eq("plant_id", seedId)
        .eq("task_type", taskType);
      if (error) console.error("toggleTask delete:", error.message);
    } else {
      const { error } = await supabase
        .from("task_completions")
        .upsert({ plant_id: seedId, task_type: taskType });
      if (error) console.error("toggleTask upsert:", error.message);
    }
  }

  function isTaskDone(seedId, taskType) {
    return completedTasks.has(`${seedId}-${taskType}`);
  }

  return (
    <SeedsContext.Provider value={{
      seeds, loading, loadMsg, error, initializing, gardenId,
      setLoading, setLoadMsg, setError,
      addSeed, addSeeds, updateSeed, removeSeed, getSeed,
      assignZone, getSeedsByZone,
      loadDiaryEntries, addDiaryEntry, getDiaryEntries,
      toggleTask, isTaskDone,
    }}>
      {children}
    </SeedsContext.Provider>
  );
}

export function useSeedsContext() {
  const ctx = useContext(SeedsContext);
  if (!ctx) throw new Error("useSeedsContext must be used inside SeedsProvider");
  return ctx;
}
