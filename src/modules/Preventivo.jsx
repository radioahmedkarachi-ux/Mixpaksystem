import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase.js";
import {
  CalendarClock,
  Plus,
  Trash2,
  AlertTriangle,
  CalendarCheck,
  Repeat,
  CalendarDays,
  Wrench,
  Search,
} from "lucide-react";
import {
  COLORS,
  inputStyle,
  selectStyle,
  primaryButtonStyle,
  ghostButtonStyle,
  logActivity,
  CenteredMessage,
  Field,
  ModalShell,
  ConfirmDialog,
  StatCard,
  EmptyState,
  useToast,
} from "../shared.jsx";

const MACHINE_TYPES = [
  { value: "envasadora", label: "Envasadora" },
  { value: "llenadora", label: "Llenadora" },
  { value: "etiquetadora", label: "Etiquetadora" },
  { value: "paletizadora", label: "Paletizadora" },
  { value: "compresor", label: "Compresor" },
  { value: "banda", label: "Banda transportadora" },
  { value: "otro", label: "Otro equipo" },
];

const PRIORITIES = [
  { value: "critica", label: "Crítica", color: COLORS.critical },
  { value: "alta", label: "Alta", color: COLORS.safety },
  { value: "media", label: "Media", color: COLORS.steel },
  { value: "baja", label: "Baja", color: COLORS.green },
];

const emptyForm = {
  machine: "",
  machineType: "envasadora",
  title: "",
  description: "",
  priority: "media",
  mode: "recurrente", // "recurrente" | "fija"
  frequencyDays: 30,
  dueDate: new Date().toISOString().slice(0, 10),
};

function machineLabel(v) {
  return MACHINE_TYPES.find((m) => m.value === v)?.label || v;
}
function priorityMeta(v) {
  return PRIORITIES.find((p) => p.value === v) || PRIORITIES[2];
}
function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}
function daysUntil(dateStr) {
  const today = new Date().toISOString().slice(0, 10);
  const a = new Date(today + "T00:00:00");
  const b = new Date(dateStr + "T00:00:00");
  return Math.round((b - a) / 86400000);
}
function urgencyMeta(days) {
  if (days < 0) return { label: `Vencido hace ${Math.abs(days)} día(s)`, color: COLORS.critical };
  if (days === 0) return { label: "Vence hoy", color: COLORS.critical };
  if (days <= 7) return { label: `En ${days} día(s)`, color: COLORS.safety };
  return { label: `En ${days} días`, color: COLORS.green };
}

