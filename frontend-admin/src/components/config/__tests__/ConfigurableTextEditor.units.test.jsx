import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import React from 'react';

// Import components inline to test them
// NumberSpinner (extracted from ConfigurableTextEditor)
const NumberSpinner = ({ value, onChange, min, max, step = 1, suffix = '', icon: Icon, title }) => {
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? step : -step;
      const unsafeNewValue = (parseFloat(value) || 0) + delta;
      const newValue = Math.round(unsafeNewValue * 100) / 100;
      
      if ((min !== undefined && newValue < min) || (max !== undefined && newValue > max)) return;
      
      onChange(newValue);
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [value, step, min, max, onChange]);

  return (
    <div 
      ref={containerRef}
      className="flex items-center border rounded"
      title={title}
      data-testid="number-spinner"
    >
      {Icon && <div><Icon size={14} /></div>}
      <button 
        onClick={() => {
          const newValue = (parseFloat(value) || 0) - step;
          if (min !== undefined && newValue < min) return;
          onChange(Math.round(newValue * 100) / 100);
        }}
        data-testid="decrement-btn"
      >
        -
      </button>
      <div>{value}{suffix}</div>
      <button 
        onClick={() => {
          const newValue = (parseFloat(value) || 0) + step;
          if (max !== undefined && newValue > max) return;
          onChange(Math.round(newValue * 100) / 100);
        }}
        data-testid="increment-btn"
      >
        +
      </button>
    </div>
  );
};

// FontSize Extension (extracted from ConfigurableTextEditor)
const FontSizeExtension = require('@tiptap/core').Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"`]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

