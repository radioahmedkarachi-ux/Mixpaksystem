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
import FotoViewer from "../FotoViewer.jsx";
import { uploadToCloudinary } from "../cloudinary.js";
import { ShieldCheck, Plus, Trash2, AlertOctagon, Camera, Image as ImageIcon, Search, Download, Share2 } from "lucide-react";
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

const TYPES = [
  { value: "defecto_producto", label: "Defecto de producto" },
  { value: "no_conformidad_proceso", label: "No conformidad de proceso" },
  { value: "reclamo_cliente", label: "Reclamo de cliente" },
  { value: "control_estabilidad", label: "Control de estabilidad / envejecimiento" },
  { value: "compatibilidad_materiales", label: "Compatibilidad de materiales" },
  { value: "otro", label: "Otro" },
];

const SEVERITIES = [
  { value: "critica", label: "Crítica", color: COLORS.critical },
  { value: "mayor", label: "Mayor", color: COLORS.safety },
  { value: "menor", label: "Menor", color: COLORS.steel },
];

const STATUSES = [
  { value: "abierta", label: "Abierta" },
  { value: "en_analisis", label: "En análisis" },
  { value: "accion_correctiva", label: "Acción correctiva" },
  { value: "cerrada", label: "Cerrada" },
];

const emptyForm = {
  title: "",
  type: "defecto_producto",
  severity: "menor",
  client: "",
  lot: "",
  reference: "",
  description: "",
  status: "abierta",
  correctiveAction: "",
};

function severityMeta(v) {
  return SEVERITIES.find((s) => s.value === v) || SEVERITIES[2];
}