export default function Preventivo({ user }) {
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "preventive_plans"), orderBy("dueDate", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  async function removePlan(plan) {
    try {
      await deleteDoc(doc(db, "preventive_plans", plan.id));
      logActivity(user.email, "Preventivo", "Eliminado", `${plan.machine}: ${plan.title}`);
      toast("Plan eliminado.");
    } catch (err) {
      toast("No se pudo eliminar el plan.", "error");
    } finally {
      setConfirmDelete(null);
    }
  }

  async function generateOrder(plan) {
    try {
      const workOrder = `OT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      await addDoc(collection(db, "tasks"), {
        machine: plan.machine,
        machineType: plan.machineType,
        title: plan.title,
        description: plan.description || "",
        priority: plan.priority,
        status: "pendiente",
        dueDate: plan.dueDate,
        workOrder,
        technician: user.email,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        photos: [],
        source: "preventivo",
        sourcePlanId: plan.id,
      });

      if (plan.mode === "recurrente") {
        const nextDue = addDays(plan.dueDate, plan.frequencyDays);
        await updateDoc(doc(db, "preventive_plans", plan.id), {
          dueDate: nextDue,
          lastGeneratedAt: serverTimestamp(),
          lastGeneratedWorkOrder: workOrder,
        });
      } else {
        await updateDoc(doc(db, "preventive_plans", plan.id), {
          active: false,
          lastGeneratedAt: serverTimestamp(),
          lastGeneratedWorkOrder: workOrder,
        });
      }

      logActivity(user.email, "Preventivo", "Orden generada", `${workOrder} · ${plan.machine}: ${plan.title}`);
      toast(`Orden ${workOrder} creada en Mantenimiento.`);
    } catch (err) {
      toast("No se pudo generar la orden.", "error");
    }
  }

  const filtered = useMemo(() => {
    return plans.filter((p) => {
      if (!showInactive && p.active === false) return false;
      if (search && !`${p.machine} ${p.title} ${p.description || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [plans, search, showInactive]);

  const stats = useMemo(() => {
    const active = plans.filter((p) => p.active !== false);
    const vencidos = active.filter((p) => daysUntil(p.dueDate) < 0).length;
    const estaSemana = active.filter((p) => { const d = daysUntil(p.dueDate); return d >= 0 && d <= 7; }).length;
    return { total: active.length, vencidos, estaSemana };
  }, [plans]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, textTransform: "uppercase", margin: 0 }}>
          Mantenimiento preventivo
        </h1>
        <button onClick={() => { setEditPlan(null); setModalOpen(true); }} style={primaryButtonStyle}>
          <Plus size={16} /> Nuevo plan
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
        <StatCard label="Planes activos" value={stats.total} color={COLORS.steel} Icon={CalendarClock} />
        <StatCard label="Vencidos" value={stats.vencidos} color={COLORS.critical} Icon={AlertTriangle} />
        <StatCard label="Esta semana" value={stats.estaSemana} color={COLORS.safety} Icon={CalendarDays} />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} color={COLORS.textMuted} style={{ position: "absolute", left: 9, top: 15 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por máquina o tarea" style={{ ...inputStyle, paddingLeft: 30 }} />
        </div>
        <button onClick={() => setShowInactive((v) => !v)} style={ghostButtonStyle}>
          {showInactive ? "Ocultar inactivos" : "Ver inactivos"}
        </button>
      </div>

      {loading ? (
        <CenteredMessage text="Cargando planes…" />
      ) : filtered.length === 0 ? (
        <EmptyState Icon={CalendarClock} title="Sin planes preventivos" message="Crea un plan para que la app te avise cuándo toca revisar cada máquina." onAdd={() => setModalOpen(true)} addLabel="Crear primer plan" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              onEdit={() => { setEditPlan(p); setModalOpen(true); }}
              onDelete={() => setConfirmDelete(p)}
              onGenerate={() => generateOrder(p)}
            />
          ))}
        </div>
      )}

      {modalOpen && <PlanModal plan={editPlan} user={user} onClose={() => setModalOpen(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar plan"
          message="Esto borra el plan preventivo. Las órdenes ya generadas no se ven afectadas."
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => removePlan(confirmDelete)}
        />
      )}
    </div>
  );
}

function PlanCard({ plan, onEdit, onDelete, onGenerate }) {
  const pr = priorityMeta(plan.priority);
  const inactive = plan.active === false;
  const days = daysUntil(plan.dueDate);
  const urgency = urgencyMeta(days);
  const isDue = days <= 0 && !inactive;

  return (
    <div style={{ background: COLORS.panel, borderLeft: `5px solid ${inactive ? COLORS.line : urgency.color}`, opacity: inactive ? 0.6 : 1, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.textMuted, marginBottom: 2 }}>
            <Wrench size={13} /> {plan.machine} · {machineLabel(plan.machineType)}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "2px 0 6px" }}>{plan.title}</h3>
        </div>
        <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted, flexShrink: 0 }}><Trash2 size={16} /></button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 600, color: "#fff", background: pr.color, padding: "2px 8px" }}>{pr.label}</span>
        <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 600, color: COLORS.dark, background: COLORS.bg, padding: "2px 8px", display: "flex", alignItems: "center", gap: 4 }}>
          {plan.mode === "recurrente" ? <Repeat size={12} /> : <CalendarCheck size={12} />}
          {plan.mode === "recurrente" ? `Cada ${plan.frequencyDays} días` : "Fecha fija"}
        </span>
      </div>

      {inactive ? (
        <div style={{ fontSize: 12, color: COLORS.textMuted, fontStyle: "italic", marginBottom: 8 }}>
          Inactivo · orden ya generada{plan.lastGeneratedWorkOrder ? ` (${plan.lastGeneratedWorkOrder})` : ""}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 13, fontWeight: 600, color: urgency.color }}>
          <AlertTriangle size={14} /> {urgency.label} · {plan.dueDate}
        </div>
      )}

      {plan.description && <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "0 0 10px" }}>{plan.description}</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onEdit} style={{ ...ghostButtonStyle, flex: 1, justifyContent: "center", fontSize: 13 }}>Editar</button>
        {!inactive && (
          <button onClick={onGenerate} style={{ ...primaryButtonStyle, flex: 2, justifyContent: "center", fontSize: 13, background: isDue ? COLORS.critical : COLORS.safety, color: isDue ? "#fff" : COLORS.dark }}>
            <CalendarCheck size={15} /> {isDue ? "Generar orden ahora" : "Generar orden"}
          </button>
        )}
      </div>
    </div>
  );
}

