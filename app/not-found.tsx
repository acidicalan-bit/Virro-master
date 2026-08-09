import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="message-page">
      <p className="eyebrow">404</p>
      <h1>Esta ruta no existe.</h1>
      <Link className="primary-button" href="/">Volver al compiler</Link>
    </main>
  );
}
