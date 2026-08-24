export const ROLES = [
  { value: "mecanico", label: "Mecánico / Mantenimiento", tabs: ["resumen", "mantenimiento"] },
  { value: "calidad", label: "Calidad", tabs: ["resumen", "calidad"] },
  { value: "produccion", label: "Producción", tabs: ["resumen", "produccion"] },
  { value: "almacen", label: "Almacén / Materiales", tabs: ["resumen", "materiales"] },
  { value: "supervisor", label: "Supervisor (acceso a todo)", tabs: ["resumen", "mantenimiento", "materiales", "produccion", "calidad", "historial"] },
  { value: "admin", label: "Administrador (aprueba usuarios, ve todo)", tabs: ["resumen", "mantenimiento", "materiales", "produccion", "calidad", "aprobaciones", "historial"] },
];

export function roleLabel(value) {
  return ROLES.find((r) => r.value === value)?.label || value;
}

export function tabsForRole(value) {
  return ROLES.find((r) => r.value === value)?.tabs || ["resumen"];
}
