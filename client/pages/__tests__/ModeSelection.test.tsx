import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ModeSelection from '../ModeSelection';
import * as analysisStore from '@/data/analysisStore';

import { vi, describe, test, expect } from 'vitest';

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ response: { restaurant: { name: 'Demo' }, analysis: { maitr_score: 85, recommendation: 'full_auto' } } }),
  } as any),
) as any;

describe('ModeSelection', () => {
  test('starts analysis when sourceLink present', async () => {
    // set up URL with sourceLink
    const url = '/mode-selection?sourceLink=https%3A%2F%2Fexample.com';
    // mock location
    delete (window as any).location;
    (window as any).location = new URL('http://localhost' + url);

    render(<ModeSelection />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });
});
