-- ============================================================
-- SEED DEMO — datos de ejemplo para Lumi
-- ============================================================
-- Cómo usar:
--   1. Crea primero el usuario demo en Supabase Auth.
--   2. Email esperado: demo@lumiassistant.com
--   3. Abre el SQL Editor de tu proyecto en Supabase.
--   4. Ejecuta este script completo.
--
-- Para resetear: simplemente vuelve a ejecutar.
-- Las fechas son relativas a CURRENT_DATE — siempre generan datos relevantes.
--
-- Requisitos previos:
--   • schema.sql ejecutado
--   • migration_session_notes.sql ejecutado
--   • migration_session_notes_multi.sql ejecutado
--   • migration_add_patient_clinical_profiles.sql ejecutado
--
-- Tablas que toca:
--   patients
--   appointments
--   consultorios
--   patient_clinical_profiles
--   session_notes
--   settings
-- ============================================================

DO $$
DECLARE
  v_user_id uuid;

  -- Pacientes
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

  -- Consultorios
  c_online    uuid := gen_random_uuid();
  c_medellin  uuid := gen_random_uuid();
  c_retiro    uuid := gen_random_uuid();

  -- Citas con nota clínica
  apt_scarlett_last_mon uuid := gen_random_uuid();
  apt_ryan_last_tue     uuid := gen_random_uuid();
  apt_emma_last_wed     uuid := gen_random_uuid();
  apt_keanu_last_thu    uuid := gen_random_uuid();

  -- Anclas de semanas
  w_prev1  date;   -- semana pasada
  w_curr   date;   -- semana actual
  w_next1  date;   -- próxima semana
  w_next2  date;   -- en 2 semanas

