export const capabilities = {
  studio: {
    eyebrow: "VIRRO STUDIO",
    title: "Haz que te vean y confíen.",
    copy: "Identidad, establecimiento, contenido y campañas que se sienten como una sola marca.",
    accent: "#ff7a59",
    items: ["Identidad y sistema visual", "Experiencia del establecimiento", "Contenido y campañas", "Catálogo y materiales"],
  },
  systems: {
    eyebrow: "VIRRO SYSTEMS",
    title: "Convierte interés en procesos.",
    copy: "Web, atención, agenda, seguimiento y automatización para que las oportunidades no se pierdan.",
    accent: "#69d9ff",
    items: ["Presencia web y SEO local", "WhatsApp, chat y formularios", "Agenda y seguimiento", "Automatización selectiva"],
  },
  academy: {
    eyebrow: "VIRRO ACADEMY",
    title: "Haz que el cambio se use.",
    copy: "Capacitación por rol, práctica y acompañamiento para que la tecnología se vuelva capacidad del equipo.",
    accent: "#d8ff5b",
    items: ["Onboarding por rol", "Manuales y práctica", "IA segura para negocio", "Ciberseguridad básica"],
  },
} as const;

export const sectors = [
  { slug: "estetica", name: "Estética", pain: "Citas dispersas y marca inconsistente", flow: "Descubrir → reservar → recordar → reseñar", modules: ["Identidad", "Agenda", "Recordatorios"] },
  { slug: "barberia", name: "Barbería", pain: "Promociones improvisadas y baja recompra", flow: "Ver estilo → reservar → membresía → volver", modules: ["Campañas", "Reserva", "Lealtad"] },
  { slug: "cafeteria", name: "Cafetería", pain: "Menú confuso y poca presencia local", flow: "Encontrar → elegir → pedir → recomendar", modules: ["Menú", "SEO local", "Pedidos"] },
  { slug: "taller", name: "Taller", pain: "Cotizaciones lentas y seguimiento manual", flow: "Consultar → cotizar → autorizar → actualizar", modules: ["Cotizador", "Estados", "Seguimiento"] },
  { slug: "clinica", name: "Clínica", pain: "Información y consentimientos fragmentados", flow: "Entender → agendar → preparar → continuar", modules: ["Servicios", "Agenda", "Consentimientos"] },
  { slug: "papeleria", name: "Papelería", pain: "Temporadas y catálogo desaprovechados", flow: "Explorar → pedir → recoger → recomprar", modules: ["Catálogo", "Campaña", "Recompra"] },
] as const;

export const cases = [
  { slug: "bella-luna", sector: "Estética", name: "Bella Luna", label: "Conceptual", color: "#ff7a59", before: "Citas en libreta e identidad dispersa", after: "Marca, agenda, recordatorios y reseñas conectados", dimensions: ["Studio", "Systems", "Academy"] },
  { slug: "distrito-24", sector: "Barbería", name: "Distrito 24", label: "Conceptual", color: "#9a7cff", before: "Promociones improvisadas", after: "Kit de campañas, reserva y reactivación", dimensions: ["Studio", "Systems"] },
  { slug: "mercado-vecino", sector: "Comercio", name: "Mercado Vecino", label: "Conceptual", color: "#d8ff5b", before: "Precios y mensajes incoherentes", after: "Catálogo semanal y promociones coordinadas", dimensions: ["Studio", "Systems"] },
  { slug: "cafe-jacaranda", sector: "Cafetería", name: "Café Jacaranda", label: "Conceptual", color: "#ffbd59", before: "Menú difícil y presencia local débil", after: "Menú claro, pedidos simples y lealtad", dimensions: ["Studio", "Systems", "Academy"] },
  { slug: "motor-norte", sector: "Taller", name: "Motor Norte", label: "Conceptual", color: "#69d9ff", before: "Cotizaciones lentas y estados invisibles", after: "Cotizador, seguimiento y comunicación clara", dimensions: ["Systems", "Academy"] },
  { slug: "sonrisa-central", sector: "Clínica", name: "Sonrisa Central", label: "Conceptual", color: "#74e8c2", before: "Información confusa", after: "Servicios, agenda y consentimientos ordenados", dimensions: ["Studio", "Systems"] },
] as const;

export const faqs = [
  ["¿Tengo que contratar todo?", "No. Mostramos el panorama completo y priorizamos únicamente lo que necesitas ahora."],
  ["¿Garantizan ventas?", "No. Podemos implementar, medir y mejorar procesos; las ventas dependen de múltiples factores."],
  ["¿Las demos son trabajos reales?", "Cada demo indica si es real, piloto o conceptual. Nunca presentamos un concepto como caso real."],
  ["¿Fabrican letreros o uniformes?", "Diseñamos y podemos coordinar proveedores. Producción e instalación se cotizan según alcance."],
  ["¿Necesito una tienda en línea?", "No siempre. A veces un catálogo con pedido y pago resuelve mejor; evaluamos operación y demanda."],
  ["¿Qué pasa si mi equipo no sabe usar las herramientas?", "Academy acompaña la implementación con capacitación por rol y materiales prácticos."],
] as const;
