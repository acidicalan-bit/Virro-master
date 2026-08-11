import type { StudyTaskType, StudyTopology } from "@/src/domain/outcome/media/preservation-study";

export type PreservationStudyPlanCase = {
  id: string;
  title: string;
  sourceBrief: string;
  instruction: string;
  topology: StudyTopology;
  taskType: StudyTaskType;
};

export const preservationStudyPlan: PreservationStudyPlanCase[] = [
  { id: "li-01-shirt-color", title: "Cambio de color de camiseta", sourceBrief: "Retrato exterior, camiseta clara, rostro y fondo detallados.", instruction: "Haz la camiseta negra; deja todo lo demás igual.", topology: "LOCAL_INDEPENDENT", taskType: "COLOR_CHANGE" },
  { id: "li-02-mug-remove", title: "Retirar taza de escritorio", sourceBrief: "Escritorio cenital con taza aislada y objetos separados.", instruction: "Quita la taza blanca sin mover lo demás.", topology: "LOCAL_INDEPENDENT", taskType: "OBJECT_REMOVAL" },
  { id: "li-03-label-text", title: "Corregir precio en etiqueta", sourceBrief: "Etiqueta plana y frontal sobre empaque, texto nítido.", instruction: "Cambia $199 por $149 y conserva el diseño.", topology: "LOCAL_INDEPENDENT", taskType: "TEXT_EDIT" },
  { id: "li-04-shoe-accent", title: "Acento de color en calzado", sourceBrief: "Fotografía de producto con tenis sobre fondo uniforme.", instruction: "Pon roja únicamente la franja lateral.", topology: "LOCAL_INDEPENDENT", taskType: "PRODUCT_EDIT" },
  { id: "li-05-sign-remove", title: "Eliminar señal pequeña", sourceBrief: "Calle urbana con señal aislada contra muro uniforme.", instruction: "Borra la señal amarilla; no cambies la calle.", topology: "LOCAL_INDEPENDENT", taskType: "OBJECT_REMOVAL" },
  { id: "li-06-button-color", title: "Botón de interfaz", sourceBrief: "Mockup de aplicación con botón separado del resto del layout.", instruction: "Haz verde el botón Comprar, nada más.", topology: "LOCAL_INDEPENDENT", taskType: "COLOR_CHANGE" },
  { id: "li-07-logo-text", title: "Texto pequeño en póster", sourceBrief: "Póster tipográfico con bloque de fecha aislado.", instruction: "Cambia la fecha al 18 de octubre.", topology: "LOCAL_INDEPENDENT", taskType: "TEXT_EDIT" },
  { id: "li-08-product-cap", title: "Color de tapa de botella", sourceBrief: "Botella de estudio con tapa bien separada del cuerpo.", instruction: "La tapa en azul marino; conserva botella, reflejos y fondo.", topology: "LOCAL_INDEPENDENT", taskType: "PRODUCT_EDIT" },

  { id: "lc-01-jacket-shadow", title: "Chaqueta con sombras", sourceBrief: "Retrato de cuerpo medio con chaqueta, pliegues, cabello y sombras cruzando bordes.", instruction: "Haz la chamarra café oscuro sin cambiar a la persona.", topology: "LOCAL_COUPLED", taskType: "COLOR_CHANGE" },
  { id: "lc-02-glasses-remove", title: "Retirar lentes", sourceBrief: "Primer plano con lentes que cubren ojos, piel y reflejos.", instruction: "Quítale los lentes y conserva su identidad.", topology: "LOCAL_COUPLED", taskType: "IDENTITY_EDIT" },
  { id: "lc-03-necklace-remove", title: "Retirar collar", sourceBrief: "Retrato con collar sobre piel y ropa, sombras de contacto.", instruction: "Quita el collar, sin retocar cara ni ropa.", topology: "LOCAL_COUPLED", taskType: "OBJECT_REMOVAL" },
  { id: "lc-04-product-logo", title: "Sustituir logo en botella", sourceBrief: "Botella curva con logo, reflejos y distorsión de superficie.", instruction: "Cambia el logo por VIRRO respetando curvatura y luz.", topology: "LOCAL_COUPLED", taskType: "PRODUCT_EDIT" },
  { id: "lc-05-sky-object", title: "Eliminar cable sobre cielo", sourceBrief: "Paisaje con cable fino cruzando cielo y ramas.", instruction: "Borra el cable, deja intactos cielo y árboles.", topology: "LOCAL_COUPLED", taskType: "OBJECT_REMOVAL" },
  { id: "lc-06-hair-strand", title: "Corregir mechón", sourceBrief: "Retrato con mechón sobre frente y transición cabello-piel.", instruction: "Acomoda ese mechón sin cambiar la cara.", topology: "LOCAL_COUPLED", taskType: "IDENTITY_EDIT" },
  { id: "lc-07-chair-color", title: "Tapizado de silla", sourceBrief: "Silla con tela, costuras, oclusiones y sombra sobre piso.", instruction: "Cambia el tapizado a verde olivo; conserva textura y estructura.", topology: "LOCAL_COUPLED", taskType: "PRODUCT_EDIT" },
  { id: "lc-08-window-reflection", title: "Retirar reflejo puntual", sourceBrief: "Interior visto por ventana con reflejo localizado y bordes complejos.", instruction: "Quita el reflejo de la lámpara del vidrio.", topology: "LOCAL_COUPLED", taskType: "OBJECT_REMOVAL" },
  { id: "lc-09-food-garnish", title: "Añadir guarnición", sourceBrief: "Plato gastronómico con sombras de contacto y textura irregular.", instruction: "Agrega un poco de perejil sobre la pasta, natural y discreto.", topology: "LOCAL_COUPLED", taskType: "OTHER" },
  { id: "lc-10-package-text", title: "Texto sobre empaque flexible", sourceBrief: "Bolsa con pliegues y texto deformado por la superficie.", instruction: "Cambia ORIGINAL por CLÁSICO respetando los pliegues.", topology: "LOCAL_COUPLED", taskType: "TEXT_EDIT" },

  { id: "st-01-arm-position", title: "Posición de brazo", sourceBrief: "Persona de pie; brazo se superpone con torso y ropa.", instruction: "Baja un poco el brazo derecho sin cambiar su cara ni postura general.", topology: "STRUCTURAL", taskType: "GEOMETRY_EDIT" },
  { id: "st-02-table-remove", title: "Retirar mesa frontal", sourceBrief: "Habitación con mesa que oculta piso, silla y pared.", instruction: "Quita la mesa del centro y reconstruye naturalmente lo que tapa.", topology: "STRUCTURAL", taskType: "OBJECT_REMOVAL" },
  { id: "st-03-door-widen", title: "Ampliar puerta", sourceBrief: "Interior arquitectónico con puerta, marco, pared y perspectiva.", instruction: "Haz la puerta un poco más ancha, manteniendo la perspectiva.", topology: "STRUCTURAL", taskType: "GEOMETRY_EDIT" },
  { id: "st-04-product-handle", title: "Modificar asa", sourceBrief: "Bolso con asa conectada al cuerpo, costuras y sombra.", instruction: "Haz el asa más corta sin rediseñar el bolso.", topology: "STRUCTURAL", taskType: "PRODUCT_EDIT" },
  { id: "st-05-smile-subtle", title: "Sonrisa sutil", sourceBrief: "Primer plano facial con boca, mejillas y expresión conectadas.", instruction: "Ponle una sonrisa muy leve; debe seguir pareciendo la misma persona.", topology: "STRUCTURAL", taskType: "IDENTITY_EDIT" },
  { id: "st-06-sleeve-length", title: "Longitud de manga", sourceBrief: "Modelo con brazo flexionado; manga afecta pliegues y mano.", instruction: "Haz la manga más larga hasta la muñeca.", topology: "STRUCTURAL", taskType: "GEOMETRY_EDIT" },
  { id: "st-07-car-wheel", title: "Cambiar rin de automóvil", sourceBrief: "Automóvil en ángulo; rueda conectada con llanta, carrocería y sombra.", instruction: "Ponle un rin deportivo sobrio a la rueda delantera.", topology: "STRUCTURAL", taskType: "PRODUCT_EDIT" },
  { id: "st-08-poster-reflow", title: "Título más grande con reflujo", sourceBrief: "Póster con título, subtítulo e imagen en composición ajustada.", instruction: "Haz el título más grande y reacomoda lo mínimo necesario.", topology: "STRUCTURAL", taskType: "TEXT_EDIT" },

  { id: "gl-01-warmer-scene", title: "Escena más cálida", sourceBrief: "Fotografía interior completa con varias fuentes de luz.", instruction: "Haz que toda la escena se sienta más cálida y acogedora.", topology: "GLOBAL", taskType: "OTHER" },
  { id: "gl-02-editorial-style", title: "Look editorial global", sourceBrief: "Retrato de moda con sujeto, fondo y gradación integrados.", instruction: "Dale un look editorial premium, sin exagerar.", topology: "GLOBAL", taskType: "OTHER" },
  { id: "gl-03-night-conversion", title: "Conversión de día a noche", sourceBrief: "Paisaje urbano diurno con cielo, edificios y reflejos.", instruction: "Convierte la escena a noche realista.", topology: "GLOBAL", taskType: "OTHER" },
  { id: "gl-04-cleaner-branding", title: "Branding más limpio", sourceBrief: "Composición de marca completa con producto, tipografía y elementos gráficos.", instruction: "Hazlo más limpio y más pro, manteniendo la identidad de marca.", topology: "GLOBAL", taskType: "OTHER" },
];

export const preservationStudyPlanDistribution = preservationStudyPlan.reduce<Record<StudyTopology, number>>(
  (counts, item) => ({ ...counts, [item.topology]: counts[item.topology] + 1 }),
  { LOCAL_INDEPENDENT: 0, LOCAL_COUPLED: 0, STRUCTURAL: 0, GLOBAL: 0 },
);
