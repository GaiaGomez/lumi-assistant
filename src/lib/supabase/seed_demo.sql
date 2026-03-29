-- ============================================================
-- SEED DEMO — datos de prueba para Lumi
-- ============================================================
-- Cómo usar:
--   1. Abre el SQL Editor de tu proyecto en Supabase
--   2. Cambia 'lu@tudominio.com' por el email real de Lu (línea marcada)
--   3. Ejecuta el script completo
--
-- Para resetear los datos demo:
--   Simplemente vuelve a ejecutar este mismo script.
--   Borra los pacientes demo y los re-siembra desde cero.
--
-- Seguridad:
--   Solo afecta al usuario con el email que especifiques.
--   Solo borra pacientes con los apellidos demo listados.
--   Nunca toca datos de otros usuarios ni pacientes reales.
-- ============================================================

DO $$
DECLARE
  v_user_id  uuid;

  -- IDs de pacientes (se generan frescos en cada ejecución)
  p_scarlett  uuid := gen_random_uuid();
  p_ryan      uuid := gen_random_uuid();
  p_emma      uuid := gen_random_uuid();
  p_chris     uuid := gen_random_uuid();
  p_margot    uuid := gen_random_uuid();
  p_keanu     uuid := gen_random_uuid();
  p_jennifer  uuid := gen_random_uuid();
  p_brad      uuid := gen_random_uuid();
  p_zendaya   uuid := gen_random_uuid();
  p_leo       uuid := gen_random_uuid();

