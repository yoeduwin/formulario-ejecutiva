# ⚡ Comandos Rápidos - Sistema de Pruebas

## 🚀 Configuración Inicial (Una sola vez)

```javascript
// 1. Configurar pruebas cada 6 horas (RECOMENDADO)
configurarPruebasAutomaticas('cada_6_horas');

// 2. O dos veces al día (9 AM y 6 PM)
configurarPruebasAutomaticas('dos_veces_dia');

// 3. O diariamente a las 9 AM
configurarPruebasAutomaticas('diario');
```

---

## 🧪 Ejecutar Pruebas

```javascript
// Prueba manual única
ejecutarPruebaManual();

// Prueba automática (la que corre el trigger)
ejecutarPruebaAutomatica();
```

---

## 📊 Ver Estado del Sistema

```javascript
// En código
obtenerEstadoSistema();

// En navegador (reemplaza TU_SCRIPT_ID)
https://script.google.com/macros/s/TU_SCRIPT_ID/exec?action=status
```

---

## 🔧 Desactivar Pruebas Automáticas

```javascript
configurarPruebasAutomaticas('ninguno');
```

---

## 📋 Opciones de Frecuencia

| Comando | Frecuencia | Uso Recomendado |
|---------|------------|-----------------|
| `'cada_hora'` | Cada 1 hora | Solo debugging |
| `'cada_6_horas'` | Cada 6 horas | ⭐ **Producción** |
| `'diario'` | 1 vez/día (9 AM) | Bajo volumen |
| `'dos_veces_dia'` | 9 AM y 6 PM | ⭐ **Recomendado** |
| `'ninguno'` | Desactivado | Desactivar |

---

## 📧 Configurar Emails

Edita en `Pruebas.gs`:

```javascript
const TEST_CONFIG = {
  TEST_EMAIL: 'sistemas@ejecutivambiental.com',  // ← Email para pruebas
  ALERT_EMAIL: 'direccion.general@ejecutivambiental.com',  // ← Email para alertas
  MAX_FAILURES_ALERT: 2  // ← Fallos antes de alertar
};
```

---

## 🐛 Debugging

```javascript
// Ver logs de última ejecución
Logger.log(obtenerEstadoSistema());

// Ver historial completo
// Ve al Sheet: "Pruebas_Sistema"

// Ver ejecuciones pasadas
// Google Apps Script → Icono de reloj → Ejecuciones
```

---

## 📍 Locations Importantes

| Recurso | Ubicación |
|---------|-----------|
| **Código de pruebas** | Google Apps Script → Archivo `Pruebas.gs` |
| **Triggers** | Google Apps Script → Icono ⏰ |
| **Historial de pruebas** | Google Sheets → Sheet "Pruebas_Sistema" |
| **Dashboard web** | URL del script + `?action=status` |
| **Logs de ejecución** | Google Apps Script → Ver → Registros |

---

## ✅ Checklist de Configuración

- [ ] Código `Pruebas.gs` agregado al proyecto
- [ ] Emails configurados en `TEST_CONFIG`
- [ ] Ejecutado `configurarPruebasAutomaticas()`
- [ ] Volver a desplegar la implementación
- [ ] Ejecutar `ejecutarPruebaManual()` para probar
- [ ] Verificar que llegó email de prueba
- [ ] Verificar Sheet "Pruebas_Sistema" creado
- [ ] Guardar URL del dashboard como marcador

---

## 🆘 Solución Rápida de Problemas

| Problema | Solución Rápida |
|----------|----------------|
| No se ejecutan automáticamente | Verifica triggers (⏰) |
| Pruebas fallan | Revisa cuota de Gmail (100/día) |
| No recibo alertas | Verifica `ALERT_EMAIL` y SPAM |
| Dashboard no carga | Vuelve a desplegar como "Web app" |
| Permisos insuficientes | Ejecuta manualmente para autorizar |

---

## 📊 Interpretar Resultados

```
✓ PASS   = Prueba exitosa
✗ FAIL   = Prueba falló (revisa detalles)
ERROR    = Error crítico (revisa logs)

🟢 Verde  = Todo OK
🟡 Amarillo = Algunos fallos
🔴 Rojo    = Error crítico
```

---

## 🔄 Flujo Típico

```
1. Configurar → configurarPruebasAutomaticas('cada_6_horas')
2. Probar → ejecutarPruebaManual()
3. Verificar → Revisar email y Sheet "Pruebas_Sistema"
4. Monitorear → Guardar dashboard URL
5. Olvidarte → El sistema se auto-monitorea 😊
```

---

## 📞 Comando de Emergencia

Si necesitas desactivar TODO inmediatamente:

```javascript
configurarPruebasAutomaticas('ninguno');
```

---

**Tip:** Guarda esta página como marcador para acceso rápido 🔖
