// 1. Crea una cuenta gratis en https://cloudinary.com/users/register/free (no pide tarjeta)
// 2. En el Dashboard, copia tu "Cloud name" y pégalo abajo
// 3. Ve a Settings (engranaje) → Upload → "Upload presets" → Add upload preset
//    - Signing Mode: **Unsigned**
//    - Guarda y copia el nombre del preset, pégalo abajo
const CLOUDINARY_CLOUD_NAME = "bzaslg6l";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";

// Sube una foto (blob ya comprimido) a una carpeta de Cloudinary y devuelve su URL pública
export async function uploadToCloudinary(blob, folder) {
  const formData = new FormData();
  formData.append("file", blob);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Cloudinary rechazó la subida. Revisa el cloud name y el upload preset.");
  }

  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id };
}
