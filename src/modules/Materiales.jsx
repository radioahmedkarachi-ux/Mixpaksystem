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
  where,
  increment,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase.js";
import { uploadToCloudinary } from "../cloudinary.js";
import FotoViewer from "../FotoViewer.jsx";
import { Boxes, Plus, Trash2, AlertTriangle, Minus, PackagePlus, Search, Download, Share2, Camera, Image as ImageIcon, ArrowLeftRight, History, ArrowDownCircle, ArrowUpCircle, FileText } from "lucide-react";
import {
  COLORS,
  inputStyle,
  selectStyle,
  primaryButtonStyle,
  ghostButtonStyle,
  compressImage,
  withTimeout,
  exportToCsv,
  exportToPdf,
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
  const [allLots, setAllLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [movementItem, setMovementItem] = useState(null);
  const [kardexItem, setKardexItem] = useState(null);
  const [lotsItem, setLotsItem] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "materials"), orderBy("name"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => setLoadError(`No se pudo cargar Materiales (${err.code || err.message}). Revisa que hayas publicado el firestore.rules más reciente.`)
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "material_lots"),
      (snap) => setAllLots(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => setLoadError(`No se pudieron cargar los lotes (${err.code || err.message}). Revisa que hayas publicado el firestore.rules más reciente.`)
    );
    return unsub;
  }, []);

  // Fecha de caducidad más próxima entre los lotes activos de un material;
  // si no tiene lotes registrados, cae al campo suelto antiguo (compatibilidad).
  function nearestExpiry(item) {
    const activeLots = allLots.filter((l) => l.materialId === item.id && (l.quantity || 0) > 0 && l.expiryDate);
    if (activeLots.length === 0) return item.expiryDate || null;
    return activeLots.reduce((min, l) => (l.expiryDate < min ? l.expiryDate : min), activeLots[0].expiryDate);
  }

  async function adjustStock(item, delta) {
    try {
      await registerMovement(item, {
        type: delta > 0 ? "entrada" : "salida",
        quantity: Math.abs(delta),
        reason: "Ajuste rápido",
      });
    } catch (err) {
      // Si el ajuste rápido de salida no tiene lotes suficientes, no hacemos
      // nada más que dejarlo pasar en silencio — es un botón pequeño sin
      // espacio para mostrar el error; para casos así conviene usar "Movimiento".
    }
  }

  async function registerMovement(item, { type, quantity, reason, lot, expiryDate, lotId }) {
    const delta = type === "entrada" ? quantity : -quantity;
    const next = (item.stock || 0) + delta;
    if (next < 0) throw new Error("El stock no puede quedar negativo.");

    let lotLabel = lot || "";

    if (type === "entrada") {
      const lotCode = (lot || "SIN-LOTE").trim();
      const existing = await getDocs(query(
        collection(db, "material_lots"),
        where("materialId", "==", item.id),
        where("lot", "==", lotCode)
      ));
      if (!existing.empty) {
        const lotDoc = existing.docs[0];
        await updateDoc(lotDoc.ref, {
          quantity: increment(quantity),
          ...(expiryDate ? { expiryDate } : {}),
        });
      } else {
        await addDoc(collection(db, "material_lots"), {
          materialId: item.id,
          materialName: item.name,
          lot: lotCode,
          expiryDate: expiryDate || "",
          quantity,
          unit: item.unit,
          createdAt: serverTimestamp(),
        });
      }
      lotLabel = lotCode;
    } else {
      // Salida: descuenta de un lote concreto. Si no se indica cuál (p. ej.
      // desde el ajuste rápido +/-1), se elige automáticamente el que
      // caduca antes (FEFO), para que el total y los lotes nunca se descuadren.
      let targetLotId = lotId;
      let lotDocsSnap = null;
      if (!targetLotId) {
        lotDocsSnap = await getDocs(query(collection(db, "material_lots"), where("materialId", "==", item.id)));
        const withStock = lotDocsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((l) => (l.quantity || 0) > 0)
          .sort((a, b) => (a.expiryDate || "9999-99-99").localeCompare(b.expiryDate || "9999-99-99"));
        if (withStock.length) targetLotId = withStock[0].id;
      }
      if (targetLotId) {
        const lotRef = doc(db, "material_lots", targetLotId);
        if (!lotDocsSnap) lotDocsSnap = await getDocs(query(collection(db, "material_lots"), where("materialId", "==", item.id)));
        const lotDoc = lotDocsSnap.docs.find((d) => d.id === targetLotId);
        if (lotDoc) {
          const available = lotDoc.data().quantity || 0;
          if (quantity > available) throw new Error(`Ese lote solo tiene ${available} ${item.unit} disponibles.`);
          await updateDoc(lotRef, { quantity: increment(-quantity) });
          lotLabel = lotDoc.data().lot;
        }
      }
    }

    await updateDoc(doc(db, "materials", item.id), {
      stock: increment(delta),
      lastMovementBy: user.email,
      lastMovementAt: serverTimestamp(),
    });
    await addDoc(collection(db, "material_movements"), {
      materialId: item.id,
      materialName: item.name,
      type,
      quantity,
      balanceAfter: next,
      reason: reason || "",
      lot: lotLabel,
      userEmail: user.email,
      createdAt: serverTimestamp(),
    });
    logActivity(user.email, "Materiales", type === "entrada" ? "Entrada de stock" : "Salida de stock", `${item.name}: ${quantity} ${item.unit} (${reason || "sin motivo"})${lotLabel ? ` · Lote ${lotLabel}` : ""}`);
  }

  async function removeItem(item) {
    try {
      const lotsSnap = await getDocs(query(collection(db, "material_lots"), where("materialId", "==", item.id)));
      await Promise.all(lotsSnap.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, "materials", item.id));
      logActivity(user.email, "Materiales", "Eliminado", item.name);
      setConfirmDelete(null);
    } catch (err) {
      alert("No se pudo eliminar el material. Revisa tu conexión e inténtalo de nuevo.");
    }
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
      const d = daysUntil(nearestExpiry(i));
      return d !== null && d <= 30;
    }).length;
    return { total: items.length, low, expiring };
  }, [items, allLots]);

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
          <Download size={16} /> CSV
        </button>
        <button
          onClick={() => exportToPdf({
            filename: "materiales",
            title: "Materiales",
            subtitle: `${filtered.length} material(es)`,
            userEmail: user.email,
            rows: filtered.map((it) => ({
              Nombre: it.name, Código: it.code || "", Categoría: it.category, Unidad: it.unit,
              Stock: it.stock, "Stock mín.": it.minStock, Ubicación: it.location || "",
              Lote: it.lot || "", Caducidad: nearestExpiry(it) || "",
            })),
          })}
          style={ghostButtonStyle}
        >
          <FileText size={16} /> PDF
        </button>
      </div>

      {loading ? (
        <CenteredMessage text={loadError || "Cargando materiales…"} />
      ) : items.length === 0 ? (
        <EmptyState Icon={Boxes} title="Sin materiales todavía" message="Registra el primer repuesto o consumible de tu almacén." onAdd={() => setModalOpen(true)} addLabel="Crear primer material" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {filtered.map((it) => (
            <MaterialCard
              key={it.id}
              item={it}
              expiryDate={nearestExpiry(it)}
              onAdjust={(d) => adjustStock(it, d)}
              onEdit={() => { setEditItem(it); setModalOpen(true); }}
              onDelete={() => setConfirmDelete(it)}
              onMovement={() => setMovementItem(it)}
              onKardex={() => setKardexItem(it)}
              onLots={() => setLotsItem(it)}
            />
          ))}
          {filtered.length === 0 && <div style={{ fontSize: 13, color: COLORS.textMuted, fontStyle: "italic" }}>No hay materiales que coincidan con el filtro.</div>}
        </div>
      )}

      {modalOpen && <MaterialModal item={editItem} user={user} onClose={() => setModalOpen(false)} />}
      {movementItem && (
        <MovementModal
          item={movementItem}
          onClose={() => setMovementItem(null)}
          onSubmit={(data) => registerMovement(movementItem, data)}
        />
      )}
      {kardexItem && <KardexModal item={kardexItem} onClose={() => setKardexItem(null)} />}
      {lotsItem && <LotsModal item={lotsItem} onClose={() => setLotsItem(null)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar material"
          message="Se eliminará este material y sus lotes activos del inventario. Su kardex (historial de movimientos) se conserva. No se puede deshacer."
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

function MaterialCard({ item, expiryDate, onAdjust, onEdit, onDelete, onMovement, onKardex, onLots }) {
  const low = item.stock <= item.minStock;
  const daysLeft = daysUntil(expiryDate);
  const expired = daysLeft !== null && daysLeft < 0;
  const expiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
  const [viewerIndex, setViewerIndex] = useState(null);

  async function share() {
    const lines = [
      `Material: ${item.name}${item.code ? ` (${item.code})` : ""}`,
      `Categoría: ${CATEGORIES.find((c) => c.value === item.category)?.label || item.category}`,
      `Stock: ${item.stock} ${item.unit} (mínimo: ${item.minStock})`,
      item.location ? `Ubicación: ${item.location}` : null,
      item.lot ? `Lote: ${item.lot}` : null,
      expiryDate ? `Próxima caducidad: ${expiryDate}` : null,
    ].filter(Boolean).join("\n");
    const result = await shareText(item.name, lines);
    if (result === "copied") alert("No se pudo abrir el selector de compartir — se copió el texto al portapapeles.");
    if (result === "failed") alert("No se pudo compartir ni copiar el texto.");
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
      {(item.lot || expiryDate) && (
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
          {item.lot && <>Lote: {item.lot}</>}
          {item.lot && expiryDate && <> · </>}
          {expiryDate && <>Próxima caducidad: {expiryDate}</>}
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
          <button onClick={() => onAdjust(-1)} style={{ ...ghostButtonStyle, padding: "6px 10px" }} title="Restar 1"><Minus size={14} /></button>
          <button onClick={() => onAdjust(1)} style={{ ...ghostButtonStyle, padding: "6px 10px" }} title="Sumar 1"><PackagePlus size={14} /></button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button onClick={onMovement} style={{ ...ghostButtonStyle, padding: "6px 8px", flex: 1, justifyContent: "center", fontSize: 12 }}>
          <ArrowLeftRight size={13} /> Movimiento
        </button>
        <button onClick={onLots} style={{ ...ghostButtonStyle, padding: "6px 8px", flex: 1, justifyContent: "center", fontSize: 12 }}>
          <Boxes size={13} /> Lotes
        </button>
        <button onClick={onKardex} style={{ ...ghostButtonStyle, padding: "6px 8px", flex: 1, justifyContent: "center", fontSize: 12 }}>
          <History size={13} /> Kardex
        </button>
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
      minStock: Number(form.minStock) || 0,
      location: form.location,
      lot: form.lot,
      expiryDate: form.expiryDate,
    };
    if (!item) payload.stock = Number(form.stock) || 0;
    let docId = item?.id;
    try {
      if (item) {
        await updateDoc(doc(db, "materials", item.id), payload);
        logActivity(user.email, "Materiales", "Editado", form.name);
      } else {
        const docRef = await addDoc(collection(db, "materials"), { ...payload, photos: item?.photos || [], createdAt: serverTimestamp() });
        docId = docRef.id;
        logActivity(user.email, "Materiales", "Creado", form.name);
        // Si arranca con stock, se crea también su primer lote y su
        // movimiento de alta, para que "Lotes" y "Kardex" no queden vacíos.
        if (payload.stock > 0) {
          await addDoc(collection(db, "material_lots"), {
            materialId: docId,
            materialName: form.name,
            lot: (form.lot || "SIN-LOTE").trim(),
            expiryDate: form.expiryDate || "",
            quantity: payload.stock,
            unit: form.unit,
            createdAt: serverTimestamp(),
          });
          await addDoc(collection(db, "material_movements"), {
            materialId: docId,
            materialName: form.name,
            type: "entrada",
            quantity: payload.stock,
            balanceAfter: payload.stock,
            reason: "Alta inicial del material",
            lot: (form.lot || "SIN-LOTE").trim(),
            userEmail: user.email,
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      setSaving(false);
      setError("No se pudo guardar el material. Revisa tu conexión y las reglas de Firestore.");
      return;
    }

    if (files.length) {
      const uploaded = [...(item?.photos || [])];
      try {
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
        if (uploaded.length > (item?.photos || []).length) {
          await updateDoc(doc(db, "materials", docId), { photos: uploaded }).catch(() => {});
        }
        setError("El material se guardó, pero no todas las fotos se pudieron subir a Cloudinary (las que sí subieron se guardaron).");
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
          <Field label={item ? "Stock actual" : "Stock inicial"}>
            {item ? (
              <div style={{ ...inputStyle, background: COLORS.bg, color: COLORS.textMuted, display: "flex", alignItems: "center" }}>
                {item.stock} {item.unit} — usa "Movimiento" para cambiarlo
              </div>
            ) : (
              <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} style={inputStyle} />
            )}
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

function MovementModal({ item, onClose, onSubmit }) {
  const [type, setType] = useState("entrada");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [lot, setLot] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [lotId, setLotId] = useState("");
  const [availableLots, setAvailableLots] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (type !== "salida") return;
    const q = query(collection(db, "material_lots"), where("materialId", "==", item.id));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((l) => (l.quantity || 0) > 0)
          .sort((a, b) => (a.expiryDate || "9999-99-99").localeCompare(b.expiryDate || "9999-99-99"));
        setAvailableLots(list);
        if (list.length && !lotId) setLotId(list[0].id);
      },
      (err) => setError(`No se pudieron cargar los lotes (${err.code || err.message}).`)
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, item.id]);

  async function submit(e) {
    e.preventDefault();
    const qty = Number(quantity);
    if (!qty || qty <= 0) return;
    if (type === "salida" && availableLots && availableLots.length > 0 && !lotId) {
      setError("Elige de qué lote sale.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit({ type, quantity: qty, reason, lot, expiryDate, lotId: type === "salida" ? lotId : "" });
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo registrar el movimiento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell onClose={onClose} title={`Movimiento · ${item.name}`}>
      <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "0 0 14px" }}>
        Stock total: <strong>{item.stock} {item.unit}</strong>
      </p>
      <form onSubmit={submit}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button type="button" onClick={() => setType("entrada")} style={{ flex: 1, padding: "10px 0", border: `1px solid ${type === "entrada" ? COLORS.green : COLORS.line}`, background: type === "entrada" ? COLORS.green : "#fff", color: type === "entrada" ? "#fff" : COLORS.dark, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", fontSize: 13 }}>
            <ArrowDownCircle size={16} /> Entrada
          </button>
          <button type="button" onClick={() => setType("salida")} style={{ flex: 1, padding: "10px 0", border: `1px solid ${type === "salida" ? COLORS.critical : COLORS.line}`, background: type === "salida" ? COLORS.critical : "#fff", color: type === "salida" ? "#fff" : COLORS.dark, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", fontSize: 13 }}>
            <ArrowUpCircle size={16} /> Salida
          </button>
        </div>
        <Field label={`Cantidad (${item.unit})`}>
          <input required type="number" min="0.01" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Motivo">
          <input value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle} placeholder={type === "entrada" ? "Ej. Compra a proveedor" : "Ej. Consumo en orden de producción"} />
        </Field>

        {type === "entrada" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Lote (nuevo o existente)">
              <input value={lot} onChange={(e) => setLot(e.target.value)} style={inputStyle} placeholder="Ej. L-2026-0731" />
            </Field>
            <Field label="Caducidad de este lote">
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} style={inputStyle} />
            </Field>
          </div>
        ) : (
          <Field label="Lote de origen (sugerido: el que caduca antes)">
            {availableLots === null ? (
              <p style={{ fontSize: 13, color: COLORS.textMuted }}>Buscando lotes disponibles…</p>
            ) : availableLots.length === 0 ? (
              <p style={{ fontSize: 13, color: COLORS.critical }}>
                Este material todavía no tiene lotes registrados. Puedes continuar y se descontará del stock general (sin lote asociado), o cancelar y usar antes "Entrada" para crear su primer lote.
              </p>
            ) : (
              <select required value={lotId} onChange={(e) => setLotId(e.target.value)} style={inputStyle}>
                {availableLots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.lot} — {l.quantity} {item.unit} disponibles{l.expiryDate ? ` · caduca ${l.expiryDate}` : ""}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}

        {error && <p style={{ color: COLORS.critical, fontSize: 13, marginTop: 10, marginBottom: 0 }}>{error}</p>}
        <button type="submit" disabled={saving} style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center", marginTop: 12 }}>
          {saving ? "Guardando…" : "Registrar movimiento"}
        </button>
      </form>
    </ModalShell>
  );
}

function KardexModal({ item, onClose }) {
  const [moves, setMoves] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "material_movements"), where("materialId", "==", item.id));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setMoves(list);
      },
      (err) => setLoadError(`No se pudo cargar el kardex (${err.code || err.message}).`)
    );
    return unsub;
  }, [item.id]);

  return (
    <ModalShell onClose={onClose} title={`Kardex · ${item.name}`}>
      <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "0 0 14px" }}>
        Stock actual: <strong>{item.stock} {item.unit}</strong>
      </p>
      {moves === null ? (
        <p style={{ fontSize: 13, color: loadError ? COLORS.critical : COLORS.textMuted }}>{loadError || "Cargando movimientos…"}</p>
      ) : moves.length === 0 ? (
        <p style={{ fontSize: 13, color: COLORS.textMuted, fontStyle: "italic" }}>Sin movimientos registrados todavía.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "55vh", overflowY: "auto" }}>
          {moves.map((m) => (
            <div key={m.id} style={{ borderLeft: `4px solid ${m.type === "entrada" ? COLORS.green : COLORS.critical}`, background: COLORS.bg, padding: "8px 10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                <span>{m.type === "entrada" ? "+ " : "− "}{m.quantity} {item.unit}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 400, color: COLORS.textMuted }}>
                  {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
                Saldo: {m.balanceAfter} {item.unit} {m.lot && <>· Lote: {m.lot}</>}
              </div>
              {m.reason && <div style={{ fontSize: 12, marginTop: 2 }}>{m.reason}</div>}
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{m.userEmail}</div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function LotsModal({ item, onClose }) {
  const [lots, setLots] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "material_lots"), where("materialId", "==", item.id));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.expiryDate || "9999-99-99").localeCompare(b.expiryDate || "9999-99-99"));
        setLots(list);
      },
      (err) => setLoadError(`No se pudieron cargar los lotes (${err.code || err.message}).`)
    );
    return unsub;
  }, [item.id]);

  const active = (lots || []).filter((l) => (l.quantity || 0) > 0);
  const agotados = (lots || []).filter((l) => (l.quantity || 0) <= 0);

  return (
    <ModalShell onClose={onClose} title={`Lotes · ${item.name}`}>
      <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "0 0 14px" }}>
        Stock total: <strong>{item.stock} {item.unit}</strong> repartido en {active.length} lote{active.length !== 1 ? "s" : ""} activo{active.length !== 1 ? "s" : ""}
      </p>
      {lots === null ? (
        <p style={{ fontSize: 13, color: loadError ? COLORS.critical : COLORS.textMuted }}>{loadError || "Cargando lotes…"}</p>
      ) : active.length === 0 ? (
        <p style={{ fontSize: 13, color: COLORS.textMuted, fontStyle: "italic" }}>
          Sin lotes registrados todavía. Usa "Movimiento → Entrada" para crear el primero.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {active.map((l) => {
            const daysLeft = daysUntil(l.expiryDate);
            const expired = daysLeft !== null && daysLeft < 0;
            const soon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
            return (
              <div key={l.id} style={{ borderLeft: `4px solid ${expired ? COLORS.critical : soon ? COLORS.safety : COLORS.green}`, background: COLORS.bg, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{l.lot}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                    {l.expiryDate ? `Caduca: ${l.expiryDate}` : "Sin fecha de caducidad"}
                    {expired && <span style={{ color: COLORS.critical, fontWeight: 600 }}> · Caducado</span>}
                    {!expired && soon && <span style={{ color: COLORS.safety, fontWeight: 600 }}> · {daysLeft} días</span>}
                  </div>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, fontWeight: 600 }}>{l.quantity} {item.unit}</div>
              </div>
            );
          })}
        </div>
      )}
      {agotados.length > 0 && (
        <p style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 14 }}>
          {agotados.length} lote{agotados.length !== 1 ? "s" : ""} agotado{agotados.length !== 1 ? "s" : ""} (sin stock), no se muestra{agotados.length !== 1 ? "n" : ""} arriba.
        </p>
      )}
    </ModalShell>
  );
}
