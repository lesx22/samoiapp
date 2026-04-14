import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SeedsProvider, useSeedsContext } from "./context/SeedsContext";
import { supabase } from "./lib/supabase";
import Nav from "./components/Nav";
import UploadModal from "./components/UploadModal";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import SeedsPage from "./pages/SeedsPage";
import SeedDetailPage from "./pages/SeedDetailPage";
import TodayPage from "./pages/TodayPage";
import CalendarPage from "./pages/CalendarPage";
import ZonePage from "./pages/ZonePage";
import GardenPage from "./pages/GardenPage";
import ZoneDetailPage from "./pages/ZoneDetailPage";

function AppShell({ session }) {
  const [modalOpen, setModalOpen] = useState(false);
  const { initializing, error } = useSeedsContext();

  if (initializing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "var(--space-md)" }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text)" }}>
          Jardin<span style={{ color: "var(--color-green)" }}>·</span>Planner
        </div>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)" }}>Loading your garden…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "var(--space-md)", padding: "var(--space-xl)" }}>
        <p style={{ color: "var(--color-error)", textAlign: "center" }}>{error}</p>
      </div>
    );
  }

  return (
    <>
      <Nav session={session} />
      <Routes>
        <Route path="/"            element={<HomePage   onUpload={() => setModalOpen(true)} />} />
        <Route path="/seeds"       element={<SeedsPage  onUpload={() => setModalOpen(true)} />} />
        <Route path="/seeds/:id"   element={<SeedDetailPage />} />
        <Route path="/today"       element={<TodayPage />} />
        <Route path="/garden"      element={<GardenPage />} />
        <Route path="/garden/:zoneId" element={<ZoneDetailPage />} />
        <Route path="/calendar"    element={<CalendarPage />} />
        <Route path="/zone"        element={<ZonePage />} />
      </Routes>
      <UploadModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text)" }}>
          Jardin<span style={{ color: "var(--color-green)" }}>·</span>Planner
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <SeedsProvider>
        <AppShell session={session} />
      </SeedsProvider>
    </BrowserRouter>
  );
}
