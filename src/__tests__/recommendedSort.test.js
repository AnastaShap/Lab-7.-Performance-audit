import { describe, it, expect, vi } from 'vitest';

// Обгортаємо справжню функцію в spy, щоб рахувати її виклики.
// Поведінка функції не змінюється.
vi.mock('../utils/rating', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, tutorScore: vi.fn(actual.tutorScore) };
});

import { tutorScore } from '../utils/rating';
import { getVisibleTutors } from '../utils/catalog';
import { tutors } from '../data/tutors';
import { DEFAULT_FILTERS } from '../App';

describe('сортування «Рекомендовані»', () => {
  it('рахує рейтинг кожного репетитора не більше одного разу', () => {
    tutorScore.mockClear();
    getVisibleTutors(tutors, { query: '', filters: DEFAULT_FILTERS, sortBy: 'recommended' });
    expect(tutorScore.mock.calls.length).toBeLessThanOrEqual(tutors.length);
  });

  it('повторне сортування (наступна літера в пошуку) не перераховує рейтинг заново', () => {
    getVisibleTutors(tutors, { query: '', filters: DEFAULT_FILTERS, sortBy: 'recommended' });
    tutorScore.mockClear();
    getVisibleTutors(tutors, { query: 'м', filters: DEFAULT_FILTERS, sortBy: 'recommended' });
    expect(tutorScore.mock.calls.length).toBe(0);
  });

  it('порядок лишається правильним: від вищого рейтингу до нижчого', () => {
    const result = getVisibleTutors(tutors, { query: '', filters: DEFAULT_FILTERS, sortBy: 'recommended' });
    for (let i = 1; i < result.length; i++) {
      expect(tutorScore(result[i - 1])).toBeGreaterThanOrEqual(tutorScore(result[i]));
    }
  });
});
