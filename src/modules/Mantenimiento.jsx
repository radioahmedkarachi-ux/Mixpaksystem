import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { uploadToCloudinary } from "../cloudinary.js";
import FotoViewer from "../FotoViewer.jsx";
import {
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  Package,
  Trash2,
  PackageSearch,
  ClipboardList,
  Camera,
  Image as ImageIcon,
  Search,
  Download,
  Share2,
} from "lucide-react";
import {
  COLORS,
  inputStyle,
  selectStyle,
  primaryButtonStyle,
  ghostButtonStyle,
  compressImage,
  withTimeout,
  exportToCsv,
  shareText,
  logActivity,
  DateRangeFilter,
  inDateRange,
  CenteredMessage,
  Field,
  ModalShell,
  ConfirmDialog,
  StatCard,
  EmptyState,
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

const STATUSES = [
  { value: "pendiente", label: "Pendiente", icon: Clock },
  { value: "en_progreso", label: "En progreso", icon: Wrench },
  { value: "espera_repuesto", label: "Esperando repuesto", icon: PackageSearch },
  { value: "completada", label: "Completada", icon: CheckCircle2 },
];

const emptyForm = {
  machine: "",
  machineType: "envasadora",
  title: "",
  description: "",
  priority: "media",
  status: "pendiente",
  dueDate: "",
};

function priorityMeta(v) {
  return PRIORITIES.find((p) => p.value === v) || PRIORITIES[2];
}
function machineLabel(v) {
  return MACHINE_TYPES.find((m) => m.value === v)?.label || v;
}

export default function Mantenimiento({ user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [filterType, setFilterType] = useState("todos");
  const [filterPriority, setFilterPriority] = useState("todas");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  async function updateStatus(task, status) {
    await updateDoc(doc(db, "tasks", task.id), { status });
    logActivity(user.email, "Mantenimiento", "Cambio de estado", `${task.workOrder} (${task.title}): ${task.status} → ${status}`);
  }

  async function removeTask(task) {
    // Nota: las fotos quedan en Cloudinary (borrar requiere un backend con la
    // clave secreta), pero el registro de la tarea sí se elimina.
    await deleteDoc(doc(db, "tasks", task.id));
    logActivity(user.email, "Mantenimiento", "Eliminada", `${task.workOrder}: ${task.title}`);
    setConfirmDelete(null);
  }

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterType !== "todos" && t.machineType !== filterType) return false;
      if (filterPriority !== "todas" && t.priority !== filterPriority) return false;
      if (!inDateRange(t.createdAt, dateFrom, dateTo)) return false;
      if (search && !`${t.machine} ${t.title} ${t.description || ""} ${t.workOrder || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filterType, filterPriority, search, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const s = { pendiente: 0, en_progreso: 0, espera_repuesto: 0, completada: 0, critica: 0, vencida: 0 };
    const today = new Date().toISOString().slice(0, 10);
    tasks.forEach((t) => {
      s[t.status] = (s[t.status] || 0) + 1;
      if (t.priority === "critica" && t.status !== "completada") s.critica++;
      if (t.dueDate && t.status !== "completada" && t.dueDate < today) s.vencida++;
    });
    return s;
  }, [tasks]);

  const columns = STATUSES.map((s) => ({
    ...s,
    items: filtered
      .filter((t) => t.status === s.value)
      .sort((a, b) => {
        const order = { critica: 0, alta: 1, media: 2, baja: 3 };
        return order[a.priority] - order[b.priority];
      }),
  }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, textTransform: "uppercase", margin: 0 }}>
          Órdenes de mantenimiento
        </h1>
        <button onClick={() => setModalOpen(true)} style={primaryButtonStyle}>
          <Plus size={16} /> Nueva
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
        <StatCard label="Pendientes" value={stats.pendiente} color={COLORS.steel} Icon={Clock} />
        <StatCard label="En progreso" value={stats.en_progreso} color={COLORS.safety} Icon={Wrench} />
        <StatCard label="Esperando repuesto" value={stats.espera_repuesto} color={COLORS.textMuted} Icon={PackageSearch} />
        <StatCard label="Completadas" value={stats.completada} color={COLORS.green} Icon={CheckCircle2} />
        <StatCard label="Críticas activas" value={stats.critica} color={COLORS.critical} Icon={AlertTriangle} />
        <StatCard label="Vencidas" value={stats.vencida} color={COLORS.critical} Icon={AlertTriangle} />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} color={COLORS.textMuted} style={{ position: "absolute", left: 9, top: 11 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por máquina, tarea u OT" style={{ ...inputStyle, paddingLeft: 30 }} />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={selectStyle}>
          <option value="todos">Todas las máquinas</option>
          {MACHINE_TYPES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={selectStyle}>
          <option value="todas">Toda prioridad</option>
          {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        <button
          onClick={() => exportToCsv("ordenes-mantenimiento", filtered.map((t) => ({
            OT: t.workOrder, maquina: t.machine, tipo: machineLabel(t.machineType), tarea: t.title,
            prioridad: t.priority, estado: t.status, tecnico: t.technician, vence: t.dueDate || "",
          })))}
          style={ghostButtonStyle}
          title="Exportar CSV"
        >
          <Download size={16} /> Exportar
        </button>
      </div>

      {loading ? (
        <CenteredMessage text="Cargando tareas…" />
      ) : tasks.length === 0 ? (
        <EmptyState Icon={ClipboardList} title="Sin órdenes todavía" message="Registra la primera tarea de mantenimiento para empezar." onAdd={() => setModalOpen(true)} addLabel="Crear primera tarea" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 16 }}>
          {columns.map((col) => (
            <div key={col.value}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${COLORS.dark}` }}>
                <col.icon size={15} />
                <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, textTransform: "uppercase", margin: 0 }}>{col.label}</h2>
                <span style={{ marginLeft: "auto", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.textMuted }}>{col.items.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {col.items.map((t) => (
                  <TaskCard key={t.id} task={t} onStatusChange={(s) => updateStatus(t, s)} onDelete={() => setConfirmDelete(t)} onOpen={() => setDetailTask(t)} />
                ))}
                {col.items.length === 0 && <div style={{ fontSize: 12, color: COLORS.textMuted, fontStyle: "italic" }}>Sin tareas aquí.</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && <TaskModal user={user} onClose={() => setModalOpen(false)} />}
      {detailTask && <DetailModal task={detailTask} onClose={() => setDetailTask(null)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar tarea"
          message="Esto borrará la orden y sus fotos. No se puede deshacer."
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => removeTask(confirmDelete)}
        />
      )}
    </div>
  );
}

