/**
 * Skeleton no formato do conteudo, sem bloquear a tela inteira (Secao 16.2).
 */
export default function AppLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando...</span>

      <div className="mb-5 space-y-2">
        <div className="skeleton h-7 w-40" />
        <div className="skeleton h-4 w-72 max-w-full" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="skeleton h-24" />
        ))}
      </div>

      <div className="skeleton mt-4 h-56" />
    </div>
  );
}
