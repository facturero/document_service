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
