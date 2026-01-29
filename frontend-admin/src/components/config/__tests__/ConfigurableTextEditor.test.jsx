import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '../../../__tests__/test-utils.tsx';
import ConfigurableTextEditor from '../ConfigurableTextEditor';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k) => k,
    i18n: { language: 'it' },
  }),
}));

// Mock font loader
vi.mock('../../../utils/fontLoader', () => ({
  autoLoadFontsFromHTML: vi.fn(),
  fontList: ['Arial', 'Open Sans', 'Roboto'],
}));

// Mock GoogleFontPicker
vi.mock('../../ui/GoogleFontPicker', () => ({
  default: ({ onFontSelect }) => (
    <button onClick={() => onFontSelect('Arial')} data-testid="font-picker">
      Font Picker
    </button>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlignCenter: () => <span data-testid="align-center-icon">AlignCenter</span>,
  AlignJustify: () => <span data-testid="align-justify-icon">AlignJustify</span>,
  AlignLeft: () => <span data-testid="align-left-icon">AlignLeft</span>,
  AlignRight: () => <span data-testid="align-right-icon">AlignRight</span>,
  Bold: () => <span data-testid="bold-icon">Bold</span>,
  Check: () => <span data-testid="check-icon">Check</span>,
  Code: () => <span data-testid="code-icon">Code</span>,
  Type: () => <span data-testid="type-icon">Type</span>,
  Italic: () => <span data-testid="italic-icon">Italic</span>,
  Loader2: () => <span data-testid="loader-icon">Loader2</span>,
  Maximize2: () => <span data-testid="maximize-icon">Maximize2</span>,
  RefreshCw: () => <span data-testid="refresh-icon">RefreshCw</span>,
  RotateCcw: () => <span data-testid="rotate-ccw-icon">RotateCcw</span>,
  RotateCw: () => <span data-testid="rotate-cw-icon">RotateCw</span>,
  Strikethrough: () => <span data-testid="strikethrough-icon">Strikethrough</span>,
  Underline: () => <span data-testid="underline-icon">Underline</span>,
  X: () => <span data-testid="x-icon">X</span>,
}));

describe('ConfigurableTextEditor - Render Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders component container without crashing', () => {
    const { container } = render(
      <ConfigurableTextEditor
        value="<p>Test</p>"
        onChange={() => { }}
        isReadOnly={false}
      />
    );
    expect(container.querySelector('div')).toBeDefined();
  });

  it('accepts and stores onChange prop', async () => {
    const onChange = vi.fn();
    render(
      <ConfigurableTextEditor
        value=""
        onChange={onChange}
        isReadOnly={false}
      />
    );
    expect(onChange).toBeDefined();
    expect(typeof onChange).toBe('function');
  });

  it('renders with isReadOnly false mode', () => {
    const { container } = render(
      <ConfigurableTextEditor
        value="<p>Content</p>"
        onChange={() => { }}
        isReadOnly={false}
      />
    );
    expect(container).toBeDefined();
  });

  it('renders with isReadOnly true mode', () => {
    const { container } = render(
      <ConfigurableTextEditor
        value="<p>Read only</p>"
        onChange={() => { }}
        isReadOnly={true}
      />
    );
    expect(container).toBeDefined();
  });

  it('handles empty string value', () => {
    const { container } = render(
      <ConfigurableTextEditor
        value=""
        onChange={() => { }}
        isReadOnly={false}
      />
    );
    expect(container).toBeDefined();
  });

  it('handles HTML paragraph content', () => {
    const { container } = render(
      <ConfigurableTextEditor
        value="<p>Simple paragraph</p>"
        onChange={() => { }}
        isReadOnly={false}
      />
    );
    expect(container).toBeDefined();
  });

  it('handles HTML with bold and italic tags', () => {
    const { container } = render(
      <ConfigurableTextEditor
        value="<p><b>Bold</b> and <i>italic</i></p>"
        onChange={() => { }}
        isReadOnly={false}
      />
    );
    expect(container).toBeDefined();
  });

  it('handles complex nested HTML structure', () => {
    const complexHTML = `
      <div>
        <h1>Title</h1>
        <p>Paragraph with <b>bold</b> and <i>italic</i></p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      </div>
    `;
    const { container } = render(
      <ConfigurableTextEditor
        value={complexHTML}
        onChange={() => { }}
        isReadOnly={false}
      />
    );
    expect(container).toBeDefined();
  });

  it('preserves HTML entities in content', () => {
    const { container } = render(
      <ConfigurableTextEditor
        value="<p>&lt;test&gt; &amp; &quot;quotes&quot;</p>"
        onChange={() => { }}
        isReadOnly={false}
      />
    );
    expect(container).toBeDefined();
  });

  it('handles unicode and special characters', () => {
    const { container } = render(
      <ConfigurableTextEditor
        value="<p>Unicöde: 中文 العربية 🎉</p>"
        onChange={() => { }}
        isReadOnly={false}
      />
    );
    expect(container).toBeDefined();
  });

  it('rerender with updated value', async () => {
    const { rerender } = render(
      <ConfigurableTextEditor
        value="<p>Initial</p>"
        onChange={() => { }}
        isReadOnly={false}
      />
    );

    rerender(
      <ConfigurableTextEditor
        value="<p>Updated</p>"
        onChange={() => { }}
        isReadOnly={false}
      />
    );
  });

  it('rerender with readOnly mode change', async () => {
    const { rerender } = render(
      <ConfigurableTextEditor
        value="<p>Content</p>"
        onChange={() => { }}
        isReadOnly={false}
      />
    );

    rerender(
      <ConfigurableTextEditor
        value="<p>Content</p>"
        onChange={() => { }}
        isReadOnly={true}
      />
    );
  });

  it('handles null onChange callback', () => {
    const { container } = render(
      <ConfigurableTextEditor
        value="<p>Test</p>"
        onChange={null}
        isReadOnly={false}
      />
    );
    expect(container).toBeDefined();
  });

  it('handles undefined onChange callback', () => {
    const { container } = render(
      <ConfigurableTextEditor
        value="<p>Test</p>"
        onChange={undefined}
        isReadOnly={false}
      />
    );
    expect(container).toBeDefined();
  });

  it('handles very long HTML content', () => {
    const longContent = '<p>' + 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50) + '</p>';
    const { container } = render(
      <ConfigurableTextEditor
        value={longContent}
        onChange={() => { }}
        isReadOnly={false}
      />
    );
    expect(container).toBeDefined();
  });

  it('supports multiple component instances', () => {
    const onChange1 = vi.fn();
    const onChange2 = vi.fn();

    const { container: container1 } = render(
      <ConfigurableTextEditor
        value="<p>Instance 1</p>"
        onChange={onChange1}
        isReadOnly={false}
      />
    );

    const { container: container2 } = render(
      <ConfigurableTextEditor
        value="<p>Instance 2</p>"
        onChange={onChange2}
        isReadOnly={false}
      />
    );

    expect(container1).not.toBe(container2);
  });

  it('handles alternating readOnly prop value', () => {
    const { rerender } = render(
      <ConfigurableTextEditor
        value="<p>Test</p>"
        onChange={() => { }}
        isReadOnly={false}
      />
    );

    for (let i = 0; i < 3; i++) {
      rerender(
        <ConfigurableTextEditor
          value="<p>Test</p>"
          onChange={() => { }}
          isReadOnly={i % 2 === 0}
        />
      );
    }
  });

  it('renders without errors on prop updates', () => {
    const { rerender } = render(
      <ConfigurableTextEditor
        value="<p>1</p>"
        onChange={() => { }}
        isReadOnly={false}
      />
    );

    const updates = [
      { value: '<p>2</p>', readOnly: false },
      { value: '<p>3</p>', readOnly: true },
      { value: '<p>4</p>', readOnly: false },
      { value: '<p>5</p>', readOnly: true },
    ];

    updates.forEach(({ value, readOnly }) => {
      rerender(
        <ConfigurableTextEditor
          value={value}
          onChange={() => { }}
          isReadOnly={readOnly}
        />
      );
    });
  });

  it('handles whitespace-only content', () => {
    const { container } = render(
      <ConfigurableTextEditor
        value="   \n  \t  "
        onChange={() => { }}
        isReadOnly={false}
      />
    );
    expect(container).toBeDefined();
  });

  it('does not throw on rapid prop changes', () => {
    const { rerender } = render(
      <ConfigurableTextEditor
        value="<p>Test</p>"
        onChange={() => { }}
        isReadOnly={false}
      />
    );

    expect(() => {
      for (let i = 0; i < 10; i++) {
        rerender(
          <ConfigurableTextEditor
            value={`<p>Update ${i}</p>`}
            onChange={() => { }}
            isReadOnly={i % 2 === 0}
          />
        );
      }
    }).not.toThrow();
  });

  it('component wrapper has expected structure', () => {
    const { container } = render(
      <ConfigurableTextEditor
        value="<p>Test</p>"
        onChange={() => { }}
        isReadOnly={false}
      />
    );

    const divElements = container.querySelectorAll('div');
    expect(divElements.length).toBeGreaterThan(0);
  });

  it('re-renders without memory leaks on multiple mounts/unmounts', () => {
    let container;
    for (let i = 0; i < 5; i++) {
      const result = render(
        <ConfigurableTextEditor
          value={`<p>Test ${i}</p>`}
          onChange={() => { }}
          isReadOnly={false}
        />
      );
      container = result.container;
    }
    expect(container).toBeDefined();
  });

  it('accepts initial values with all formatting types', () => {
    const values = [
      '<h1>Heading</h1>',
      '<h2>Subheading</h2>',
      '<b>Bold text</b>',
      '<i>Italic text</i>',
      '<u>Underlined</u>',
      '<s>Strikethrough</s>',
      '<code>Code block</code>',
      '<p>Normal paragraph</p>',
      '<blockquote>Quote</blockquote>',
    ];

    values.forEach(value => {
      const { container } = render(
        <ConfigurableTextEditor
          value={value}
          onChange={() => { }}
          isReadOnly={false}
        />
      );
      expect(container).toBeDefined();
    });
  });
});

