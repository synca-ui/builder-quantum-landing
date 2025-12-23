import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingOverlay from '../LoadingOverlay';

describe('LoadingOverlay', () => {
  test('renders messages and progress', () => {
    const messages = ['One', 'Two', 'Three'];
    render(<LoadingOverlay visible={true} messages={messages} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('One')).toBeInTheDocument();
  });

  test('does not render when not visible', () => {
    const { container } = render(<LoadingOverlay visible={false} messages={["x"]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
