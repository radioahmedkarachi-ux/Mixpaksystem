import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";
import {
  Wrench,
  Boxes,
  Factory,
  ShieldCheck,
  AlertTriangle,
  Clock,
  TrendingUp,
  AlertOctagon,
} from "lucide-react";
import { COLORS, CenteredMessage, StatCard } from "../shared.jsx";
import { tabsForRole } from "../roles.js";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

function last14Days() {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}
function shortLabel(dateStr) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export default function Dashboard({ user, goTo, role }) {
  const allowed = tabsForRole(role);
  const [tasks, setTasks] = useState(null);
  const [materials, setMaterials] = useState(null);
  const [orders, setOrders] = useState(null);
  const [issues, setIssues] = useState(null);

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, "tasks"), (snap) => setTasks(snap.docs.map((d) => d.data()))),
      onSnapshot(collection(db, "materials"), (snap) => setMaterials(snap.docs.map((d) => d.data()))),
      onSnapshot(collection(db, "production_orders"), (snap) => setOrders(snap.docs.map((d) => d.data()))),
      onSnapshot(collection(db, "quality_issues"), (snap) => setIssues(snap.docs.map((d) => d.data()))),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const loading = !tasks || !materials || !orders || !issues;

  const stats = useMemo(() => {
    if (loading) return null;
    const today = new Date().toISOString().slice(0, 10);
    const pendientesMtto = tasks.filter((t) => t.status !== "completada").length;
    const criticasMtto = tasks.filter((t) => t.priority === "critica" && t.status !== "completada").length;
    const vencidasMtto = tasks.filter((t) => t.dueDate && t.status !== "completada" && t.dueDate < today).length;
    const bajoMinimo = materials.filter((m) => m.stock <= m.minStock).length;
    const caducando = materials.filter((m) => {
      if (!m.expiryDate) return false;
      const days = Math.ceil((new Date(m.expiryDate) - new Date()) / 86400000);
      return days <= 30;
    }).length;
    const todays = orders.filter((o) => o.date === today);
    const producedToday = todays.reduce((s, o) => s + (Number(o.producedQty) || 0), 0);
    const targetToday = todays.reduce((s, o) => s + (Number(o.targetQty) || 0), 0);
    const eficiencia = targetToday > 0 ? Math.round((producedToday / targetToday) * 100) : 0;
    const abiertasCalidad = issues.filter((i) => i.status !== "cerrada").length;
    const criticasCalidad = issues.filter((i) => i.severity === "critica" && i.status !== "cerrada").length;
    return { pendientesMtto, criticasMtto, vencidasMtto, bajoMinimo, caducando, producedToday, eficiencia, abiertasCalidad, criticasCalidad };
  }, [tasks, materials, orders, issues, loading]);

  const trendProduccion = useMemo(() => {
    if (loading) return [];
    const days = last14Days();
    return days.map((day) => {
      const dayOrders = orders.filter((o) => o.date === day);
      const produced = dayOrders.reduce((s, o) => s + (Number(o.producedQty) || 0), 0);
      const target = dayOrders.reduce((s, o) => s + (Number(o.targetQty) || 0), 0);
      const eficiencia = target > 0 ? Math.round((produced / target) * 100) : 0;
      return { day: shortLabel(day), eficiencia, producido: produced };
    });
  }, [orders, loading]);

  const trendCalidad = useMemo(() => {
    if (loading) return [];
    const days = last14Days();
    const counts = Object.fromEntries(days.map((d) => [d, 0]));
    issues.forEach((i) => {
      const d = i.createdAt?.toDate ? i.createdAt.toDate().toISOString().slice(0, 10) : null;
      if (d && counts[d] !== undefined) counts[d]++;
    });
    return days.map((day) => ({ day: shortLabel(day), incidencias: counts[day] }));
  }, [issues, loading]);

  if (loading) return <CenteredMessage text="Cargando resumen…" />;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 22, textTransform: "uppercase", margin: 0 }}>
          Resumen general
        </h1>
        <p style={{ color: COLORS.textMuted, fontSize: 13, margin: "4px 0 0" }}>Mixpak System · {user.email}</p>
      </div>

      <Section title="Mantenimiento" icon={Wrench} onClick={() => goTo("mantenimiento")} visible={allowed.includes("mantenimiento")}>
        <StatCard label="Órdenes pendientes" value={stats.pendientesMtto} color={COLORS.steel} Icon={Clock} />
        <StatCard label="Críticas activas" value={stats.criticasMtto} color={COLORS.critical} Icon={AlertTriangle} />
        <StatCard label="Vencidas" value={stats.vencidasMtto} color={COLORS.critical} Icon={AlertTriangle} />
      </Section>

      <Section title="Materiales" icon={Boxes} onClick={() => goTo("materiales")} visible={allowed.includes("materiales")}>
        <StatCard label="Bajo mínimo" value={stats.bajoMinimo} color={COLORS.critical} Icon={AlertTriangle} />
        <StatCard label="Caducando (30 días)" value={stats.caducando} color={COLORS.safety} Icon={AlertTriangle} />
      </Section>

      <Section title="Producción" icon={Factory} onClick={() => goTo("produccion")} visible={allowed.includes("produccion")}>
        <StatCard label="Producido hoy" value={stats.producedToday} color={COLORS.green} Icon={TrendingUp} />
        <StatCard label="Eficiencia hoy" value={`${stats.eficiencia}%`} color={COLORS.safety} Icon={TrendingUp} />
      </Section>
      {allowed.includes("produccion") && (
        <div style={{ marginBottom: 22, background: COLORS.panel, padding: "14px 10px 6px" }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", color: COLORS.textMuted, fontWeight: 600, marginBottom: 8, paddingLeft: 8 }}>
            Eficiencia de producción · últimos 14 días
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendProduccion}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" width={38} />
              <Tooltip formatter={(v, name) => [name === "eficiencia" ? `${v}%` : v, name === "eficiencia" ? "Eficiencia" : "Producido"]} />
              <Line type="monotone" dataKey="eficiencia" stroke={COLORS.safety} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <Section title="Calidad" icon={ShieldCheck} onClick={() => goTo("calidad")} visible={allowed.includes("calidad")}>
        <StatCard label="Incidencias abiertas" value={stats.abiertasCalidad} color={COLORS.safety} Icon={AlertOctagon} />
        <StatCard label="Críticas activas" value={stats.criticasCalidad} color={COLORS.critical} Icon={AlertOctagon} />
      </Section>
      {allowed.includes("calidad") && (
        <div style={{ marginBottom: 22, background: COLORS.panel, padding: "14px 10px 6px" }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", color: COLORS.textMuted, fontWeight: 600, marginBottom: 8, paddingLeft: 8 }}>
            Incidencias de calidad creadas · últimos 14 días
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trendCalidad}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={30} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="incidencias" fill={COLORS.critical} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, onClick, children, visible = true }) {
  if (!visible) return null;
  return (
    <div style={{ marginBottom: 22 }}>
      <button
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          paddingBottom: 8,
          borderBottom: `2px solid ${COLORS.dark}`,
          width: "100%",
          background: "none",
          border: "none",
          borderBottomWidth: 2,
          borderBottomStyle: "solid",
          borderBottomColor: COLORS.dark,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <Icon size={16} />
        <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, textTransform: "uppercase", margin: 0 }}>{title}</h2>
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {children}
      </div>
    </div>
  );
}
