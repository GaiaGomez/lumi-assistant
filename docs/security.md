# Seguridad y backups — Lumi

## Estado actual

Lumi usa Supabase como backend. Las siguientes medidas están implementadas:

- **RLS activo** en todas las tablas clínicas: `patients`, `patient_clinical_profiles`, `appointments`, `session_notes`, `settings`, `consultorios`.
- Cada usuario solo accede a sus propios datos (scoped por `user_id` / `psychologist_id` = `auth.uid()`).
- **Notas firmadas bloqueadas**: `session_notes` con `status = 'signed'` no pueden editarse ni eliminarse (bloqueado en RLS + en la server action).
- **Storage privado**: el bucket `canvas-notes` es privado; los archivos solo son accesibles por el usuario dueño vía signed URLs temporales.
- **No se usa `service_role`** en ningún cliente del navegador.
- **No hay `console.log`** con datos clínicos en el código fuente.

---

## Backups — ACCIÓN REQUERIDA

### Verificar que los backups están habilitados en Supabase

Los datos clínicos requieren backup regular. Supabase ofrece Point-in-Time Recovery (PITR) en planes de pago.

**Pasos a verificar antes de usar en producción real:**

1. Ir a Supabase Dashboard → Settings → Backups.
2. Confirmar que los backups automáticos están activos.
3. Si estás en plan Free: los backups son limitados. Considera actualizar al plan Pro para PITR completo.
4. **Hacer un restore de prueba** antes de confiar en los backups. Un backup no verificado no es un backup real.
5. Exportar una historia clínica en PDF y verificar que los datos son correctos.

### Exportaciones manuales

- La función "Exportar PDF" en Lumi genera un documento por paciente con las notas firmadas.
- No reemplaza un backup completo de la base de datos.
- Úsala para entregas formales, no como estrategia de backup.

---

## No usar en producción real sin validar

Antes de atender pacientes reales con Lumi, verificar:

- [ ] Backups automáticos habilitados y probados con restore.
- [ ] Dominio propio con HTTPS.
- [ ] Variables de entorno en producción (no en `.env.local`).
- [ ] El usuario demo (si existe) NO tiene acceso a datos reales.
- [ ] Se revisó la política de privacidad y cumplimiento de Ley de Habeas Data (Colombia) o RGPD según aplique.
- [ ] Los consentimientos informados y autorizaciones de datos están firmados para cada paciente.

---

## Variables sensibles

Las siguientes variables deben estar configuradas en el entorno de producción y NO en el repositorio:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
DEMO_EMAIL          # solo si se usa acceso demo
DEMO_PASSWORD       # solo si se usa acceso demo
```

El archivo `.env.local` está en `.gitignore` y nunca debe comitearse.

---

## Archivos clínicos en Storage

- El bucket `canvas-notes` es privado.
- Si en el futuro se agrega almacenamiento de consentimientos (`consent_file_path`), crear un bucket separado privado y aplicar políticas RLS equivalentes.
- **Nunca configurar un bucket clínico como público.**
