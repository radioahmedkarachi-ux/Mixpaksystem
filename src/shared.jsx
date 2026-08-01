import React from "react";
import { X, AlertTriangle } from "lucide-react";
import { Share } from "@capacitor/share";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";

export const COLORS = {
  bg: "#E7E4DC",
  panel: "#FFFFFF",
  dark: "#22262A",
  safety: "#F2A900",
  critical: "#C1440E",
  steel: "#4A6FA5",
  green: "#4C7A4A",
  line: "#CFCABE",
  textMuted: "#5B5850",
};

export const selectStyle = { background: "#fff", border: `1px solid ${COLORS.line}`, padding: "8px 10px", fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif", color: COLORS.dark };
export const inputStyle = { width: "100%", border: `1px solid ${COLORS.line}`, padding: "9px 10px", fontSize: 14, fontFamily: "'IBM Plex Sans', sans-serif", color: COLORS.dark, background: "#fff", boxSizing: "border-box" };
export const primaryButtonStyle = { background: COLORS.safety, color: COLORS.dark, border: "none", padding: "10px 16px", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" };
export const ghostButtonStyle = { background: "none", border: `1px solid ${COLORS.line}`, padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 };

// Comprime una imagen en el navegador antes de subirla (ahorra datos y espacio)
export function compressImage(file, maxSize = 1280, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = (e) => {
      img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("No se pudo comprimir la imagen."));
        }, "image/jpeg", quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Evita que la app se quede colgada para siempre si Storage no responde
// (por ejemplo, si Storage no está activado en el proyecto de Firebase).
export function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

export function CenteredMessage({ text }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {text}
    </div>
  );
}

export function HazardBar() {
  return (
    <div style={{ height: 5, backgroundImage: `repeating-linear-gradient(135deg, ${COLORS.safety} 0px, ${COLORS.safety} 10px, ${COLORS.dark} 10px, ${COLORS.dark} 20px)` }} />
  );
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, textTransform: "uppercase", color: COLORS.textMuted, marginBottom: 4, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

export function ModalShell({ children, onClose, title }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(24,27,30,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.panel, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto" }}>
        <HazardBar />
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.textMuted }}>{title}</span>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ onCancel, onConfirm, title = "Eliminar", message = "Esta acción no se puede deshacer.", confirmLabel = "Eliminar" }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(24,27,30,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 60 }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.panel, padding: 20, maxWidth: 340, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <AlertTriangle size={20} color={COLORS.critical} />
          <h3 style={{ margin: 0, fontFamily: "'Oswald', sans-serif", fontSize: 15, textTransform: "uppercase" }}>{title}</h3>
        </div>
        <p style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 16 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={ghostButtonStyle}>Cancelar</button>
          <button onClick={onConfirm} style={{ padding: "8px 14px", background: COLORS.critical, color: "#fff", border: "none", cursor: "pointer" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function StatCard({ label, value, color, Icon }) {
  return (
    <div style={{ background: COLORS.panel, borderLeft: `5px solid ${color}`, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 600 }}>{value}</div>
        <div style={{ fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase" }}>{label}</div>
      </div>
      <Icon size={20} color={color} />
    </div>
  );
}

export function EmptyState({ Icon, title, message, onAdd, addLabel }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px dashed ${COLORS.line}`, padding: "48px 24px", textAlign: "center" }}>
      <Icon size={34} color={COLORS.textMuted} style={{ margin: "0 auto 10px" }} />
      <h3 style={{ fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", fontSize: 16, margin: "0 0 6px" }}>{title}</h3>
      <p style={{ color: COLORS.textMuted, fontSize: 14, margin: "0 0 16px" }}>{message}</p>
      {onAdd && <button onClick={onAdd} style={primaryButtonStyle}>{addLabel}</button>}
    </div>
  );
}

// Exporta un array de objetos a un archivo CSV descargable (sin librerías externas)
export function exportToCsv(filename, rows) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Comparte texto usando el selector nativo de Android (WhatsApp, Gmail, etc.)
// a través del plugin de Capacitor. Si no está disponible (p. ej. abierto en
// un navegador de escritorio), cae al Web Share API o copia al portapapeles.
export async function shareText(title, text) {
  try {
    await Share.share({ title, text, dialogTitle: title });
    return "shared";
  } catch (err) {
    if (err?.message === "Share canceled" || err?.message?.includes("cancel")) return "cancelled";
  }
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (err) {
      if (err.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch (err) {
    return "failed";
  }
}

// Registra una acción en el historial (colección "activity_log"). Nunca debe
// romper la acción principal si falla, por eso se traga el error.
export async function logActivity(userEmail, module, action, details) {
  try {
    await addDoc(collection(db, "activity_log"), {
      userEmail,
      module,
      action,
      details: details || "",
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("No se pudo registrar la actividad en el historial", err);
  }
}

// Comprueba si una fecha (string "YYYY-MM-DD" o Timestamp de Firestore) cae
// dentro del rango [from, to] (ambos "YYYY-MM-DD", opcionales).
export function inDateRange(dateValue, from, to) {
  if (!from && !to) return true;
  if (!dateValue) return false;
  let d;
  if (typeof dateValue === "string") d = dateValue;
  else if (dateValue.toDate) d = dateValue.toDate().toISOString().slice(0, 10);
  else return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

// Par de campos "Desde" / "Hasta" para filtrar por rango de fechas (formato YYYY-MM-DD)
export function DateRangeFilter({ from, to, onFromChange, onToChange }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} style={{ ...inputStyle, width: 140 }} title="Desde" />
      <span style={{ color: COLORS.textMuted, fontSize: 12 }}>a</span>
      <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} style={{ ...inputStyle, width: 140 }} title="Hasta" />
      {(from || to) && (
        <button type="button" onClick={() => { onFromChange(""); onToChange(""); }} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 12, textDecoration: "underline" }}>
          Limpiar
        </button>
      )}
    </div>
  );
}
