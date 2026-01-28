import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { EditorContent, Extension, Mark, mergeAttributes, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { autoLoadFontsFromHTML } from '../../utils/fontLoader';
import GoogleFontPicker from '../ui/GoogleFontPicker';

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Code,
  Type as FontSizeIcon,
  Italic,
  Loader2,
  Maximize2,
  RefreshCw,
  RotateCcw, RotateCw,
  Strikethrough,
  Underline as UnderlineIcon,
  X
} from 'lucide-react';

// --- CUSTOM COMPONENT: NUMBER SPINNER ---
const NumberSpinner = ({ value, onChange, min, max, step = 1, suffix = '', icon: Icon, title }) => {
  const containerRef = useRef(null);

  // Gestione Wheel (Rotellina) con listener non passivo per prevenire lo scroll pagina
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? step : -step;
      const unsafeNewValue = (parseFloat(value) || 0) + delta;
      // Round to avoid float precision issues
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
      className="flex items-center border border-gray-300 rounded bg-white overflow-hidden shadow-sm h-8"
      title={title}
    >
      {Icon && (
        <div className="pl-2 pr-1 text-gray-500 bg-gray-50 h-full flex items-center border-r border-gray-100">
          <Icon size={14} />
        </div>
      )}
      <button
        onClick={() => {
          const newValue = (parseFloat(value) || 0) - step;
          if (min !== undefined && newValue < min) return;
          onChange(Math.round(newValue * 100) / 100);
        }}
        className="px-2 h-full hover:bg-gray-100 border-r border-gray-200 active:bg-gray-200 touch-manipulation text-gray-600 font-bold"
      >
        -
      </button>
      <div className="px-2 text-xs font-medium min-w-[3.5rem] text-center select-none text-gray-700">
        {value}{suffix}
      </div>
      <button
        onClick={() => {
          const newValue = (parseFloat(value) || 0) + step;
          if (max !== undefined && newValue > max) return;
          onChange(Math.round(newValue * 100) / 100);
        }}
        className="px-2 h-full hover:bg-gray-100 border-l border-gray-200 active:bg-gray-200 touch-manipulation text-gray-600 font-bold"
      >
        +
      </button>
    </div>
  );
};

