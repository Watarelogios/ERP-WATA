"use client";

import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Star,
  Trash2,
} from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  deletePhotoAction,
  movePhotoAction,
  setCoverPhotoAction,
  uploadPhotosAction,
  type PhotoActionState,
} from "@/lib/actions/photos";

const INITIAL_STATE: PhotoActionState = {};

/** Espelha os limites do servidor para barrar antes do upload. */
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = "image/jpeg,image/png,image/webp";
const MAX_PHOTOS = 12;

export type PhotoItem = {
  id: string;
  url: string | null;
  alt: string;
  isCover: boolean;
};

export type PhotoManagerProps = {
  watchId: string;
  photos: PhotoItem[];
};

export function PhotoManager({ watchId, photos }: PhotoManagerProps) {
  const upload = uploadPhotosAction.bind(null, watchId);
  const [state, action, uploading] = useActionState(upload, INITIAL_STATE);

  const { showToast } = useToast();
  const [pendingOp, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<PhotoItem | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const successMessage = state.success ? state.message : undefined;
  useEffect(() => {
    if (successMessage) {
      showToast("success", successMessage);
      formRef.current?.reset();
    }
  }, [successMessage, showToast]);

  function onFilesChosen(files: FileList | null) {
    setClientError(null);

    if (!files || files.length === 0) {
      return;
    }

    // Validacao no cliente evita subir 10 MB para descobrir que nao pode.
    if (photos.length + files.length > MAX_PHOTOS) {
      setClientError(
        `Limite de ${MAX_PHOTOS} fotos por relogio. Ja existem ${photos.length}.`,
      );

      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    for (const file of Array.from(files)) {
      if (!ACCEPTED.split(",").includes(file.type)) {
        setClientError(`${file.name}: use JPEG, PNG ou WebP.`);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
        return;
      }

      if (file.size > MAX_BYTES) {
        setClientError(`${file.name}: excede o limite de 10 MB.`);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
        return;
      }
    }

    // Tudo valido: envia direto, sem clique extra.
    formRef.current?.requestSubmit();
  }

  function run(operation: () => Promise<{ success?: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await operation();

      if (result.message) {
        showToast(result.success ? "success" : "danger", result.message);
      }

      setDeleting(null);
    });
  }

  return (
    <div className="space-y-3">
      {state.message && !state.success ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}
      {clientError ? <Alert tone="danger">{clientError}</Alert> : null}

      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              className="group relative overflow-hidden rounded-card border border-border bg-surface"
            >
              <div className="relative aspect-[4/3]">
                {photo.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.url}
                    alt={photo.alt}
                    className="absolute inset-0 size-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-muted">
                    Falha ao carregar
                  </span>
                )}
              </div>

              {photo.isCover ? (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-graphite px-2 py-0.5 text-[11px] font-medium text-white">
                  <Star className="size-3" aria-hidden="true" />
                  Capa
                </span>
              ) : null}

              <div className="flex items-center justify-between gap-1 border-t border-border bg-white p-1.5">
                <span className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => run(() => movePhotoAction(photo.id, "left"))}
                    disabled={pendingOp || index === 0}
                    className="flex size-9 items-center justify-center rounded text-muted hover:bg-surface hover:text-graphite disabled:opacity-40"
                    aria-label={`Mover ${photo.alt} para a esquerda`}
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => run(() => movePhotoAction(photo.id, "right"))}
                    disabled={pendingOp || index === photos.length - 1}
                    className="flex size-9 items-center justify-center rounded text-muted hover:bg-surface hover:text-graphite disabled:opacity-40"
                    aria-label={`Mover ${photo.alt} para a direita`}
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </button>
                </span>

                <span className="flex gap-1">
                  {!photo.isCover ? (
                    <button
                      type="button"
                      onClick={() => run(() => setCoverPhotoAction(photo.id))}
                      disabled={pendingOp}
                      className="flex size-9 items-center justify-center rounded text-muted hover:bg-surface hover:text-graphite"
                      aria-label={`Definir ${photo.alt} como capa`}
                    >
                      <Star className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setDeleting(photo)}
                    disabled={pendingOp}
                    className="flex size-9 items-center justify-center rounded text-muted hover:bg-danger-surface hover:text-danger"
                    aria-label={`Remover ${photo.alt}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <form ref={formRef} action={action}>
        <input
          ref={inputRef}
          type="file"
          name="fotos"
          accept={ACCEPTED}
          multiple
          className="sr-only"
          id="photo-input"
          onChange={(event) => onFilesChosen(event.target.files)}
          disabled={uploading}
        />

        <Button
          type="button"
          variant="secondary"
          disabled={uploading || photos.length >= MAX_PHOTOS}
          onClick={() => inputRef.current?.click()}
          block
        >
          {uploading ? (
            <Spinner label="Enviando fotos" />
          ) : (
            <ImagePlus className="size-4" aria-hidden="true" />
          )}
          {uploading
            ? "Enviando..."
            : photos.length === 0
              ? "Adicionar fotos"
              : `Adicionar mais fotos (${photos.length}/${MAX_PHOTOS})`}
        </Button>
      </form>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && run(() => deletePhotoAction(deleting.id))}
        title="Remover foto"
        subject={deleting?.alt ?? ""}
        description="A foto sera removida permanentemente do relogio. Esta acao nao afeta os dados do cadastro."
        confirmLabel="Remover foto"
        pending={pendingOp}
        destructive
      />
    </div>
  );
}
