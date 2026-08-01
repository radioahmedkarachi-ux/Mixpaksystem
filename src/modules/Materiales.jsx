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
  increment,
} from "firebase/firestore";
import { db } from "../firebase.js";
import { uploadToCloudinary } from "../cloudinary.js";
import FotoViewer from "../FotoViewer.jsx";
import { Boxes, Plus, Trash2, AlertTriangle, Minus, PackagePlus, Search, Download, Share2, Camera, Image as ImageIcon } from "lucide-react";
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
  CenteredMessage,
  Field,
  ModalShell,
  ConfirmDialog,
  StatCard,
  EmptyState,
} from "../shared.jsx";

const CATEGORIES = [
  { value: "repuesto", label: "Repuesto" },
  { value: "consumible", label: "Consumible" },
  { value: "herramienta", label: "Herramienta" },
  { value: "materia_prima", label: "Materia prima" },
  { value: "formato_envase", label: "Formato de envase (film/sachet/stick/doypack)" },
  { value: "otro", label: "Otro" },
];

const emptyForm = {
  name: "",
  code: "",
  category: "repuesto",
  unit: "unidad",
  stock: 0,
  minStock: 0,
  location: "",
  lot: "",
  expiryDate: "",
};

export default function Materiales({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "materials"), orderBy("name"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  async function adjustStock(item, delta) {
    const next = (item.stock || 0) + delta;
    if (next < 0) return;
    await updateDoc(doc(db, "materials", item.id), {
      stock: increment(delta),
      lastMovementBy: user.email,
      lastMovementAt: serverTimestamp(),
    });
    logActivity(user.email, "Materiales", "Ajuste de stock", `${item.name}: ${item.stock} → ${next} ${item.unit}`);
  }

  async function removeItem(item) {
    await deleteDoc(doc(db, "materials", item.id));
    logActivity(user.email, "Materiales", "Eliminado", item.name);
    setConfirmDelete(null);
  }

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (onlyLow && !(it.stock <= it.minStock)) return false;
      if (search && !`${it.name} ${it.code}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, search, onlyLow]);

  const stats = useMemo(() => {
    const low = items.filter((i) => i.stock <= i.minStock).length;
    const expiring = items.filter((i) => {
      const d = daysUntil(i.expiryDate);
      return d !== null && d <= 30;
    }).length;
    return { total: items.length, low, expiring };
  }, [items]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, textTransform: "uppercase", margin: 0 }}>
          Materiales y repuestos
        </h1>
        <button onClick={() => { setEditItem(null); setModalOpen(true); }} style={primaryButtonStyle}>
          <Plus size={16} /> Nuevo material
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
        <StatCard label="Materiales registrados" value={stats.total} color={COLORS.steel} Icon={Boxes} />
        <StatCard label="Bajo mínimo" value={stats.low} color={COLORS.critical} Icon={AlertTriangle} />
        <StatCard label="Caducando (30 días)" value={stats.expiring} color={COLORS.safety} Icon={AlertTriangle} />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={14} color={COLORS.textMuted} style={{ position: "absolute", left: 9, top: 11 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o código" style={{ ...inputStyle, paddingLeft: 30 }} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: COLORS.textMuted }}>
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
          Solo bajo mínimo
        </label>
        <button
          onClick={() => exportToCsv("materiales", filtered.map((it) => ({
            nombre: it.name, codigo: it.code, categoria: it.category, unidad: it.unit,
            stock: it.stock, stockMinimo: it.minStock, ubicacion: it.location || "",
            lote: it.lot || "", caducidad: it.expiryDate || "",
          })))}
          style={ghostButtonStyle}
        >
          <Download size={16} /> Exportar
        </button>
      </div>

      {loading ? (
        <CenteredMessage text="Cargando materiales…" />
      ) : items.length === 0 ? (
        <EmptyState Icon={Boxes} title="Sin materiales todavía" message="Registra el primer repuesto o consumible de tu almacén." onAdd={() => setModalOpen(true)} addLabel="Crear primer material" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {filtered.map((it) => (
            <MaterialCard
              key={it.id}
              item={it}
              onAdjust={(d) => adjustStock(it, d)}
              onEdit={() => { setEditItem(it); setModalOpen(true); }}
              onDelete={() => setConfirmDelete(it)}
            />
          ))}
          {filtered.length === 0 && <div style={{ fontSize: 13, color: COLORS.textMuted, fontStyle: "italic" }}>No hay materiales que coincidan con el filtro.</div>}
        </div>
      )}

      {modalOpen && <MaterialModal item={editItem} user={user} onClose={() => setModalOpen(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar material"
          message="Se eliminará este material del inventario. No se puede deshacer."
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => removeItem(confirmDelete)}
        />
      )}
    </div>
  );
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
  return Math.ceil(diff);
}

function MaterialCard({ item, onAdjust, onEdit, onDelete }) {
  const low = item.stock <= item.minStock;
  const daysLeft = daysUntil(item.expiryDate);
  const expired = daysLeft !== null && daysLeft < 0;
  const expiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
  const [viewerIndex, setViewerIndex] = useState(null);

  function share() {
    const lines = [
      `Material: ${item.name}${item.code ? ` (${item.code})` : ""}`,
      `Categoría: ${CATEGORIES.find((c) => c.value === item.category)?.label || item.category}`,
      `Stock: ${item.stock} ${item.unit} (mínimo: ${item.minStock})`,
      item.location ? `Ubicación: ${item.location}` : null,
      item.lot ? `Lote: ${item.lot}` : null,
      item.expiryDate ? `Caduca: ${item.expiryDate}` : null,
    ].filter(Boolean).join("\n");
    shareText(item.name, lines);
  }

  return (
    <div style={{ background: COLORS.panel, borderLeft: `5px solid ${expired || low ? COLORS.critical : expiringSoon ? COLORS.safety : COLORS.green}`, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.textMuted }}>{item.code || "—"}</span>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={share} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><Share2 size={14} /></button>
          <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><Trash2 size={14} /></button>
        </div>
      </div>
      <h3 onClick={onEdit} style={{ fontSize: 15, fontWeight: 600, margin: "6px 0 2px", cursor: "pointer" }}>{item.name}</h3>
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
        {CATEGORIES.find((c) => c.value === item.category)?.label || item.category}
        {item.location && <> · {item.location}</>}
      </div>
      {item.photos?.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto" }}>
          {item.photos.slice(0, 3).map((p, i) => (
            <img key={i} src={p.url} alt="" onClick={() => setViewerIndex(i)} style={{ width: 52, height: 52, objectFit: "cover", cursor: "pointer" }} />
          ))}
        </div>
      )}
      {(item.lot || item.expiryDate) && (
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
          {item.lot && <>Lote: {item.lot}</>}
          {item.lot && item.expiryDate && <> · </>}
          {item.expiryDate && <>Caduca: {item.expiryDate}</>}
        </div>
      )}
      {low && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: COLORS.critical, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
          <AlertTriangle size={13} /> Bajo el mínimo ({item.minStock} {item.unit})
        </div>
      )}
      {expired && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: COLORS.critical, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
          <AlertTriangle size={13} /> Caducado
        </div>
      )}
      {!expired && expiringSoon && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: COLORS.safety, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
          <AlertTriangle size={13} /> Caduca en {daysLeft} días
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 600 }}>
          {item.stock} <span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "'IBM Plex Sans', sans-serif" }}>{item.unit}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onAdjust(-1)} style={{ ...ghostButtonStyle, padding: "6px 10px" }}><Minus size={14} /></button>
          <button onClick={() => onAdjust(1)} style={{ ...ghostButtonStyle, padding: "6px 10px" }}><PackagePlus size={14} /></button>
        </div>
      </div>
      {viewerIndex !== null && <FotoViewer photos={item.photos} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />}
    </div>
  );
}

function MaterialModal({ item, user, onClose }) {
  const [form, setForm] = useState(item ? { ...emptyForm, ...item } : emptyForm);
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
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    const payload = {
      name: form.name,
      code: form.code,
      category: form.category,
      unit: form.unit,
      stock: Number(form.stock) || 0,
      minStock: Number(form.minStock) || 0,
      location: form.location,
      lot: form.lot,
      expiryDate: form.expiryDate,
    };
    let docId = item?.id;
    try {
      if (item) {
        await updateDoc(doc(db, "materials", item.id), payload);
        logActivity(user.email, "Materiales", "Editado", form.name);
      } else {
        const docRef = await addDoc(collection(db, "materials"), { ...payload, photos: item?.photos || [], createdAt: serverTimestamp() });
        docId = docRef.id;
        logActivity(user.email, "Materiales", "Creado", form.name);
      }
    } catch (err) {
      setSaving(false);
      setError("No se pudo guardar el material. Revisa tu conexión y las reglas de Firestore.");
      return;
    }

    if (files.length) {
      try {
        const uploaded = [...(item?.photos || [])];
        for (let i = 0; i < files.length; i++) {
          setUploadStatus(`Subiendo foto ${i + 1} de ${files.length}…`);
          const blob = await withTimeout(compressImage(files[i]), 15000, "La foto tardó demasiado en procesarse.");
          const result = await withTimeout(uploadToCloudinary(blob, `materials/${docId}`), 20000, "La subida de la foto tardó demasiado.");
          uploaded.push(result);
        }
        setUploadStatus("Guardando enlaces de las fotos…");
        await updateDoc(doc(db, "materials", docId), { photos: uploaded });
      } catch (err) {
        setSaving(false);
        setUploadStatus("");
        setError("El material se guardó, pero las fotos no se pudieron subir a Cloudinary.");
        return;
      }
    }
    setSaving(false);
    setUploadStatus("");
    onClose();
  }

  return (
    <ModalShell onClose={onClose} title={item ? "Editar material" : "Nuevo material"}>
      <form onSubmit={submit}>
        <Field label="Nombre *">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Ej. Rodamiento 6205" />
        </Field>
        <Field label="Código">
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} style={inputStyle} placeholder="Ej. ROD-6205" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Categoría">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Unidad">
            <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} style={inputStyle} placeholder="unidad, kg, m, litro…" />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Stock actual">
            <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Stock mínimo">
            <input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} style={inputStyle} />
          </Field>
        </div>
        <Field label="Ubicación en almacén">
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={inputStyle} placeholder="Ej. Estante A3" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Lote / nº de lote">
            <input value={form.lot} onChange={(e) => setForm({ ...form, lot: e.target.value })} style={inputStyle} placeholder="Ej. L-2026-0731" />
          </Field>
          <Field label="Fecha de caducidad">
            <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} style={inputStyle} />
          </Field>
        </div>
        <Field label="Fotos del material">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {(item?.photos || []).map((p, i) => <img key={`ex-${i}`} src={p.url} style={{ width: 60, height: 60, objectFit: "cover" }} />)}
            {previews.map((src, i) => <img key={i} src={src} style={{ width: 60, height: 60, objectFit: "cover" }} />)}
            <button type="button" onClick={() => fileInputRef.current.click()} style={{ width: 60, height: 60, border: `1px dashed ${COLORS.line}`, background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Camera size={20} color={COLORS.textMuted} />
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: "none" }} />
        </Field>
        <button type="submit" disabled={saving} style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center", marginTop: 8 }}>
          {uploadStatus || (saving ? "Guardando…" : "Guardar material")}
        </button>
        {error && <p style={{ color: COLORS.critical, fontSize: 13, marginTop: 10 }}>{error}</p>}
      </form>
    </ModalShell>
  );
}
