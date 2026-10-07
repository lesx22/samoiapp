import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SeedsProvider, useSeedsContext } from "./context/SeedsContext";
import { supabase } from "./lib/supabase";
import Nav from "./components/Nav";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// Signed-in pages load on demand, so the login screen doesn't wait for them
const UploadModal    = lazy(() => import("./components/UploadModal"));
const HomePage       = lazy(() => import("./pages/HomePage"));
const SeedsPage      = lazy(() => import("./pages/SeedsPage"));
const SeedDetailPage = lazy(() => import("./pages/SeedDetailPage"));
const TodayPage      = lazy(() => import("./pages/TodayPage"));
const CalendarPage   = lazy(() => import("./pages/CalendarPage"));
const ZonePage       = lazy(() => import("./pages/ZonePage"));
const GardenPage     = lazy(() => import("./pages/GardenPage"));
const ZoneDetailPage = lazy(() => import("./pages/ZoneDetailPage"));

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
      <Suspense fallback={null}>
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
      </Suspense>
      <Suspense fallback={null}>
        <UploadModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </Suspense>
    </>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  // Recovery links contain #type=recovery; read it before the first render
  const [isRecovery, setIsRecovery] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery"
  );
  // The auth listener is created once, so it reads recovery mode from a ref, not stale state
  const isRecoveryRef = useRef(isRecovery);
  useEffect(() => { isRecoveryRef.current = isRecovery; }, [isRecovery]);

  useEffect(() => {

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setSession(session);
        setAuthLoading(false);
      } else if (event === "USER_UPDATED") {
        // Password was successfully updated — clear recovery mode
        setIsRecovery(false);
        setSession(session);
        setAuthLoading(false);
      } else {
        if (!isRecoveryRef.current) {
          setSession(session);
          setAuthLoading(false);
        }
      }
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

  if (isRecovery) {
    return <ResetPasswordPage onDone={() => setIsRecovery(false)} />;
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