function TaskCard({ task, onStatusChange, onDelete, onOpen }) {
  const pr = priorityMeta(task.priority);
  const isCritical = task.priority === "critica" && task.status !== "completada";
  const isOverdue = task.dueDate && task.status !== "completada" && task.dueDate < new Date().toISOString().slice(0, 10);
  return (
    <div style={{ background: COLORS.panel, borderLeft: `5px solid ${isOverdue ? COLORS.critical : pr.color}`, boxShadow: isCritical || isOverdue ? `0 0 0 1px ${COLORS.critical}` : "none", padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.textMuted }}>{task.workOrder}</span>
        <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><Trash2 size={14} /></button>
      </div>
      <h3 onClick={onOpen} style={{ fontSize: 15, fontWeight: 600, margin: "6px 0 2px", cursor: "pointer" }}>{task.title}</h3>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>
        <Package size={13} /> <span>{task.machine} · {machineLabel(task.machineType)}</span>
      </div>
      {isOverdue && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: COLORS.critical, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
          <AlertTriangle size={13} /> Vencida ({task.dueDate})
        </div>
      )}
      {task.photos?.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto" }}>
          {task.photos.slice(0, 3).map((p, i) => (
            <img key={i} src={p.url} alt="" onClick={onOpen} style={{ width: 52, height: 52, objectFit: "cover", cursor: "pointer" }} />
          ))}
          {task.photos.length > 3 && (
            <div onClick={onOpen} style={{ width: 52, height: 52, background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, cursor: "pointer" }}>
              +{task.photos.length - 3}
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 600, color: "#fff", background: pr.color, padding: "2px 8px" }}>{pr.label}</span>
        {task.technician && <span style={{ fontSize: 12, color: COLORS.textMuted }}>Técnico: {task.technician}</span>}
        {task.dueDate && <span style={{ fontSize: 12, color: COLORS.textMuted }}>· Vence: {task.dueDate}</span>}
      </div>
      <select value={task.status} onChange={(e) => onStatusChange(e.target.value)} style={{ ...selectStyle, width: "100%", fontSize: 12, padding: "6px 8px" }}>
        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    </div>
  );
}

