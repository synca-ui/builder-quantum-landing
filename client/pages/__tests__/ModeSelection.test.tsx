import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ModeSelection from '../ModeSelection';
import * as analysisStore from '@/data/analysisStore';
import { MemoryRouter } from 'react-router-dom';

import { vi, describe, test, expect } from 'vitest';

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ response: { restaurant: { name: 'Demo' }, analysis: { maitr_score: 85, recommendation: 'full_auto' } } }),
  } as any),
) as any;

// Prevent store notifications from causing re-render loops during test
vi.spyOn(analysisStore, 'setIsLoading').mockImplementation(() => {});
vi.spyOn(analysisStore, 'setN8nData').mockImplementation(() => {});
vi.spyOn(analysisStore, 'setSourceLink').mockImplementation(() => {});

describe('ModeSelection', () => {
  test('starts analysis when sourceLink present', async () => {
    const initialEntries = ['/mode-selection?sourceLink=https%3A%2F%2Fexample.com'];

    render(
      <MemoryRouter initialEntries={initialEntries}>
        <ModeSelection />
      </MemoryRouter>,
    );

    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });
});
