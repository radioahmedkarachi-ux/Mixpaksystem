import { BarcodeScanner, BarcodeFormat } from "@capacitor-mlkit/barcode-scanning";

// Pide permiso de cámara y escanea un código QR una sola vez usando el
// escáner integrado de Google (no necesita cámara personalizada ni permisos
// especiales en el manifiesto de Android). Devuelve el texto leído, o null
// si se canceló o algo falló.
export async function scanQr() {
  try {
    const perm = await BarcodeScanner.checkPermissions();
    if (perm.camera !== "granted" && perm.camera !== "limited") {
      const req = await BarcodeScanner.requestPermissions();
      if (req.camera !== "granted" && req.camera !== "limited") {
        alert("Necesitas dar permiso de cámara para escanear un código QR.");
        return null;
      }
    }

    const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
    if (!available) {
      await BarcodeScanner.installGoogleBarcodeScannerModule();
    }

    const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
    if (barcodes && barcodes.length) return barcodes[0].rawValue || barcodes[0].displayValue || null;
    return null;
  } catch (err) {
    console.error("No se pudo escanear el código QR", err);
    alert("No se pudo abrir la cámara para escanear. Puedes buscar manualmente mientras lo revisamos.");
    return null;
  }
}
