// Garden arrondissements — zone definitions with map hotspot positions
// Hotspot positions are % of the garden-map.jpg image dimensions

export const ZONES = [
  {
    id: "potager",
    name: "Potager",
    emoji: "🥕",
    description: "Main vegetable garden",
    color: "rgba(45, 106, 79, 0.45)",
    borderColor: "#2D6A4F",
    // Position over the central garden bed area (between barns)
    hotspot: { left: "19%", top: "44%", width: "29%", height: "20%" },
  },
  {
    id: "orchard",
    name: "Orchard",
    emoji: "🍎",
    description: "Fruit trees and soft fruit",
    color: "rgba(82, 183, 136, 0.45)",
    borderColor: "#52B788",
    // Position over the tree shapes near the pond in upper-centre
    hotspot: { left: "27%", top: "11%", width: "25%", height: "26%" },
  },
  {
    id: "potting-shed",
    name: "Potting Shed",
    emoji: "🪴",
    description: "Beds around the potting shed",
    color: "rgba(180, 83, 9, 0.38)",
    borderColor: "#b45309",
    // Position over building 5 area, lower-centre
    hotspot: { left: "36%", top: "67%", width: "17%", height: "14%" },
  },
  {
    id: "ball-court",
    name: "Ball Court Beds",
    emoji: "🌿",
    description: "Planting beds along the ball court",
    color: "rgba(29, 78, 216, 0.35)",
    borderColor: "#1d4ed8",
    // Position over the E/F hatched area lower-centre-left
    hotspot: { left: "13%", top: "59%", width: "27%", height: "15%" },
  },
  {
    id: "rock-garden",
    name: "Rock Garden",
    emoji: "🪨",
    description: "Rock garden planting areas",
    color: "rgba(107, 114, 128, 0.4)",
    borderColor: "#6b7280",
    // Position over the rocky/hatched area lower-left
    hotspot: { left: "5%", top: "54%", width: "13%", height: "17%" },
  },
  {
    id: "woodland-garden",
    name: "Woodland Garden",
    emoji: "🌳",
    description: "Shaded woodland planting area",
    color: "rgba(20, 83, 45, 0.4)",
    borderColor: "#14532d",
    // Position over upper-right wooded area
    hotspot: { left: "63%", top: "10%", width: "22%", height: "20%" },
  },
];

export function getZone(id) {
  return ZONES.find(z => z.id === id) ?? null;
}
