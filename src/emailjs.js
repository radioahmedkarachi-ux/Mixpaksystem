// 1. Crea cuenta gratis en https://www.emailjs.com (puedes entrar con tu cuenta de Google)
// 2. Menú "Email Services" → "Add New Service" → elige Gmail → conecta tu cuenta de Gmail
//    → copia el "Service ID" que te da
// 3. Menú "Email Templates" → "Create New Template". En el asunto/cuerpo usa estas
//    variables (tal cual, con doble llave): {{new_user_email}} y {{new_user_role}}
//    Ejemplo de cuerpo: "Nuevo registro pendiente: {{new_user_email}} (categoría: {{new_user_role}})"
//    En el campo "To email" del template pon tu propio Gmail (o dejarlo en {{to_email}})
//    → copia el "Template ID"
// 4. Arriba a la derecha, ícono de tu cuenta → "General" → copia tu "Public Key"
// 5. Pega los 4 valores de abajo

const EMAILJS_SERVICE_ID = "PEGA_AQUI_TU_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "PEGA_AQUI_TU_TEMPLATE_ID";
const EMAILJS_PUBLIC_KEY = "PEGA_AQUI_TU_PUBLIC_KEY";
const ADMIN_NOTIFY_EMAIL = "PEGA_AQUI_TU_CORREO_GMAIL";

// Avisa por correo cuando alguien nuevo se registra y necesita aprobación.
// Si no está configurado todavía, simplemente no hace nada (no rompe el registro).
export async function notifyNewRegistration(newUserEmail, newUserRole) {
  if (EMAILJS_SERVICE_ID.startsWith("PEGA_AQUI")) return;
  try {
    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: ADMIN_NOTIFY_EMAIL,
          new_user_email: newUserEmail,
          new_user_role: newUserRole,
        },
      }),
    });
  } catch (err) {
    // Un aviso fallido nunca debe impedir que la persona se registre.
    console.error("No se pudo enviar el aviso de nuevo registro por correo", err);
  }
}
