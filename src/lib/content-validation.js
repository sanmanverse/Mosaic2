import { CATEGORIES } from './recommendation.js';

export function validateComposition(composition = {}) {
  const values = CATEGORIES.map(({ key }) => Number(composition[key] ?? 0));
  const validNumbers = values.every((value) => Number.isInteger(value) && value >= 0 && value <= 100);
  const total = values.reduce((sum, value) => sum + value, 0);
  return { valid: validNumbers && total === 100, total, values };
}

export function normalizeUsername(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24);
}
