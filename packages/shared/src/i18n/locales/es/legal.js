// legal strings (es). Keys are referenced as t('legal.<key>').
// Los textos largos son listas de secciones: { title, body?: [], items?: [], after?: [] }.
// Placeholders que completa la página: {{controller}}, {{email}}, {{contactEmail}}, {{deleteUrl}}.
// NOTE: must be reviewed by a lawyer before launch.
export default {
  lastUpdated: 'Última actualización: {{date}}',
  updatedDate: '26 de noviembre de 2026',
  otherLanguages: 'También disponible en',
  onThisPage: 'En esta página',
  privacy: {
    metaTitle: 'Política de Privacidad | MeuAzulão',
    metaDescription: 'Qué datos recopila MeuAzulão, para qué, quién los trata y cómo eliminarlos.',
    badge: 'Privacidad',
    title: 'Política de Privacidad',
    shortTitle: 'Privacidad',
    intro: 'MeuAzulão te ayuda a controlar tu dinero conversando con Zul por WhatsApp. Esta política explica, con palabras simples, qué datos recopilamos, para qué, quién nos ayuda a tratarlos y cómo mantienes el control. Cumple con la Ley General de Protección de Datos de Brasil (LGPD, Ley 13.709/2018) y con las leyes de privacidad de los países donde operamos.',
    sections: [
      {
        title: '1. Quién es responsable de tus datos',
        body: [
          'MeuAzulão es operado por {{controller}}, responsable del tratamiento de los datos personales descritos aquí.',
          'Para cualquier tema sobre tus datos, escribe a nuestro Delegado de Protección de Datos en {{email}}.',
        ],
      },
      {
        title: '2. Qué datos recopilamos',
        items: [
          'Datos de la cuenta: tu número de teléfono (WhatsApp), tu nombre y, si nos lo das, tu correo.',
          'Lo que nos cuentas: transacciones y otras notas financieras que escribes o le dices a Zul o que registras en la app, como montos, descripciones, categorías, nombres de tarjetas y cuentas, cuentas por pagar, presupuestos y metas.',
          'Audios y fotos (por ejemplo, recibos) que le envías a Zul. Los usamos para entender la transacción y luego los descartamos en un plazo de 30 días.',
          'Datos de uso y de fallos: versión de la app y del dispositivo, reportes de errores, registros de acceso y dirección IP, para que el servicio funcione y sea seguro.',
          'Datos de la suscripción: tu plan, la tienda donde compraste y las fechas de compra y renovación. Los datos de la tarjeta van directo al procesador de pagos; nunca recibimos el número completo de tu tarjeta.',
        ],
        after: [
          'Nunca te pedimos contraseñas del banco ni números completos de tarjeta, y no los necesitamos. Por favor, no se los envíes a Zul.',
        ],
      },
      {
        title: '3. Para qué los usamos (y la base legal)',
        items: [
          'Para prestarte el servicio que contrataste: registrar tus transacciones, responderte por WhatsApp, mostrar tu panel y enviarte los recordatorios y resúmenes que pediste. Base legal: ejecución de un contrato (LGPD, art. 7, V).',
          'Para mantener el servicio seguro, evitar abusos y corregir errores. Base legal: ejecución de un contrato y nuestro interés legítimo (art. 7, IX).',
          'Para cumplir obligaciones legales y solicitudes de autoridades (art. 7, II).',
        ],
        after: [
          'No usamos tus datos para publicidad, no tenemos rastreadores de anuncios y nunca vendemos tus datos.',
        ],
      },
      {
        title: '4. Quién trata tus datos por nosotros',
        body: ['Usamos algunos proveedores de servicios, con contratos que solo les permiten tratar tus datos para operar MeuAzulão:'],
        items: [
          'Meta (WhatsApp Business Platform): entrega los mensajes entre tú y Zul.',
          'OpenAI (vía API): entiende tus mensajes, audios y fotos. Los datos enviados por la API no se usan para entrenar los modelos de OpenAI.',
          'Supabase: nuestra base de datos, alojada en la región de São Paulo (Brasil), cifrada en tránsito y en reposo.',
          'Vercel: aloja nuestro sitio web y nuestros servidores.',
          'Sentry: recibe reportes de errores y fallos para que podamos corregir problemas.',
          'Twilio SendGrid: envía correos de la cuenta, como invitaciones, cuando usas correo.',
          'RevenueCat: administra las suscripciones y nos informa si tu hogar tiene Plus (id del hogar, producto, tienda y fechas).',
          'Apple (App Store) y Google (Google Play): procesan las compras hechas en la app, según sus propios términos y políticas de privacidad.',
        ],
        after: [
          'En una cuenta compartida (familiar), los miembros que invites pueden ver los datos financieros compartidos de la organización.',
          'Podemos divulgar datos cuando lo exija la ley o una orden judicial.',
        ],
      },
      {
        title: '5. Transferencias internacionales',
        body: [
          'Algunos proveedores (como Meta, OpenAI, Vercel, Sentry y RevenueCat) pueden tratar datos fuera de Brasil, incluso en Estados Unidos. Estas transferencias siguen el art. 33 de la LGPD, con base en cláusulas contractuales estándar y compromisos de protección de datos equivalentes.',
        ],
      },
      {
        title: '6. Cuánto tiempo los guardamos',
        items: [
          'Datos de la cuenta y financieros: mientras tu cuenta esté activa.',
          'Audios y fotos: se descartan en un plazo de 30 días después de procesarlos.',
          'Registros de acceso y reportes de errores: hasta 90 días.',
          'Cuando eliminas tu cuenta, tus datos se borran de inmediato; las copias en respaldos se borran en un plazo de 30 días. Solo guardamos lo que la ley nos obliga a guardar, por el tiempo que exige.',
        ],
      },
      {
        title: '7. Tus derechos',
        body: ['Puedes, en cualquier momento y sin costo:'],
        items: [
          'Confirmar si tratamos tus datos y acceder a ellos.',
          'Corregir datos incompletos, inexactos o desactualizados.',
          'Recibir una copia de tus datos en un formato estructurado (portabilidad).',
          'Pedir que anonimicemos, bloqueemos o eliminemos datos innecesarios o excesivos.',
          'Eliminar tu cuenta y tus datos.',
          'Saber con quién compartimos tus datos.',
          'Oponerte a un tratamiento y revocar cualquier consentimiento que hayas dado.',
        ],
        after: [
          'Para ejercer cualquiera de estos derechos, escribe a {{email}}. Respondemos en un plazo de 15 días. También puedes presentar una queja ante la autoridad de protección de datos de Brasil (ANPD) o la de tu país.',
        ],
      },
      {
        title: '8. Cómo eliminar tu cuenta',
        body: [
          'Puedes eliminar tu cuenta en la app (Configuración > Eliminar cuenta), enviando “eliminar mi cuenta” a Zul por WhatsApp, o en la web en {{deleteUrl}}. La eliminación es inmediata e incluye todos tus datos.',
        ],
      },
      {
        title: '9. Seguridad',
        items: [
          'Cifrado en tránsito (TLS/HTTPS) y en reposo.',
          'Seguridad por fila en la base de datos, para que cada persona solo acceda a sus propios datos.',
          'Inicio de sesión con un código de un solo uso enviado por WhatsApp.',
          'Controles de acceso por organización y rol, y respaldos automáticos.',
        ],
      },
      {
        title: '10. Menores de edad',
        body: ['MeuAzulão es para mayores de 18 años. No recopilamos datos de menores a sabiendas.'],
      },
      {
        title: '11. Cookies',
        body: [
          'Solo usamos lo estrictamente necesario para mantener tu sesión y recordar tus preferencias (como el idioma). Nada de cookies de publicidad ni de rastreo de terceros.',
        ],
      },
      {
        title: '12. Cambios en esta política',
        body: [
          'Si hacemos cambios importantes, te avisaremos por WhatsApp, por correo o en la app antes de que entren en vigor. La fecha de arriba muestra la versión más reciente.',
        ],
      },
      {
        title: '13. Contacto',
        body: [
          'Responsable del tratamiento: {{controller}}.',
          'Delegado de Protección de Datos (Encarregado): {{email}}.',
        ],
      },
    ],
  },
  terms: {
    metaTitle: 'Términos de Servicio | MeuAzulão',
    metaDescription: 'Las reglas para usar MeuAzulão y Zul, tu asistente en WhatsApp.',
    badge: 'Términos',
    title: 'Términos de Servicio',
    shortTitle: 'Términos',
    intro: 'Estos Términos regulan el uso de MeuAzulão, operado por {{controller}}. Al crear una cuenta o usar el servicio, por WhatsApp, en la app o en la web, los aceptas. Léelos junto con nuestra Política de Privacidad.',
    sections: [
      {
        title: '1. Quién puede usar MeuAzulão',
        items: [
          'Tienes al menos 18 años y capacidad para celebrar un contrato.',
          'La información que nos das es verdadera y está actualizada.',
          'Proteges tu teléfono, tu WhatsApp y tus códigos de acceso. Quien tenga acceso a tu WhatsApp puede hablar con Zul como si fueras tú.',
        ],
      },
      {
        title: '2. El servicio',
        body: ['MeuAzulão es un control de finanzas personal y familiar. Con él puedes:'],
        items: [
          'Registrar gastos e ingresos conversando con Zul por WhatsApp (texto, audio o fotos), en la app o en la web.',
          'Ver resúmenes, gráficos y tu mes de un vistazo.',
          'Recibir los recordatorios y alertas que elijas, como cuentas por vencer y presupuestos.',
          'Compartir la cuenta con tu familia, con un rol para cada miembro.',
        ],
        after: [
          'Podemos cambiar, suspender o dar por terminadas funciones. Cuando un cambio sea importante para ti, te avisaremos con anticipación siempre que sea posible.',
        ],
      },
      {
        title: '3. Zul e inteligencia artificial',
        items: [
          'Zul es un asistente automático que funciona con inteligencia artificial (modelos de OpenAI vía API). Zul no es un asesor financiero certificado y sus respuestas no son asesoría financiera, fiscal, legal ni de inversión.',
          'La inteligencia artificial puede equivocarse. Revisa los números importantes en tu panel antes de tomar decisiones.',
          'Lo que le envías a Zul se trata como se describe en la Política de Privacidad y no se usa para entrenar los modelos de OpenAI.',
        ],
      },
      {
        title: '4. Tu cuenta',
        items: [
          'Inicias sesión con un código que te enviamos por WhatsApp (o con correo y contraseña, si los configuraste).',
          'Eres responsable de lo que pasa en tu cuenta. Avísanos de inmediato si notas un uso no autorizado.',
          'En una cuenta compartida, todos los miembros que invites ven los datos financieros compartidos. Los administradores gestionan los miembros y sus permisos.',
        ],
      },
      {
        title: '5. Uso correcto',
        body: ['Aceptas no:'],
        items: [
          'Usar MeuAzulão para algo ilegal o para violar los derechos de otras personas.',
          'Intentar acceder a datos de otras personas o a partes del servicio a las que no tienes acceso.',
          'Enviar virus, spam o contenido abusivo o ilegal a Zul.',
          'Interrumpir, sobrecargar, copiar, revender o hacer ingeniería inversa del servicio.',
        ],
        after: ['Si no cumples estas reglas, podemos suspender o cerrar tu cuenta.'],
      },
      {
        title: '6. Precio, prueba gratis y suscripción',
        items: [
          'Prueba gratis: cada cuenta nueva tiene 7 días de MeuAzulão gratis, sin tarjeta. No se cobra nada cuando termina la prueba. Para seguir registrando, tú eliges si te suscribes a MeuAzulão Plus.',
          'Planes: Plus se vende por mes o por año. El precio, el período de cobro y la moneda siempre se muestran antes de que confirmes la compra. Los precios pueden variar según la tienda (App Store o Google Play) y el país, y pueden incluir impuestos.',
          'Renovación automática: Plus se renueva automáticamente al final de cada período, al precio vigente, hasta que lo canceles. Si el precio cambia, nosotros o la tienda te avisaremos antes, como exigen las reglas de la tienda y la ley.',
          'Cancelación: puedes cancelar cuando quieras y conservas Plus hasta el final del período que ya pagaste. Plus se vende solo en la app, en App Store y Google Play. Para cancelar, usa la configuración de suscripciones de la tienda donde te suscribiste (no podemos cancelar suscripciones de las tiendas por ti).',
          'Derecho de arrepentimiento: si compraste Plus por internet como consumidor en Brasil, puedes desistir dentro de los 7 días posteriores a la compra y recibir el reembolso total (Código de Defensa del Consumidor de Brasil, art. 49). Pide el reembolso a App Store o Google Play, que procesan esos pagos; si necesitas ayuda, escríbenos.',
          'Fuera de esos casos, los reembolsos siguen las reglas de la tienda donde compraste y las leyes de tu país.',
          'Los pagos los procesa App Store o Google Play. Nunca vemos ni guardamos los datos de tu tarjeta.',
          'Si no te suscribes después de la prueba, tus datos no se borran: puedes seguir viéndolos, pero no puedes registrar nuevos movimientos hasta suscribirte. Puedes eliminar tu cuenta en cualquier momento (sección 10).',
        ],
      },
      {
        title: '7. Propiedad intelectual',
        body: [
          'La marca MeuAzulão, Zul, el software y el contenido del servicio pertenecen a {{controller}} o a sus licenciantes. Te damos una licencia personal, no exclusiva, intransferible y revocable para usar el servicio según estos Términos. Tus datos financieros son tuyos.',
        ],
      },
      {
        title: '8. Privacidad',
        body: [
          'Cómo tratamos tus datos personales se explica en nuestra Política de Privacidad, que forma parte de estos Términos.',
        ],
      },
      {
        title: '9. Límites de nuestra responsabilidad',
        items: [
          'MeuAzulão es una herramienta de organización. No somos un banco ni una institución financiera, y no ofrecemos crédito, inversiones ni asesoría financiera.',
          'Trabajamos para que el servicio esté disponible y sea correcto, pero puede tener interrupciones o errores.',
          'En la medida que la ley lo permita, no respondemos por daños indirectos ni por decisiones tomadas solo con base en las respuestas de Zul. Nada en estos Términos limita los derechos que te dan las leyes de protección al consumidor.',
        ],
      },
      {
        title: '10. Cierre de la cuenta',
        items: [
          'Puedes eliminar tu cuenta cuando quieras: en la app, enviando “eliminar mi cuenta” a Zul o en {{deleteUrl}}.',
          'Podemos suspender o cerrar cuentas que no cumplan estos Términos o que pongan en riesgo el servicio o a otras personas.',
          'Después del cierre, tus datos se tratan como se describe en la Política de Privacidad.',
        ],
      },
      {
        title: '11. Ley aplicable',
        body: [
          'Estos Términos se rigen por las leyes de Brasil, en especial el Código de Defensa del Consumidor (Ley 8.078/1990), el Marco Civil de Internet (Ley 12.965/2014) y la LGPD. Las disputas se resuelven en los tribunales del domicilio del consumidor. Si vives fuera de Brasil, también se aplican las normas obligatorias de protección al consumidor de tu país.',
        ],
      },
      {
        title: '12. Cambios en estos Términos',
        body: [
          'Si cambiamos estos Términos de forma relevante, te avisaremos con anticipación por WhatsApp, por correo o en la app. Si sigues usando MeuAzulão después de que los cambios entren en vigor, se aplican los nuevos Términos.',
        ],
      },
      {
        title: '13. Contacto',
        body: ['Dudas sobre estos Términos: {{contactEmail}}. Dudas sobre privacidad: {{email}}.'],
      },
    ],
  },
};
