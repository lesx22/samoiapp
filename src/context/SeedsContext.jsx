import { createContext, useContext, useState, useEffect } from "react";
import { DUMMY_SEEDS } from "../data/seeds";
import { DUMMY_DIARY } from "../data/diary";

const SeedsContext = createContext(null);

export function SeedsProvider({ children }) {
  const [seeds, setSeeds] = useState(DUMMY_SEEDS);
  const [diary, setDiary] = useState(DUMMY_DIARY);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [error, setError] = useState(null);

  // Completed tasks: Set of "seedId-taskType" strings, persisted to localStorage
  const [completedTasks, setCompletedTasks] = useState(() => {
    try {
      const saved = localStorage.getItem("jardin-completed-tasks");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    try {
      localStorage.setItem("jardin-completed-tasks", JSON.stringify([...completedTasks]));
    } catch { /* storage full */ }
  }, [completedTasks]);

  function addSeed(seed) {
    const id = `seed-${Date.now()}`;
    setSeeds(prev => [...prev, { ...seed, id, createdAt: new Date().toISOString() }]);
    return id;
  }

  function addSeeds(plantsArray) {
    const now = Date.now();
    const newSeeds = plantsArray.map((p, i) => ({
      ...p,
      id: `seed-${now}-${i}`,
      createdAt: new Date(now + i).toISOString(),
    }));
    setSeeds(prev => [...prev, ...newSeeds]);
    return newSeeds.map(s => s.id);
  }

  function updateSeed(id, data) {
    setSeeds(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  }

  function removeSeed(id) {
    setSeeds(prev => prev.filter(s => s.id !== id));
  }

  function getSeed(id) {
    return seeds.find(s => s.id === id) ?? null;
  }

  function assignZone(seedId, zoneId) {
    setSeeds(prev => prev.map(s => s.id === seedId ? { ...s, zoneId } : s));
  }

  function getSeedsByZone(zoneId) {
    return seeds.filter(s => s.zoneId === zoneId);
  }

  function addDiaryEntry(seedId, entry) {
    setDiary(prev => ({
      ...prev,
      [seedId]: [
        { ...entry, id: `diary-${Date.now()}`, date: new Date().toISOString().slice(0, 10) },
        ...(prev[seedId] ?? []),
      ],
    }));
  }

  function getDiaryEntries(seedId) {
    return diary[seedId] ?? [];
  }

  function toggleTask(seedId, taskType) {
    const key = `${seedId}-${taskType}`;
    setCompletedTasks(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function isTaskDone(seedId, taskType) {
    return completedTasks.has(`${seedId}-${taskType}`);
  }

  return (
    <SeedsContext.Provider value={{
      seeds, loading, loadMsg, error,
      setLoading, setLoadMsg, setError,
      addSeed, addSeeds, updateSeed, removeSeed, getSeed,
      assignZone, getSeedsByZone,
      addDiaryEntry, getDiaryEntries,
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
