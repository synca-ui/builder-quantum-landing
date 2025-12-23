import React from 'react';
import { render, screen } from '@testing-library/react';
import ModeSelection from '../ModeSelection';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect } from 'vitest';

describe('ModeSelection', () => {
  test('renders selection options', () => {
    render(
      <MemoryRouter>
        <ModeSelection />
      </MemoryRouter>,
    );

    expect(screen.getByText(/How would you like Maitr to help\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Guided \(Manual\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Automatic \(Zero-Input\)/i)).toBeInTheDocument();
  });
});
