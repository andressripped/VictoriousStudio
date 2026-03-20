import imageCompression from 'browser-image-compression';

/**
 * Comprime una imagen seleccionada y la convierte a un string Base64.
 * Garantiza que la imagen pese menos del límite de documento de Firestore (1 MB).
 */
export async function compressAndConvertToBase64(file: File): Promise<string> {
  const options = {
    maxSizeMB: 0.3,          // 300KB → ~400KB en Base64 (más agresivo)
    maxWidthOrHeight: 800,    // Suficiente para tarjetas de 380px
    fileType: 'image/webp' as const,  // Conversión automática a WebP
    useWebWorker: false,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = (error) => reject(error);
    });
  } catch (error) {
    console.error('Error comprimiendo la imagen:', error);
    throw error;
  }
}