function PlanModal({ plan, user, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState(plan ? { ...emptyForm, ...plan } : emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!form.machine.trim() || !form.title.trim() || !form.dueDate) return;
    setSaving(true);
    setError("");
    const payload = {
      machine: form.machine,
      machineType: form.machineType,
      title: form.title,
      description: form.description,
      priority: form.priority,
      mode: form.mode,
      frequencyDays: form.mode === "recurrente" ? Number(form.frequencyDays) || 30 : null,
      dueDate: form.dueDate,
      active: plan ? plan.active !== false : true,
    };
    try {
      if (plan) {
        await updateDoc(doc(db, "preventive_plans", plan.id), payload);
        logActivity(user.email, "Preventivo", "Editado", `${form.machine}: ${form.title}`);
        toast("Plan actualizado.");
      } else {
        await addDoc(collection(db, "preventive_plans"), { ...payload, createdBy: user.email, createdAt: serverTimestamp() });
        logActivity(user.email, "Preventivo", "Creado", `${form.machine}: ${form.title}`);
        toast("Plan guardado.");
      }
      setSaving(false);
      onClose();
    } catch (err) {
      setSaving(false);
      setError("No se pudo guardar el plan. Revisa tu conexión y las reglas de Firestore.");
      toast("No se pudo guardar el plan.", "error");
    }
  }

  return (
    <ModalShell onClose={onClose} title={plan ? "Editar plan preventivo" : "Nuevo plan preventivo"}>
      <form onSubmit={submit}>
        <Field label="Máquina / equipo *">
          <input required value={form.machine} onChange={(e) => setForm({ ...form, machine: e.target.value })} style={inputStyle} placeholder="Ej. Envasadora línea 3" />
        </Field>
        <Field label="Tipo de máquina">
          <select value={form.machineType} onChange={(e) => setForm({ ...form, machineType: e.target.value })} style={inputStyle}>
            {MACHINE_TYPES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="Tarea *">
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} placeholder="Ej. Engrase de rodamientos" />
        </Field>
        <Field label="Descripción">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>
        <Field label="Prioridad">
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={inputStyle}>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>

        <Field label="Repetición">
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setForm({ ...form, mode: "recurrente" })} style={{ ...(form.mode === "recurrente" ? primaryButtonStyle : ghostButtonStyle), flex: 1, justifyContent: "center", fontSize: 13 }}>
              <Repeat size={14} /> Cada X días
            </button>
            <button type="button" onClick={() => setForm({ ...form, mode: "fija" })} style={{ ...(form.mode === "fija" ? primaryButtonStyle : ghostButtonStyle), flex: 1, justifyContent: "center", fontSize: 13 }}>
              <CalendarCheck size={14} /> Fecha fija
            </button>
          </div>
        </Field>

        {form.mode === "recurrente" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Cada cuántos días">
              <input type="number" min={1} required value={form.frequencyDays} onChange={(e) => setForm({ ...form, frequencyDays: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Próxima fecha">
              <input type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} style={inputStyle} />
            </Field>
          </div>
        ) : (
          <Field label="Fecha programada">
            <input type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} style={inputStyle} />
          </Field>
        )}

        <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: -4, marginBottom: 12 }}>
          {form.mode === "recurrente"
            ? "Cada vez que generes la orden desde este plan, la próxima fecha avanzará sola según los días indicados."
            : "Es un plan de una sola vez: al generar la orden, este plan pasará a inactivo."}
        </p>

        <button type="submit" disabled={saving} style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center", marginTop: 8 }}>
          {saving ? "Guardando…" : "Guardar plan"}
        </button>
        {error && <p style={{ color: COLORS.critical, fontSize: 13, marginTop: 10 }}>{error}</p>}
      </form>
    </ModalShell>
  );
}
