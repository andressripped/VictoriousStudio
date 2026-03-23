const DAY_ALIASES: Record<string, string> = {
  dom: 'dom',
  domingo: 'dom',
  lun: 'lun',
  lunes: 'lun',
  mar: 'mar',
  martes: 'mar',
  mie: 'mie',
  miercoles: 'mie',
  miercole: 'mie',
  'miã©': 'mie',
  'miã©rcoles': 'mie',
  jue: 'jue',
  jueves: 'jue',
  vie: 'vie',
  viernes: 'vie',
  sab: 'sab',
  sabado: 'sab',
  'sã¡b': 'sab',
  'sã¡bado': 'sab',
};

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

export const getDayName = (date: Date) => DAY_NAMES[date.getDay()];

export const normalizeDayToken = (value: string) => {
  const compact = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return DAY_ALIASES[compact] || compact;
};

export const parseTimeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const hasConfiguredShifts = (barber: any) => {
  const shifts = [barber?.horarioManana, barber?.horarioTarde];

  return shifts.some(
    (shift) => shift?.inicio && shift?.fin && shift.inicio !== '' && shift.fin !== '',
  );
};

export const isBarberDayOff = (barber: any, date: Date) => {
  const dayToken = normalizeDayToken(getDayName(date));

  if (dayToken === 'dom') return true;

  if (!Array.isArray(barber?.diasTrabajo) || barber.diasTrabajo.length === 0) {
    return true;
  }

  return !barber.diasTrabajo.some((day: string) => normalizeDayToken(day) === dayToken);
};

export const isSlotWithinBarberSchedule = (
  barber: any,
  slotTime: string,
  serviceDuration: number,
) => {
  if (!hasConfiguredShifts(barber)) return false;

  const slotStart = parseTimeToMinutes(slotTime);
  const slotEnd = slotStart + serviceDuration;
  const shifts = [barber?.horarioManana, barber?.horarioTarde];

  return shifts.some((shift) => {
    if (!shift?.inicio || !shift?.fin || shift.inicio === '' || shift.fin === '') {
      return false;
    }

    const shiftStart = parseTimeToMinutes(shift.inicio);
    const shiftEnd = parseTimeToMinutes(shift.fin);

    return slotStart >= shiftStart && slotEnd <= shiftEnd;
  });
};

export const overlapsExistingSlot = (
  slotTime: string,
  serviceDuration: number,
  entries: Array<{ time: string; duration?: number }>,
) => {
  const slotStart = parseTimeToMinutes(slotTime);
  const slotEnd = slotStart + serviceDuration;

  return entries.some((entry) => {
    const entryStart = parseTimeToMinutes(entry.time);
    const entryEnd = entryStart + (Number(entry.duration) || 30);

    return slotStart < entryEnd && slotEnd > entryStart;
  });
};
