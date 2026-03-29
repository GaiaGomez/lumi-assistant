-- ============================================================
-- CLEANUP — borrar pacientes y citas que NO son datos demo
-- ============================================================
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase.
-- Borra solo los pacientes que no tienen los apellidos demo.
-- Los pacientes demo (Hollywood) se preservan intactos.
--
-- ⚠️  Cambia el email por el de Lu antes de ejecutar.
-- ============================================================

DO $$
DECLARE
  v_user_id uuid;
  v_deleted_appointments int;
  v_deleted_patients int;

  -- Apellidos de los pacientes demo — se preservan
  demo_apellidos text[] := ARRAY[
    'Johansson','Reynolds','Stone','Evans','Robbie',
    'Reeves','Lawrence','Pitt','Coleman','DiCaprio'
  ];

BEGIN

  -- Buscar usuario
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'lu@tudominio.com'  -- <── CAMBIAR AQUÍ
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado. Cambia el email.';
  END IF;

  -- Borrar citas de pacientes NO demo (primero, por FK)
  DELETE FROM appointments
  WHERE user_id = v_user_id
    AND patient_id IN (
      SELECT id FROM patients
      WHERE user_id = v_user_id
        AND apellido != ALL(demo_apellidos)
    );

  GET DIAGNOSTICS v_deleted_appointments = ROW_COUNT;

  -- Borrar pacientes NO demo
  DELETE FROM patients
  WHERE user_id = v_user_id
    AND apellido != ALL(demo_apellidos);

  GET DIAGNOSTICS v_deleted_patients = ROW_COUNT;

  RAISE NOTICE 'Limpieza completada: % citas y % pacientes viejos borrados.',
    v_deleted_appointments, v_deleted_patients;

END $$;
