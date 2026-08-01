import React, { useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { COLORS, primaryButtonStyle, HazardBar } from "./shared.jsx";
import { ROLES, roleLabel } from "./roles.js";
import { notifyNewRegistration } from "./emailjs.js";
import { Wrench, ShieldCheck, Factory, Boxes, LayoutDashboard, UserCog } from "lucide-react";
import logoMixpak from "./assets/logo-mixpak.png";

const ICONS = { mecanico: Wrench, calidad: ShieldCheck, produccion: Factory, almacen: Boxes, supervisor: LayoutDashboard, admin: UserCog };

export default function RoleGate({ user, onSelected }) {
  const [saving, setSaving] = useState(null);

  async function choose(role) {
    setSaving(role);
    await setDoc(doc(db, "team", user.uid), {
      email: user.email,
      role,
      aprobado: false,
      updatedAt: serverTimestamp(),
    });
    notifyNewRegistration(user.email, roleLabel(role));
    onSelected({ role, aprobado: false });
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.dark, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div style={{ background: COLORS.panel, width: "100%", maxWidth: 420 }}>
        <HazardBar />
        <div style={{ padding: 28 }}>
          <img src={logoMixpak} alt="Mixpak System" style={{ height: 40, marginBottom: 6 }} />
          <p style={{ color: COLORS.textMuted, fontSize: 13, margin: "0 0 20px" }}>
            {user.email} — Elige tu categoría para ver solo lo que te corresponde. Puedes cambiarla luego. Un administrador debe aprobar tu cuenta antes de que puedas entrar.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ROLES.map((r) => {
              const Icon = ICONS[r.value];
              return (
                <button
                  key={r.value}
                  onClick={() => choose(r.value)}
                  disabled={saving !== null}
                  style={{ ...primaryButtonStyle, width: "100%", justifyContent: "flex-start", background: saving === r.value ? COLORS.line : COLORS.safety }}
                >
                  <Icon size={16} /> {saving === r.value ? "Guardando…" : r.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