export default function Calidad({ user }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailIssue, setDetailIssue] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filterStatus, setFilterStatus] = useState("todas");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const q = query(collection(db, "quality_issues"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setIssues(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  async function updateStatus(issue, status) {
    await updateDoc(doc(db, "quality_issues", issue.id), { status });
    logActivity(user.email, "Calidad", "Cambio de estado", `${issue.title}: ${issue.status} → ${status}`);
  }

  async function removeIssue(issue) {
    // Nota: las fotos quedan en Cloudinary (borrar requiere un backend con la
    // clave secreta), pero el registro de la incidencia sí se elimina.
    await deleteDoc(doc(db, "quality_issues", issue.id));
    logActivity(user.email, "Calidad", "Eliminada", issue.title);
    setConfirmDelete(null);
  }

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (filterStatus !== "todas" && i.status !== filterStatus) return false;
      if (!inDateRange(i.createdAt, dateFrom, dateTo)) return false;
      if (search && !`${i.title} ${i.client || ""} ${i.lot || ""} ${i.reference || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [issues, filterStatus, search, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const abiertas = issues.filter((i) => i.status !== "cerrada").length;
    const criticas = issues.filter((i) => i.severity === "critica" && i.status !== "cerrada").length;
    return { total: issues.length, abiertas, criticas };
  }, [issues]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, textTransform: "uppercase", margin: 0 }}>
          Calidad
        </h1>
        <button onClick={() => setModalOpen(true)} style={primaryButtonStyle}>
          <Plus size={16} /> Nueva incidencia
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
        <StatCard label="Total incidencias" value={stats.total} color={COLORS.steel} Icon={ShieldCheck} />
        <StatCard label="Abiertas" value={stats.abiertas} color={COLORS.safety} Icon={AlertOctagon} />
        <StatCard label="Críticas activas" value={stats.criticas} color={COLORS.critical} Icon={AlertOctagon} />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} color={COLORS.textMuted} style={{ position: "absolute", left: 9, top: 11 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título, cliente, lote o referencia" style={{ ...inputStyle, paddingLeft: 30 }} />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="todas">Todos los estados</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        <button
          onClick={() => exportToCsv("incidencias-calidad", filtered.map((i) => ({
            titulo: i.title, tipo: i.type, severidad: i.severity, cliente: i.client || "",
            lote: i.lot || "", referencia: i.reference || "", estado: i.status,
          })))}
          style={ghostButtonStyle}
        >
          <Download size={16} /> Exportar
        </button>
      </div>

      {loading ? (
        <CenteredMessage text="Cargando incidencias…" />
      ) : issues.length === 0 ? (
        <EmptyState Icon={ShieldCheck} title="Sin incidencias registradas" message="Registra la primera no conformidad o defecto de calidad." onAdd={() => setModalOpen(true)} addLabel="Crear primera incidencia" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 14 }}>
          {filtered.map((i) => (
            <IssueCard
              key={i.id}
              issue={i}
              onStatusChange={(s) => updateStatus(i, s)}
              onOpen={() => setDetailIssue(i)}
              onDelete={() => setConfirmDelete(i)}
            />
          ))}
          {filtered.length === 0 && <div style={{ fontSize: 13, color: COLORS.textMuted, fontStyle: "italic" }}>No hay incidencias con este filtro.</div>}
        </div>
      )}

      {modalOpen && <IssueModal user={user} onClose={() => setModalOpen(false)} />}
      {detailIssue && <DetailModal issue={detailIssue} onClose={() => setDetailIssue(null)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar incidencia"
          message="Se eliminará esta incidencia de calidad y sus fotos. No se puede deshacer."
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => removeIssue(confirmDelete)}
        />
      )}
    </div>
  );
}

function IssueCard({ issue, onStatusChange, onOpen, onDelete }) {
  const sev = severityMeta(issue.severity);
  return (
    <div style={{ background: COLORS.panel, borderLeft: `5px solid ${sev.color}`, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.textMuted }}>
          {TYPES.find((t) => t.value === issue.type)?.label}
        </span>
        <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><Trash2 size={14} /></button>
      </div>
      <h3 onClick={onOpen} style={{ fontSize: 15, fontWeight: 600, margin: "6px 0 4px", cursor: "pointer" }}>{issue.title}</h3>
      {(issue.client || issue.lot) && (
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>
          {issue.client && <>Cliente: {issue.client}</>}
          {issue.client && issue.lot && <> · </>}
          {issue.lot && <>Lote: {issue.lot}</>}
        </div>
      )}
      {issue.reference && <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>Ref: {issue.reference}</div>}
      <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 600, color: "#fff", background: sev.color, padding: "2px 8px", marginBottom: 10, display: "inline-block" }}>{sev.label}</span>
      <select value={issue.status} onChange={(e) => onStatusChange(e.target.value)} style={{ ...selectStyle, width: "100%", fontSize: 12, padding: "6px 8px", marginTop: 6 }}>
        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    </div>
  );
}

function IssueModal({ user, onClose }) {
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
    if (!form.title.trim()) return;
    setSaving(true);
    setError("");
    let docRef;
    try {
      docRef = await addDoc(collection(db, "quality_issues"), {
        ...form,
        reportedBy: user.email,
        createdAt: serverTimestamp(),
        photos: [],
      });
      logActivity(user.email, "Calidad", "Creada", form.title);
    } catch (err) {
      setSaving(false);
      setError("No se pudo guardar la incidencia. Revisa tu conexión y las reglas de Firestore.");
      return;
    }

    if (files.length) {
      try {
        const uploaded = [];
        for (let i = 0; i < files.length; i++) {
          setUploadStatus(`Subiendo foto ${i + 1} de ${files.length}…`);
          const blob = await withTimeout(compressImage(files[i]), 15000, "La foto tardó demasiado en procesarse.");
          const result = await withTimeout(uploadToCloudinary(blob, `quality/${docRef.id}`), 20000, "La subida de la foto tardó demasiado.");
          uploaded.push(result);
        }
        setUploadStatus("Guardando enlaces de las fotos…");
        await updateDoc(doc(db, "quality_issues", docRef.id), { photos: uploaded });
      } catch (err) {
        setSaving(false);
        setUploadStatus("");
        setError("La incidencia se guardó, pero las fotos no se pudieron subir a Cloudinary. Revisa el cloud name y el upload preset en src/cloudinary.js.");
        return;
      }
    }
    setSaving(false);
    setUploadStatus("");
    onClose();
  }

  return (
    <ModalShell onClose={onClose} title="Nueva incidencia de calidad">
      <form onSubmit={submit}>
        <Field label="Título *">
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} placeholder="Ej. Sellado defectuoso lote 4521" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tipo">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Severidad">
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} style={inputStyle}>
              {SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Cliente">
            <input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} style={inputStyle} placeholder="Ej. Marca S.L." />
          </Field>
          <Field label="Lote / nº de lote">
            <input value={form.lot} onChange={(e) => setForm({ ...form, lot: e.target.value })} style={inputStyle} placeholder="Ej. L-2026-0731" />
          </Field>
        </div>
        <Field label="Referencia (línea, máquina, orden…)">
          <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} style={inputStyle} placeholder="Ej. Línea 2" />
        </Field>
        <Field label="Descripción">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>
        <Field label="Acción correctiva (si ya se conoce)">
          <textarea value={form.correctiveAction} onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>
        <Field label="Fotos">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {previews.map((src, i) => <img key={i} src={src} style={{ width: 60, height: 60, objectFit: "cover" }} />)}
            <button type="button" onClick={() => fileInputRef.current.click()} style={{ width: 60, height: 60, border: `1px dashed ${COLORS.line}`, background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Camera size={20} color={COLORS.textMuted} />
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: "none" }} />
        </Field>
        <button type="submit" disabled={saving} style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center", marginTop: 8 }}>
          {uploadStatus || (saving ? "Guardando…" : "Guardar incidencia")}
        </button>
        {error && <p style={{ color: COLORS.critical, fontSize: 13, marginTop: 10 }}>{error}</p>}
      </form>
    </ModalShell>
  );
}

function DetailModal({ issue, onClose }) {
  const sev = severityMeta(issue.severity);
  const [viewerIndex, setViewerIndex] = useState(null);

  function share() {
    const lines = [
      `${TYPES.find((t) => t.value === issue.type)?.label}: ${issue.title}`,
      issue.client ? `Cliente: ${issue.client}` : null,
      issue.lot ? `Lote: ${issue.lot}` : null,
      issue.reference ? `Ref: ${issue.reference}` : null,
      `Severidad: ${sev.label} · Estado: ${issue.status}`,
      issue.description ? `Descripción: ${issue.description}` : null,
      issue.correctiveAction ? `Acción correctiva: ${issue.correctiveAction}` : null,
      issue.photos?.length ? `Fotos: ${issue.photos.map((p) => p.url).join(" ")}` : null,
    ].filter(Boolean).join("\n");
    shareText(issue.title, lines);
  }

  return (
    <ModalShell onClose={onClose} title={TYPES.find((t) => t.value === issue.type)?.label}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>{issue.title}</h2>
        <button onClick={share} style={{ background: "none", border: `1px solid ${COLORS.line}`, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <Share2 size={14} /> Compartir
        </button>
      </div>
      {(issue.client || issue.lot) && (
        <p style={{ color: COLORS.textMuted, fontSize: 13, margin: "0 0 4px" }}>
          {issue.client && <>Cliente: {issue.client}</>}
          {issue.client && issue.lot && <> · </>}
          {issue.lot && <>Lote: {issue.lot}</>}
        </p>
      )}
      {issue.reference && <p style={{ color: COLORS.textMuted, fontSize: 13, margin: "0 0 10px" }}>Ref: {issue.reference}</p>}
      <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 600, color: "#fff", background: sev.color, padding: "2px 8px" }}>{sev.label}</span>
      {issue.description && <p style={{ fontSize: 14, marginTop: 12 }}>{issue.description}</p>}
      {issue.correctiveAction && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", color: COLORS.textMuted, fontWeight: 600, marginBottom: 4 }}>Acción correctiva</div>
          <p style={{ fontSize: 14, margin: 0 }}>{issue.correctiveAction}</p>
        </div>
      )}
      {issue.photos?.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginTop: 14 }}>
          {issue.photos.map((p, i) => (
            <button key={i} onClick={() => setViewerIndex(i)} style={{ padding: 0, border: "none", background: "none", cursor: "pointer" }}>
              <img src={p.url} style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.textMuted, fontSize: 13, marginTop: 14 }}>
          <ImageIcon size={16} /> Sin fotos adjuntas
        </div>
      )}
      {viewerIndex !== null && <FotoViewer photos={issue.photos} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />}
    </ModalShell>
  );
}
