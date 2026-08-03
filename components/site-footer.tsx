import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <Link className="brand" href="/">
            <Image src="/brand/virro-icon.svg" width={30} height={24} alt="" />
            <span>VIRRO</span>
          </Link>
          <p className="footer-statement">La siguiente versión de tu negocio, construida con claridad.</p>
        </div>
        <div className="footer-links"><span>Programa</span><Link href="/impulsa">Cómo funciona</Link><Link href="/transformaciones">Transformaciones</Link><Link href="/planes">Modelos de atención</Link></div>
        <div className="footer-links"><span>Capacidades</span><Link href="/studio">Studio</Link><Link href="/systems">Systems</Link><Link href="/academy">Academy</Link></div>
        <div className="footer-links"><span>Confianza</span><Link href="/privacidad">Privacidad</Link><Link href="/terminos">Términos</Link><Link href="/labs">Virro Core</Link></div>
      </div>
      <div className="shell footer-bottom"><span>© 2026 VIRRO</span><span>CDMX · Diseño, tecnología y adopción</span></div>
    </footer>
  );
}
