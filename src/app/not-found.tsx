import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { WataMark } from "@/components/layout/wata-mark";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface px-4 text-center">
      <WataMark />
      <h1 className="text-xl font-semibold">Pagina nao encontrada</h1>
      <p className="max-w-sm text-sm text-muted">
        O endereco acessado nao existe ou o registro foi removido.
      </p>
      <Link href="/dashboard" className={buttonVariants({ variant: "primary" })}>
        Ir para o dashboard
      </Link>
    </div>
  );
}
