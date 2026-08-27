import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";
import { LocalNotifications } from "@capacitor/local-notifications";

function nearestExpiry(material, lots) {
  const activeLots = lots.filter((l) => l.materialId === material.id && (l.quantity || 0) > 0 && l.expiryDate);
  if (activeLots.length === 0) return material.expiryDate || null;
  return activeLots.reduce((min, l) => (l.expiryDate < min ? l.expiryDate : min), activeLots[0].expiryDate);
}

// Revisa mantenimiento crítico/vencido, calidad crítica y materiales
// bajo mínimo/caducando (solo lo que el rol de la persona puede ver) y, si
// hay algo, lanza una notificación nativa. Se llama una vez al abrir la app.
export async function checkAndNotify(allowedTabs) {
  try {
    const lines = [];
    const today = new Date().toISOString().slice(0, 10);

    if (allowedTabs.includes("mantenimiento")) {
      const snap = await getDocs(collection(db, "tasks"));
      const tasks = snap.docs.map((d) => d.data());
      const criticas = tasks.filter((t) => t.priority === "critica" && t.status !== "completada").length;
      const vencidas = tasks.filter((t) => t.dueDate && t.status !== "completada" && t.dueDate < today).length;
      if (criticas) lines.push(`${criticas} orden(es) crítica(s) de mantenimiento`);
      if (vencidas) lines.push(`${vencidas} orden(es) de mantenimiento vencida(s)`);
    }

    if (allowedTabs.includes("calidad")) {
      const snap = await getDocs(collection(db, "quality_issues"));
      const issues = snap.docs.map((d) => d.data());
      const criticas = issues.filter((i) => i.severity === "critica" && i.status !== "cerrada").length;
      if (criticas) lines.push(`${criticas} incidencia(s) crítica(s) de calidad`);
    }

    if (allowedTabs.includes("materiales")) {
      const [matSnap, lotSnap] = await Promise.all([
        getDocs(collection(db, "materials")),
        getDocs(collection(db, "material_lots")),
      ]);
      const materials = matSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const lots = lotSnap.docs.map((d) => d.data());
      const bajoMinimo = materials.filter((m) => m.stock <= m.minStock).length;
      const caducando = materials.filter((m) => {
        const nearest = nearestExpiry(m, lots);
        if (!nearest) return false;
        const days = Math.ceil((new Date(nearest) - new Date()) / 86400000);
        return days <= 30;
      }).length;
      if (bajoMinimo) lines.push(`${bajoMinimo} material(es) bajo mínimo`);
      if (caducando) lines.push(`${caducando} material(es) caducando pronto`);
    }

    if (!lines.length) return;

    const current = await LocalNotifications.checkPermissions();
    if (current.display !== "granted") {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== "granted") return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 100000),
          title: "Mixpak System — avisos pendientes",
          body: lines.join(" · "),
          schedule: { at: new Date(Date.now() + 1000) },
        },
      ],
    });
  } catch (err) {
    // Un aviso fallido nunca debe romper la carga de la app.
    console.error("No se pudieron comprobar los avisos", err);
  }
}