BEGIN

  -- ── PASO 1: buscar usuario ─────────────────────────────────
  -- ⚠️  CAMBIA ESTE EMAIL por el email real de Lu
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'lu@tudominio.com'  -- <── CAMBIAR AQUÍ
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'Usuario no encontrado. Cambia el email en la línea marcada con CAMBIAR AQUÍ.';
  END IF;

  -- ── PASO 2: limpiar datos demo anteriores ──────────────────
  -- Solo borra pacientes con los apellidos de la demo y sus citas asociadas
  DELETE FROM appointments
  WHERE user_id = v_user_id
    AND patient_id IN (
      SELECT id FROM patients
      WHERE user_id = v_user_id
        AND apellido IN (
          'Johansson','Reynolds','Stone','Evans','Robbie',
          'Reeves','Lawrence','Pitt','Coleman','DiCaprio'
        )
    );

  DELETE FROM patients
  WHERE user_id = v_user_id
    AND apellido IN (
      'Johansson','Reynolds','Stone','Evans','Robbie',
      'Reeves','Lawrence','Pitt','Coleman','DiCaprio'
    );

  -- ── PASO 3: insertar pacientes demo ───────────────────────
  INSERT INTO patients
    (id, user_id, nombre, apellido, whatsapp, email, fecha_inicio, notas_generales)
  VALUES
    (p_scarlett, v_user_id, 'Scarlett',  'Johansson', '573001000001', 'scarlett@demo.com', '2025-08-15',
      'Proceso enfocado en regulación emocional. Muy comprometida con el proceso. Prefiere sesiones online por horarios.'),
    (p_ryan,     v_user_id, 'Ryan',      'Reynolds',  '573001000002', 'ryan@demo.com',     '2025-09-03',
      'Ansiedad laboral crónica. Usa el humor como mecanismo de defensa. Trabajar desde ese lugar con cuidado.'),
    (p_emma,     v_user_id, 'Emma',      'Stone',     '573001000003', 'emma@demo.com',     '2025-10-01',
      'Duelo reciente por separación. Proceso lento pero constante. Muy reflexiva.'),
    (p_chris,    v_user_id, 'Chris',     'Evans',     '573001000004', 'chris@demo.com',    '2026-01-10',
      'En proceso de inicio. Exploración de patrones de autoexigencia y perfeccionismo.'),
    (p_margot,   v_user_id, 'Margot',    'Robbie',    '573001000005', 'margot@demo.com',   '2025-07-22',
      'Sesiones de retiro una vez al mes. Muy buena respuesta al trabajo somático y de presencia.'),
    (p_keanu,    v_user_id, 'Keanu',     'Reeves',    '573001000006', 'keanu@demo.com',    '2025-11-05',
      'Proceso de duelo prolongado. Sesiones cada dos semanas. Ritmo pausado, necesario.'),
    (p_jennifer, v_user_id, 'Jennifer',  'Lawrence',  '573001000007', 'jennifer@demo.com', '2026-02-03',
      'Ansiedad social y dificultad para sostener compromisos. Faltó a la última sesión sin avisar.'),
    (p_brad,     v_user_id, 'Brad',      'Pitt',      '573001000008', 'brad@demo.com',     '2025-06-01',
      'Proceso largo y profundo. Buena adherencia general. Tiene 2 sesiones con pago pendiente.'),
    (p_zendaya,  v_user_id, 'Zendaya',   'Coleman',   '573001000009', 'zendaya@demo.com',  '2026-01-20',
      'Joven, muy reflexiva y motivada. Online exclusivamente por agenda apretada.'),
    (p_leo,      v_user_id, 'Leonardo',  'DiCaprio',  '573001000010', 'leo@demo.com',      '2025-05-12',
      'Proceso intermitente. Difícil de contactar entre sesiones. Pago siempre al día, eso sí.');

  -- ── PASO 4: citas pasadas (semana 23–27 mar 2026) ─────────
  -- Las fechas son pasadas → permiten probar estados reales: asistio, cancelo, no_asistio

  -- Lunes 23 mar — dos citas, mañana
  INSERT INTO appointments
    (patient_id, user_id, fecha_inicio, fecha_fin, modalidad, estado_sesion, estado_pago)
  VALUES
    (p_scarlett, v_user_id,
      '2026-03-23 09:00:00-05', '2026-03-23 10:00:00-05',
      'online', 'asistio', 'pagado'),
    (p_ryan, v_user_id,
      '2026-03-23 11:00:00-05', '2026-03-23 12:00:00-05',
      'medellin', 'asistio', 'pendiente');  -- pago pendiente de 1 sesión

  -- Martes 24 mar — una asistió, una canceló
  INSERT INTO appointments
    (patient_id, user_id, fecha_inicio, fecha_fin, modalidad, estado_sesion, estado_pago)
  VALUES
    (p_emma, v_user_id,
      '2026-03-24 10:00:00-05', '2026-03-24 11:00:00-05',
      'online', 'asistio', 'pagado'),
    (p_chris, v_user_id,
      '2026-03-24 15:00:00-05', '2026-03-24 16:00:00-05',
      'medellin', 'cancelo', 'pendiente');  -- canceló y pago en el aire

  -- Miércoles 25 mar — sesión de retiro
  INSERT INTO appointments
    (patient_id, user_id, fecha_inicio, fecha_fin, modalidad, estado_sesion, estado_pago, notas)
  VALUES
    (p_margot, v_user_id,
      '2026-03-25 09:00:00-05', '2026-03-25 10:00:00-05',
      'retiro', 'asistio', 'pagado',
      'Sesión de cierre de ciclo. Trabajo somático y narrativo. Excelente proceso.');

  -- Jueves 26 mar — una asistió, una no se presentó
  INSERT INTO appointments
    (patient_id, user_id, fecha_inicio, fecha_fin, modalidad, estado_sesion, estado_pago)
  VALUES
    (p_keanu, v_user_id,
      '2026-03-26 11:00:00-05', '2026-03-26 12:00:00-05',
      'online', 'asistio', 'pendiente'),
    (p_jennifer, v_user_id,
      '2026-03-26 17:00:00-05', '2026-03-26 18:00:00-05',
      'online', 'no_asistio', 'pendiente');  -- no avisó, pago en el aire

  -- Viernes 27 mar — tres citas, tarde mezclada
  INSERT INTO appointments
    (patient_id, user_id, fecha_inicio, fecha_fin, modalidad, estado_sesion, estado_pago)
  VALUES
    (p_brad, v_user_id,
      '2026-03-27 09:00:00-05', '2026-03-27 10:00:00-05',
      'medellin', 'asistio', 'pagado'),
    (p_zendaya, v_user_id,
      '2026-03-27 11:00:00-05', '2026-03-27 12:00:00-05',
      'online', 'asistio', 'pagado'),
    (p_leo, v_user_id,
      '2026-03-27 16:00:00-05', '2026-03-27 17:00:00-05',
      'medellin', 'asistio', 'pendiente');  -- asistió pero aún no paga

  -- ── PASO 5: citas próximas ──────────────────────────────────

  -- Lunes 30 mar — día cargado (5 citas)
  INSERT INTO appointments
    (patient_id, user_id, fecha_inicio, fecha_fin, modalidad, estado_sesion, estado_pago)
  VALUES
    (p_scarlett, v_user_id,
      '2026-03-30 09:00:00-05', '2026-03-30 10:00:00-05',
      'online', 'pendiente', 'pendiente'),
    (p_ryan, v_user_id,
      '2026-03-30 11:00:00-05', '2026-03-30 12:00:00-05',
      'medellin', 'pendiente', 'pendiente'),
    (p_emma, v_user_id,
      '2026-03-30 12:00:00-05', '2026-03-30 13:00:00-05',
      'online', 'pendiente', 'pendiente'),
    (p_chris, v_user_id,
      '2026-03-30 16:00:00-05', '2026-03-30 17:00:00-05',
      'medellin', 'pendiente', 'pendiente'),
    (p_margot, v_user_id,
      '2026-03-30 18:00:00-05', '2026-03-30 19:00:00-05',
      'online', 'pendiente', 'pendiente');

  -- Miércoles 1 abr — día suave (2 citas online seguidas)
  INSERT INTO appointments
    (patient_id, user_id, fecha_inicio, fecha_fin, modalidad, estado_sesion, estado_pago)
  VALUES
    (p_keanu, v_user_id,
      '2026-04-01 10:00:00-05', '2026-04-01 11:00:00-05',
      'online', 'pendiente', 'pendiente'),
    (p_jennifer, v_user_id,
      '2026-04-01 14:00:00-05', '2026-04-01 15:00:00-05',
      'online', 'pendiente', 'pendiente');

  -- Viernes 3 abr — tres modalidades distintas en el mismo día
  INSERT INTO appointments
    (patient_id, user_id, fecha_inicio, fecha_fin, modalidad, estado_sesion, estado_pago, notas)
  VALUES
    (p_brad, v_user_id,
      '2026-04-03 09:00:00-05', '2026-04-03 10:00:00-05',
      'medellin', 'pendiente', 'pendiente', null),
    (p_zendaya, v_user_id,
      '2026-04-03 11:00:00-05', '2026-04-03 12:00:00-05',
      'online', 'pendiente', 'pendiente', null),
    (p_leo, v_user_id,
      '2026-04-03 15:00:00-05', '2026-04-03 16:00:00-05',
      'retiro', 'pendiente', 'pendiente',
      'Primera vez en modalidad retiro. Confirmar con anticipación.');

  -- Semana 6–10 abr
  INSERT INTO appointments
    (patient_id, user_id, fecha_inicio, fecha_fin, modalidad, estado_sesion, estado_pago)
  VALUES
    (p_scarlett, v_user_id,
      '2026-04-06 09:00:00-05', '2026-04-06 10:00:00-05',
      'online', 'pendiente', 'pendiente'),
    (p_emma, v_user_id,
      '2026-04-08 11:00:00-05', '2026-04-08 12:00:00-05',
      'online', 'pendiente', 'pendiente'),
    (p_ryan, v_user_id,
      '2026-04-08 15:00:00-05', '2026-04-08 16:00:00-05',
      'medellin', 'pendiente', 'pendiente'),
    (p_chris, v_user_id,
      '2026-04-10 10:00:00-05', '2026-04-10 11:00:00-05',
      'medellin', 'pendiente', 'pendiente'),
    (p_margot, v_user_id,
      '2026-04-10 14:00:00-05', '2026-04-10 15:00:00-05',
      'retiro', 'pendiente', 'pendiente');

  RAISE NOTICE 'Demo sembrada correctamente para usuario %', v_user_id;

END $$;
