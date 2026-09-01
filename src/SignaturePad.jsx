import React, { useRef, useState, useEffect } from "react";
import { X, RotateCcw } from "lucide-react";
import { COLORS, primaryButtonStyle, ghostButtonStyle, HazardBar } from "./shared.jsx";

export default function SignaturePad({ title, onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [empty, setEmpty] = useState(true);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = COLORS.dark;
  }, []);

  function pointFromEvent(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  }

  function start(e) {
    e.preventDefault();
    drawing.current = true;
    last.current = pointFromEvent(e);
  }

  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (empty) setEmpty(false);
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
  }

  function save() {
    if (empty) return;
    canvasRef.current.toBlob((blob) => onSave(blob), "image/png");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(24,27,30,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: COLORS.panel, width: "100%", maxWidth: 480 }}>
        <HazardBar />
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 15, textTransform: "uppercase" }}>{title || "Firma digital"}</span>
            <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
          </div>
          <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "0 0 10px" }}>Firma con el dedo dentro del recuadro.</p>
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: 200, background: "#fff", border: `1px dashed ${COLORS.line}`, touchAction: "none" }}
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={start}
            onTouchMove={move}
            onTouchEnd={end}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={clear} style={{ ...ghostButtonStyle, flex: 1, justifyContent: "center" }}>
              <RotateCcw size={14} /> Borrar
            </button>
            <button onClick={save} disabled={empty} style={{ ...primaryButtonStyle, flex: 1, justifyContent: "center", opacity: empty ? 0.5 : 1 }}>
              Guardar firma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
