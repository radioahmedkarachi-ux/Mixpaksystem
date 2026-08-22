import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { UserCheck, UserX, Clock, Trash2 } from "lucide-react";
import { COLORS, selectStyle, ghostButtonStyle, CenteredMessage, ConfirmDialog, StatCard, EmptyState, logActivity } from "../shared.jsx";
import { ROLES, roleLabel } from "../roles.js";

export default function Aprobaciones({ user }) {
  const [people, setPeople] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "team"), (snap) => {
      setPeople(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  async function approve(person, aprobado) {
    await updateDoc(doc(db, "team", person.id), { aprobado });
    logActivity(user.email, "Aprobaciones", aprobado ? "Aprobada" : "Revocada", person.email);
  }

  async function changeRole(person, role) {
    await updateDoc(doc(db, "team", person.id), { role });
    logActivity(user.email, "Aprobaciones", "Cambio de categoría", `${person.email}: ${person.role} → ${role}`);
  }

  async function removePerson(person) {
    await deleteDoc(doc(db, "team", person.id));
    logActivity(user.email, "Aprobaciones", "Eliminada", person.email);
    setConfirmRemove(null);
  }

  const pending = useMemo(() => (people || []).filter((p) => !p.aprobado), [people]);
  const approved = useMemo(() => (people || []).filter((p) => p.aprobado), [people]);

  if (!people) return <CenteredMessage text="Cargando personas…" />;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, textTransform: "uppercase", margin: 0 }}>
          Aprobaciones
        </h1>
        <p style={{ color: COLORS.textMuted, fontSize: 13, margin: "4px 0 0" }}>Solo tú (administrador) ves esta pestaña.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 24 }}>
        <StatCard label="Pendientes de aprobar" value={pending.length} color={COLORS.safety} Icon={Clock} />
        <StatCard label="Personas aprobadas" value={approved.length} color={COLORS.green} Icon={UserCheck} />
      </div>

      <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, textTransform: "uppercase", borderBottom: `2px solid ${COLORS.dark}`, paddingBottom: 8, marginBottom: 12 }}>
        Pendientes
      </h2>
      {pending.length === 0 ? (
        <p style={{ fontSize: 13, color: COLORS.textMuted, fontStyle: "italic", marginBottom: 24 }}>No hay nadie esperando aprobación.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {pending.map((p) => (
            <PersonRow key={p.id} person={p} onApprove={() => approve(p, true)} onRoleChange={(r) => changeRole(p, r)} onRemove={() => setConfirmRemove(p)} />
          ))}
        </div>
      )}

      <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, textTransform: "uppercase", borderBottom: `2px solid ${COLORS.dark}`, paddingBottom: 8, marginBottom: 12 }}>
        Aprobados
      </h2>
      {approved.length === 0 ? (
        <EmptyState Icon={UserCheck} title="Nadie aprobado todavía" message="Aprueba a alguien de la lista de arriba." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {approved.map((p) => (
            <PersonRow key={p.id} person={p} approved onApprove={() => approve(p, false)} onRoleChange={(r) => changeRole(p, r)} isSelf={p.id === user.uid} onRemove={() => setConfirmRemove(p)} />
          ))}
        </div>
      )}

      {confirmRemove && (
        <ConfirmDialog
          title="Eliminar cuenta"
          message={`Se eliminará a ${confirmRemove.email} de la app. Su cuenta de correo seguirá existiendo — si vuelve a entrar, tendrá que elegir categoría y esperar aprobación de nuevo. Para bloquearlo del todo, bórralo también en Firebase → Authentication → Users.`}
          confirmLabel="Eliminar"
          onCancel={() => setConfirmRemove(null)}
          onConfirm={() => removePerson(confirmRemove)}
        />
      )}
    </div>
  );
}

function PersonRow({ person, approved, onApprove, onRoleChange, isSelf, onRemove }) {
  return (
    <div style={{ background: COLORS.panel, borderLeft: `5px solid ${approved ? COLORS.green : COLORS.safety}`, padding: "12px 14px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{person.email}{isSelf && " (tú)"}</div>
        <div style={{ fontSize: 12, color: COLORS.textMuted }}>{roleLabel(person.role)}</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <select value={person.role} onChange={(e) => onRoleChange(e.target.value)} style={{ ...selectStyle, fontSize: 12, padding: "6px 8px" }}>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button
          onClick={onApprove}
          disabled={isSelf && approved}
          title={isSelf && approved ? "No puedes quitarte la aprobación a ti mismo" : ""}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", border: "none", cursor: isSelf && approved ? "not-allowed" : "pointer",
            background: approved ? COLORS.critical : COLORS.green, color: "#fff", opacity: isSelf && approved ? 0.5 : 1,
          }}
        >
          {approved ? <><UserX size={14} /> Revocar</> : <><UserCheck size={14} /> Aprobar</>}
        </button>
        <button
          onClick={onRemove}
          disabled={isSelf}
          title={isSelf ? "No puedes eliminarte a ti mismo" : "Eliminar cuenta"}
          style={{ ...ghostButtonStyle, padding: "8px 10px", opacity: isSelf ? 0.4 : 1, cursor: isSelf ? "not-allowed" : "pointer" }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