// --- CUSTOM EXTENSION: FONT SIZE ---
const FontSize = Extension.create({
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
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
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

// --- CUSTOM EXTENSION: ROTATION ---
const Rotation = Mark.create({
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
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
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

const MenuBar = ({ editor }) => {
  const [activeFontFamily, setActiveFontFamily] = useState('Open Sans');
  // State for spinners
  const [fontSizeValue, setFontSizeValue] = useState(1); // Default 1rem
  const [rotationValue, setRotationValue] = useState(0);
  const [, forceUpdate] = useState(0);

  if (!editor) {
    return null;
  }

  // Helper to extract clean font name
  const cleanFontName = (fontFamily) => {
    if (!fontFamily) return null;
    return fontFamily.split(',')[0].replace(/['"`]/g, '').trim();
  };

  // Sync active font/size from editor state
  useEffect(() => {
    const updateState = () => {
      // 🔥 Forza un re-render (serve SOLO nei test)
      forceUpdate(x => x + 1);

      // Font Family
      const selectionFont = editor.getAttributes('textStyle').fontFamily;
      if (selectionFont) {
        setActiveFontFamily(cleanFontName(selectionFont));
      } else {
        setActiveFontFamily('Open Sans');
      }

      // Font Size (Convert px/rem to number)
      const selectionSize = editor.getAttributes('textStyle').fontSize; // e.g. "1.5rem" or "24px"
      if (selectionSize) {
        if (selectionSize.endsWith('rem')) {
          setFontSizeValue(parseFloat(selectionSize));
        } else if (selectionSize.endsWith('px')) {
          // Convert px to rem approx (base 16)
          setFontSizeValue(Math.round((parseFloat(selectionSize) / 16) * 100) / 100);
        } else {
          setFontSizeValue(parseFloat(selectionSize) || 1);
        }
      } else {
        setFontSizeValue(1); // Default
      }

      // Rotation
      const selectionRotation = editor.getAttributes('rotation').angle;
      setRotationValue(selectionRotation || 0);
    };

    updateState();
    editor.on('selectionUpdate', updateState);
    editor.on('transaction', updateState);

    return () => {
      editor.off('selectionUpdate', updateState);
      editor.off('transaction', updateState);
    };
  }, [editor]);


  // Helper per classi bottone
  const btnClass = (isActive) =>
    `p-1.5 sm:p-2 rounded hover:bg-gray-200 transition-colors ${isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'} disabled:opacity-30 disabled:cursor-not-allowed`;

  const iconSize = "w-4 h-4 sm:w-[18px] sm:h-[18px]";

  return (
    <div className="flex flex-wrap gap-2 p-2 border-b border-gray-200 bg-gray-50 sticky top-0 z-10 items-center justify-start">
      {/* History */}
      <div className="flex gap-0.5 border-r border-gray-300 pr-2">
        <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().chain().focus().undo().run()} className={btnClass(false)} title="Annulla"><RotateCcw className={iconSize} /></button>
        <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().chain().focus().redo().run()} className={btnClass(false)} title="Ripeti"><RotateCw className={iconSize} /></button>
      </div>

      {/* Fonts & Size & Color */}
      <div className="flex gap-2 border-r border-gray-300 pr-2 items-center">
        <GoogleFontPicker
          activeFamily={activeFontFamily}
          onSelect={(font) => {
            const fontFamily = `"${font.family}", ${font.category || 'sans-serif'}`;
            editor.chain().focus().setFontFamily(fontFamily).run();
            setActiveFontFamily(font.family);
          }}
        />

        {/* New Number Spinner for Font Size */}
        <NumberSpinner
          icon={FontSizeIcon}
          value={fontSizeValue}
          min={0.5}
          max={8}
          step={0.1}
          suffix="rem"
          title="Dimensione Font (rem)"
          onChange={(val) => {
            editor.chain().focus().setFontSize(`${val}rem`).run();
          }}
        />

        {/* Color Picker */}
        <div className="relative flex items-center">
          <input
            type="color"
            onInput={event => editor.chain().focus().setColor(event.target.value).run()}
            value={editor.getAttributes('textStyle').color || '#000000'}
            className="w-8 h-8 p-0 border border-gray-300 rounded overflow-hidden cursor-pointer shadow-sm"
            title="Colore Testo"
          />
        </div>
      </div>

      {/* Rotation Spinner */}
      <div className="flex gap-2 border-r border-gray-300 pr-2 items-center">
        <NumberSpinner
          icon={RefreshCw}
          value={rotationValue}
          min={-180}
          max={180}
          step={1}
          suffix="°"
          title="Rotazione (gradi)"
          onChange={(val) => {
            editor.chain().focus().setRotation(val).run();
          }}
        />
      </div>

      {/* Basic Formatting */}
      <div className="flex gap-0.5 border-r border-gray-300 pr-2 flex-wrap">
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="Grassetto"><Bold className={iconSize} /></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="Corsivo"><Italic className={iconSize} /></button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))} title="Barrato"><Strikethrough className={iconSize} /></button>
        <button onClick={() => editor.chain().focus().toggleCode().run()} className={btnClass(editor.isActive('code'))} title="Codice Inline"><Code className={iconSize} /></button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive('underline'))} title="Sottolineato"><UnderlineIcon className={iconSize} /></button>
      </div>

      {/* Alignment */}
      <div className="flex gap-0.5 flex-wrap">
        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btnClass(editor.isActive({ textAlign: 'left' }))} title="Allinea Sx"><AlignLeft className={iconSize} /></button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btnClass(editor.isActive({ textAlign: 'center' }))} title="Allinea Centro"><AlignCenter className={iconSize} /></button>
        <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btnClass(editor.isActive({ textAlign: 'right' }))} title="Allinea Dx"><AlignRight className={iconSize} /></button>
        <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={btnClass(editor.isActive({ textAlign: 'justify' }))} title="Giustifica"><AlignJustify className={iconSize} /></button>
      </div>
    </div>
  );
};

