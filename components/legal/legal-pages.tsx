"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText, Scale, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const effectiveDate = "11 July 2026";

function LegalShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  const { t } = useLanguage();
  return <div className="min-h-screen bg-[var(--app-bg)] text-[var(--text)]"><header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--header)_90%,transparent)] px-5 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-5xl items-center gap-3"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={15} /> Virro</Link><div className="ml-auto flex items-center gap-2"><LanguageToggle compact /><ThemeToggle label={t("Toggle theme", "Cambiar tema")} /></div></div></header><main className="px-5 py-16 md:py-24"><article className="mx-auto max-w-5xl"><p className="section-kicker">{eyebrow}</p><h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-.055em] md:text-7xl">{title}</h1><p className="mt-5 text-[10px] uppercase tracking-[.12em] text-[var(--subtle)]">{t("Effective date", "Fecha de vigencia")}: {effectiveDate}</p><div className="legal-document mt-14">{children}</div><div className="mt-14 flex flex-wrap gap-3 border-t border-[var(--border)] pt-7 text-[10px]"><Link href="/legal">{t("Legal center", "Centro legal")}</Link><Link href="/legal/terms">{t("Terms", "Términos")}</Link><Link href="/legal/privacy">{t("Privacy notice", "Aviso de privacidad")}</Link><a href="mailto:contacto@virro.app">contacto@virro.app</a></div></article></main></div>;
}

export function LegalCenter() {
  const { t } = useLanguage();
  const cards = [
    { href: "/legal/terms", icon: Scale, title: t("Terms of Use", "Términos de uso"), copy: t("Rules for accessing Virro, the enterprise demo, audits, pilots and future licensed services.", "Reglas para acceder a Virro, la demo enterprise, auditorías, pilotos y futuros servicios licenciados.") },
    { href: "/legal/privacy", icon: ShieldCheck, title: t("Privacy Notice", "Aviso de privacidad"), copy: t("What data Virro may process, why, and the privacy-first controls applied to audits and pilots.", "Qué datos puede tratar Virro, para qué y qué controles privacy-first se aplican a auditorías y pilotos.") },
    { href: "/app/privacy-trust", icon: FileText, title: "Privacy & Trust", copy: t("Product principles, retention modes and the limits of probabilistic scores.", "Principios de producto, modos de retención y límites de los scores probabilísticos.") },
  ];
  return <LegalShell eyebrow={t("Legal & trust", "Legal y confianza")} title={t("Clear terms for an understanding infrastructure.", "Términos claros para una infraestructura de entendimiento.")}><p className="legal-intro">{t("This center explains the public terms currently applicable to Virro. Enterprise pilots may add an order form, data-processing terms, confidentiality commitments and deployment-specific controls.", "Este centro explica los términos públicos actualmente aplicables a Virro. Los pilotos enterprise pueden añadir una orden de servicio, términos de tratamiento de datos, compromisos de confidencialidad y controles según el despliegue.")}</p><div className="mt-10 grid gap-4 md:grid-cols-3">{cards.map(({ href, icon: Icon, title, copy }) => <Link key={href} href={href} className="legal-card"><Icon size={19} /><h2>{title}</h2><p>{copy}</p><span>{t("Read document", "Leer documento")} <ArrowRight size={12} /></span></Link>)}</div><p className="mt-8 text-[10px] leading-5 text-[var(--subtle)]">{t("These documents are operational launch materials and should be reviewed by qualified counsel before regulated or jurisdiction-specific use.", "Estos documentos son materiales operativos de lanzamiento y deben ser revisados por asesoría jurídica calificada antes de uso regulado o específico de una jurisdicción.")}</p></LegalShell>;
}

