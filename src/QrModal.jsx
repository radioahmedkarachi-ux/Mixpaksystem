import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { ModalShell, primaryButtonStyle, COLORS } from "./shared.jsx";
import { Share2 } from "lucide-react";

// Modal que genera y muestra un código QR a partir de un texto (por ejemplo
// "material:ID" o "machine:Nombre"), listo para compartir/imprimir.
export default function QrModal({ title, value, label, onClose }) {
  const canvasRef = useRef(null);
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    QRCode.toDataURL(value, { width: 260, margin: 1, color: { dark: "#22262A", light: "#FFFFFF" } })
      .then(setDataUrl)
      .catch((err) => console.error("No se pudo generar el QR", err));
  }, [value]);

  async function share() {
    if (!dataUrl) return;
    const base64 = dataUrl.split(",")[1];
    const filename = "qr-mixpak.png";
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
        await Share.share({ title: filename, url: result.uri });
      } catch (err) {
        alert("No se pudo compartir el código QR.");
      }
    } else {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      a.click();
    }
  }

  return (
    <ModalShell onClose={onClose} title={title || "Código QR"}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {label && <p style={{ fontSize: 14, fontWeight: 600, margin: 0, textAlign: "center" }}>{label}</p>}
        {dataUrl ? (
          <img src={dataUrl} alt="Código QR" style={{ width: 220, height: 220 }} />
        ) : (
          <p style={{ fontSize: 13, color: COLORS.textMuted }}>Generando…</p>
        )}
        <p style={{ fontSize: 12, color: COLORS.textMuted, textAlign: "center", margin: 0 }}>
          Imprime o pega este código en el sitio físico correspondiente. Al escanearlo, la app abre esto directamente.
        </p>
        <button onClick={share} style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center" }}>
          <Share2 size={16} /> Compartir / Guardar QR
        </button>
      </div>
    </ModalShell>
  );
}
