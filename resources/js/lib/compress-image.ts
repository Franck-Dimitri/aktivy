/**
 * Réduit une photo avant l'envoi : côté le plus long ramené à `maxSide` pixels, ré-encodée en JPEG
 * (ou en PNG pour garder la transparence d'un logo). Une photo de téléphone de 4 à 6 Mo descend
 * ainsi vers 300 à 800 Ko, ce qui accélère l'envoi en 4G et reste sous les limites du serveur.
 * Les PDF, les petites images et les formats illisibles par le navigateur sont renvoyés tels quels.
 */
export async function compressImage(
    file: File,
    { maxSide = 2000, quality = 0.85, keepPng = false, minBytes = 800_000 } = {},
): Promise<File> {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
        return file;
    }

    let bitmap: ImageBitmap;

    try {
        // imageOrientation : applique la rotation EXIF des photos prises au téléphone
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
        return file;
    }

    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));

    if (scale === 1 && file.size <= minBytes) {
        bitmap.close();

        return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const png = keepPng && file.type === 'image/png';
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        bitmap.close();

        return file;
    }

    if (!png) {
        // fond blanc : une image transparente convertie en JPEG ne doit pas devenir noire
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const type = png ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

    if (!blob || blob.size >= file.size) {
        return file;
    }

    const name = file.name.replace(/\.[^.]+$/, '') + (png ? '.png' : '.jpg');

    return new File([blob], name, { type, lastModified: Date.now() });
}
