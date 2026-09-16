/**
 * Quién puede tocar un archivo desde las rutas de usuario (FACTURACION-BRECHAS.md, N13).
 *
 * - Los de su organización.
 * - Los suyos como persona (`resourceType: 'user'`, su avatar), desde cualquier
 *   organización: una misma persona puede pertenecer a varias.
 * - Los anteriores a guardar la organización (`organizationId` null): no hay
 *   forma fiable de saber de quién son, así que siguen accesibles con sesión.
 *
 * Todo lo demás responde como "no existe": no se confirma a otra empresa que el
 * archivo está ahí. Las rutas internas (secreto compartido) no pasan por aquí.
 */
export interface FileActor {
  userId: string;
  organizationId: string | null;
}

export function canAccessFile(
  file: { organizationId: string | null; resourceType: string; resourceId: string },
  actor: FileActor,
): boolean {
  if (file.resourceType === 'user' && file.resourceId === actor.userId) return true;
  if (file.organizationId === null) return true;
  return actor.organizationId !== null && file.organizationId === actor.organizationId;
}

const PRIVATE_RESOURCE_TYPES = new Set(['fiscal_certificate', 'fiscal_invoice']);
const PRIVATE_MIME_TYPES = new Set(['application/x-pkcs12']);

/**
 * Archivos que no salen por las rutas de descarga de usuario: la firma
 * electrónica de la empresa (.p12) y los XML fiscales. fiscal-ecuador los lee
 * por `/files/:id/content` (interna) y el XML llega al usuario por
 * `/fiscal-invoices/:id/xml/download`, con permiso.
 */
export function isPrivateFile(file: { resourceType: string; mimeType: string }): boolean {
  return PRIVATE_RESOURCE_TYPES.has(file.resourceType) || PRIVATE_MIME_TYPES.has(file.mimeType);
}

/**
 * Archivos que ninguna ruta de usuario puede borrar ni modificar.
 *
 * - Los privados (certificado de firma, XML firmado y XML autorizado por el SRI):
 *   borrar el autorizado pierde el único comprobante con validez legal, y el
 *   certificado se gestiona solo desde fiscal-ecuador (`DELETE /certificates/:id`).
 * - Los comprobantes que billing genera al emitir (`invoice` + `comprobante`):
 *   son la copia del documento de una factura ya emitida.
 *
 * Antes bastaba pertenecer a la organización —sin ningún permiso— para borrarlos
 * con `DELETE /files/:id`, y los anteriores a guardar la organización
 * (`organizationId` null) los podía borrar cualquier usuario con sesión.
 */
export function isImmutableFile(file: { resourceType: string; mimeType: string; category: string }): boolean {
  if (isPrivateFile(file)) return true;
  return file.resourceType === 'invoice' && file.category === 'comprobante';
}
