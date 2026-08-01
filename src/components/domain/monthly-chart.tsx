import { formatBRL } from "@/lib/money";
import type { MonthlyRow } from "@/lib/queries/dashboard";

const MES_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

/**
 * Receita e lucro por mes.
 *
 * Barras em CSS puro, sem biblioteca de grafico: sao seis meses e dois valores
 * por mes. Uma dependencia de charting aqui custaria mais bundle do que
 * entrega, e o mesmo dado ja vai em tabela para leitor de tela.
 */
export function MonthlyChart({ rows }: { rows: MonthlyRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted">
        Os primeiros meses aparecem aqui assim que houver vendas registradas.
      </p>
    );
  }

  const maior = Math.max(...rows.map((row) => row.receitaCents), 1);

  return (
    <div>
      <div
        className="flex h-40 items-end gap-2 sm:gap-4"
        role="img"
        aria-label="Grafico de receita e lucro por mes. Os valores exatos estao na tabela abaixo."
      >
        {rows.map((row) => {
          const alturaReceita = Math.round((row.receitaCents / maior) * 100);
          const alturaLucro = Math.round(
            (Math.max(row.lucroCents, 0) / maior) * 100,
          );

          return (
            <div
              key={row.mes}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <div className="flex h-full w-full items-end justify-center gap-0.5">
                <div
                  className="w-1/2 rounded-t bg-graphite"
                  style={{ height: `${Math.max(alturaReceita, 2)}%` }}
                />
                <div
                  className="w-1/2 rounded-t bg-success"
                  style={{ height: `${Math.max(alturaLucro, 2)}%` }}
                />
              </div>

              <span className="truncate text-[11px] text-muted">
                {MES_FORMAT.format(new Date(`${row.mes}T12:00:00Z`))}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-graphite" aria-hidden="true" />
          Receita
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-success" aria-hidden="true" />
          Lucro liquido
        </span>
      </div>

      {/* Mesmo dado em tabela: o grafico nao pode ser a unica forma de ler. */}
      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">Receita e lucro por mes</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th scope="col" className="py-1.5 font-medium">
              Mes
            </th>
            <th scope="col" className="py-1.5 text-right font-medium">
              Vendas
            </th>
            <th scope="col" className="py-1.5 text-right font-medium">
              Receita
            </th>
            <th scope="col" className="py-1.5 text-right font-medium">
              Lucro
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.mes} className="border-b border-border last:border-0">
              <td className="py-1.5">
                {MES_FORMAT.format(new Date(`${row.mes}T12:00:00Z`))}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {row.quantidade}
              </td>
              <td className="py-1.5 text-right tabular-nums" data-money>
                {formatBRL(row.receitaCents)}
              </td>
              <td
                className="py-1.5 text-right tabular-nums text-success"
                data-money
              >
                {formatBRL(row.lucroCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
