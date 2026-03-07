/**
 * Admin Layout
 *
 * Layout compartilhado para todas as páginas /admin/*
 * Adiciona padding padrão e header de seção.
 */

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 min-h-full">
      {children}
    </div>
  );
}
