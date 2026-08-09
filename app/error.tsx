"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="message-page">
      <p className="eyebrow">Error</p>
      <h1>Algo no salió bien.</h1>
      <p>El laboratorio no pudo completar esta vista. Puedes intentarlo de nuevo.</p>
      <button className="primary-button" type="button" onClick={reset}>Reintentar</button>
    </main>
  );
}