BEGIN
  -- Calcular anclas
  w_prev1 := (date_trunc('week', CURRENT_DATE))::date - 7;
  w_curr  := (date_trunc('week', CURRENT_DATE))::date;
  w_next1 := (date_trunc('week', CURRENT_DATE))::date + 7;
  w_next2 := (date_trunc('week', CURRENT_DATE))::date + 14;

  -- ── PASO 1: buscar usuario demo ────────────────────────────
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'demo@lumiassistant.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario demo no encontrado. Crea primero demo@lumiassistant.com en Supabase Auth.';
  END IF;

  -- ── PASO 2: limpiar datos demo anteriores ──────────────────

  DELETE FROM session_notes
  WHERE psychologist_id = v_user_id
    AND patient_id IN (
      SELECT id FROM patients
      WHERE user_id = v_user_id
        AND apellido IN (
          'Johansson','Reynolds','Stone','Evans','Robbie',
          'Reeves','Lawrence','Pitt','Coleman','DiCaprio'
        )
    );

  DELETE FROM patient_clinical_profiles
  WHERE psychologist_id = v_user_id
    AND patient_id IN (
      SELECT id FROM patients
      WHERE user_id = v_user_id
        AND apellido IN (
          'Johansson','Reynolds','Stone','Evans','Robbie',
          'Reeves','Lawrence','Pitt','Coleman','DiCaprio'
        )
    );

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

  DELETE FROM appointments
  WHERE user_id = v_user_id
    AND event_type = 'general'
    AND title = 'Supervisión clínica';

  DELETE FROM patients
  WHERE user_id = v_user_id
    AND apellido IN (
      'Johansson','Reynolds','Stone','Evans','Robbie',
      'Reeves','Lawrence','Pitt','Coleman','DiCaprio'
    );

  DELETE FROM consultorios
  WHERE user_id = v_user_id
    AND legacy_key IN ('online', 'medellin', 'retiro');

  -- ── PASO 3: settings ───────────────────────────────────────
  INSERT INTO settings (user_id, key, value) VALUES
    (v_user_id, 'perfil_nombre_mostrado',    'Lucía'),
    (v_user_id, 'perfil_nombre_consultorio', 'Consultorio Lucía Martínez'),
    (v_user_id, 'booking_url',               'https://cal.com/demo-lumiapp'),
    (v_user_id, 'agenda_hora_inicio',        '08:00'),
    (v_user_id, 'agenda_hora_fin',           '20:00'),
    (v_user_id, 'agenda_duracion_cita',      '60'),
    (v_user_id, 'agenda_intervalo',          '30'),
    (v_user_id, 'pacientes_dias_reactivar',  '45'),
    (v_user_id, 'recordatorio_firma',
      'Lucía Martínez' || chr(10) || 'Psicóloga Clínica | TP 12345' || chr(10) || 'Medellín, Colombia'),
    (v_user_id, 'template_cobros',
      'Hola, {first_name}. Te escribo para recordarte que la sesión del {session_date} tiene el pago pendiente. Cuando puedas me confirmas. ¡Gracias!'),
    (v_user_id, 'template_sin_proxima',
      'Hola, {first_name}. ¿Cómo vas? Quedamos sin fecha para nuestra próxima sesión. Aquí te dejo el enlace para agendar cuando quieras: {booking_url}'),
    (v_user_id, 'template_retomar',
      'Hola, {first_name}. Han pasado {days_inactive} días desde nuestra última sesión y quería saber cómo estás. ¿Te gustaría retomar el proceso?')
  ON CONFLICT (user_id, key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = NOW();

  -- ── PASO 4: consultorios ───────────────────────────────────
  INSERT INTO consultorios
    (id, user_id, nombre, color, icono, dato_principal_tipo, dato_principal, legacy_key)
  VALUES
    (c_online,   v_user_id, 'Online',   '#8FA5BD', 'monitor', 'enlace',
      'https://meet.google.com/lumi-demo', 'online'),
    (c_medellin, v_user_id, 'Medellín', '#9488B0', 'map-pin', 'direccion',
      'Calle 10 # 43D-28, El Poblado, Medellín', 'medellin'),
    (c_retiro,   v_user_id, 'Retiro',   '#7EA88F', 'leaf',    'nota',
      'Llevar ropa cómoda. Llegar 10 min antes.', 'retiro');

    -- ── PASO 5: pacientes ──────────────────────────────────────
  INSERT INTO patients
    (id, user_id, nombre, apellido, whatsapp, email, fecha_inicio, notas_generales)
  VALUES
    (p_scarlett, v_user_id, 'Scarlett', 'Johansson', '573001000001', 'scarlett@demo.com',
      CURRENT_DATE - 255,
      'Proceso semanal online. Ansiedad laboral y perfeccionismo. Muy comprometida. Prefiere horarios de mañana.'),
    (p_ryan, v_user_id, 'Ryan', 'Reynolds', '573001000002', 'ryan@demo.com',
      CURRENT_DATE - 237,
      'Proceso quincenal presencial. Ansiedad crónica. Usa el humor como defensa. Tiene 1 sesión sin cobrar.'),
    (p_emma, v_user_id, 'Emma', 'Stone', '573001000003', 'emma@demo.com',
      CURRENT_DATE - 209,
      'Proceso semanal. Duelo por separación. Muy reflexiva y comprometida con el proceso.'),
    (p_chris, v_user_id, 'Chris', 'Evans', '573001000004', 'chris@demo.com',
      CURRENT_DATE - 108,
      'Inicio de proceso. Autoexigencia y perfeccionismo. Sesiones mensuales presenciales.'),
    (p_margot, v_user_id, 'Margot', 'Robbie', '573001000005', 'margot@demo.com',
      CURRENT_DATE - 281,
      'Sesiones en retiro, una vez al mes. Excelente respuesta al trabajo somático.'),
    (p_keanu, v_user_id, 'Keanu', 'Reeves', '573001000006', 'keanu@demo.com',
      CURRENT_DATE - 175,
      'Proceso quincenal. Duelo prolongado. Ritmo pausado, necesario. Tiene 1 sesión sin cobrar.'),
    (p_jennifer, v_user_id, 'Jennifer', 'Lawrence', '573001000007', 'jennifer@demo.com',
      CURRENT_DATE - 84,
      'Ansiedad social. Dificultad para mantener compromisos. Canceló en la última semana.'),
    (p_brad, v_user_id, 'Brad', 'Pitt', '573001000008', 'brad@demo.com',
      CURRENT_DATE - 365,
      'Proceso intermitente. Última sesión hace más de 8 semanas. Difícil de contactar entre sesiones.'),
    (p_zendaya, v_user_id, 'Zendaya', 'Coleman', '573001000009', 'zendaya@demo.com',
      CURRENT_DATE - 99,
      'Paciente joven, muy reflexiva. Online exclusivamente. Próxima cita ya confirmada.'),
    (p_leo, v_user_id, 'Leonardo', 'DiCaprio', '573001000010', 'leo@demo.com',
      CURRENT_DATE - 350,
      'Proceso intermitente. Última sesión hace 2 semanas. Sin próxima cita agendada.');

  -- ── PASO 6: citas ──────────────────────────────────────────

  INSERT INTO appointments
    (patient_id, user_id, consultorio_id, fecha_inicio, fecha_fin, modalidad, estado_sesion, estado_pago)
  VALUES
    (p_brad, v_user_id, c_medellin,
      ((CURRENT_DATE - 56)::timestamp + INTERVAL '9 hours') AT TIME ZONE 'America/Bogota',
      ((CURRENT_DATE - 56)::timestamp + INTERVAL '10 hours') AT TIME ZONE 'America/Bogota',
      'medellin', 'realizada', 'pagado'),
    (p_leo, v_user_id, c_medellin,
      ((CURRENT_DATE - 14)::timestamp + INTERVAL '16 hours') AT TIME ZONE 'America/Bogota',
      ((CURRENT_DATE - 14)::timestamp + INTERVAL '17 hours') AT TIME ZONE 'America/Bogota',
      'medellin', 'realizada', 'pagado');

  INSERT INTO appointments
    (id, patient_id, user_id, consultorio_id, fecha_inicio, fecha_fin, modalidad, estado_sesion, estado_pago)
  VALUES
    (apt_scarlett_last_mon, p_scarlett, v_user_id, c_online,
      ((w_prev1 + 0)::timestamp + INTERVAL '9 hours') AT TIME ZONE 'America/Bogota',
      ((w_prev1 + 0)::timestamp + INTERVAL '10 hours') AT TIME ZONE 'America/Bogota',
      'online', 'realizada', 'pagado'),
    (apt_ryan_last_tue, p_ryan, v_user_id, c_medellin,
      ((w_prev1 + 1)::timestamp + INTERVAL '11 hours') AT TIME ZONE 'America/Bogota',
      ((w_prev1 + 1)::timestamp + INTERVAL '12 hours') AT TIME ZONE 'America/Bogota',
      'medellin', 'realizada', 'pendiente'),
    (apt_emma_last_wed, p_emma, v_user_id, c_online,
      ((w_prev1 + 2)::timestamp + INTERVAL '10 hours') AT TIME ZONE 'America/Bogota',
      ((w_prev1 + 2)::timestamp + INTERVAL '11 hours') AT TIME ZONE 'America/Bogota',
      'online', 'realizada', 'pagado'),
    (apt_keanu_last_thu, p_keanu, v_user_id, c_online,
      ((w_prev1 + 3)::timestamp + INTERVAL '15 hours') AT TIME ZONE 'America/Bogota',
      ((w_prev1 + 3)::timestamp + INTERVAL '16 hours') AT TIME ZONE 'America/Bogota',
      'online', 'realizada', 'pendiente'),
    (gen_random_uuid(), p_margot, v_user_id, c_retiro,
      ((w_prev1 + 4)::timestamp + INTERVAL '9 hours') AT TIME ZONE 'America/Bogota',
      ((w_prev1 + 4)::timestamp + INTERVAL '10 hours') AT TIME ZONE 'America/Bogota',
      'retiro', 'realizada', 'pagado'),
    (gen_random_uuid(), p_zendaya, v_user_id, c_online,
      ((w_prev1 + 4)::timestamp + INTERVAL '16 hours') AT TIME ZONE 'America/Bogota',
      ((w_prev1 + 4)::timestamp + INTERVAL '17 hours') AT TIME ZONE 'America/Bogota',
      'online', 'confirmada', 'pagado');

  INSERT INTO appointments
    (patient_id, user_id, consultorio_id, fecha_inicio, fecha_fin, modalidad, estado_sesion, estado_pago)
  VALUES
    (p_scarlett, v_user_id, c_online,
      (CURRENT_DATE::timestamp + INTERVAL '9 hours') AT TIME ZONE 'America/Bogota',
      (CURRENT_DATE::timestamp + INTERVAL '10 hours') AT TIME ZONE 'America/Bogota',
      'online', 'pendiente', 'pendiente'),
    (p_ryan, v_user_id, c_medellin,
      (CURRENT_DATE::timestamp + INTERVAL '11 hours') AT TIME ZONE 'America/Bogota',
      (CURRENT_DATE::timestamp + INTERVAL '12 hours') AT TIME ZONE 'America/Bogota',
      'medellin', 'pendiente', 'pendiente');

  INSERT INTO appointments
    (patient_id, user_id, consultorio_id, fecha_inicio, fecha_fin, modalidad, estado_sesion, estado_pago)
  VALUES
    (p_emma, v_user_id, c_online,
      ((CURRENT_DATE + 1)::timestamp + INTERVAL '10 hours') AT TIME ZONE 'America/Bogota',
      ((CURRENT_DATE + 1)::timestamp + INTERVAL '11 hours') AT TIME ZONE 'America/Bogota',
      'online', 'pendiente', 'pendiente'),
    (p_chris, v_user_id, c_medellin,
      ((CURRENT_DATE + 1)::timestamp + INTERVAL '15 hours') AT TIME ZONE 'America/Bogota',
      ((CURRENT_DATE + 1)::timestamp + INTERVAL '16 hours') AT TIME ZONE 'America/Bogota',
      'medellin', 'pendiente', 'pendiente'),
    (p_keanu, v_user_id, c_online,
      ((CURRENT_DATE + 1)::timestamp + INTERVAL '17 hours') AT TIME ZONE 'America/Bogota',
      ((CURRENT_DATE + 1)::timestamp + INTERVAL '18 hours') AT TIME ZONE 'America/Bogota',
      'online', 'pendiente', 'pendiente');

  INSERT INTO appointments
    (patient_id, user_id, consultorio_id, fecha_inicio, fecha_fin, modalidad, estado_sesion, estado_pago)
  VALUES
    (p_zendaya, v_user_id, c_online,
      ((CURRENT_DATE + 2)::timestamp + INTERVAL '16 hours') AT TIME ZONE 'America/Bogota',
      ((CURRENT_DATE + 2)::timestamp + INTERVAL '17 hours') AT TIME ZONE 'America/Bogota',
      'online', 'confirmada', 'pendiente'),
    (p_jennifer, v_user_id, c_online,
      ((CURRENT_DATE + 3)::timestamp + INTERVAL '14 hours') AT TIME ZONE 'America/Bogota',
      ((CURRENT_DATE + 3)::timestamp + INTERVAL '15 hours') AT TIME ZONE 'America/Bogota',
      'online', 'pendiente', 'pendiente');

  INSERT INTO appointments
    (patient_id, user_id, event_type, title, fecha_inicio, fecha_fin, estado_sesion, estado_pago)
  VALUES
    (NULL, v_user_id, 'general', 'Supervisión clínica',
      ((CURRENT_DATE + 4)::timestamp + INTERVAL '18 hours') AT TIME ZONE 'America/Bogota',
      ((CURRENT_DATE + 4)::timestamp + INTERVAL '20 hours') AT TIME ZONE 'America/Bogota',
      'pendiente', 'pendiente');

  INSERT INTO appointments
    (patient_id, user_id, consultorio_id, fecha_inicio, fecha_fin, modalidad, estado_sesion, estado_pago)
  VALUES
    (p_scarlett, v_user_id, c_online,
      ((w_next1 + 0)::timestamp + INTERVAL '9 hours') AT TIME ZONE 'America/Bogota',
      ((w_next1 + 0)::timestamp + INTERVAL '10 hours') AT TIME ZONE 'America/Bogota',
      'online', 'pendiente', 'pendiente'),
    (p_zendaya, v_user_id, c_online,
      ((w_next1 + 0)::timestamp + INTERVAL '16 hours') AT TIME ZONE 'America/Bogota',
      ((w_next1 + 0)::timestamp + INTERVAL '17 hours') AT TIME ZONE 'America/Bogota',
      'online', 'pendiente', 'pendiente'),
    (p_ryan, v_user_id, c_medellin,
      ((w_next1 + 1)::timestamp + INTERVAL '11 hours') AT TIME ZONE 'America/Bogota',
      ((w_next1 + 1)::timestamp + INTERVAL '12 hours') AT TIME ZONE 'America/Bogota',
      'medellin', 'pendiente', 'pendiente'),
    (p_emma, v_user_id, c_online,
      ((w_next1 + 2)::timestamp + INTERVAL '10 hours') AT TIME ZONE 'America/Bogota',
      ((w_next1 + 2)::timestamp + INTERVAL '11 hours') AT TIME ZONE 'America/Bogota',
      'online', 'pendiente', 'pendiente'),
    (p_keanu, v_user_id, c_online,
      ((w_next1 + 3)::timestamp + INTERVAL '15 hours') AT TIME ZONE 'America/Bogota',
      ((w_next1 + 3)::timestamp + INTERVAL '16 hours') AT TIME ZONE 'America/Bogota',
      'online', 'pendiente', 'pendiente'),
    (p_chris, v_user_id, c_medellin,
      ((w_next1 + 3)::timestamp + INTERVAL '17 hours') AT TIME ZONE 'America/Bogota',
      ((w_next1 + 3)::timestamp + INTERVAL '18 hours') AT TIME ZONE 'America/Bogota',
      'medellin', 'pendiente', 'pendiente'),
    (p_jennifer, v_user_id, c_online,
      ((w_next1 + 4)::timestamp + INTERVAL '14 hours') AT TIME ZONE 'America/Bogota',
      ((w_next1 + 4)::timestamp + INTERVAL '15 hours') AT TIME ZONE 'America/Bogota',
      'online', 'pendiente', 'pendiente'),
    (p_margot, v_user_id, c_retiro,
      ((w_next1 + 4)::timestamp + INTERVAL '9 hours') AT TIME ZONE 'America/Bogota',
      ((w_next1 + 4)::timestamp + INTERVAL '10 hours') AT TIME ZONE 'America/Bogota',
      'retiro', 'pendiente', 'pendiente');

  INSERT INTO appointments
    (patient_id, user_id, consultorio_id, fecha_inicio, fecha_fin, modalidad, estado_sesion, estado_pago)
  VALUES
    (p_scarlett, v_user_id, c_online,
      ((w_next2 + 0)::timestamp + INTERVAL '9 hours') AT TIME ZONE 'America/Bogota',
      ((w_next2 + 0)::timestamp + INTERVAL '10 hours') AT TIME ZONE 'America/Bogota',
      'online', 'pendiente', 'pendiente'),
    (p_ryan, v_user_id, c_medellin,
      ((w_next2 + 1)::timestamp + INTERVAL '11 hours') AT TIME ZONE 'America/Bogota',
      ((w_next2 + 1)::timestamp + INTERVAL '12 hours') AT TIME ZONE 'America/Bogota',
      'medellin', 'pendiente', 'pendiente'),
    (p_emma, v_user_id, c_online,
      ((w_next2 + 2)::timestamp + INTERVAL '10 hours') AT TIME ZONE 'America/Bogota',
      ((w_next2 + 2)::timestamp + INTERVAL '11 hours') AT TIME ZONE 'America/Bogota',
      'online', 'pendiente', 'pendiente');

  -- ── PASO 7: perfiles clínicos ──────────────────────────────
  INSERT INTO patient_clinical_profiles
    (patient_id, psychologist_id,
     birth_date, genero, ocupacion, ciudad, eps,
     emergency_contact_name, emergency_contact_relationship,
     emergency_contact_phone, emergency_contact_authorized,
     medication, diagnoses, previous_treatments,
     consultation_reason, therapeutic_objective,
     session_frequency, care_modality, process_status,
     support_network, clinical_alerts, informed_consent_status, administrative_notes)
  VALUES
    (p_scarlett, v_user_id,
     '1990-05-14', 'Femenino', 'Diseñadora gráfica', 'Medellín', 'Sura',
     'Mónica Johansson', 'Madre', '573009001001', true,
     'Escitalopram 10 mg. Prescrito por psiquiatría. Última revisión hace 2 meses.',
     'Trastorno de ansiedad generalizada (F41.1)',
     'Psicología 2020–2021. Buena experiencia. Proceso corto pero útil.',
     'Ansiedad recurrente vinculada a presión laboral. Dificultad para desconectar fuera del horario de trabajo.',
     'Desarrollar estrategias de regulación emocional y reestructuración cognitiva frente a la exigencia laboral.',
     'Semanal', 'Online', 'En proceso activo',
     'Familia cercana y presente. Pareja estable que apoya el proceso.',
     ARRAY['medicacion_activa'], 'signed',
     'Factura mensual. Prefiere recordatorios por WhatsApp, no por llamada.');

  INSERT INTO patient_clinical_profiles
    (patient_id, psychologist_id,
     birth_date, genero, ocupacion, ciudad,
     consultation_reason, therapeutic_objective,
     session_frequency, care_modality, process_status,
     clinical_alerts, informed_consent_status)
  VALUES
    (p_ryan, v_user_id,
     '1988-10-23', 'Masculino', 'Empresario', 'Medellín',
     'Ansiedad crónica vinculada a responsabilidades laborales. Dificultad para delegar. Somatización frecuente.',
     'Trabajar la narrativa de autosuficiencia y los patrones de hiperfuncionamiento.',
     'Quincenal', 'Presencial (Medellín)', 'En proceso activo',
     '{}', 'signed');

  INSERT INTO patient_clinical_profiles
    (patient_id, psychologist_id,
     birth_date, genero, ocupacion, ciudad,
     consultation_reason, therapeutic_objective,
     session_frequency, care_modality, process_status,
     support_network, clinical_alerts, informed_consent_status)
  VALUES
    (p_emma, v_user_id,
     '1994-11-06', 'Femenino', 'Profesora universitaria', 'Medellín',
     'Duelo por separación de pareja de 5 años. Dificultad para retomar rutinas. Sensación de pérdida de identidad.',
     'Acompañar el proceso de duelo. Recuperar autonomía emocional y narrativa de identidad propia.',
     'Semanal', 'Online', 'En proceso activo',
     'Familia presente y disponible. Amigas cercanas que la apoyan.',
     '{}', 'signed');

  -- ── PASO 8: notas de sesión ────────────────────────────────
  INSERT INTO session_notes
    (appointment_id, patient_id, psychologist_id,
     como_llego, que_trabajaron, como_va_proceso, que_sigue,
     session_number, is_draft, signed_at)
  VALUES
    (apt_scarlett_last_mon, p_scarlett, v_user_id,
     'Llegó puntual. Refirió una semana difícil en el trabajo, con dos evaluaciones seguidas. Estado de ánimo tenso al inicio.',
     'Revisamos el registro emocional de la semana. Identificamos el patrón de anticipación catastrófica ante evaluaciones laborales. Se trabajó reestructuración cognitiva sobre un episodio específico.',
     'Proceso en buen ritmo. Scarlett muestra mayor capacidad para identificar sus pensamientos automáticos. La alianza terapéutica es sólida.',
     'Continuar con el registro de pensamientos. Para la próxima sesión: traer un ejemplo donde haya podido aplicar la reestructuración.',
     12, false,
     ((w_prev1 + 0)::timestamp + INTERVAL '10 hours') AT TIME ZONE 'America/Bogota');

  INSERT INTO session_notes
    (appointment_id, patient_id, psychologist_id,
     quick_note, session_number, is_draft)
  VALUES
    (apt_ryan_last_tue, p_ryan, v_user_id,
     'Humor como escudo desde el principio. Le cuesta hablar del miedo a fallar. Revisamos la dinámica con su equipo y la dificultad para delegar.',
     8, true);

  INSERT INTO session_notes
    (appointment_id, patient_id, psychologist_id,
     como_llego, que_trabajaron, como_va_proceso, que_sigue,
     session_number, is_draft, signed_at)
  VALUES
    (apt_emma_last_wed, p_emma, v_user_id,
     'Llegó 5 minutos tarde, algo agitada. Comentó que pensó en cancelar.',
     'Trabajo de duelo: carta al vínculo perdido que no fue enviada. Se exploró la diferencia entre perdonar y olvidar.',
     'El proceso avanza lentamente pero con profundidad. Emma está integrando el duelo sin evitar completamente el dolor asociado.',
     'Leer lo que escribió durante la semana. Próxima sesión: continuar el trabajo de memoria y explorar cierre simbólico.',
     7, false,
     ((w_prev1 + 2)::timestamp + INTERVAL '11 hours') AT TIME ZONE 'America/Bogota');

  INSERT INTO session_notes
    (appointment_id, patient_id, psychologist_id,
     quick_note, session_number, is_draft)
  VALUES
    (apt_keanu_last_thu, p_keanu, v_user_id,
     'Llegó cansado, habló poco los primeros 10 minutos. Luego trajo un sueño recurrente con su madre. Importante seguir explorando en próximas sesiones con cuidado.',
     6, true);

  RAISE NOTICE 'Demo sembrada correctamente para %. Semana actual: % al %.', v_user_id, w_curr, w_curr + 4;

END $$;