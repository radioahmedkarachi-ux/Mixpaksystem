import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase.js";
import { History, Search } from "lucide-react";
import { COLORS, inputStyle, selectStyle, CenteredMessage, EmptyState, DateRangeFilter, inDateRange } from "../shared.jsx";

const MODULES = ["Mantenimiento", "Materiales", "Producción", "Calidad", "Aprobaciones"];

function formatWhen(ts) {
  if (!ts?.toDate) return "";
  const d = ts.toDate();
  return d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Historial() {
  const [entries, setEntries] = useState(null);
  const [moduleFilter, setModuleFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const q = query(collection(db, "activity_log"), orderBy("createdAt", "desc"), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    return (entries || []).filter((e) => {
      if (moduleFilter !== "todos" && e.module !== moduleFilter) return false;
      if (!inDateRange(e.createdAt, dateFrom, dateTo)) return false;
      if (search && !`${e.userEmail} ${e.action} ${e.details}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [entries, moduleFilter, search, dateFrom, dateTo]);

  if (!entries) return <CenteredMessage text="Cargando historial…" />;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, textTransform: "uppercase", margin: 0 }}>
          Historial de cambios
        </h1>
        <p style={{ color: COLORS.textMuted, fontSize: 13, margin: "4px 0 0" }}>Últimas 200 acciones registradas, más reciente primero.</p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={14} color={COLORS.textMuted} style={{ position: "absolute", left: 9, top: 11 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por persona, acción o detalle" style={{ ...inputStyle, paddingLeft: 30 }} />
        </div>
        <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} style={selectStyle}>
          <option value="todos">Todos los módulos</option>
          {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState Icon={History} title="Sin actividad todavía" message="Aquí aparecerán los cambios que se hagan en la app." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((e) => (
            <div key={e.id} style={{ background: COLORS.panel, borderLeft: `4px solid ${COLORS.steel}`, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{e.module} · {e.action}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.textMuted }}>{formatWhen(e.createdAt)}</span>
              </div>
              {e.details && <div style={{ fontSize: 13, marginTop: 4 }}>{e.details}</div>}
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>{e.userEmail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
