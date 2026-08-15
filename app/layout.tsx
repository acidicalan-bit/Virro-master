import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "Intent Lab",
  description: "Compilador de lenguaje humano natural a contratos ejecutables para IA.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <a className="skip-link" href="#main-content">Saltar al contenido</a>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Intent Lab, inicio">
            <span aria-hidden="true">⌁</span>
            Intent Lab
          </Link>
          <nav aria-label="Principal">
            <Link href="/">Compiler</Link>
            <Link href="/benchmarks">Benchmarks</Link>
            <Link href="/blind-eval">Blind Eval</Link>
            <Link href="/field-beta">Precision Edit</Link>
            <Link href="/preservation-study">Value Study</Link>
          </nav>
        </header>
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
