"use server";

import { revalidatePath } from "next/cache";

import {
  reportUnexpectedError,
  type FormState,
} from "@/lib/actions/form-state";
import { requireContext, UnauthorizedError } from "@/lib/actions/guard";
import {
  MAX_PHOTOS_PER_WATCH,
  PHOTOS_BUCKET,
  photoPath,
  validatePhotoFile,
} from "@/lib/storage/photos";

export type PhotoActionState = FormState & {
  uploaded?: number;
};

/**
 * Upload de fotos de um relogio.
 *
 * Ordem das operacoes pensada para falha no meio (Secao 18):
 * 1. valida sessao, relogio e limites;
 * 2. sobe o arquivo no Storage;
 * 3. registra em watch_photos.
 * Se o registro falhar, o arquivo orfao e removido — nunca fica foto no
 * Storage sem linha na tabela, nem linha sem arquivo.
 */
export async function uploadPhotosAction(
  watchId: string,
  _prevState: PhotoActionState,
  formData: FormData,
): Promise<PhotoActionState> {
  const files = formData
    .getAll("fotos")
    .filter((item): item is File => item instanceof File && item.size > 0);

  if (files.length === 0) {
    return { message: "Selecione ao menos uma foto." };
  }

  try {
    const { supabase, user } = await requireContext();

    // O relogio precisa existir e ser do usuario (RLS ja filtra, o maybeSingle confirma).
    const { data: watch, error: watchError } = await supabase
      .from("watches")
      .select("id, marca, modelo, wata_id")
      .eq("id", watchId)
      .is("deleted_at", null)
      .maybeSingle();

    if (watchError) {
      throw watchError;
    }

    if (!watch) {
      return { message: "Relogio nao encontrado." };
    }

    const { count } = await supabase
      .from("watch_photos")
      .select("id", { count: "exact", head: true })
      .eq("watch_id", watchId);

    const existentes = count ?? 0;

    if (existentes + files.length > MAX_PHOTOS_PER_WATCH) {
      return {
        message: `Limite de ${MAX_PHOTOS_PER_WATCH} fotos por relogio. Ja existem ${existentes}.`,
      };
    }

    let uploaded = 0;

    for (const [index, file] of files.entries()) {
      const invalid = validatePhotoFile(file);

      if (invalid) {
        return {
          message: `${file.name}: ${invalid.message}`,
          uploaded,
        };
      }

      const path = photoPath(user.id, watchId, file.type);

      const { error: uploadError } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        console.error("[wata] uploadPhoto storage", uploadError.message);

        return {
          message: `Falha ao enviar ${file.name}. As fotos anteriores foram salvas; tente novamente as restantes.`,
          uploaded,
        };
      }

      const { error: insertError } = await supabase
        .from("watch_photos")
        .insert({
          owner_id: user.id,
          watch_id: watchId,
          storage_path: path,
          ordem: existentes + index,
          // Primeira foto do relogio vira capa automaticamente.
          is_cover: existentes === 0 && index === 0,
          // Alt no formato "Marca Modelo - WATA-0001" (Secao 16.2).
          alt_text: `${watch.marca} ${watch.modelo} - ${watch.wata_id}`,
        });

      if (insertError) {
        // Remove o arquivo orfao antes de reportar.
        await supabase.storage.from(PHOTOS_BUCKET).remove([path]);

        console.error("[wata] uploadPhoto insert", insertError.message);

        return {
          message: `Falha ao registrar ${file.name}. Tente novamente.`,
          uploaded,
        };
      }

      uploaded += 1;
    }

    revalidatePath(`/estoque/${watchId}`);
    revalidatePath("/estoque");

    return {
      success: true,
      uploaded,
      message:
        uploaded === 1 ? "1 foto enviada." : `${uploaded} fotos enviadas.`,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError(
      "uploadPhotos",
      error,
      "Nao foi possivel enviar as fotos. Tente novamente.",
    );
  }
}

