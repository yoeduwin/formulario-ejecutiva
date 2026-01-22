// ========================================
// GOOGLE APPS SCRIPT - PERFIL DE DATOS v7.0
// Ejecutiva Ambiental
// ✅ NUEVO: Sistema robusto de envío de emails con reintentos
// ✅ NUEVO: Logging mejorado para debugging
// ✅ NUEVO: Fallback de emails en caso de falla
// ========================================

// ⚙️ CONFIGURACIÓN
const CONFIG = {
  FOLDER_ID: '1nHd-70uUeciClDm_3_pgbmqGF7II1lfQ',
  SPREADSHEET_ID: '1pjykeUxhUZFgr5ydrqMp-iI8udG9KXQHUb8P4LOr7U4',
  SHEET_NAME: 'Registros',
  EMAIL_TO: [
    'direccion.general@ejecutivambiental.com',
    'operaciones@ejecutivambiental.com',
    'aclientes@ejecutivambiental.com'
  ],
  COMPANY_NAME: 'Ejecutiva Ambiental',

  // ✅ NUEVO: Configuración de reintentos
  EMAIL_RETRY_ATTEMPTS: 3,
  EMAIL_RETRY_DELAY_MS: 2000
};

// ========================================
// FUNCIÓN PRINCIPAL - doPost
// ========================================
function doPost(e) {
  const startTime = new Date();
  let logEntries = [];

  function addLog(message) {
    const timestamp = new Date().toISOString();
    logEntries.push(`[${timestamp}] ${message}`);
    Logger.log(message);
  }

  try {
    const data = JSON.parse(e.postData.contents);

    addLog('=== INICIO PROCESO v7.0 ===');
    addLog('Cliente: ' + (data.razon_social || 'Sin nombre'));
    addLog('Sucursal: ' + (data.sucursal || 'Sin sucursal'));
    addLog('Email cliente: ' + (data.correo_informe || 'Sin email'));

    // 1. Crear carpeta del cliente CON SUCURSAL
    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
    const timestamp = Utilities.formatDate(new Date(), 'GMT-6', 'yyMMdd');
    const cleanedCompany = cleanCompanyName(data.razon_social || 'Cliente');
    const cleanedBranch = sanitizeFileName(data.sucursal || 'Sucursal');
    const carpetaCliente = folder.createFolder(`${timestamp}_${cleanedCompany}_${cleanedBranch}`);
    addLog('✓ Carpeta creada: ' + carpetaCliente.getName());

    // 2. Guardar archivos adjuntos
    const processedFiles = guardarArchivos(data, carpetaCliente, addLog);
    addLog('✓ Archivos guardados: ' + processedFiles.length);

    // 3. Generar Google Sheet con datos del perfil
    const sheetUrl = generarPerfilSheet(data, carpetaCliente, cleanedCompany, cleanedBranch, timestamp, addLog);
    addLog('✓ Perfil Sheet creado');

    // 4. Registrar en Sheets de control
    registrarEnSheet(data, processedFiles, carpetaCliente, addLog);
    addLog('✓ Registro en Sheet de control');

    // ✅ NUEVO: Sistema de envío robusto con reintentos
    const emailResult = enviarNotificacionRobusta(data, processedFiles, carpetaCliente, sheetUrl, addLog);

    if (emailResult.success) {
      addLog('✓ Notificaciones enviadas correctamente');
    } else {
      addLog('⚠️ ADVERTENCIA: Emails fallaron pero proceso completado');
      addLog('Error de email: ' + emailResult.error);
    }

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    addLog(`=== PROCESO COMPLETADO en ${duration}s ===`);

    // ✅ NUEVO: Guardar log completo en carpeta del cliente
    guardarLogEnDrive(carpetaCliente, logEntries, data);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Registro exitoso v7.0',
        files: processedFiles.length,
        emailSent: emailResult.success,
        duration: duration
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    addLog('❌ ERROR CRÍTICO: ' + error.toString());
    addLog('Stack: ' + error.stack);

    // ✅ NUEVO: Enviar email de emergencia sobre el error
    try {
      enviarEmailEmergencia(error, logEntries);
    } catch (e) {
      Logger.log('No se pudo enviar email de emergencia: ' + e);
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString(),
        logs: logEntries
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================
// ✅ NUEVO: SISTEMA DE ENVÍO ROBUSTO
// ========================================
function enviarNotificacionRobusta(data, files, carpetaCliente, sheetUrl, addLog) {
  let lastError = null;

  // Intentar envío a equipo interno
  for (let attempt = 1; attempt <= CONFIG.EMAIL_RETRY_ATTEMPTS; attempt++) {
    try {
      addLog(`Intento ${attempt}/${CONFIG.EMAIL_RETRY_ATTEMPTS} - Enviando a equipo interno...`);

      enviarNotificacionEquipo(data, files, carpetaCliente, sheetUrl);
      addLog(`✓ Email a equipo enviado correctamente en intento ${attempt}`);

      // Esperar antes de enviar al cliente
      Utilities.sleep(1000);

      // Enviar confirmación al cliente
      enviarConfirmacionCliente(data, carpetaCliente);
      addLog('✓ Confirmación a cliente enviada');

      return { success: true };

    } catch (error) {
      lastError = error;
      addLog(`✗ Intento ${attempt} falló: ${error.toString()}`);

      if (attempt < CONFIG.EMAIL_RETRY_ATTEMPTS) {
        addLog(`Esperando ${CONFIG.EMAIL_RETRY_DELAY_MS}ms antes de reintentar...`);
        Utilities.sleep(CONFIG.EMAIL_RETRY_DELAY_MS);
      }
    }
  }

  // Si todos los intentos fallan, intentar email simple
  addLog('⚠️ Todos los intentos HTML fallaron, intentando email simple...');
  try {
    enviarEmailSimpleFallback(data, carpetaCliente, sheetUrl);
    addLog('✓ Email simple de fallback enviado');
    return { success: true, usedFallback: true };
  } catch (fallbackError) {
    addLog('✗ Incluso el fallback falló: ' + fallbackError.toString());
    return { success: false, error: lastError.toString() };
  }
}

// ========================================
// ENVIAR NOTIFICACIÓN AL EQUIPO (HTML)
// ========================================
function enviarNotificacionEquipo(data, files, carpetaCliente, sheetUrl) {
  const timestamp = Utilities.formatDate(new Date(), 'GMT-6', 'dd/MM/yyyy HH:mm');

  let filesListHTML = '';
  if (files.length > 0) {
    files.forEach(f => {
      filesListHTML += `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
            <a href="${f.url}" style="color:#1e5a3e; text-decoration:none; font-weight:600;">${f.label}</a>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align:right; color:#777; font-size:12px;">
            ${formatFileSize(f.size)}
          </td>
        </tr>`;
    });
  } else {
    filesListHTML = '<tr><td colspan="2" style="padding:10px; color:#999; font-style:italic;">No se adjuntaron archivos</td></tr>';
  }

  const tagNom = data.aplica_nom020 === 'si'
    ? '<span style="background:#fff3cd; color:#856404; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:11px;">SI APLICA</span>'
    : '<span style="background:#e8f5e9; color:#2e7d32; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:11px;">NO APLICA</span>';

  const tagPipc = data.requiere_pipc === 'si'
    ? '<span style="background:#fff3cd; color:#856404; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:11px;">SI REQUIERE</span>'
    : '<span style="background:#e8f5e9; color:#2e7d32; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:11px;">NO REQUIERE</span>';

  const fechasPreferidas = data.fechas_preferidas || 'No especificadas por el cliente';

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding:20px;">
        <tr>
          <td align="center">

            <table width="600" border="0" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.05);">

              <tr>
                <td style="background-color:#1e5a3e; padding:30px; text-align:center;">
                  <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:700;">Nuevo Perfil de Datos</h1>
                  <p style="color:#a8e6cf; margin:5px 0 0 0; font-size:14px;">${data.razon_social || 'Cliente Nuevo'}</p>
                  <p style="color:#a8e6cf; margin:3px 0 0 0; font-size:12px;">Sucursal: ${data.sucursal || 'N/A'}</p>
                </td>
              </tr>

              <tr>
                <td style="padding:30px;">

                  <p style="text-align:right; font-size:11px; color:#999; margin-top:0;">Recibido: ${timestamp}</p>

                  <h3 style="color:#1e5a3e; border-bottom:2px solid #1e5a3e; padding-bottom:8px; margin-top:0;">Información de Contacto</h3>
                  <table width="100%" border="0" cellspacing="0" cellpadding="5" style="font-size:14px; color:#333; margin-bottom:20px;">
                    <tr>
                      <td width="30%" style="font-weight:bold; color:#555;">Solicitante:</td>
                      <td>${data.nombre_solicitante || '-'}</td>
                    </tr>
                    <tr>
                      <td style="font-weight:bold; color:#555;">Sucursal:</td>
                      <td><strong>${data.sucursal || '-'}</strong></td>
                    </tr>
                    <tr>
                      <td style="font-weight:bold; color:#555;">Teléfono:</td>
                      <td><a href="tel:${data.telefono_empresa}" style="text-decoration:none; color:#333;">${data.telefono_empresa || '-'}</a></td>
                    </tr>
                    <tr>
                      <td style="font-weight:bold; color:#555;">Correo:</td>
                      <td><a href="mailto:${data.correo_informe}" style="color:#1e5a3e; font-weight:bold;">${data.correo_informe || '-'}</a></td>
                    </tr>
                    <tr>
                      <td style="font-weight:bold; color:#555;">Giro:</td>
                      <td>${data.giro || '-'}</td>
                    </tr>
                  </table>

                  <h3 style="color:#1e5a3e; border-bottom:2px solid #1e5a3e; padding-bottom:8px;">Servicios Solicitados</h3>
                  <table width="100%" border="0" cellspacing="0" cellpadding="5" style="font-size:14px; color:#333; margin-bottom:20px;">
                    <tr>
                      <td width="50%"><strong>NOM-020-STPS:</strong> ${tagNom}</td>
                      <td width="50%"><strong>Prot. Civil (PIPC):</strong> ${tagPipc}</td>
                    </tr>
                  </table>

                  <div style="background-color:#fff8e1; border-left:4px solid #ffc107; padding:15px; margin-bottom:25px; border-radius:4px;">
                    <strong style="color:#f57f17; font-size:12px; text-transform:uppercase;">FECHAS PREFERIDAS PARA EVALUACIÓN:</strong>
                    <p style="margin:8px 0 0 0; font-size:14px; color:#333; line-height:1.6;">
                      ${fechasPreferidas}
                    </p>
                  </div>

                  <h3 style="color:#1e5a3e; border-bottom:2px solid #1e5a3e; padding-bottom:8px;">Documentación Adjunta (${files.length})</h3>
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:13px; color:#333;">
                    ${filesListHTML}
                  </table>

                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top:30px;">
                    <tr>
                      <td align="center">
                        <a href="${carpetaCliente.getUrl()}" style="background-color:#1e5a3e; color:#ffffff; padding:12px 25px; text-decoration:none; border-radius:5px; font-weight:bold; font-size:14px; margin-right:10px; display:inline-block;">Ver Carpeta Drive</a>
                        <a href="${sheetUrl}" style="background-color:#2196f3; color:#ffffff; padding:12px 25px; text-decoration:none; border-radius:5px; font-weight:bold; font-size:14px; display:inline-block;">Ver Perfil Excel</a>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              <tr>
                <td style="background-color:#f8f9fa; padding:15px; text-align:center; border-top:1px solid #eee; font-size:11px; color:#888;">
                  Sistema de Registro Automático v7.0 - ${CONFIG.COMPANY_NAME}<br>
                  Este es un mensaje automático, no responder.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  GmailApp.sendEmail(
    CONFIG.EMAIL_TO.join(','),
    `Nuevo Registro - ${data.razon_social} - ${data.sucursal}`,
    'Su cliente de correo no soporta HTML.',
    {
      htmlBody: htmlBody,
      name: CONFIG.COMPANY_NAME
    }
  );
}

// ========================================
// ✅ NUEVO: CONFIRMACIÓN AL CLIENTE
// ========================================
function enviarConfirmacionCliente(data, carpetaCliente) {
  const emailCliente = data.correo_informe;

  if (!emailCliente || emailCliente.trim() === '') {
    Logger.log('⚠️ No hay email del cliente para enviar confirmación');
    return;
  }

  const htmlCliente = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding:20px;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.05);">

              <tr>
                <td style="background-color:#1e5a3e; padding:30px; text-align:center;">
                  <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:700;">¡Información Recibida!</h1>
                  <p style="color:#a8e6cf; margin:8px 0 0 0; font-size:14px;">Ejecutiva Ambiental</p>
                </td>
              </tr>

              <tr>
                <td style="padding:30px;">
                  <p style="font-size:16px; color:#333; line-height:1.6; margin-top:0;">
                    Estimado(a) <strong>${data.nombre_solicitante || 'Cliente'}</strong>,
                  </p>

                  <p style="font-size:15px; color:#333; line-height:1.8;">
                    Hemos recibido correctamente su <strong>Perfil de Datos</strong> para:
                  </p>

                  <div style="background-color:#e8f5e9; border-left:4px solid #4caf50; padding:15px; margin:20px 0; border-radius:4px;">
                    <p style="margin:0; font-size:14px; color:#2e7d32; line-height:1.6;">
                      <strong>Empresa:</strong> ${data.razon_social}<br>
                      <strong>Sucursal:</strong> ${data.sucursal || 'N/A'}<br>
                      <strong>RFC:</strong> ${data.rfc || 'N/A'}
                    </p>
                  </div>

                  <p style="font-size:15px; color:#333; line-height:1.8;">
                    Nuestro equipo de <strong>Atención a Clientes</strong> revisará la información y se comunicará con usted en las próximas <strong>24 horas</strong> para coordinar los detalles del servicio.
                  </p>

                  <div style="background-color:#fff3cd; border-left:4px solid #ffc107; padding:15px; margin:25px 0; border-radius:4px;">
                    <p style="margin:0; font-size:13px; color:#856404; line-height:1.6;">
                      <strong>📋 ¿Necesita realizar algún cambio?</strong><br>
                      Por favor comuníquese con nosotros:<br><br>
                      📞 <strong>222 941 7295</strong><br>
                      💬 WhatsApp: <strong>279 111 3533</strong><br>
                      📧 <strong>aclientes@ejecutivambiental.com</strong>
                    </p>
                  </div>

                  <p style="font-size:14px; color:#666; line-height:1.6;">
                    Gracias por su confianza en <strong>Ejecutiva Ambiental</strong>.
                  </p>

                  <p style="font-size:14px; color:#666; margin-bottom:0;">
                    Atentamente,<br>
                    <strong style="color:#1e5a3e;">Equipo de Ejecutiva Ambiental</strong>
                  </p>
                </td>
              </tr>

              <tr>
                <td style="background-color:#f8f9fa; padding:15px; text-align:center; border-top:1px solid #eee; font-size:11px; color:#888;">
                  Sistema de Registro Automático - ${CONFIG.COMPANY_NAME}<br>
                  Este es un mensaje automático, por favor no responder a este correo.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  GmailApp.sendEmail(
    emailCliente,
    '✓ Información Recibida - Ejecutiva Ambiental',
    'Su cliente de correo no soporta HTML.',
    {
      htmlBody: htmlCliente,
      name: CONFIG.COMPANY_NAME
    }
  );
}

// ========================================
// ✅ NUEVO: EMAIL SIMPLE FALLBACK
// ========================================
function enviarEmailSimpleFallback(data, carpetaCliente, sheetUrl) {
  const subject = `NUEVO REGISTRO: ${data.razon_social} - ${data.sucursal}`;
  const body = `
NUEVO PERFIL DE DATOS RECIBIDO

Cliente: ${data.razon_social}
Sucursal: ${data.sucursal}
RFC: ${data.rfc}
Contacto: ${data.nombre_solicitante}
Email: ${data.correo_informe}
Teléfono: ${data.telefono_empresa}

NOM-020: ${data.aplica_nom020 === 'si' ? 'SÍ' : 'NO'}
PIPC: ${data.requiere_pipc === 'si' ? 'SÍ' : 'NO'}

Carpeta Drive: ${carpetaCliente.getUrl()}
Perfil Sheet: ${sheetUrl}

---
Sistema v7.0 - Fallback Mode
  `;

  // Enviar a equipo
  GmailApp.sendEmail(CONFIG.EMAIL_TO.join(','), subject, body);

  // Enviar confirmación simple al cliente
  if (data.correo_informe) {
    const clientBody = `
Estimado(a) ${data.nombre_solicitante},

Hemos recibido correctamente su información para ${data.razon_social} - ${data.sucursal}.

Nuestro equipo se comunicará con usted en las próximas 24 horas.

Gracias por su confianza,
Ejecutiva Ambiental

Contacto: 222 941 7295
    `;

    GmailApp.sendEmail(data.correo_informe, '✓ Información Recibida - Ejecutiva Ambiental', clientBody);
  }
}

// ========================================
// ✅ NUEVO: EMAIL DE EMERGENCIA
// ========================================
function enviarEmailEmergencia(error, logEntries) {
  const subject = '🚨 ERROR CRÍTICO - Sistema de Registro v7.0';
  const body = `
ERROR CRÍTICO EN SISTEMA DE REGISTRO

Error: ${error.toString()}

Stack: ${error.stack || 'N/A'}

LOGS:
${logEntries.join('\n')}

---
Revisar inmediatamente el sistema
  `;

  try {
    GmailApp.sendEmail(CONFIG.EMAIL_TO[0], subject, body);
  } catch (e) {
    Logger.log('No se pudo enviar email de emergencia: ' + e);
  }
}

// ========================================
// ✅ NUEVO: GUARDAR LOG EN DRIVE
// ========================================
function guardarLogEnDrive(carpetaCliente, logEntries, data) {
  try {
    const timestamp = Utilities.formatDate(new Date(), 'GMT-6', 'yyyyMMdd_HHmmss');
    const logContent = `
SISTEMA DE REGISTRO - LOG DE PROCESO
=====================================
Cliente: ${data.razon_social}
Sucursal: ${data.sucursal}
Fecha: ${timestamp}

LOGS:
${logEntries.join('\n')}
    `;

    const blob = Utilities.newBlob(logContent, 'text/plain', `LOG_${timestamp}.txt`);
    carpetaCliente.createFile(blob);
  } catch (error) {
    Logger.log('No se pudo guardar log en Drive: ' + error);
  }
}

// ========================================
// FUNCIÓN DE LIMPIEZA DE NOMBRES
// ========================================
function cleanCompanyName(companyName) {
  if (!companyName) return 'Cliente';

  const legalSuffixes = [
    ' S.A. DE C.V.',
    ' S.A. de C.V.',
    ' SA DE CV',
    ' S.A.',
    ' SA',
    ' S. DE R.L.',
    ' S DE RL',
    ' S.R.L.',
    ' SRL',
    ' S. DE R.L. DE C.V.',
    ' S DE RL DE CV',
    ' S.C.',
    ' SC',
    ' A.C.',
    ' AC',
    ' S.A.P.I.',
    ' SAPI',
    ' S.A.P.I. DE C.V.',
    ' SAPI DE CV'
  ];

  let cleaned = companyName.trim();

  legalSuffixes.forEach(suffix => {
    const regex = new RegExp(suffix.replace(/\./g, '\\.') + '$', 'i');
    cleaned = cleaned.replace(regex, '');
  });

  return sanitizeFileName(cleaned.trim());
}

// ========================================
// GUARDAR ARCHIVOS EN DRIVE
// ========================================
function guardarArchivos(data, carpetaCliente, addLog) {
  const files = [];

  const fileFields = [
    { key: 'planos', label: '1) Planos generales' },
    { key: 'mantenimiento', label: '2) Prog. Mantenimiento' },
    { key: 'proceso_produccion', label: '3) Proceso Producción' },
    { key: 'requisitos_ingreso', label: '4) Requisitos Ingreso' },
    { key: 'ine_atencion', label: 'A) INE Atiende' },
    { key: 'ine_testigo1', label: 'B) INE Testigo 1' },
    { key: 'ine_testigo2', label: 'C) INE Testigo 2' },
    { key: 'poder_notarial', label: 'D) Poder Notarial (NOM-020)' },
    { key: 'ine_representante', label: 'E) INE Representante (NOM-020)' },
    { key: 'situacion_fiscal', label: 'F) Sit. Fiscal (NOM-020)' },
    { key: 'licencia', label: 'G) Licencia/Cédula' },
    { key: 'dc3', label: 'H) DC-3 Operador' },
    { key: 'calibracion_valvula', label: 'I) Calibración Válvula' },
    { key: 'pipc_licencia_funcionamiento', label: 'PIPC - 1) Lic. Funcionamiento' },
    { key: 'pipc_uso_suelo', label: 'PIPC - 2) Uso de Suelo' },
    { key: 'pipc_predial', label: 'PIPC - 3) Predial' },
    { key: 'pipc_poliza_seguro', label: 'PIPC - 4) Póliza Seguro' },
    { key: 'pipc_mant_extintores', label: 'PIPC - 5) Mant. Extintores' },
    { key: 'pipc_situacion_fiscal', label: 'PIPC - 6) Sit. Fiscal' },
    { key: 'pipc_ine_representante', label: 'PIPC - 7) INE Rep. Legal' },
    { key: 'pipc_acta_constitutiva', label: 'PIPC - 8) Acta Constitutiva' },
    { key: 'pipc_poder_notarial', label: 'PIPC - 9) Poder Notarial' },
    { key: 'pipc_evidencia_simulacros', label: 'PIPC - 10) Simulacros' },
    { key: 'pipc_organigrama_brigadas', label: 'PIPC - 11) Brigadas' },
    { key: 'pipc_detectores_humo', label: 'PIPC - 12) Detectores Humo' },
    { key: 'pipc_medidas_preventivas', label: 'PIPC - 13) Medidas Preventivas' },
    { key: 'pipc_gas_natural', label: 'PIPC - 14) Gas Natural' },
    { key: 'pipc_sustancias_quimicas', label: 'PIPC - 15) Sust. Químicas' },
    { key: 'pipc_dc3_operadores', label: 'PIPC - 16) DC3 Montacargas' }
  ];

  fileFields.forEach(field => {
    const fileData = data[field.key];
    const fileName = data[field.key + '_filename'];

    if (fileData && fileName && fileData.startsWith('data:')) {
      try {
        const parts = fileData.split(',');
        const mimeType = parts[0].match(/:(.*?);/)[1];
        const base64Data = parts[1];

        const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
        const file = carpetaCliente.createFile(blob);

        files.push({
          name: fileName,
          label: field.label,
          url: file.getUrl(),
          size: data[field.key + '_size'] || 0
        });

        if (addLog) addLog(`  - Archivo guardado: ${fileName}`);

      } catch (error) {
        const msg = '⚠️ Error guardando ' + field.key + ': ' + error.toString();
        if (addLog) addLog(msg);
        Logger.log(msg);
      }
    }
  });

  return files;
}

// ========================================
// GENERAR GOOGLE SHEET DEL PERFIL
// ========================================
function generarPerfilSheet(data, carpetaCliente, cleanedCompany, cleanedBranch, timestamp, addLog) {
  const nombreSheet = `${timestamp}_Perfil_${cleanedCompany}_${cleanedBranch}`;

  const ss = SpreadsheetApp.create(nombreSheet);
  const sheet = ss.getSheets()[0];
  sheet.setName('PERFIL DE DATOS');

  const setHeader = (range, text) => {
    sheet.getRange(range).merge().setValue(text)
      .setBackground('#1e5a3e').setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center');
  };

  const setField = (labelRange, label, valueRange, value) => {
    sheet.getRange(labelRange).merge().setValue(label).setFontWeight('bold');
    sheet.getRange(valueRange).merge().setValue(value || '')
      .setBorder(true, true, true, true, false, false).setBackground('#F0F0F0').setWrap(true);
  };

  // 1. INFO GENERAL
  setHeader('A1:L1', 'INFORMACIÓN GENERAL');
  setField('B3:C3', 'Solicitante:', 'D3:L3', data.nombre_solicitante);
  setField('B5:C5', 'Razón Social:', 'D5:L5', data.razon_social);
  setField('B7:C7', 'Sucursal:', 'D7:L7', data.sucursal);
  setField('B9:C9', 'RFC:', 'D9:G9', data.rfc);
  setField('H9:H9', 'Tel:', 'I9:L9', data.telefono_empresa);
  setField('B11:C11', 'Rep. Legal:', 'D11:L11', data.representante_legal);
  setField('B13:C13', 'Dirección:', 'D13:L13', data.direccion_evaluacion);
  setField('B15:C15', 'Responsable:', 'D15:G15', data.responsable);
  setField('H15:H15', 'Tel:', 'I15:L15', data.telefono_responsable);
  setField('B17:C17', 'Giro:', 'D17:L17', data.giro);
  setField('B19:C19', 'Actividad:', 'D19:L19', data.actividad_principal);
  setField('B21:C21', 'Reg. Patronal:', 'D21:L21', data.registro_patronal);
  sheet.getRange('B23:C23').merge().setValue('Capacidad Op:').setFontWeight('bold');
  sheet.getRange('D23:E23').merge().setValue(data.capacidad_operacion || '').setBackground('#F0F0F0');
  sheet.getRange('F23').setValue('Instalada:').setFontWeight('bold');
  sheet.getRange('G23:H23').merge().setValue(data.capacidad_instalada || '').setBackground('#F0F0F0');
  sheet.getRange('I23').setValue('Horarios:').setFontWeight('bold');
  sheet.getRange('J23:L23').merge().setValue(data.dias_turnos_horarios || '').setBackground('#F0F0F0').setWrap(true);

  let currentRow = 26;

  // 2. INFORME
  setHeader(`A${currentRow}:L${currentRow}`, 'SOBRE EL INFORME');
  setField(`B${currentRow+2}:C${currentRow+2}`, 'Dirigido a:', `D${currentRow+2}:L${currentRow+2}`, data.nombre_dirigido);
  setField(`B${currentRow+4}:C${currentRow+4}`, 'Puesto:', `D${currentRow+4}:L${currentRow+4}`, data.puesto_dirigido);
  setField(`B${currentRow+6}:C${currentRow+6}`, 'Email:', `D${currentRow+6}:L${currentRow+6}`, data.correo_informe);
  currentRow += 9;

  // 3. FECHAS PREFERIDAS
  setHeader(`A${currentRow}:L${currentRow}`, 'FECHAS PREFERIDAS');
  sheet.getRange(`B${currentRow+1}:L${currentRow+3}`).merge().setValue(data.fechas_preferidas || 'No especificadas').setBackground('#F0F0F0').setWrap(true);
  currentRow += 5;

  // 4. DESCRIPCIÓN
  setHeader(`A${currentRow}:L${currentRow}`, 'DESCRIPCIÓN DEL PROCESO');
  sheet.getRange(`B${currentRow+1}:L${currentRow+3}`).merge().setValue(data.descripcion_proceso || '').setBackground('#F0F0F0').setWrap(true);
  currentRow += 5;

  // 5. NOM-020
  if (data.aplica_nom020) {
    setHeader(`A${currentRow}:L${currentRow}`, 'NOM-020-STPS');
    const aplica = data.aplica_nom020 === 'si' ? 'SÍ APLICA' : 'NO APLICA';
    sheet.getRange(`B${currentRow+1}:L${currentRow+1}`).merge().setValue(aplica).setHorizontalAlignment('center').setFontWeight('bold');

    if (data.aplica_nom020 === 'si') {
      setField(`B${currentRow+3}:C${currentRow+3}`, 'Testigo 1:', `D${currentRow+3}:L${currentRow+3}`, data.testigo1);
      setField(`B${currentRow+4}:C${currentRow+4}`, 'Testigo 2:', `D${currentRow+4}:L${currentRow+4}`, data.testigo2);
    }
    currentRow += 6;
  }

  // 6. PIPC
  if (data.requiere_pipc) {
    setHeader(`A${currentRow}:L${currentRow}`, 'PROTECCIÓN CIVIL (PIPC)');
    const pipc = data.requiere_pipc === 'si' ? 'SÍ REQUIERE' : 'NO REQUIERE';
    sheet.getRange(`B${currentRow+1}:L${currentRow+1}`).merge().setValue(pipc).setHorizontalAlignment('center').setFontWeight('bold');

    if (data.requiere_pipc === 'si') {
      const infoPipc = [];
      if (data.pipc_tiene_medidas) infoPipc.push(`Medidas Preventivas: ${data.pipc_tiene_medidas}`);
      if (data.pipc_tiene_gas) infoPipc.push(`Gas Natural: ${data.pipc_tiene_gas}`);
      if (data.pipc_tiene_quimicos) infoPipc.push(`Sust. Químicas: ${data.pipc_tiene_quimicos}`);
      if (data.pipc_tiene_montacargas) infoPipc.push(`Montacargas: ${data.pipc_tiene_montacargas}`);

      sheet.getRange(`B${currentRow+2}:L${currentRow+5}`).merge().setValue(infoPipc.join('\n')).setWrap(true).setBackground('#F0F0F0');
    }
  }

  // Mover archivo
  const archivoSheet = DriveApp.getFileById(ss.getId());
  archivoSheet.moveTo(carpetaCliente);

  return archivoSheet.getUrl();
}

// ========================================
// REGISTRAR EN SHEET DE CONTROL
// ========================================
function registrarEnSheet(data, files, carpetaCliente, addLog) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(['Fecha', 'Hora', 'Razón Social', 'Sucursal', 'RFC', 'Solicitante', 'Teléfono', 'Email', 'NOM-020', 'PIPC', 'Archivos', 'URL Carpeta']);
  }

  const now = new Date();
  sheet.appendRow([
    Utilities.formatDate(now, 'GMT-6', 'dd/MM/yyyy'),
    Utilities.formatDate(now, 'GMT-6', 'HH:mm:ss'),
    data.razon_social,
    data.sucursal,
    data.rfc,
    data.nombre_solicitante,
    data.telefono_responsable,
    data.correo_informe,
    data.aplica_nom020 === 'si' ? 'SÍ' : 'NO',
    data.requiere_pipc === 'si' ? 'SÍ' : 'NO',
    files.length,
    carpetaCliente.getUrl()
  ]);
}

// ========================================
// UTILIDADES
// ========================================
function sanitizeFileName(name) {
  return name.replace(/[^a-z0-9áéíóúñü ]/gi, '_').substring(0, 50);
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function doGet(e) {
  return ContentService.createTextOutput("Servicio Activo v7.0 - Sistema Robusto");
}
