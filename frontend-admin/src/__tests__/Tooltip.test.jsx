import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Tooltip from '../components/common/Tooltip';

describe('Tooltip Component', () => {
  beforeEach(() => {
    // Mock getBoundingClientRect for position calculations
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 100,
      top: 100,
      right: 150,
      bottom: 120,
      width: 50,
      height: 20,
      x: 100,
      y: 100,
    }));
  });

  it('renders trigger element', () => {
    render(
      <Tooltip content="Test tooltip">
        <button>Hover me</button>
      </Tooltip>
    );

    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('shows tooltip on mouse enter', async () => {
    render(
      <Tooltip content="Test tooltip content">
        <button>Trigger</button>
      </Tooltip>
    );

    const trigger = screen.getByText('Trigger').parentElement;
    fireEvent.mouseEnter(trigger);

    // Tooltip is rendered in a Portal, query from document.body
    await waitFor(() => {
      expect(screen.getByText('Test tooltip content')).toBeInTheDocument();
    });
  });

  it('hides tooltip on mouse leave', async () => {
    render(
      <Tooltip content="Test tooltip content">
        <button>Trigger</button>
      </Tooltip>
    );

    const trigger = screen.getByText('Trigger').parentElement;
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText('Test tooltip content')).toBeInTheDocument();
    });

    fireEvent.mouseLeave(trigger);

    await waitFor(() => {
      expect(screen.queryByText('Test tooltip content')).not.toBeInTheDocument();
    });
  });

  it('supports different positions', async () => {
    const { rerender } = render(
      <Tooltip content="Top tooltip" position="top">
        <button>Top</button>
      </Tooltip>
    );

    const trigger = screen.getByText('Top').parentElement;
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText('Top tooltip')).toBeInTheDocument();
    });

    fireEvent.mouseLeave(trigger);

    // Test bottom position
    rerender(
      <Tooltip content="Bottom tooltip" position="bottom">
        <button>Bottom</button>
      </Tooltip>
    );

    const bottomTrigger = screen.getByText('Bottom').parentElement;
    fireEvent.mouseEnter(bottomTrigger);

    await waitFor(() => {
      expect(screen.getByText('Bottom tooltip')).toBeInTheDocument();
    });

    fireEvent.mouseLeave(bottomTrigger);

    // Test left position
    rerender(
      <Tooltip content="Left tooltip" position="left">
        <button>Left</button>
      </Tooltip>
    );

    const leftTrigger = screen.getByText('Left').parentElement;
    fireEvent.mouseEnter(leftTrigger);

    await waitFor(() => {
      expect(screen.getByText('Left tooltip')).toBeInTheDocument();
    });

    fireEvent.mouseLeave(leftTrigger);

    // Test right position
    rerender(
      <Tooltip content="Right tooltip" position="right">
        <button>Right</button>
      </Tooltip>
    );

    const rightTrigger = screen.getByText('Right').parentElement;
    fireEvent.mouseEnter(rightTrigger);

    await waitFor(() => {
      expect(screen.getByText('Right tooltip')).toBeInTheDocument();
    });
  });

  it('accepts custom className for wrapper', () => {
    const { container } = render(
      <Tooltip content="Test" className="custom-class">
        <button>Test</button>
      </Tooltip>
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('renders React nodes as content', async () => {
    render(
      <Tooltip content={<span>Rich <strong>content</strong></span>}>
        <button>Trigger</button>
      </Tooltip>
    );

    const trigger = screen.getByText('Trigger').parentElement;
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText('Rich')).toBeInTheDocument();
      expect(screen.getByText('content')).toBeInTheDocument();
    });
  });
});
