import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateExecutiveMetrics } from '../src/domain.js';

test('calculates forecast budget saving and schedule delay', () => {
  const result = calculateExecutiveMetrics({
    budget: { baseline: 42800000, forecast: 41900000, actual: 24600000, plannedToDate: 25400000 },
    schedule: { plannedStart:'2026-03-02', contractualEnd:'2026-11-30', forecastEnd:'2026-12-12', asOf:'2026-09-01', plannedProgress:63, actualProgress:57 }
  });
  assert.equal(result.budgetVariance, -900000);
  assert.equal(result.budgetVariancePct, -2.1);
  assert.equal(result.budgetStatus, 'Abaixo do orçamento');
  assert.equal(result.scheduleVarianceDays, 12);
  assert.equal(result.scheduleStatus, 'Atraso projetado');
  assert.equal(result.progressVariancePct, -6);
});

test('recognizes an early finish', () => {
  const result = calculateExecutiveMetrics({
    budget: { baseline: 1000000, forecast: 1020000, actual: 600000, plannedToDate: 580000 },
    schedule: { plannedStart:'2026-01-01', contractualEnd:'2026-12-31', forecastEnd:'2026-12-20', asOf:'2026-09-01', plannedProgress:70, actualProgress:73 }
  });
  assert.equal(result.budgetStatus, 'Acima do orçamento');
  assert.equal(result.scheduleVarianceDays, -11);
  assert.equal(result.scheduleStatus, 'Entrega antecipada');
  assert.equal(result.progressVariancePct, 3);
});