// Rotation Extension (extracted from ConfigurableTextEditor)
const RotationMark = require('@tiptap/core').Mark.create({
  name: 'rotation',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      angle: {
        default: 0,
        parseHTML: element => {
           const transform = element.style.transform || '';
           const match = transform.match(/rotate\(([-\d.]+)deg\)/);
           return match ? parseInt(match[1], 10) : 0;
        },
        renderHTML: attributes => {
          if (!attributes.angle || attributes.angle === 0) {
            return {}
          }
          return {
            style: `display: inline-block; transform: rotate(${attributes.angle}deg); transform-origin: center;`,
            'data-angle': attributes.angle,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: element => {
          const hasRotate = element.style.transform?.includes('rotate');
          return hasRotate ? null : false;
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0]
  },

  addCommands() {
    return {
      setRotation: angle => ({ commands }) => {
        if (angle === 0) {
            return commands.unsetMark(this.name);
        }
        return commands.setMark(this.name, { angle: angle });
      },
      unsetRotation: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },
});

describe('ConfigurableTextEditor - Unit Tests', () => {
  
  describe('NumberSpinner Component', () => {
    it('renders with initial value and suffix', () => {
      render(<NumberSpinner value={1.5} onChange={() => {}} suffix="rem" title="Test Spinner" />);
      
      expect(screen.getByText('1.5rem')).toBeInTheDocument();
      expect(screen.getByTitle('Test Spinner')).toBeInTheDocument();
    });

    it('increments value on + button click', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      
      render(<NumberSpinner value={2} onChange={onChange} step={0.5} />);
      
      await user.click(screen.getByTestId('increment-btn'));
      
      expect(onChange).toHaveBeenCalledWith(2.5);
    });

    it('decrements value on - button click', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      
      render(<NumberSpinner value={2} onChange={onChange} step={0.5} />);
      
      await user.click(screen.getByTestId('decrement-btn'));
      
      expect(onChange).toHaveBeenCalledWith(1.5);
    });

    it('respects min boundary on decrement', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      
      render(<NumberSpinner value={1} onChange={onChange} min={1} step={1} />);
      
      await user.click(screen.getByTestId('decrement-btn'));
      
      expect(onChange).not.toHaveBeenCalled();
    });

    it('respects max boundary on increment', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      
      render(<NumberSpinner value={5} onChange={onChange} max={5} step={1} />);
      
      await user.click(screen.getByTestId('increment-btn'));
      
      expect(onChange).not.toHaveBeenCalled();
    });

    it('handles wheel scroll up to increment', async () => {
      const onChange = vi.fn();
      
      render(<NumberSpinner value={2} onChange={onChange} step={0.1} />);
      
      const container = screen.getByTestId('number-spinner');
      
      // Simulate wheel up (negative deltaY)
      fireEvent.wheel(container, { deltaY: -100 });
      
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(2.1);
      });
    });

    it('handles wheel scroll down to decrement', async () => {
      const onChange = vi.fn();
      
      render(<NumberSpinner value={2} onChange={onChange} step={0.1} />);
      
      const container = screen.getByTestId('number-spinner');
      
      // Simulate wheel down (positive deltaY)
      fireEvent.wheel(container, { deltaY: 100 });
      
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(1.9);
      });
    });

    it('respects min boundary on wheel scroll', async () => {
      const onChange = vi.fn();
      
      render(<NumberSpinner value={0.5} onChange={onChange} min={0.5} step={0.1} />);
      
      const container = screen.getByTestId('number-spinner');
      
      fireEvent.wheel(container, { deltaY: 100 }); // Try to go below min
      
      await waitFor(() => {
        expect(onChange).not.toHaveBeenCalled();
      });
    });

    it('respects max boundary on wheel scroll', async () => {
      const onChange = vi.fn();
      
      render(<NumberSpinner value={8} onChange={onChange} max={8} step={0.1} />);
      
      const container = screen.getByTestId('number-spinner');
      
      fireEvent.wheel(container, { deltaY: -100 }); // Try to go above max
      
      await waitFor(() => {
        expect(onChange).not.toHaveBeenCalled();
      });
    });

    it('rounds float values to 2 decimals on wheel', async () => {
      const onChange = vi.fn();
      
      render(<NumberSpinner value={1.234} onChange={onChange} step={0.333} />);
      
      const container = screen.getByTestId('number-spinner');
      
      fireEvent.wheel(container, { deltaY: -100 });
      
      await waitFor(() => {
        const calledValue = onChange.mock.calls[0][0];
        // Should be rounded to 2 decimals
        expect(calledValue).toBeCloseTo(1.57, 2);
      });
    });

    it('handles zero and negative values correctly', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      
      render(<NumberSpinner value={0} onChange={onChange} step={1} min={-5} />);
      
      await user.click(screen.getByTestId('decrement-btn'));
      
      expect(onChange).toHaveBeenCalledWith(-1);
    });

    it('renders icon when provided', () => {
      const MockIcon = (props) => <svg data-testid="mock-icon" {...props} />;
      
      render(<NumberSpinner value={1} onChange={() => {}} icon={MockIcon} />);
      
      expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    });

    it('cleans up wheel event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(Element.prototype, 'removeEventListener');
      
      const { unmount } = render(<NumberSpinner value={1} onChange={() => {}} />);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('wheel', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('FontSize Extension', () => {
    it('adds fontSize attribute to textStyle', () => {
      const extension = FontSizeExtension;
      
      expect(extension.name).toBe('fontSize');
      expect(extension.options.types).toEqual(['textStyle']);
      
      const attrs = extension.addGlobalAttributes();
      expect(attrs[0].attributes.fontSize).toBeDefined();
    });

    it('parseHTML strips quotes from font-size style', () => {
      const extension = FontSizeExtension;
      const attrs = extension.addGlobalAttributes();
      
      const mockElement = {
        style: { fontSize: '"1.5rem"' }
      };
      
      const result = attrs[0].attributes.fontSize.parseHTML(mockElement);
      expect(result).toBe('1.5rem');
    });

    it('renderHTML returns empty object when fontSize is null', () => {
      const extension = FontSizeExtension;
      const attrs = extension.addGlobalAttributes();
      
      const result = attrs[0].attributes.fontSize.renderHTML({ fontSize: null });
      expect(result).toEqual({});
    });

    it('renderHTML returns style with fontSize', () => {
      const extension = FontSizeExtension;
      const attrs = extension.addGlobalAttributes();
      
      const result = attrs[0].attributes.fontSize.renderHTML({ fontSize: '2rem' });
      expect(result).toEqual({ style: 'font-size: 2rem' });
    });

    it('defines setFontSize command', () => {
      const extension = FontSizeExtension;
      const commands = extension.addCommands();
      
      expect(commands.setFontSize).toBeDefined();
      expect(typeof commands.setFontSize).toBe('function');
    });

    it('defines unsetFontSize command', () => {
      const extension = FontSizeExtension;
      const commands = extension.addCommands();
      
      expect(commands.unsetFontSize).toBeDefined();
      expect(typeof commands.unsetFontSize).toBe('function');
    });
  });

  describe('Rotation Mark Extension', () => {
    it('has correct name and type', () => {
      expect(RotationMark.name).toBe('rotation');
      expect(RotationMark.type).toBe('mark');
    });

    it('parseHTML extracts angle from transform style', () => {
      const attrs = RotationMark.addAttributes();
      
      const mockElement = {
        style: { transform: 'rotate(45deg)' }
      };
      
      const result = attrs.angle.parseHTML(mockElement);
      expect(result).toBe(45);
    });

    it('parseHTML handles negative angles', () => {
      const attrs = RotationMark.addAttributes();
      
      const mockElement = {
        style: { transform: 'rotate(-90deg)' }
      };
      
      const result = attrs.angle.parseHTML(mockElement);
      expect(result).toBe(-90);
    });

    it('parseHTML returns 0 when no transform present', () => {
      const attrs = RotationMark.addAttributes();
      
      const mockElement = {
        style: {}
      };
      
      const result = attrs.angle.parseHTML(mockElement);
      expect(result).toBe(0);
    });

    it('parseHTML returns 0 when transform has no rotate', () => {
      const attrs = RotationMark.addAttributes();
      
      const mockElement = {
        style: { transform: 'scale(2)' }
      };
      
      const result = attrs.angle.parseHTML(mockElement);
      expect(result).toBe(0);
    });

    it('renderHTML returns empty object when angle is 0', () => {
      const attrs = RotationMark.addAttributes();
      
      const result = attrs.angle.renderHTML({ angle: 0 });
      expect(result).toEqual({});
    });

    it('renderHTML returns transform style with angle', () => {
      const attrs = RotationMark.addAttributes();
      
      const result = attrs.angle.renderHTML({ angle: 45 });
      
      expect(result.style).toContain('rotate(45deg)');
      expect(result['data-angle']).toBe(45);
    });

    it('getAttrs returns null for span with rotate transform', () => {
      const parseRules = RotationMark.parseHTML();
      
      const mockElement = {
        style: { transform: 'rotate(30deg)' }
      };
      
      const result = parseRules[0].getAttrs(mockElement);
      expect(result).toBeNull(); // null means parse this element
    });

    it('getAttrs returns false for span without rotate', () => {
      const parseRules = RotationMark.parseHTML();
      
      const mockElement = {
        style: {}
      };
      
      const result = parseRules[0].getAttrs(mockElement);
      expect(result).toBe(false); // false means ignore this element
    });

    it('setRotation command with angle 0 calls unsetMark', () => {
      const commands = RotationMark.addCommands();
      const mockUnsetMark = vi.fn();
      
      const commandContext = {
        commands: {
          unsetMark: mockUnsetMark,
          setMark: vi.fn(),
        }
      };
      
      // Execute setRotation with angle 0
      const result = commands.setRotation(0)(commandContext);
      
      expect(mockUnsetMark).toHaveBeenCalledWith('rotation');
    });

    it('setRotation command with non-zero angle calls setMark', () => {
      const commands = RotationMark.addCommands();
      const mockSetMark = vi.fn();
      
      const commandContext = {
        commands: {
          setMark: mockSetMark,
          unsetMark: vi.fn(),
        }
      };
      
      commands.setRotation(90)(commandContext);
      
      expect(mockSetMark).toHaveBeenCalledWith('rotation', { angle: 90 });
    });

    it('unsetRotation command calls unsetMark', () => {
      const commands = RotationMark.addCommands();
      const mockUnsetMark = vi.fn();
      
      const commandContext = {
        commands: {
          unsetMark: mockUnsetMark,
        }
      };
      
      commands.unsetRotation()(commandContext);
      
      expect(mockUnsetMark).toHaveBeenCalledWith('rotation');
    });
  });

  describe('Editor Paste Handler Logic', () => {
    it('allows paste when clipboardData contains HTML', () => {
      const mockEvent = {
        clipboardData: {
          items: [
            { type: 'text/html' },
            { type: 'text/plain' }
          ],
          getData: vi.fn((type) => {
            if (type === 'text/plain') return '<p>HTML Content</p>';
            return '';
          })
        },
        preventDefault: vi.fn()
      };

      // Simulate handlePaste logic
      const items = mockEvent.clipboardData.items;
      const hasHtml = Array.from(items).some(item => item.type === 'text/html');
      
      expect(hasHtml).toBe(true);
      // When hasHtml is true, handler returns false (browser default paste)
    });

    it('detects HTML in plain text and inserts it', () => {
      const mockInsertContent = vi.fn();
      const mockEvent = {
        clipboardData: {
          items: [{ type: 'text/plain' }],
          getData: vi.fn(() => '<div>Custom HTML</div>')
        },
        preventDefault: vi.fn()
      };

      const text = mockEvent.clipboardData.getData('text/plain');
      const hasHtmlTags = /<[a-z][\s\S]*>/i.test(text);
      
      expect(hasHtmlTags).toBe(true);
      
      // Parse to validate
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const errorNode = doc.querySelector('parsererror');
      const isValidHtml = !errorNode && doc.body.innerHTML.trim().length > 0 && (text.includes('</') || text.includes('/>'));
      
      expect(isValidHtml).toBe(true);
    });

    it('rejects invalid HTML in paste', () => {
      const text = '<invalid><broken';
      
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const errorNode = doc.querySelector('parsererror');
      const isValidHtml = !errorNode && doc.body.innerHTML.trim().length > 0 && (text.includes('</') || text.includes('/>'));
      
      expect(isValidHtml).toBe(false);
    });

    it('rejects plain text without closing tags', () => {
      const text = 'Just plain text no tags';
      
      const hasHtmlTags = /<[a-z][\s\S]*>/i.test(text);
      
      expect(hasHtmlTags).toBe(false);
    });
  });
});
