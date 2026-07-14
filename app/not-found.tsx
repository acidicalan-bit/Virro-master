import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-[var(--app-bg)] px-5 text-[var(--text)]"><section className="max-w-xl text-center"><p className="section-kicker">Virro · 404</p><h1 className="mt-5 text-4xl font-semibold tracking-[-.055em] md:text-6xl">Esta ruta no está disponible.</h1><p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[var(--muted)]">Vuelve al sitio público o inicia una solicitud de auditoría de entendimiento operativo.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/" className="brand-secondary-button"><ArrowLeft size={15} />Volver al inicio</Link><Link href="/#solicitar-diagnostico" className="brand-primary-button">Solicitar auditoría<ArrowRight size={15} /></Link></div></section></main>;
}