// --- LAZY LOADED EDITOR WRAPPER ---
// This component initializes the heavy TipTap editor only when rendered
const LazyEditor = ({ content, onSave, onCancel, textKey, label }) => {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const dialogTitleId = `editor-title-${textKey}`;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      // Image Removed
      Subscript,
      Superscript,
      Highlight,
      TextStyle,
      Color,
      FontFamily,
      Rotation,
      FontSize,
    ],
    content: content || '',
    editable: true,
    autofocus: true,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-lg max-w-none p-4 sm:p-6 focus:outline-none min-h-[50vh]',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        const hasHtml = Array.from(items || []).some(item => item.type === 'text/html');
        if (hasHtml) return false;

        const text = event.clipboardData?.getData('text/plain');
        if (text && /<[a-z][\s\S]*>/i.test(text)) {
          const doc = new DOMParser().parseFromString(text, 'text/html');
          const errorNode = doc.querySelector('parsererror');
          if (!errorNode && doc.body.innerHTML.trim().length > 0 && (text.includes('</') || text.includes('/>'))) {
            event.preventDefault();
            // Guard against undefined editor (can occur in test environments)
            if (view.props?.editor?.commands) {
              view.props.editor.commands.insertContent(text);
            }
            return true;
          }
        }
        return false;
      }
    },
  });

  // Auto-load fonts only for the active editor
  useEffect(() => {
    if (content) {
      autoLoadFontsFromHTML(content);
    }
  }, [content]);

  const handleSave = async () => {
    if (!editor) return;
    setIsSaving(true);
    const htmlContent = editor.getHTML();
    try {
      await onSave(textKey, htmlContent);
      // Parent handles closing
    } catch (error) {
      console.error('Failed to save text:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200 bg-white shadow-sm shrink-0 gap-3">
        <div className="flex flex-col w-full sm:w-auto">
          <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">{t('common.edit')}</span>
          <h2
            id={dialogTitleId}
            className="text-sm sm:text-xl font-bold text-gray-800 truncate max-w-[280px] sm:max-w-md"
            title={label || textKey}
          >
            {label || textKey}
          </h2>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={onCancel}
            className="flex-1 sm:flex-none justify-center items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            title={t('admin.config.text_editor.buttons.cancel') + " modifiche"} // Assuming we want some context or just "Annulla"
          >
            <X size={16} /> <span className="sm:inline">{t('admin.config.text_editor.buttons.cancel')}</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 sm:flex-none justify-center items-center gap-2 px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold shadow-lg shadow-indigo-200 transition-all transform active:scale-95"
            title={t('admin.config.text_editor.buttons.save') + " modifiche"}
          >
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <><Check size={16} /> <span className="sm:inline">{t('admin.config.text_editor.buttons.save')}</span></>}
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-5xl mx-auto w-full border-x border-gray-100 shadow-xl sm:my-4 bg-white sm:rounded-lg">
        <MenuBar editor={editor} />
        <div className="flex-1 overflow-y-auto cursor-text relative" onClick={() => editor?.commands.focus()}>
          {/* INJECT MANUAL STYLES FOR HEADINGS (because @tailwindcss/typography is missing) */}
          <style>{`
                      .ProseMirror h1 { font-size: 2.25em; font-weight: 800; line-height: 1.1; margin-bottom: 0.5em; margin-top: 1em; }
                      .ProseMirror h2 { font-size: 1.5em; font-weight: 700; line-height: 1.3; margin-bottom: 0.5em; margin-top: 1em; }
                      .ProseMirror h3 { font-size: 1.25em; font-weight: 600; line-height: 1.4; margin-bottom: 0.5em; margin-top: 1em; }
                      .ProseMirror ul { list-style-type: disc; padding-left: 1.6em; margin: 1em 0; }
                      .ProseMirror ol { list-style-type: decimal; padding-left: 1.6em; margin: 1em 0; }
                      .ProseMirror blockquote { border-left: 4px solid #e5e7eb; padding-left: 1em; font-style: italic; }
                      .ProseMirror code { background-color: #f3f4f6; padding: 0.25em; rounded: 0.25em; font-family: monospace; }
                    `}</style>
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
// Now lightweight, just renders a preview
const ConfigurableTextEditor = ({ textKey, initialContent, onSave, label }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);

  // Auto-load fonts for preview (still needed but lighter than editor instance)
  useEffect(() => {
    if (initialContent) {
      autoLoadFontsFromHTML(initialContent);
    }
  }, [initialContent]);

  const handleSaveWrapper = async (key, content) => {
    await onSave(key, content);
    setIsEditing(false);
  };

  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (isEditing) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isEditing]);

  return (
    <>
      {/* Preview Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 transition-all duration-200 hover:shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 border-b border-gray-100 gap-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 break-all">
            {label || textKey}
          </label>

          <button
            onClick={() => setIsEditing(true)}
            className="w-full sm:w-auto text-center justify-center text-indigo-600 hover:text-indigo-800 text-xs font-medium uppercase tracking-wider flex items-center gap-1 hover:bg-indigo-50 px-3 py-1.5 rounded-lg sm:rounded-full transition-colors border sm:border-transparent border-indigo-100"
          >
            <Maximize2 size={14} /> {t('admin.config.text_editor.buttons.edit')}
          </button>
        </div>

        <div className="p-3 sm:p-4 bg-gray-50/50 min-h-[60px] overflow-hidden">
          <div
            className="prose prose-sm max-w-none text-gray-600 break-words [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded"
            dangerouslySetInnerHTML={{ __html: initialContent || '<em class="text-gray-400">Nessun contenuto.</em>' }}
          />
        </div>
      </div>

      {/* Lazy Loaded Full Screen Modal */}
      {isEditing && (
        <LazyEditor
          content={initialContent}
          onSave={handleSaveWrapper}
          onCancel={() => setIsEditing(false)}
          textKey={textKey}
          label={label}
        />
      )}
    </>
  );
};

export default ConfigurableTextEditor;