/** Remove a foto do Storage e da tabela; se sobrar so uma, ela vira capa. */
export async function deletePhotoAction(photoId: string): Promise<FormState> {
  try {
    const { supabase } = await requireContext();

    const { data: photo, error } = await supabase
      .from("watch_photos")
      .select("id, watch_id, storage_path, is_cover")
      .eq("id", photoId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!photo) {
      return { message: "Foto nao encontrada." };
    }

    /*
     * Banco primeiro, Storage depois: se a remocao do arquivo falhar sobra um
     * orfao inofensivo no bucket; o contrario deixaria uma linha apontando
     * para uma imagem inexistente.
     */
    const { error: deleteError } = await supabase
      .from("watch_photos")
      .delete()
      .eq("id", photoId);

    if (deleteError) {
      throw deleteError;
    }

    const { error: storageError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .remove([photo.storage_path]);

    if (storageError) {
      console.error("[wata] deletePhoto storage", storageError.message);
    }

    // Se a capa foi removida, promove a proxima foto.
    if (photo.is_cover) {
      const { data: next } = await supabase
        .from("watch_photos")
        .select("id")
        .eq("watch_id", photo.watch_id)
        .order("ordem")
        .limit(1)
        .maybeSingle();

      if (next) {
        await supabase
          .from("watch_photos")
          .update({ is_cover: true })
          .eq("id", next.id);
      }
    }

    revalidatePath(`/estoque/${photo.watch_id}`);
    revalidatePath("/estoque");

    return { success: true, message: "Foto removida." };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError("deletePhoto", error);
  }
}

/** Define a foto de capa. O indice unico garante uma capa por relogio. */
export async function setCoverPhotoAction(photoId: string): Promise<FormState> {
  try {
    const { supabase } = await requireContext();

    const { data: photo, error } = await supabase
      .from("watch_photos")
      .select("id, watch_id")
      .eq("id", photoId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!photo) {
      return { message: "Foto nao encontrada." };
    }

    // Ordem importa: primeiro tira a capa atual, depois define a nova.
    const { error: clearError } = await supabase
      .from("watch_photos")
      .update({ is_cover: false })
      .eq("watch_id", photo.watch_id)
      .eq("is_cover", true);

    if (clearError) {
      throw clearError;
    }

    const { error: setError } = await supabase
      .from("watch_photos")
      .update({ is_cover: true })
      .eq("id", photoId);

    if (setError) {
      throw setError;
    }

    revalidatePath(`/estoque/${photo.watch_id}`);
    revalidatePath("/estoque");

    return { success: true, message: "Capa atualizada." };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError("setCoverPhoto", error);
  }
}

/** Move a foto uma posicao para a esquerda ou direita. */
export async function movePhotoAction(
  photoId: string,
  direction: "left" | "right",
): Promise<FormState> {
  try {
    const { supabase } = await requireContext();

    const { data: photo, error } = await supabase
      .from("watch_photos")
      .select("id, watch_id, ordem")
      .eq("id", photoId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!photo) {
      return { message: "Foto nao encontrada." };
    }

    // Vizinha imediata na direcao pedida.
    const { data: neighbor } = await supabase
      .from("watch_photos")
      .select("id, ordem")
      .eq("watch_id", photo.watch_id)
      .filter("ordem", direction === "left" ? "lt" : "gt", photo.ordem)
      .order("ordem", { ascending: direction === "right" })
      .limit(1)
      .maybeSingle();

    if (!neighbor) {
      // Ja esta na ponta; nada a fazer.
      return { success: true };
    }

    // Troca as posicoes.
    await supabase
      .from("watch_photos")
      .update({ ordem: neighbor.ordem })
      .eq("id", photo.id);
    await supabase
      .from("watch_photos")
      .update({ ordem: photo.ordem })
      .eq("id", neighbor.id);

    revalidatePath(`/estoque/${photo.watch_id}`);

    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError("movePhoto", error);
  }
}
