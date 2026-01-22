# 🧪 Guía de Pruebas Periódicas Automáticas

## 📋 Índice

1. [¿Qué son las pruebas periódicas?](#qué-son-las-pruebas-periódicas)
2. [Instalación del sistema de pruebas](#instalación)
3. [Configuración de pruebas automáticas](#configuración)
4. [Pruebas manuales](#pruebas-manuales)
5. [Monitoreo y alertas](#monitoreo)
6. [Dashboard de estado](#dashboard)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 ¿Qué son las pruebas periódicas?

Las pruebas periódicas son un sistema automático que:

- ✅ **Verifica** que el envío de emails funcione correctamente
- ✅ **Prueba** la creación de carpetas en Drive
- ✅ **Valida** el registro en Google Sheets
- ✅ **Alerta** si detecta fallos consecutivos
- ✅ **Registra** todas las pruebas en un Sheet de control

**Beneficio:** Detectas problemas ANTES de que un cliente real intente usar el formulario.

---

## 🚀 Instalación

### Paso 1: Agregar el código de pruebas

1. Ve a tu Google Apps Script (donde está el código v7.0)
2. Haz clic en el **+** junto a "Archivos" para crear un nuevo archivo
3. Nómbralo: `Pruebas.gs`
4. **Copia y pega TODO el contenido** de `Code_Pruebas.gs`
5. Guarda (Ctrl+S)

### Paso 2: Configurar emails de prueba

En el archivo `Pruebas.gs`, encuentra esta sección al inicio:

```javascript
const TEST_CONFIG = {
  SHEET_NAME_TESTS: 'Pruebas_Sistema',
  TEST_EMAIL: 'sistemas@ejecutivambiental.com',  // ⚠️ CAMBIAR ESTE EMAIL
  ALERT_EMAIL: 'direccion.general@ejecutivambiental.com',  // ⚠️ Y ESTE
  MAX_FAILURES_ALERT: 2
};
```

**Modifica:**
- `TEST_EMAIL`: Email que recibirá los correos de prueba
- `ALERT_EMAIL`: Email que recibirá las alertas de fallos
- `MAX_FAILURES_ALERT`: Número de fallos consecutivos antes de alertar (default: 2)

### Paso 3: Guardar y desplegar

1. Guarda todos los cambios
2. Ve a **Implementar** → **Gestionar implementaciones**
3. Edita la implementación activa y selecciona **"Nueva versión"**
4. Implementar

---

## ⚙️ Configuración de Pruebas Automáticas

### Opción 1: Configuración Rápida (Recomendada)

Ejecuta esta función para configurar pruebas automáticas:

1. En el editor de Google Apps Script
2. Selecciona la función `configurarPruebasAutomaticas` en el menú desplegable
3. Haz clic en ▶️ Ejecutar
4. Cuando te pida frecuencia, edita el código temporalmente:

```javascript
// En la consola de debug, ejecuta:
configurarPruebasAutomaticas('cada_6_horas');
```

**Frecuencias disponibles:**
- `'cada_hora'` - Cada hora (intensivo, solo para debugging)
- `'cada_6_horas'` - Cada 6 horas ⭐ **RECOMENDADO**
- `'diario'` - Una vez al día a las 9 AM
- `'dos_veces_dia'` - 9 AM y 6 PM ⭐ **RECOMENDADO**
- `'ninguno'` - Desactiva pruebas automáticas

### Opción 2: Configuración Manual (Triggers)

Si prefieres configurarlo manualmente:

1. En el editor, haz clic en el **icono del reloj** ⏰ (Activadores/Triggers)
2. Haz clic en **+ Agregar activador**
3. Configura:
   - **Función a ejecutar:** `ejecutarPruebaAutomatica`
   - **Tipo de activador:** Basado en tiempo
   - **Tipo de activador de hora:** Temporizador de días
   - **Intervalo:** Cada 6 horas (o lo que prefieras)
4. Guardar

### Configuración Recomendada para Producción

```
Frecuencia: Cada 6 horas
Horarios: 00:00, 06:00, 12:00, 18:00
Alerta después de: 2 fallos consecutivos
```

Esta configuración:
- ✅ Detecta problemas rápidamente
- ✅ No consume mucha cuota de Gmail
- ✅ Cubre todas las franjas horarias críticas

---

## 🔧 Pruebas Manuales

### Ejecutar prueba única

Puedes ejecutar una prueba manual en cualquier momento:

1. En el editor de Google Apps Script
2. Selecciona la función `ejecutarPruebaManual`
3. Haz clic en ▶️ Ejecutar
4. Revisa los logs (Ver → Registros)

Recibirás un **email con el resultado** de la prueba.

### Desde la interfaz web

También puedes ejecutar pruebas desde tu navegador (después de configurar):

```
https://script.google.com/macros/s/TU_SCRIPT_ID/exec?action=test
```

---

## 📊 Monitoreo y Alertas

### Sheet de Pruebas

El sistema crea automáticamente un sheet llamado **"Pruebas_Sistema"** con:

| Columna | Descripción |
|---------|-------------|
| Test ID | Identificador único de la prueba |
| Fecha | Fecha de ejecución |
| Hora | Hora de ejecución |
| Duración | Tiempo que tardó en segundos |
| Email Test | ✓ PASS o ✗ FAIL |
| Folder Test | ✓ PASS o ✗ FAIL |
| Sheet Test | ✓ PASS o ✗ FAIL |
| Resultado | PASS, FAIL o ERROR |
| Detalles | JSON con errores si los hay |

**Colores:**
- 🟢 Verde claro = Todo OK (PASS)
- 🟡 Amarillo = Algunos fallos (FAIL)
- 🔴 Rojo claro = Error crítico (ERROR)

### Alertas Automáticas

El sistema envía alertas por email cuando:

1. **Fallos consecutivos:** Si hay 2+ pruebas fallidas seguidas
   - Subject: 🚨 ALERTA: X Fallos Consecutivos
   - Destinatario: `ALERT_EMAIL`

2. **Error crítico:** Si la prueba no puede ejecutarse
   - Subject: 🔥 ERROR CRÍTICO en Prueba del Sistema
   - Destinatario: `ALERT_EMAIL`

### Tipos de alertas

**Alerta de Fallos Consecutivos:**
```
🚨 ALERTA: 2 Fallos Consecutivos en Sistema de Emails

Se han detectado 2 pruebas fallidas consecutivas.

Esto puede indicar:
- Problemas con la API de Gmail (cuota excedida)
- Problemas de conectividad
- Errores en el código

ACCIÓN REQUERIDA:
1. Revisar el Sheet "Pruebas_Sistema"
2. Verificar los logs en Google Apps Script
3. Revisar la cuota de Gmail API
```

---

## 📈 Dashboard de Estado

### Ver estado en tiempo real

Puedes ver el estado del sistema en tu navegador visitando:

```
https://script.google.com/macros/s/TU_SCRIPT_ID/exec?action=status
```

Esto mostrará:
- ✅ Estado actual del sistema (Healthy/Warning/Critical)
- 📊 Resultados de la última prueba
- 📈 Estadísticas de las últimas 5 pruebas
- ⏰ Timestamp de actualización

### Ejemplo de dashboard:

```
🔍 Estado del Sistema de Emails

Estado Actual
Status: HEALTHY
Sistema operando normalmente (100% éxito)

Última Prueba
• Fecha: 22/01/2025 10:30:00
• Email Test: ✓ PASS
• Folder Test: ✓ PASS
• Sheet Test: ✓ PASS
• Resultado: PASS

Estadísticas (Últimas 5 pruebas)
• Exitosas: 5
• Fallidas: 0
```

### Agregar al bookmark

Guarda la URL del dashboard como marcador en tu navegador para acceso rápido.

---

## 🧪 ¿Qué prueba cada test?

### 1. Email Test
- Envía un email de prueba a `TEST_EMAIL`
- Intenta 3 veces si falla
- Espera 2 segundos entre reintentos
- **Resultado:** PASS si al menos 1 intento funciona

### 2. Folder Test
- Crea una carpeta temporal en Drive
- Crea un archivo de prueba dentro
- Verifica que se creó correctamente
- **Nota:** Las carpetas de prueba quedan guardadas (puedes eliminarlas manualmente)

### 3. Sheet Test
- Escribe una fila de prueba en el Sheet de Registros
- Verifica que se escribió correctamente
- La fila dice "TEST_CLIENTE" para identificarla fácilmente
- **Nota:** Puedes eliminar estas filas manualmente si quieres

---

## 🛠️ Troubleshooting

### Problema: No se ejecutan las pruebas automáticas

**Solución:**
1. Verifica que configuraste el trigger correctamente
2. Ve a ⏰ Activadores y confirma que existe `ejecutarPruebaAutomatica`
3. Revisa los logs en "Ejecuciones" para ver errores

### Problema: Las pruebas fallan constantemente

**Causas comunes:**

1. **Cuota de Gmail excedida**
   - Límite: 100 emails/día (cuenta gratuita)
   - Solución: Reducir frecuencia o actualizar a Google Workspace

2. **Permisos insuficientes**
   - El script necesita permisos de Gmail, Drive y Sheets
   - Vuelve a ejecutar manualmente para autorizar

3. **Sheet o Folder ID incorrecto**
   - Verifica que `CONFIG.SPREADSHEET_ID` y `CONFIG.FOLDER_ID` sean correctos

### Problema: No recibo alertas

**Solución:**
1. Verifica que `TEST_CONFIG.ALERT_EMAIL` sea correcto
2. Revisa la carpeta de SPAM
3. Verifica que hay al menos 2 fallos consecutivos (configurado en `MAX_FAILURES_ALERT`)

### Problema: El dashboard no carga

**Solución:**
1. Verifica que volviste a desplegar después de agregar el código
2. La URL correcta debe terminar en `/exec?action=status`
3. El script necesita estar desplegado como "Web app" con acceso "Cualquier usuario"

---

## 📊 Métricas Recomendadas

Para un sistema saludable:

- ✅ **Tasa de éxito:** > 95%
- ✅ **Duración promedio:** < 5 segundos
- ✅ **Fallos consecutivos:** 0
- ⚠️ **Revisar si:** Tasa de éxito < 80%
- 🚨 **Alerta crítica si:** Tasa de éxito < 50%

---

## 🔄 Mantenimiento

### Limpieza periódica

Cada mes, considera:

1. **Eliminar carpetas de prueba antiguas** en Drive
2. **Archivar** pruebas antiguas del Sheet (mover a otro sheet)
3. **Revisar** logs de errores y resolver problemas recurrentes

### Backup del Sheet de Pruebas

El Sheet `Pruebas_Sistema` es valioso para análisis. Considera:
- Hacer backup mensual
- Exportar a BigQuery para análisis avanzado
- Crear gráficas en Data Studio

---

## 📞 Resumen de Configuración Rápida

Para configurar en 5 minutos:

```javascript
// 1. Agregar archivo Pruebas.gs con el código

// 2. Configurar emails
TEST_EMAIL: 'tu-email@ejecutivambiental.com'
ALERT_EMAIL: 'alertas@ejecutivambiental.com'

// 3. Ejecutar en consola:
configurarPruebasAutomaticas('cada_6_horas');

// 4. Volver a desplegar

// 5. Ejecutar prueba manual:
ejecutarPruebaManual();

// 6. Verificar email y Sheet "Pruebas_Sistema"
```

✅ ¡Listo! El sistema ahora se auto-monitorea.

---

## 📱 Integración con Slack/Teams (Opcional)

Si quieres recibir notificaciones en Slack o Teams en lugar de email, puedes modificar las funciones de alerta para usar webhooks. Documentación disponible bajo pedido.

---

**Última actualización:** 2025-01-22
**Versión:** 7.0
**Soporte:** Claude Code Assistant
