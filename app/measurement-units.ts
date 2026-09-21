export type MeasurementUnit = 'm²' | 'm³' | 'kg';

const normalizeActivity = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const UNIT_RULES: ReadonlyArray<{
  unit: MeasurementUnit;
  terms: readonly string[];
}> = [
  {
    unit: 'm³',
    terms: ['concretagem', 'concreto'],
  },
  {
    unit: 'kg',
    terms: ['armadura', 'aco', 'aço'],
  },
  {
    unit: 'm²',
    terms: [
      'alvenaria',
      'chapisco',
      'taliscamento',
      'reboco',
      'massa unica',
      'impermeabilizacao',
      'selador',
      'textura',
      'revestimento',
      'porcelanato',
      'ceramico',
      'ceramica',
    ],
  },
];

export const CANONICAL_MEASUREMENT_UNITS: Readonly<Record<string, MeasurementUnit>> = {
  Alvenaria: 'm²',
  Chapisco: 'm²',
  Taliscamento: 'm²',
  Reboco: 'm²',
  'Massa única': 'm²',
  Impermeabilização: 'm²',
  Selador: 'm²',
  Textura: 'm²',
  Revestimento: 'm²',
  Porcelanato: 'm²',
  Cerâmico: 'm²',
  Concretagem: 'm³',
  Armadura: 'kg',
};

export function getMeasurementUnit(
  activity: string,
  fallback: MeasurementUnit = 'm²',
): MeasurementUnit {
  const normalized = normalizeActivity(activity);

  for (const rule of UNIT_RULES) {
    if (rule.terms.some((term) => normalized.includes(normalizeActivity(term)))) {
      return rule.unit;
    }
  }

  return fallback;
}

export function formatMeasuredValue(
  value: number | string,
  activity: string,
  fallback: MeasurementUnit = 'm²',
) {
  return `${value} ${getMeasurementUnit(activity, fallback)}`;
}
