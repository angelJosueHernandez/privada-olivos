/*
  Prepara una foto de evidencia antes de subirla:
  - Solo acepta imágenes (JPG, PNG, WEBP, HEIC) y rechaza archivos enormes.
  - La redimensiona (máx. 1600 px) y la vuelve a codificar como JPEG. Al re-codificar en un
    canvas se pierden TODOS los metadatos EXIF (ubicación GPS, modelo del celular, fecha),
    así no se filtran datos de más.
  La API debe volver a validar tipo (bytes mágicos), tamaño y guardar con nombre aleatorio.
*/
const TIPOS = /^image\/(jpeg|png|webp|heic|heif)$/
const MAX_ENTRADA = 25 * 1024 * 1024
const LADO_MAX = 1600

export async function prepararFoto(archivo: File, { ladoMax = LADO_MAX, calidad = 0.8 }: { ladoMax?: number; calidad?: number } = {}): Promise<Blob> {
  if (archivo.type && !TIPOS.test(archivo.type)) throw new Error('Solo se permiten fotos (JPG, PNG o HEIC).')
  if (archivo.size > MAX_ENTRADA) throw new Error('La foto es demasiado grande.')

  let imagen: ImageBitmap
  try {
    imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('No se pudo leer la foto. Intenta tomarla de nuevo.')
  }
  const escala = Math.min(1, ladoMax / Math.max(imagen.width, imagen.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(imagen.width * escala)
  canvas.height = Math.round(imagen.height * escala)
  canvas.getContext('2d')!.drawImage(imagen, 0, 0, canvas.width, canvas.height)
  imagen.close()

  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', calidad))
  if (!blob) throw new Error('No se pudo procesar la foto.')
  return blob
}
