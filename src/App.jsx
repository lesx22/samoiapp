import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SeedsProvider } from "./context/SeedsContext";
import Nav from "./components/Nav";
import UploadModal from "./components/UploadModal";
import HomePage from "./pages/HomePage";
import SeedsPage from "./pages/SeedsPage";
import SeedDetailPage from "./pages/SeedDetailPage";
import TodayPage from "./pages/TodayPage";
import CalendarPage from "./pages/CalendarPage";
import ZonePage from "./pages/ZonePage";
import GardenPage from "./pages/GardenPage";
import ZoneDetailPage from "./pages/ZoneDetailPage";

export default function App() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <BrowserRouter>
      <SeedsProvider>
        <Nav />
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
      </SeedsProvider>
    </BrowserRouter>
  );
}
