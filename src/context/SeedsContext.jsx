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
  const [zones, setZones] = useState([]);
  const [diary, setDiary] = useState({});
  const [gardenId, setGardenId] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [error, setError] = useState(null);
  const [completedTasks, setCompletedTasks] = useState(new Set());
  const [zoneTasks, setZoneTasks] = useState({});
  const [zoneDiary, setZoneDiary] = useState({});
  const [gardenBgImage, setGardenBgImage] = useState(null);

  // Load garden, zones, plants, and task completions on mount
  useEffect(() => {
    async function init() {
      const { data: garden, error: gErr } = await supabase
        .from("gardens")
        .select("id, background_image_url")
        .eq("name", GARDEN_NAME)
        .single();

      if (gErr || !garden) {
        setError("Could not connect to garden database. Check your Supabase credentials.");
        setInitializing(false);
        return;
      }
      setGardenId(garden.id);
      setGardenBgImage(garden.background_image_url ?? null);

      const [
        { data: zonesData },
        { data: plants, error: pErr },
        { data: completions },
      ] = await Promise.all([
        supabase.from("zones").select("*").eq("garden_id", garden.id),
        supabase.from("plants").select("*").eq("garden_id", garden.id).order("created_at", { ascending: false }),
        supabase.from("task_completions").select("plant_id, task_type"),
      ]);

      setZones((zonesData || []).map(r => ({
        id: r.id,
        name: r.name,
        emoji: r.emoji ?? null,
        description: r.description ?? null,
        color: r.color ?? null,
        borderColor: r.border_color ?? null,
        hotspot: r.hotspot ?? {},
      })));

      if (pErr) {
        setError(pErr.message);
      } else {
        setSeeds((plants || []).map(toApp));
      }

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

  function getZone(id) {
    return zones.find(z => z.id === id) ?? null;
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

  // ── Zone Tasks ───────────────────────────────────────────────────────────────

  async function loadZoneTasks(zoneId) {
    if (zoneTasks[zoneId] !== undefined) return;
    const { data, error } = await supabase.from("zone_tasks").select("*").eq("zone_id", zoneId).order("created_at");
    if (error) { console.error("loadZoneTasks:", error.message); return; }
    setZoneTasks(prev => ({ ...prev, [zoneId]: (data || []).map(r => ({ id: r.id, title: r.title, description: r.description ?? null, dueDate: r.due_date ?? null, completed: r.completed })) }));
  }

  async function addZoneTask(zoneId, { title, description, dueDate }) {
    const { data, error } = await supabase.from("zone_tasks").insert({ zone_id: zoneId, garden_id: gardenId, title, description: description || null, due_date: dueDate || null, completed: false }).select().single();
    if (error) { console.error("addZoneTask:", error.message); return; }
    setZoneTasks(prev => ({ ...prev, [zoneId]: [...(prev[zoneId] ?? []), { id: data.id, title: data.title, description: data.description ?? null, dueDate: data.due_date ?? null, completed: false }] }));
  }

  async function toggleZoneTask(zoneId, taskId) {
    const task = zoneTasks[zoneId]?.find(t => t.id === taskId);
    if (!task) return;
    const newCompleted = !task.completed;
    setZoneTasks(prev => ({ ...prev, [zoneId]: prev[zoneId].map(t => t.id === taskId ? { ...t, completed: newCompleted } : t) }));
    const { error } = await supabase.from("zone_tasks").update({ completed: newCompleted }).eq("id", taskId);
    if (error) console.error("toggleZoneTask:", error.message);
  }

  async function deleteZoneTask(zoneId, taskId) {
    setZoneTasks(prev => ({ ...prev, [zoneId]: prev[zoneId].filter(t => t.id !== taskId) }));
    const { error } = await supabase.from("zone_tasks").delete().eq("id", taskId);
    if (error) console.error("deleteZoneTask:", error.message);
  }

  function getZoneTasks(zoneId) { return zoneTasks[zoneId] ?? []; }

  // ── Zone Diary ───────────────────────────────────────────────────────────────

  async function loadZoneDiary(zoneId) {
    if (zoneDiary[zoneId] !== undefined) return;
    const { data, error } = await supabase.from("zone_diary_entries").select("*").eq("zone_id", zoneId).order("created_at", { ascending: false });
    if (error) { console.error("loadZoneDiary:", error.message); return; }
    setZoneDiary(prev => ({ ...prev, [zoneId]: (data || []).map(r => ({ id: r.id, date: r.date, text: r.text, photo: r.photo_url ?? null })) }));
  }

  async function addZoneDiaryEntry(zoneId, { text, photo }) {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.from("zone_diary_entries").insert({ zone_id: zoneId, garden_id: gardenId, date: today, text, photo_url: photo ?? null }).select().single();
    if (error) { console.error("addZoneDiaryEntry:", error.message); return; }
    setZoneDiary(prev => ({ ...prev, [zoneId]: [{ id: data.id, date: data.date, text: data.text, photo: data.photo_url ?? null }, ...(prev[zoneId] ?? [])] }));
  }

  async function deleteZoneDiaryEntry(zoneId, entryId) {
    setZoneDiary(prev => ({ ...prev, [zoneId]: prev[zoneId].filter(e => e.id !== entryId) }));
    const { error } = await supabase.from("zone_diary_entries").delete().eq("id", entryId);
    if (error) console.error("deleteZoneDiaryEntry:", error.message);
  }

  function getZoneDiaryEntries(zoneId) { return zoneDiary[zoneId] ?? []; }

  // ── Zone CRUD ────────────────────────────────────────────────────────────────

  function zoneRowToApp(r) {
    return { id: r.id, name: r.name, emoji: r.emoji ?? null, description: r.description ?? null, color: r.color ?? null, borderColor: r.border_color ?? null, hotspot: r.hotspot ?? {} };
  }

  async function createZone({ name, emoji, description, color, borderColor, hotspot }) {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();
    const { data, error } = await supabase.from("zones").insert({ id, garden_id: gardenId, name, emoji: emoji || null, description: description || null, color: color || null, border_color: borderColor || null, hotspot: hotspot || {} }).select().single();
    if (error) throw new Error(error.message);
    const appZone = zoneRowToApp(data);
    setZones(prev => [...prev, appZone]);
    return appZone;
  }

  async function updateZone(zoneId, updates) {
    const dbUpdates = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.borderColor !== undefined) dbUpdates.border_color = updates.borderColor;
    if (updates.hotspot !== undefined) dbUpdates.hotspot = updates.hotspot;
    setZones(prev => prev.map(z => z.id === zoneId ? { ...z, ...updates } : z));
    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from("zones").update(dbUpdates).eq("id", zoneId);
      if (error) console.error("updateZone:", error.message);
    }
  }

  async function deleteZone(zoneId, { deletePlants }) {
    if (deletePlants) {
      const toDelete = seeds.filter(s => s.zoneId === zoneId);
      await Promise.all(toDelete.map(p => supabase.from("plants").delete().eq("id", p.id)));
      setSeeds(prev => prev.filter(s => s.zoneId !== zoneId));
    } else {
      setSeeds(prev => prev.map(s => s.zoneId === zoneId ? { ...s, zoneId: null } : s));
      await supabase.from("plants").update({ zone_id: null }).eq("zone_id", zoneId);
    }
    setZones(prev => prev.filter(z => z.id !== zoneId));
    const { error } = await supabase.from("zones").delete().eq("id", zoneId);
    if (error) console.error("deleteZone:", error.message);
  }

  // ── Garden Image ─────────────────────────────────────────────────────────────

  async function uploadGardenImage(file) {
    const filename = `${gardenId}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "-")}`;
    const { error: uploadError } = await supabase.storage.from("garden-images").upload(filename, file, { cacheControl: "3600", upsert: false });
    if (uploadError) throw new Error(uploadError.message);
    const { data: { publicUrl } } = supabase.storage.from("garden-images").getPublicUrl(filename);
    await Promise.all([
      supabase.from("garden_images").insert({ garden_id: gardenId, url: publicUrl }),
      supabase.from("gardens").update({ background_image_url: publicUrl }).eq("id", gardenId),
    ]);
    setGardenBgImage(publicUrl);
    return publicUrl;
  }

  return (
    <SeedsContext.Provider value={{
      seeds, zones, loading, loadMsg, error, initializing, gardenId,
      gardenBgImage,
      setLoading, setLoadMsg, setError,
      addSeed, addSeeds, updateSeed, removeSeed, getSeed,
      assignZone, getSeedsByZone, getZone,
      loadDiaryEntries, addDiaryEntry, getDiaryEntries,
      toggleTask, isTaskDone,
      loadZoneTasks, addZoneTask, toggleZoneTask, deleteZoneTask, getZoneTasks,
      loadZoneDiary, addZoneDiaryEntry, deleteZoneDiaryEntry, getZoneDiaryEntries,
      createZone, updateZone, deleteZone,
      uploadGardenImage,
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