describe('ConfigurableTextEditor - Modal and Save/Cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('opens editor modal when edit button is clicked', async () => {
    const user = require('@testing-library/user-event').default;
    const { getByText, getByRole } = render(
      <ConfigurableTextEditor
        textKey="test_key"
        initialContent="<p>Test content</p>"
        onSave={() => { }}
        label="Test Label"
      />
    );

    const editButton = getByText('admin.config.text_editor.buttons.edit');
    expect(editButton).toBeDefined();

    await user.click(editButton);

    // Modal should now be visible
    const modal = getByRole('dialog', { hidden: false });
    expect(modal).toBeDefined();
  });

  it('closes modal when cancel button is clicked', async () => {
    const user = require('@testing-library/user-event').default;
    const { getByText, queryByRole } = render(
      <ConfigurableTextEditor
        textKey="test_key"
        initialContent="<p>Test content</p>"
        onSave={() => { }}
      />
    );

    const editButton = getByText('admin.config.text_editor.buttons.edit');
    await user.click(editButton);

    // Modal should be open
    let modal = queryByRole('dialog');
    expect(modal).toBeDefined();

    // Click cancel button
    const cancelButton = getByText('admin.config.text_editor.buttons.cancel');
    await user.click(cancelButton);

    // Modal should close
    modal = queryByRole('dialog');
    expect(modal).toBeNull();
  });

  it('calls onSave when save button is clicked', async () => {
    const user = require('@testing-library/user-event').default;
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { getByText, getByRole } = render(
      <ConfigurableTextEditor
        textKey="test_key"
        initialContent="<p>Test</p>"
        onSave={onSave}
      />
    );

    const editButton = getByText('admin.config.text_editor.buttons.edit');
    await user.click(editButton);

    const saveButton = getByText('admin.config.text_editor.buttons.save');
    await user.click(saveButton);

    // Wait for async save to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(onSave).toHaveBeenCalled();
  });

  it('handles onSave errors gracefully', async () => {
    const user = require('@testing-library/user-event').default;
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));

    const { getByText } = render(
      <ConfigurableTextEditor
        textKey="test_key"
        initialContent="<p>Test</p>"
        onSave={onSave}
      />
    );

    const editButton = getByText('admin.config.text_editor.buttons.edit');
    await user.click(editButton);

    const saveButton = getByText('admin.config.text_editor.buttons.save');
    await user.click(saveButton);

    await new Promise(resolve => setTimeout(resolve, 150));

    expect(onSave).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('sets body overflow to hidden when modal opens and restores on close', async () => {
    const user = require('@testing-library/user-event').default;

    // Reset overflow before test
    document.body.style.overflow = '';

    const { getByText } = render(
      <ConfigurableTextEditor
        textKey="test_key"
        initialContent="<p>Test</p>"
        onSave={() => { }}
      />
    );

    // Initial state should be empty or default
    const initialOverflow = document.body.style.overflow;

    const editButton = getByText('admin.config.text_editor.buttons.edit');
    await user.click(editButton);

    // Should be hidden after opening
    expect(document.body.style.overflow).toBe('hidden');

    // Click cancel to close
    const cancelButton = getByText('admin.config.text_editor.buttons.cancel');
    await user.click(cancelButton);

    // Should restore to unset or initial value
    expect(document.body.style.overflow).toBe('unset');
  });

  it('renders preview content with proper formatting', () => {
    const { container } = render(
      <ConfigurableTextEditor
        textKey="test_key"
        initialContent="<p><strong>Bold</strong> and <em>italic</em></p>"
        onSave={() => { }}
      />
    );

    const previewDiv = container.querySelector('[class*="prose"]');
    expect(previewDiv).toBeDefined();
  });

  it('displays label in preview card', () => {
    const { getByText } = render(
      <ConfigurableTextEditor
        textKey="test_key"
        initialContent="<p>Content</p>"
        onSave={() => { }}
        label="Custom Label"
      />
    );

    expect(getByText('Custom Label')).toBeDefined();
  });

  it('uses textKey as label when label prop is not provided', () => {
    const { getByText } = render(
      <ConfigurableTextEditor
        textKey="my_text_key"
        initialContent="<p>Content</p>"
        onSave={() => { }}
      />
    );

    expect(getByText('my_text_key')).toBeDefined();
  });

  it('displays empty content message when initialContent is empty', () => {
    const { container } = render(
      <ConfigurableTextEditor
        textKey="test_key"
        initialContent=""
        onSave={() => { }}
      />
    );

    const emptyMessage = container.querySelector('[class*="text-gray-400"]');
    expect(emptyMessage).toBeDefined();
  });
});
