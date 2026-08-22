import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "./firebase.js";
import { COLORS, ghostButtonStyle, HazardBar } from "./shared.jsx";
import { roleLabel } from "./roles.js";
import { Clock, LogOut } from "lucide-react";

export default function PendingScreen({ user, role }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.dark, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div style={{ background: COLORS.panel, width: "100%", maxWidth: 420, textAlign: "center" }}>
        <HazardBar />
        <div style={{ padding: 32 }}>
          <Clock size={36} color={COLORS.safety} style={{ margin: "0 auto 14px" }} />
          <h1 style={{ fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", fontSize: 17, margin: "0 0 10px" }}>
            Cuenta pendiente de aprobación
          </h1>
          <p style={{ color: COLORS.textMuted, fontSize: 14, margin: "0 0 4px" }}>{user.email}</p>
          <p style={{ color: COLORS.textMuted, fontSize: 13, margin: "0 0 18px" }}>Categoría elegida: {roleLabel(role)}</p>
          <p style={{ fontSize: 14, margin: "0 0 22px" }}>
            Un administrador tiene que aprobar tu cuenta antes de que puedas entrar. Avísale.
          </p>
          <button onClick={() => signOut(auth)} style={{ ...ghostButtonStyle, margin: "0 auto" }}>
            <LogOut size={16} /> Salir
          </button>
        </div>
      </div>
    </div>
  );
}
