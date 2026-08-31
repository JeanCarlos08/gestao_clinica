import Link from "next/link";
export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Página não encontrada</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">A página que você procura não existe.</p>
        <Link href="/dashboard" className="btn-primary px-6 py-2.5 text-sm inline-flex">Voltar ao Dashboard</Link>
      </div>
    </div>
  );
}
