import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { COLORS } from "./shared.jsx";

export default function FotoViewer({ photos, startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const photo = photos[index];

  function prev(e) {
    e.stopPropagation();
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }
  function next(e) {
    e.stopPropagation();
    setIndex((i) => (i + 1) % photos.length);
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.95)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}
    >
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer" }}>
        <X size={28} color="#fff" />
      </button>
      {photos.length > 1 && (
        <div style={{ position: "absolute", top: 16, left: 16, color: "#fff", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}>
          {index + 1} / {photos.length}
        </div>
      )}
      <img
        src={photo.url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "94vw", maxHeight: "80vh", objectFit: "contain" }}
      />
      {photos.length > 1 && (
        <div style={{ display: "flex", gap: 40, marginTop: 20 }}>
          <button onClick={prev} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <ChevronLeft size={32} color="#fff" />
          </button>
          <button onClick={next} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <ChevronRight size={32} color="#fff" />
          </button>
        </div>
      )}
    </div>
  );
}