export function TermsPage() {
  const { locale, t } = useLanguage();
  const sections = locale === "en" ? [
    ["1. Agreement", "By accessing virro.app, the enterprise demo or a Virro audit or pilot, you agree to these Terms and any signed order form. If you act for an organization, you confirm that you may bind it."],
    ["2. Service scope", "Virro provides operational-understanding analysis, probabilistic readiness estimates, structured deliverables and executive signals. Demo data is simulated. Production capabilities, packs, limits and deployment mode are defined in the applicable order form."],
    ["3. Authorized use", "You may use Virro for lawful internal business purposes. You may not attempt unauthorized access, disrupt the service, reverse engineer protected components, submit unlawful material or use Virro to monitor or rank employees."],
    ["4. Customer information", "You control the information submitted to Virro and must have authority to process it. Do not submit secrets or unnecessary sensitive data through public forms. Audit and pilot rules are agreed before real evidence is reviewed."],
    ["5. Scores and outputs", "Scores, risks and recommendations are probabilistic operational estimates. They require human validation and are not guarantees, legal advice, security certifications, employment evaluations or automated final decisions."],
    ["6. Intellectual property", "Virro retains rights in the platform, methods, visual system and software. Customers retain rights in their information. Contracted reports and deliverables are licensed or assigned as stated in the applicable order form."],
    ["7. Availability and changes", "Virro may improve or change preview and demo functionality. Paid service levels, support and material changes are governed by the applicable order form."],
    ["8. Liability boundary", "To the extent permitted by applicable law, Virro is not responsible for decisions made without appropriate human review or for indirect losses. Any negotiated liability limits appear in the applicable order form."],
    ["9. Suspension and termination", "Access may be suspended for security risk, misuse, non-payment or material breach. Data handling at termination follows the privacy notice and any signed data-processing terms."],
    ["10. Governing terms", "Enterprise order forms may specify governing law, venue and precedence. Where no order form exists, applicable mandatory law remains unaffected."],
    ["11. Contact", "Questions about these Terms may be sent to contacto@virro.app."],
  ] : [
    ["1. Acuerdo", "Al acceder a virro.app, la demo enterprise o una auditoría o piloto de Virro, aceptas estos Términos y cualquier orden de servicio firmada. Si actúas por una organización, confirmas que puedes obligarla."],
    ["2. Alcance del servicio", "Virro proporciona análisis de entendimiento operativo, estimaciones probabilísticas de readiness, entregables estructurados y señales ejecutivas. Los datos demo son simulados. Capacidades, packs, límites y modo de despliegue productivo se definen en la orden aplicable."],
    ["3. Uso autorizado", "Puedes usar Virro para fines empresariales internos y lícitos. No puedes intentar acceso no autorizado, interrumpir el servicio, realizar ingeniería inversa de componentes protegidos, enviar material ilícito ni usar Virro para vigilar o clasificar empleados."],
    ["4. Información del cliente", "Controlas la información enviada a Virro y debes tener autorización para tratarla. No envíes secretos ni datos sensibles innecesarios mediante formularios públicos. Las reglas de auditoría y piloto se acuerdan antes de revisar evidencia real."],
    ["5. Scores y entregables", "Los scores, riesgos y recomendaciones son estimaciones operativas probabilísticas. Requieren validación humana y no son garantías, asesoría legal, certificaciones de seguridad, evaluaciones laborales ni decisiones finales automatizadas."],
    ["6. Propiedad intelectual", "Virro conserva los derechos sobre la plataforma, métodos, sistema visual y software. Los clientes conservan derechos sobre su información. Los reportes y entregables contratados se licencian o ceden según la orden aplicable."],
    ["7. Disponibilidad y cambios", "Virro puede mejorar o modificar funcionalidades preview y demo. Los niveles de servicio, soporte y cambios materiales de pago se rigen por la orden aplicable."],
    ["8. Límite de responsabilidad", "En la medida permitida por la ley aplicable, Virro no responde por decisiones tomadas sin revisión humana apropiada ni por pérdidas indirectas. Los límites negociados aparecen en la orden aplicable."],
    ["9. Suspensión y terminación", "El acceso puede suspenderse por riesgo de seguridad, uso indebido, falta de pago o incumplimiento material. El tratamiento al terminar sigue el aviso de privacidad y los términos de datos firmados."],
    ["10. Términos aplicables", "Las órdenes enterprise pueden indicar ley aplicable, jurisdicción y prevalencia. Si no existe orden, la legislación imperativa aplicable no se ve afectada."],
    ["11. Contacto", "Las preguntas sobre estos Términos pueden enviarse a contacto@virro.app."],
  ];
  return <LegalShell eyebrow={t("Legal", "Legal")} title={t("Terms of Use", "Términos de uso")}>{sections.map(([heading, copy]) => <section key={heading}><h2>{heading}</h2><p>{copy}</p></section>)}</LegalShell>;
}

