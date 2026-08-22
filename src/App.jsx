import React, { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import { Wrench, Boxes, Factory, ShieldCheck, LogOut, UserCog, UserCheck, History } from "lucide-react";
import { COLORS, inputStyle, primaryButtonStyle, ghostButtonStyle, CenteredMessage, Field, HazardBar } from "./shared.jsx";
import Dashboard from "./modules/Dashboard.jsx";
import Mantenimiento from "./modules/Mantenimiento.jsx";
import Materiales from "./modules/Materiales.jsx";
import Produccion from "./modules/Produccion.jsx";
import Calidad from "./modules/Calidad.jsx";
import Aprobaciones from "./modules/Aprobaciones.jsx";
import Historial from "./modules/Historial.jsx";
import { LayoutDashboard } from "lucide-react";
import RoleGate from "./RoleGate.jsx";
import PendingScreen from "./PendingScreen.jsx";
import { ROLES, roleLabel, tabsForRole } from "./roles.js";
import logoMixpak from "./assets/logo-mixpak.png";

const TABS = [
  { value: "resumen", label: "Resumen", icon: LayoutDashboard, Component: Dashboard },
  { value: "mantenimiento", label: "Mantenimiento", icon: Wrench, Component: Mantenimiento },
  { value: "materiales", label: "Materiales", icon: Boxes, Component: Materiales },
  { value: "produccion", label: "Producción", icon: Factory, Component: Produccion },
  { value: "calidad", label: "Calidad", icon: ShieldCheck, Component: Calidad },
  { value: "aprobaciones", label: "Aprobaciones", icon: UserCheck, Component: Aprobaciones },
  { value: "historial", label: "Historial", icon: History, Component: Historial },
];

// ⚠️ MODO PRUEBA: si algún día quieres volver a probar sin login, pon esto en
// `true` de nuevo. Con `false`, cada persona necesita su propia cuenta real.
const DEV_MODE = false;
const DEV_USER = { email: "prueba@local (modo prueba)", uid: "dev-user" };

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(!DEV_MODE);
  const [team, setTeam] = useState(undefined); // undefined = cargando, null = sin elegir todavía
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (DEV_MODE) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const activeUser = DEV_MODE ? DEV_USER : user;

  useEffect(() => {
    if (!activeUser) return;
    setTeam(undefined);
    setStuck(false);
    const timeout = setTimeout(() => setStuck(true), 8000);
    const unsub = onSnapshot(
      doc(db, "team", activeUser.uid),
      (snap) => {
        clearTimeout(timeout);
        setTeam(snap.exists() ? snap.data() : null);
      },
      () => {
        clearTimeout(timeout);
        setStuck(true);
      }
    );
    return () => { clearTimeout(timeout); unsub(); };
  }, [activeUser?.uid]);

  if (!DEV_MODE) {
    if (authLoading) return <CenteredMessage text="Cargando…" />;
    if (!user) return <LoginScreen />;
  }
  if (team === undefined) {
    if (stuck) {
      return (
        <CenteredMessage text="No se pudo conectar con Firebase. Revisa que src/firebase.js tenga tu firebaseConfig real (no el de ejemplo) y que Firestore esté activado en tu proyecto." />
      );
    }
    return <CenteredMessage text="Cargando…" />;
  }
  if (team === null) return <RoleGate user={activeUser} onSelected={setTeam} />;
  if (!team.aprobado) return <PendingScreen user={activeUser} role={team.role} />;
  return <MainShell user={activeUser} role={team.role} onChangeRole={() => setTeam(null)} />;
}

function LoginScreen() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError("Correo o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Ese correo ya tiene una cuenta. Prueba a iniciar sesión.");
      } else if (err.code === "auth/invalid-email") {
        setError("El correo no es válido.");
      } else {
        setError("No se pudo crear la cuenta. Inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.dark, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <form onSubmit={mode === "login" ? handleLogin : handleRegister} style={{ background: COLORS.panel, width: "100%", maxWidth: 360, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <img src={logoMixpak} alt="Mixpak System" style={{ height: 44 }} />
        </div>

        <div style={{ display: "flex", marginBottom: 20, borderBottom: `1px solid ${COLORS.line}` }}>
          <button type="button" onClick={() => { setMode("login"); setError(""); }} style={{ flex: 1, padding: "8px 0", background: "none", border: "none", borderBottom: mode === "login" ? `2px solid ${COLORS.safety}` : "2px solid transparent", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", fontSize: 13, fontWeight: 600, color: mode === "login" ? COLORS.dark : COLORS.textMuted, cursor: "pointer" }}>
            Entrar
          </button>
          <button type="button" onClick={() => { setMode("register"); setError(""); }} style={{ flex: 1, padding: "8px 0", background: "none", border: "none", borderBottom: mode === "register" ? `2px solid ${COLORS.safety}` : "2px solid transparent", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", fontSize: 13, fontWeight: 600, color: mode === "register" ? COLORS.dark : COLORS.textMuted, cursor: "pointer" }}>
            Crear cuenta
          </button>
        </div>

        {mode === "register" && (
          <Field label="Nombre">
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Tu nombre" />
          </Field>
        )}
        <Field label="Correo">
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="tecnico@empresa.com" />
        </Field>
        <Field label="Contraseña">
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        </Field>
        {error && <p style={{ color: COLORS.critical, fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} style={primaryButtonStyle}>
          {loading ? "Un momento…" : mode === "login" ? "Entrar" : "Crear mi cuenta"}
        </button>
        {mode === "register" && (
          <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 14 }}>
            Después de crear tu cuenta, te pedirá elegir tu categoría (mecánico, calidad…).
          </p>
        )}
      </form>
    </div>
  );
}

function MainShell({ user, role, onChangeRole }) {
  const allowedTabs = tabsForRole(role);
  const visibleTabs = TABS.filter((t) => allowedTabs.includes(t.value));
  const [tab, setTab] = useState(visibleTabs[0]?.value || "resumen");
  const active = visibleTabs.find((t) => t.value === tab) || visibleTabs[0] || TABS[0];
  const ActiveComponent = active.Component;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'IBM Plex Sans', sans-serif", color: COLORS.dark }}>
      <header style={{ background: COLORS.dark }}>
        <HazardBar />
        <div style={{ padding: "18px 20px", maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={logoMixpak} alt="Mixpak System" style={{ height: 36 }} />
            <p style={{ color: "#B9B6AC", fontSize: 12, margin: 0 }}>{user.email} · {roleLabel(role)}</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onChangeRole} style={{ ...ghostButtonStyle, color: "#F5F3EC", borderColor: "#454A4E" }}>
              <UserCog size={16} /> Cambiar categoría
            </button>
            <button onClick={() => signOut(auth)} style={{ ...ghostButtonStyle, color: "#F5F3EC", borderColor: "#454A4E" }}>
              <LogOut size={16} /> Salir
            </button>
          </div>
        </div>
        <nav style={{ maxWidth: 1400, margin: "0 auto", padding: "0 20px", display: "flex", gap: 4, overflowX: "auto" }}>
          {visibleTabs.map((t) => {
            const isActive = t.value === tab;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  background: isActive ? COLORS.bg : "transparent",
                  color: isActive ? COLORS.dark : "#B9B6AC",
                  border: "none",
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: 13,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <t.icon size={15} /> {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: 20 }}>
        <ActiveComponent user={user} goTo={setTab} role={role} />
      </main>
    </div>
  );
}
