import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 1. Ve a https://console.firebase.google.com -> tu proyecto -> Configuración del proyecto
// 2. En "Tus apps", crea una app Web (icono </>)
// 3. Copia aquí el objeto firebaseConfig que te da Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBBSKwL1FMTOo0m62SrvnOObHeK3rR68Ys",
  authDomain: "mixpak-system.firebaseapp.com",
  projectId: "mixpak-system",
  messagingSenderId: "552046543093",
  // appId: se obtiene registrando una app "Web" (icono </>) en Firebase, distinta
  // de la app Android. No es necesario para que funcionen Auth/Firestore,
  // así que la app funciona igual sin él.
};
// Nota: ya no usamos Firebase Storage (las fotos van a Cloudinary, ver src/cloudinary.js),
// así que no hace falta storageBucket ni tener el proyecto en plan Blaze.

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