export function PrivacyNoticePage() {
  const { locale, t } = useLanguage();
  const sections = locale === "en" ? [
    ["1. Privacy-first principle", "Virro is designed to analyze operational understanding, not identities. Safe mode processes raw content transiently, masks detected entities and retains safe signals rather than raw client content by default."],
    ["2. Data categories", "Virro may process account and business contact data, tenant and license metadata, usage counters, audit actions, submitted operational content, masked entities, readiness scores, risk categories and reports. Public diagnostic requests open the user's email client and are not stored by the website."],
    ["3. Purposes", "Data is used to provide and secure the service, perform requested analyses, generate reports, control licensed usage, support customers, prevent misuse and comply with applicable obligations."],
    ["4. Raw client content", "Under safe mode, raw input is processed in memory and is not retained by default. A future raw-retention mode would require explicit customer configuration, contractual scope and additional controls."],
    ["5. Legal grounds and roles", "Depending on the relationship and applicable law, processing may rely on contract performance, legitimate interests, consent or legal obligation. Enterprise data-controller and processor roles are defined in signed data-processing terms."],
    ["6. Sharing and transfers", "Virro may use vetted infrastructure providers to operate the service. Provider access is limited to operational necessity. Cross-border safeguards, subprocessors and private or hybrid deployment requirements are defined for enterprise engagements."],
    ["7. Retention and security", "Metadata and safe results are retained only as needed for service, audit, security and contractual purposes. Virro applies proportionate controls, but no service can promise absolute security."],
    ["8. Your choices and rights", "Subject to applicable law, you may request access, correction, deletion, restriction, portability or objection. Enterprise administrators may control tenant data and retention. Requests may be sent to contacto@virro.app."],
    ["9. Children", "Virro is an enterprise service and is not directed to children."],
    ["10. Updates", "Material updates will be reflected on this page with a revised effective date. Contracted customers may receive additional notice where required."],
  ] : [
    ["1. Principio privacy-first", "Virro está diseñado para analizar entendimiento operativo, no identidades. El modo seguro procesa contenido crudo de forma transitoria, enmascara entidades detectadas y conserva señales seguras en lugar de contenido crudo del cliente por defecto."],
    ["2. Categorías de datos", "Virro puede tratar datos de cuenta y contacto empresarial, metadata de tenant y licencia, contadores de uso, acciones de auditoría, contenido operativo enviado, entidades enmascaradas, scores de readiness, categorías de riesgo y reportes. Las solicitudes públicas abren el cliente de correo del usuario y la web no las almacena."],
    ["3. Finalidades", "Los datos se usan para prestar y proteger el servicio, ejecutar análisis solicitados, generar reportes, controlar uso licenciado, dar soporte, prevenir abuso y cumplir obligaciones aplicables."],
    ["4. Contenido crudo del cliente", "En modo seguro, el input crudo se procesa en memoria y no se conserva por defecto. Un futuro modo de retención requerirá configuración explícita del cliente, alcance contractual y controles adicionales."],
    ["5. Bases y roles", "Según la relación y ley aplicable, el tratamiento puede basarse en ejecución contractual, intereses legítimos, consentimiento u obligación legal. Los roles de responsable y encargado se definen en términos de tratamiento firmados."],
    ["6. Compartición y transferencias", "Virro puede usar proveedores de infraestructura evaluados para operar el servicio. Su acceso se limita a necesidad operativa. Salvaguardas internacionales, subencargados y requisitos privados o híbridos se definen para engagements enterprise."],
    ["7. Retención y seguridad", "La metadata y resultados seguros se conservan solo durante lo necesario para servicio, auditoría, seguridad y fines contractuales. Virro aplica controles proporcionales, pero ningún servicio puede prometer seguridad absoluta."],
    ["8. Opciones y derechos", "Sujeto a la ley aplicable, puedes solicitar acceso, rectificación, eliminación, limitación, portabilidad u oposición. Los administradores enterprise pueden controlar datos y retención del tenant. Las solicitudes se envían a contacto@virro.app."],
    ["9. Menores", "Virro es un servicio empresarial y no está dirigido a menores."],
    ["10. Actualizaciones", "Los cambios materiales se reflejarán en esta página con una nueva fecha de vigencia. Los clientes contratados pueden recibir aviso adicional cuando sea requerido."],
  ];
  return <LegalShell eyebrow="Privacy Shield" title={t("Privacy Notice", "Aviso de privacidad")}>{sections.map(([heading, copy]) => <section key={heading}><h2>{heading}</h2><p>{copy}</p></section>)}</LegalShell>;
}
