-- Índice compuesto para la query más frecuente de la agenda:
-- .eq('user_id', ...).order('fecha_inicio', ...)
-- También cubre el filtro de rango de fechas ±N días.
create index if not exists appointments_user_fecha_idx
  on appointments(user_id, fecha_inicio);