function TaskModal({ user, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  function handleFiles(e) {
    const list = Array.from(e.target.files || []);
    setFiles((f) => [...f, ...list]);
    setPreviews((p) => [...p, ...list.map((f) => URL.createObjectURL(f))]);
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.machine.trim() || !form.title.trim()) return;
    setSaving(true);
    setError("");
    let docRef;
    try {
      const workOrder = `OT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      docRef = await addDoc(collection(db, "tasks"), {
        ...form,
        workOrder,
        technician: user.email,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        photos: [],
      });
      logActivity(user.email, "Mantenimiento", "Creada", `${workOrder}: ${form.title} (${form.machine})`);
    } catch (err) {
      setSaving(false);
      setError("No se pudo guardar la orden. Revisa tu conexión y las reglas de Firestore.");
      return;
    }

    if (files.length) {
      try {
        const uploaded = [];
        for (let i = 0; i < files.length; i++) {
          setUploadStatus(`Subiendo foto ${i + 1} de ${files.length}…`);
          const blob = await withTimeout(compressImage(files[i]), 15000, "La foto tardó demasiado en procesarse.");
          const result = await withTimeout(uploadToCloudinary(blob, `tasks/${docRef.id}`), 20000, "La subida de la foto tardó demasiado.");
          uploaded.push(result);
        }
        setUploadStatus("Guardando enlaces de las fotos…");
        await updateDoc(doc(db, "tasks", docRef.id), { photos: uploaded });
      } catch (err) {
        setSaving(false);
        setUploadStatus("");
        setError("La orden se guardó, pero las fotos no se pudieron subir a Cloudinary. Revisa el cloud name y el upload preset en src/cloudinary.js. Puedes añadir las fotos luego editando la orden.");
        return;
      }
    }
    setSaving(false);
    setUploadStatus("");
    onClose();
  }

  return (
    <ModalShell onClose={onClose} title="Nueva orden de trabajo">
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
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} placeholder="Ej. Cambio de rodamiento" />
        </Field>
        <Field label="Descripción">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Prioridad">
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={inputStyle}>
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Fecha límite">
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} style={inputStyle} />
          </Field>
        </div>

        <Field label="Fotos (máquina o avería)">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {previews.map((src, i) => <img key={i} src={src} style={{ width: 60, height: 60, objectFit: "cover" }} />)}
            <button type="button" onClick={() => fileInputRef.current.click()} style={{ width: 60, height: 60, border: `1px dashed ${COLORS.line}`, background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Camera size={20} color={COLORS.textMuted} />
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: "none" }} />
        </Field>

        <button type="submit" disabled={saving} style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center", marginTop: 8 }}>
          {uploadStatus || (saving ? "Guardando…" : "Guardar orden")}
        </button>
        {error && <p style={{ color: COLORS.critical, fontSize: 13, marginTop: 10 }}>{error}</p>}
      </form>
    </ModalShell>
  );
}

function DetailModal({ task, onClose }) {
  const pr = priorityMeta(task.priority);
  const [viewerIndex, setViewerIndex] = useState(null);

  function share() {
    const lines = [
      `Orden ${task.workOrder}: ${task.title}`,
      `Máquina: ${task.machine} (${machineLabel(task.machineType)})`,
      `Prioridad: ${pr.label} · Estado: ${task.status}`,
      task.description ? `Descripción: ${task.description}` : null,
      task.dueDate ? `Vence: ${task.dueDate}` : null,
      task.photos?.length ? `Fotos: ${task.photos.map((p) => p.url).join(" ")}` : null,
    ].filter(Boolean).join("\n");
    shareText(task.workOrder, lines);
  }

  return (
    <ModalShell onClose={onClose} title={task.workOrder}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>{task.title}</h2>
        <button onClick={share} style={{ background: "none", border: `1px solid ${COLORS.line}`, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <Share2 size={14} /> Compartir
        </button>
      </div>
      <p style={{ color: COLORS.textMuted, fontSize: 13, margin: "0 0 10px" }}>{task.machine} · {machineLabel(task.machineType)}</p>
      <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 600, color: "#fff", background: pr.color, padding: "2px 8px" }}>{pr.label}</span>
      {task.description && <p style={{ fontSize: 14, marginTop: 12 }}>{task.description}</p>}
      {task.photos?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginTop: 14 }}>
          {task.photos.map((p, i) => (
            <button key={i} onClick={() => setViewerIndex(i)} style={{ padding: 0, border: "none", background: "none", cursor: "pointer" }}>
              <img src={p.url} style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
      {!task.photos?.length && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.textMuted, fontSize: 13, marginTop: 14 }}>
          <ImageIcon size={16} /> Sin fotos adjuntas
        </div>
      )}
      {viewerIndex !== null && <FotoViewer photos={task.photos} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />}
    </ModalShell>
  );
}
