// ========================================
// SISTEMA DE PRUEBAS PERIÓDICAS v7.0
// Ejecutiva Ambiental
// ========================================

// ⚙️ CONFIGURACIÓN DE PRUEBAS
const TEST_CONFIG = {
  SHEET_NAME_TESTS: 'Pruebas_Sistema',
  TEST_EMAIL: 'sistemas@ejecutivambiental.com', // Email que recibirá las pruebas
  ALERT_EMAIL: 'direccion.general@ejecutivambiental.com', // Email para alertas
  MAX_FAILURES_ALERT: 2 // Número de fallos consecutivos antes de alertar
};

// ========================================
// FUNCIÓN PRINCIPAL DE PRUEBA AUTOMÁTICA
// ========================================
function ejecutarPruebaAutomatica() {
  const testId = Utilities.formatDate(new Date(), 'GMT-6', 'yyyyMMdd_HHmmss');
  const startTime = new Date();

  Logger.log('=== INICIANDO PRUEBA AUTOMÁTICA ' + testId + ' ===');

  try {
    // 1. Probar envío de email simple
    const emailTest = probarEnvioEmail();

    // 2. Probar creación de carpeta
    const folderTest = probarCreacionCarpeta();

    // 3. Probar registro en Sheet
    const sheetTest = probarRegistroSheet();

    // 4. Calcular duración
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    // 5. Determinar resultado
    const allPassed = emailTest.success && folderTest.success && sheetTest.success;

    // 6. Registrar resultado
    registrarResultadoPrueba({
      testId: testId,
      timestamp: startTime,
      duration: duration,
      emailTest: emailTest,
      folderTest: folderTest,
      sheetTest: sheetTest,
      overall: allPassed ? 'PASS' : 'FAIL'
    });

    // 7. Verificar si necesitamos alertar
    if (!allPassed) {
      verificarYAlertarFallos();
    }

    Logger.log('=== PRUEBA COMPLETADA: ' + (allPassed ? 'EXITOSA' : 'FALLÓ') + ' ===');

    return {
      success: allPassed,
      testId: testId,
      duration: duration,
      details: { emailTest, folderTest, sheetTest }
    };

  } catch (error) {
    Logger.log('❌ ERROR EN PRUEBA: ' + error.toString());
    registrarResultadoPrueba({
      testId: testId,
      timestamp: startTime,
      duration: 0,
      emailTest: { success: false, error: error.toString() },
      folderTest: { success: false, error: 'No ejecutado' },
      sheetTest: { success: false, error: 'No ejecutado' },
      overall: 'ERROR'
    });

    enviarAlertaErrorCritico(error, testId);

    return { success: false, error: error.toString() };
  }
}

