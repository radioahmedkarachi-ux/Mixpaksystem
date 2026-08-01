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
import { COLORS, inputStyle, primaryButtonStyle, ghostButtonStyle, CenteredMessage, Field, HazardBar, ToastProvider } from "./shared.jsx";
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
  return (
    <ToastProvider>
      <MainShell user={activeUser} role={team.role} onChangeRole={() => setTeam(null)} />
    </ToastProvider>
  );
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
      <header style={{ background: COLORS.dark, position: "sticky", top: 0, zIndex: 40 }}>
        <HazardBar />
        <div style={{ padding: "14px 16px", maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <img src={logoMixpak} alt="Mixpak System" style={{ height: 32, flexShrink: 0 }} />
            <p style={{ color: "#B9B6AC", fontSize: 12, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email} · {roleLabel(role)}</p>
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button onClick={onChangeRole} title="Cambiar categoría" aria-label="Cambiar categoría" style={{ ...ghostButtonStyle, color: "#F5F3EC", borderColor: "#454A4E", padding: 10, minWidth: 44, minHeight: 44, justifyContent: "center" }}>
              <UserCog size={18} />
            </button>
            <button onClick={() => signOut(auth)} title="Salir" aria-label="Salir" style={{ ...ghostButtonStyle, color: "#F5F3EC", borderColor: "#454A4E", padding: 10, minWidth: 44, minHeight: 44, justifyContent: "center" }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 16px calc(76px + env(safe-area-inset-bottom))" }}>
        <ActiveComponent user={user} goTo={setTab} role={role} />
      </main>

      <nav
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: COLORS.dark,
          borderTop: "1px solid #33383D",
          paddingBottom: "env(safe-area-inset-bottom)",
          zIndex: 40,
        }}
      >
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", overflowX: "auto" }}>
          {visibleTabs.map((t) => {
            const isActive = t.value === tab;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                aria-current={isActive}
                style={{
                  flex: "1 0 64px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  padding: "8px 6px",
                  minHeight: 56,
                  background: "none",
                  color: isActive ? COLORS.safety : "#8C8983",
                  border: "none",
                  borderTop: `3px solid ${isActive ? COLORS.safety : "transparent"}`,
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: 10,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <t.icon size={19} /> {t.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
