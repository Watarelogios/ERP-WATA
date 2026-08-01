import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

export const PHOTOS_BUCKET = "wata-watch-photos";

/** Limites tambem aplicados no bucket (migration 00007) e no cliente. */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTOS_PER_WATCH = 12;

export const ALLOWED_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** URLs assinadas duram pouco: a foto e privada e o link nao deve circular. */
const SIGNED_URL_SECONDS = 60 * 30;

export type PhotoValidationError = {
  message: string;
};

/**
 * Valida um arquivo de foto no servidor.
 *
 * O cliente ja valida antes do upload, mas Server Actions sao endpoints
 * publicos: a validacao que vale e esta (Secao 17.1).
 */
export function validatePhotoFile(
  file: File,
): PhotoValidationError | null {
  if (!(file.type in ALLOWED_PHOTO_TYPES)) {
    return { message: "Formato invalido. Use JPEG, PNG ou WebP." };
  }

  if (file.size === 0) {
    return { message: "O arquivo esta vazio." };
  }

  if (file.size > MAX_PHOTO_BYTES) {
    return { message: "A foto excede o limite de 10 MB." };
  }

  return null;
}

/** Caminho conforme a Secao 17.1: <auth.uid()>/<watch_id>/<uuid>.<ext>. */
export function photoPath(
  userId: string,
  watchId: string,
  mimeType: string,
): string {
  const ext = ALLOWED_PHOTO_TYPES[mimeType] ?? "jpg";

  return `${userId}/${watchId}/${crypto.randomUUID()}.${ext}`;
}

/**
 * Gera URLs assinadas para um conjunto de caminhos.
 *
 * Devolve um mapa caminho -> URL; caminhos que falharem ficam de fora e a tela
 * mostra o placeholder em vez de uma imagem quebrada.
 */
export async function signPhotoUrls(
  supabase: SupabaseClient<Database>,
  paths: string[],
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(paths)).filter(Boolean);

  if (unique.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_SECONDS);

  if (error) {
    console.error("[wata] signPhotoUrls", error.message);
    return new Map();
  }

  const map = new Map<string, string>();

  for (const item of data ?? []) {
    if (item.signedUrl && item.path) {
      map.set(item.path, item.signedUrl);
    }
  }

  return map;
}