// ========================================
// PRUEBA: ENVÍO DE EMAIL
// ========================================
function probarEnvioEmail() {
  try {
    Logger.log('Probando envío de email...');

    const testSubject = '🧪 Prueba Automática del Sistema - ' + new Date().toLocaleString('es-MX');
    const testBody = `
Esta es una prueba automática del sistema de emails.

✅ Si recibes este correo, el sistema está funcionando correctamente.

Timestamp: ${new Date().toISOString()}
Sistema: v7.0 Automated Test

---
Este es un correo automático de prueba.
    `;

    // Intentar envío con reintentos
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        GmailApp.sendEmail(
          TEST_CONFIG.TEST_EMAIL,
          testSubject,
          testBody,
          { name: CONFIG.COMPANY_NAME }
        );

        Logger.log('✓ Email de prueba enviado correctamente (intento ' + attempt + ')');
        return {
          success: true,
          attempts: attempt,
          timestamp: new Date()
        };

      } catch (error) {
        lastError = error;
        Logger.log('✗ Intento ' + attempt + ' falló: ' + error.toString());
        if (attempt < 3) {
          Utilities.sleep(2000);
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    return {
      success: false,
      error: lastError.toString(),
      attempts: 3
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ========================================
// PRUEBA: CREACIÓN DE CARPETA
// ========================================
function probarCreacionCarpeta() {
  try {
    Logger.log('Probando creación de carpeta...');

    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
    const testFolderName = 'TEST_' + Utilities.formatDate(new Date(), 'GMT-6', 'yyyyMMdd_HHmmss');

    // Crear carpeta de prueba
    const testFolder = folder.createFolder(testFolderName);
    const folderId = testFolder.getId();

    // Crear archivo de prueba dentro
    const testFile = testFolder.createFile('test.txt', 'Archivo de prueba automática');

    // Verificar que se creó correctamente
    const verification = DriveApp.getFolderById(folderId);

    Logger.log('✓ Carpeta de prueba creada correctamente');

    // Programar eliminación de la carpeta de prueba después de 24 horas
    // (opcional, puedes comentar esto si quieres mantener las pruebas)
    // ScriptApp.newTrigger('eliminarCarpetaPrueba')
    //   .timeBased()
    //   .after(24 * 60 * 60 * 1000)
    //   .create();

    return {
      success: true,
      folderId: folderId,
      folderUrl: testFolder.getUrl(),
      timestamp: new Date()
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ========================================
// PRUEBA: REGISTRO EN SHEET
// ========================================
function probarRegistroSheet() {
  try {
    Logger.log('Probando registro en Sheet...');

    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

    if (!sheet) {
      return {
        success: false,
        error: 'Sheet de control no encontrado'
      };
    }

    // Intentar escribir una fila de prueba
    const testRow = [
      Utilities.formatDate(new Date(), 'GMT-6', 'dd/MM/yyyy'),
      Utilities.formatDate(new Date(), 'GMT-6', 'HH:mm:ss'),
      'TEST_CLIENTE',
      'TEST_SUCURSAL',
      'TEST123456XXX',
      'Prueba Automática',
      '0000000000',
      TEST_CONFIG.TEST_EMAIL,
      'NO',
      'NO',
      0,
      'https://test.com'
    ];

    sheet.appendRow(testRow);

    // Verificar que se escribió
    const lastRow = sheet.getLastRow();
    const lastData = sheet.getRange(lastRow, 1, 1, 3).getValues()[0];

    Logger.log('✓ Registro en Sheet exitoso');

    return {
      success: true,
      lastRow: lastRow,
      timestamp: new Date()
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ========================================
// REGISTRAR RESULTADO DE PRUEBA
// ========================================
function registrarResultadoPrueba(result) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let testSheet = ss.getSheetByName(TEST_CONFIG.SHEET_NAME_TESTS);

    // Crear sheet si no existe
    if (!testSheet) {
      testSheet = ss.insertSheet(TEST_CONFIG.SHEET_NAME_TESTS);
      testSheet.appendRow([
        'Test ID',
        'Fecha',
        'Hora',
        'Duración (s)',
        'Email Test',
        'Folder Test',
        'Sheet Test',
        'Resultado',
        'Detalles'
      ]);

      // Formato del header
      const headerRange = testSheet.getRange(1, 1, 1, 9);
      headerRange.setBackground('#1e5a3e');
      headerRange.setFontColor('#FFFFFF');
      headerRange.setFontWeight('bold');
    }

    // Registrar resultado
    testSheet.appendRow([
      result.testId,
      Utilities.formatDate(result.timestamp, 'GMT-6', 'dd/MM/yyyy'),
      Utilities.formatDate(result.timestamp, 'GMT-6', 'HH:mm:ss'),
      result.duration,
      result.emailTest.success ? '✓ PASS' : '✗ FAIL',
      result.folderTest.success ? '✓ PASS' : '✗ FAIL',
      result.sheetTest.success ? '✓ PASS' : '✗ FAIL',
      result.overall,
      JSON.stringify({
        emailError: result.emailTest.error || null,
        folderError: result.folderTest.error || null,
        sheetError: result.sheetTest.error || null
      })
    ]);

    // Colorear la fila según resultado
    const lastRow = testSheet.getLastRow();
    const resultRange = testSheet.getRange(lastRow, 1, 1, 9);

    if (result.overall === 'PASS') {
      resultRange.setBackground('#e8f5e9'); // Verde claro
    } else if (result.overall === 'FAIL') {
      resultRange.setBackground('#fff3cd'); // Amarillo
    } else {
      resultRange.setBackground('#f8d7da'); // Rojo claro
    }

    Logger.log('✓ Resultado registrado en Sheet de Pruebas');

  } catch (error) {
    Logger.log('⚠️ No se pudo registrar resultado: ' + error.toString());
  }
}

// ========================================
// VERIFICAR FALLOS CONSECUTIVOS
// ========================================
function verificarYAlertarFallos() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const testSheet = ss.getSheetByName(TEST_CONFIG.SHEET_NAME_TESTS);

    if (!testSheet) return;

    const lastRow = testSheet.getLastRow();
    if (lastRow < 2) return;

    // Obtener últimos resultados
    const numResultados = Math.min(TEST_CONFIG.MAX_FAILURES_ALERT, lastRow - 1);
    const resultados = testSheet.getRange(lastRow - numResultados + 1, 8, numResultados, 1).getValues();

    // Verificar si todos son FAIL o ERROR
    let fallosConsecutivos = 0;
    for (let i = resultados.length - 1; i >= 0; i--) {
      if (resultados[i][0] === 'FAIL' || resultados[i][0] === 'ERROR') {
        fallosConsecutivos++;
      } else {
        break;
      }
    }

    // Alertar si hay demasiados fallos consecutivos
    if (fallosConsecutivos >= TEST_CONFIG.MAX_FAILURES_ALERT) {
      enviarAlertaFallosConsecutivos(fallosConsecutivos);
    }

  } catch (error) {
    Logger.log('⚠️ Error verificando fallos: ' + error.toString());
  }
}

// ========================================
// ALERTAS
// ========================================
function enviarAlertaFallosConsecutivos(numFallos) {
  const subject = '🚨 ALERTA: ' + numFallos + ' Fallos Consecutivos en Sistema de Emails';
  const body = `
ALERTA DEL SISTEMA DE MONITOREO

Se han detectado ${numFallos} pruebas fallidas consecutivas en el sistema de registro de emails.

Esto puede indicar:
- Problemas con la API de Gmail (cuota excedida)
- Problemas de conectividad
- Errores en el código

ACCIÓN REQUERIDA:
1. Revisar el Sheet "Pruebas_Sistema" en el documento de control
2. Verificar los logs en Google Apps Script
3. Revisar la cuota de Gmail API

Timestamp: ${new Date().toLocaleString('es-MX')}

---
Sistema de Monitoreo Automático v7.0
  `;

  try {
    GmailApp.sendEmail(TEST_CONFIG.ALERT_EMAIL, subject, body, {
      name: CONFIG.COMPANY_NAME + ' - Monitor'
    });
    Logger.log('🚨 Alerta de fallos consecutivos enviada');
  } catch (error) {
    Logger.log('❌ No se pudo enviar alerta: ' + error.toString());
  }
}

function enviarAlertaErrorCritico(error, testId) {
  const subject = '🔥 ERROR CRÍTICO en Prueba del Sistema';
  const body = `
ERROR CRÍTICO EN SISTEMA DE PRUEBAS

Test ID: ${testId}
Error: ${error.toString()}
Stack: ${error.stack || 'N/A'}

Timestamp: ${new Date().toLocaleString('es-MX')}

El sistema de pruebas automáticas encontró un error crítico.
Por favor revisar inmediatamente.

---
Sistema de Monitoreo Automático v7.0
  `;

  try {
    GmailApp.sendEmail(TEST_CONFIG.ALERT_EMAIL, subject, body, {
      name: CONFIG.COMPANY_NAME + ' - Monitor'
    });
  } catch (e) {
    Logger.log('❌ No se pudo enviar alerta crítica: ' + e.toString());
  }
}

// ========================================
// FUNCIÓN PARA PRUEBA MANUAL
// ========================================
function ejecutarPruebaManual() {
  const result = ejecutarPruebaAutomatica();

  const message = result.success
    ? '✅ PRUEBA EXITOSA\n\n' + JSON.stringify(result, null, 2)
    : '❌ PRUEBA FALLÓ\n\n' + JSON.stringify(result, null, 2);

  Logger.log(message);

  // También enviar email con resultado
  try {
    GmailApp.sendEmail(
      TEST_CONFIG.TEST_EMAIL,
      '📊 Resultado de Prueba Manual - ' + new Date().toLocaleString('es-MX'),
      message,
      { name: CONFIG.COMPANY_NAME }
    );
  } catch (e) {
    Logger.log('⚠️ No se pudo enviar resultado: ' + e.toString());
  }

  return result;
}

// ========================================
// FUNCIÓN PARA OBTENER ESTADO DEL SISTEMA
// ========================================
function obtenerEstadoSistema() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const testSheet = ss.getSheetByName(TEST_CONFIG.SHEET_NAME_TESTS);

    if (!testSheet || testSheet.getLastRow() < 2) {
      return {
        status: 'unknown',
        message: 'No hay pruebas registradas'
      };
    }

    // Obtener últimas 5 pruebas
    const lastRow = testSheet.getLastRow();
    const numPruebas = Math.min(5, lastRow - 1);
    const ultimas = testSheet.getRange(lastRow - numPruebas + 1, 1, numPruebas, 9).getValues();

    // Analizar resultados
    let exitosas = 0;
    let fallidas = 0;

    ultimas.forEach(row => {
      if (row[7] === 'PASS') exitosas++;
      else fallidas++;
    });

    const porcentajeExito = (exitosas / numPruebas) * 100;

    let status = 'healthy';
    let message = `Sistema operando normalmente (${porcentajeExito}% éxito)`;

    if (porcentajeExito < 80) {
      status = 'warning';
      message = `Sistema con problemas intermitentes (${porcentajeExito}% éxito)`;
    }

    if (porcentajeExito < 50) {
      status = 'critical';
      message = `Sistema con fallas críticas (${porcentajeExito}% éxito)`;
    }

    return {
      status: status,
      message: message,
      ultimaPrueba: ultimas[ultimas.length - 1],
      exitosas: exitosas,
      fallidas: fallidas,
      totalPruebas: numPruebas
    };

  } catch (error) {
    return {
      status: 'error',
      message: 'Error obteniendo estado: ' + error.toString()
    };
  }
}

// ========================================
// CONFIGURAR PRUEBAS AUTOMÁTICAS
// ========================================
function configurarPruebasAutomaticas(frecuencia) {
  // Primero, eliminar triggers existentes de pruebas
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'ejecutarPruebaAutomatica') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Crear nuevo trigger según frecuencia
  switch (frecuencia) {
    case 'cada_hora':
      ScriptApp.newTrigger('ejecutarPruebaAutomatica')
        .timeBased()
        .everyHours(1)
        .create();
      Logger.log('✓ Configurado: Prueba cada hora');
      break;

    case 'cada_6_horas':
      ScriptApp.newTrigger('ejecutarPruebaAutomatica')
        .timeBased()
        .everyHours(6)
        .create();
      Logger.log('✓ Configurado: Prueba cada 6 horas');
      break;

    case 'diario':
      ScriptApp.newTrigger('ejecutarPruebaAutomatica')
        .timeBased()
        .everyDays(1)
        .atHour(9) // A las 9 AM
        .create();
      Logger.log('✓ Configurado: Prueba diaria a las 9 AM');
      break;

    case 'dos_veces_dia':
      ScriptApp.newTrigger('ejecutarPruebaAutomatica')
        .timeBased()
        .everyDays(1)
        .atHour(9)
        .create();
      ScriptApp.newTrigger('ejecutarPruebaAutomatica')
        .timeBased()
        .everyDays(1)
        .atHour(18)
        .create();
      Logger.log('✓ Configurado: Prueba 2 veces al día (9 AM y 6 PM)');
      break;

    case 'ninguno':
      Logger.log('✓ Pruebas automáticas desactivadas');
      break;

    default:
      Logger.log('⚠️ Frecuencia no reconocida');
  }

  return { success: true, frecuencia: frecuencia };
}

// ========================================
// ENDPOINT WEB PARA VER ESTADO
// ========================================
function doGet(e) {
  // Si viene el parámetro ?status, mostrar estado del sistema
  if (e && e.parameter && e.parameter.action === 'status') {
    const estado = obtenerEstadoSistema();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Estado del Sistema - Ejecutiva Ambiental</title>
        <style>
          body { font-family: Arial; padding: 20px; background: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .status-healthy { color: #4caf50; }
          .status-warning { color: #ff9800; }
          .status-critical { color: #f44336; }
          .badge { padding: 8px 15px; border-radius: 20px; font-weight: bold; display: inline-block; }
          .badge-healthy { background: #e8f5e9; color: #2e7d32; }
          .badge-warning { background: #fff3cd; color: #856404; }
          .badge-critical { background: #f8d7da; color: #721c24; }
          h1 { color: #1e5a3e; }
          .info { background: #f0f9f4; padding: 15px; border-left: 4px solid #4caf50; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔍 Estado del Sistema de Emails</h1>

          <div class="info">
            <h2>Estado Actual</h2>
            <p><strong>Status:</strong> <span class="badge badge-${estado.status}">${estado.status.toUpperCase()}</span></p>
            <p>${estado.message}</p>
          </div>

          ${estado.ultimaPrueba ? `
            <h3>Última Prueba</h3>
            <ul>
              <li><strong>Fecha:</strong> ${estado.ultimaPrueba[1]} ${estado.ultimaPrueba[2]}</li>
              <li><strong>Email Test:</strong> ${estado.ultimaPrueba[4]}</li>
              <li><strong>Folder Test:</strong> ${estado.ultimaPrueba[5]}</li>
              <li><strong>Sheet Test:</strong> ${estado.ultimaPrueba[6]}</li>
              <li><strong>Resultado:</strong> ${estado.ultimaPrueba[7]}</li>
            </ul>
          ` : ''}

          <h3>Estadísticas (Últimas ${estado.totalPruebas || 0} pruebas)</h3>
          <ul>
            <li><strong>Exitosas:</strong> ${estado.exitosas || 0}</li>
            <li><strong>Fallidas:</strong> ${estado.fallidas || 0}</li>
          </ul>

          <p style="margin-top: 30px; font-size: 12px; color: #999;">
            Actualizado: ${new Date().toLocaleString('es-MX')}<br>
            Sistema v7.0
          </p>
        </div>
      </body>
      </html>
    `;

    return HtmlService.createHtmlOutput(html);
  }

  // Por defecto, mostrar mensaje de servicio activo
  return ContentService.createTextOutput("Servicio Activo v7.0 - Sistema Robusto con Monitoreo");
}
