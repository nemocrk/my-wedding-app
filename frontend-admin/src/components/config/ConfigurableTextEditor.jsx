import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent, Mark, mergeAttributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import GoogleFontPicker from '../ui/GoogleFontPicker';
import { autoLoadFontsFromHTML } from '../../utils/fontLoader';

import {
  Loader2, Bold, Italic, Underline as UnderlineIcon,
  Link as LinkIcon, Unlink, RotateCcw, RotateCw,
  X, Check, Maximize2, Strikethrough, Code, Highlighter,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Image as ImageIcon,
  Heading1, Heading2, Type, RefreshCw
} from 'lucide-react';

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

  if (!editor) {
    return null;
  }

  const googleFontsApiKey = import.meta.env.VITE_GOOGLE_FONTS_API_KEY;

  // Sync active font from editor state
  useEffect(() => {
    const currentFont = editor.getAttributes('textStyle').fontFamily;
    if (currentFont) {
      const cleanFont = currentFont.split(',')[0].replace(/['"`]/g, '').trim();
      setActiveFontFamily(cleanFont);
    }
  }, [editor.getAttributes('textStyle').fontFamily]);

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt('URL Immagine');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  // Helper per classi bottone
  const btnClass = (isActive) =>
    `p-1.5 sm:p-2 rounded hover:bg-gray-200 transition-colors ${isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'} disabled:opacity-30 disabled:cursor-not-allowed`;

  const iconSize = "w-4 h-4 sm:w-[18px] sm:h-[18px]";

  const ROTATIONS = [
      { label: '0°', value: 0 },
      { label: '-1°', value: -1 },
      { label: '1°', value: 1 },
      { label: '-2°', value: -2 },
      { label: '2°', value: 2 },
      { label: '-3°', value: -3 },
      { label: '3°', value: 3 },
      { label: '-5°', value: -5 },
      { label: '5°', value: 5 },
  ];

  return (
    <div className="flex flex-wrap gap-0.5 sm:gap-1 p-2 border-b border-gray-200 bg-gray-50 sticky top-0 z-10 items-center justify-start">
      {/* History */}
      <div className="flex gap-0.5 mr-1 border-r border-gray-300 pr-1">
        <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().chain().focus().undo().run()} className={btnClass(false)} title="Annulla"><RotateCcw className={iconSize} /></button>
        <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().chain().focus().redo().run()} className={btnClass(false)} title="Ripeti"><RotateCw className={iconSize} /></button>
      </div>

      {/* Headings */}
      <div className="flex gap-0.5 mr-1 border-r border-gray-300 pr-1 items-center">
         <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={btnClass(editor.isActive('heading', { level: 1 }))}
            title="Heading 1"
         >
           <Heading1 className={iconSize} />
         </button>
         <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={btnClass(editor.isActive('heading', { level: 2 }))}
            title="Heading 2"
         >
           <Heading2 className={iconSize} />
         </button>
         <button
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={btnClass(editor.isActive('paragraph'))}
            title="Paragrafo"
         >
           <Type className={iconSize} />
         </button>
      </div>

      {/* Fonts & Color */}
      <div className="flex gap-1 mr-1 border-r border-gray-300 pr-1 items-center">
          <GoogleFontPicker
            apiKey={googleFontsApiKey}
            activeFamily={activeFontFamily}
            onSelect={(font) => {
              const fontFamily = `"${font.family}", ${font.category || 'sans-serif'}`;
              editor.chain().focus().setFontFamily(fontFamily).run();
              setActiveFontFamily(font.family);
            }}
          />

          {/* Color Picker */}
          <div className="relative flex items-center">
             <input
                type="color"
                onInput={event => editor.chain().focus().setColor(event.target.value).run()}
                value={editor.getAttributes('textStyle').color || '#000000'}
                className="w-6 h-6 p-0 border-0 rounded overflow-hidden cursor-pointer"
                title="Colore Testo"
             />
          </div>
      </div>

       {/* Rotation */}
       <div className="flex gap-1 mr-1 border-r border-gray-300 pr-1 items-center">
          <div className="relative group flex items-center gap-1">
             <RefreshCw className="w-4 h-4 text-gray-500" />
             <select
                className="appearance-none bg-transparent hover:bg-gray-200 pl-1 pr-4 py-1 rounded text-xs font-medium text-gray-700 cursor-pointer focus:outline-none"
                onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    editor.chain().focus().setRotation(val).run();
                }}
                value={editor.getAttributes('rotation').angle || 0}
            >
                {ROTATIONS.map(rot => (
                    <option key={rot.label} value={rot.value}>{rot.label}</option>
                ))}
            </select>
          </div>
       </div>

      {/* Basic Formatting */}
      <div className="flex gap-0.5 mr-1 border-r border-gray-300 pr-1 flex-wrap">
        <button onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="Grassetto"><Bold className={iconSize} /></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="Corsivo"><Italic className={iconSize} /></button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))} title="Barrato"><Strikethrough className={iconSize} /></button>
        <button onClick={() => editor.chain().focus().toggleCode().run()} disabled={!editor.can().chain().focus().toggleCode().run()} className={btnClass(editor.isActive('code'))} title="Codice Inline"><Code className={iconSize} /></button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive('underline'))} title="Sottolineato"><UnderlineIcon className={iconSize} /></button>
        <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={btnClass(editor.isActive('highlight'))} title="Evidenzia"><Highlighter className={iconSize} /></button>
      </div>

      {/* Alignment */}
      <div className="flex gap-0.5 mr-1 border-r border-gray-300 pr-1 flex-wrap">
        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btnClass(editor.isActive({ textAlign: 'left' }))} title="Allinea Sx"><AlignLeft className={iconSize} /></button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btnClass(editor.isActive({ textAlign: 'center' }))} title="Allinea Centro"><AlignCenter className={iconSize} /></button>
        <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btnClass(editor.isActive({ textAlign: 'right' }))} title="Allinea Dx"><AlignRight className={iconSize} /></button>
        <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={btnClass(editor.isActive({ textAlign: 'justify' }))} title="Giustifica"><AlignJustify className={iconSize} /></button>
      </div>

      {/* Insert */}
      <div className="flex gap-0.5">
        <button onClick={setLink} className={btnClass(editor.isActive('link'))} title="Link"><LinkIcon className={iconSize} /></button>
        <button onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')} className={btnClass(false)} title="Rimuovi Link"><Unlink className={iconSize} /></button>
        <button onClick={addImage} className={btnClass(false)} title="Inserisci Immagine"><ImageIcon className={iconSize} /></button>
      </div>
    </div>
  );
};

const ConfigurableTextEditor = ({ textKey, initialContent, onSave, label }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // TipTap configuration
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: true }),
      Subscript,
      Superscript,
      Highlight,
      TextStyle,
      Color,
      FontFamily,
      Rotation,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-600 hover:underline',
        },
      }),
    ],
    content: initialContent || '',
    editable: true,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-lg max-w-none p-4 sm:p-6 focus:outline-none min-h-[50vh] [&_img]:max-w-full [&_img]:rounded-lg',
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
            view.props.editor.commands.insertContent(text);
            return true;
          }
        }
        return false;
      }
    },
  });

  // Auto-load fonts from initial content (for preview/editing)
  useEffect(() => {
    if (initialContent) {
      autoLoadFontsFromHTML(initialContent);
    }
  }, [initialContent]);

  // Sync content when initialContent changes (and not editing)
  useEffect(() => {
    if (editor && initialContent !== undefined && !isEditing) {
      const currentContent = editor.getHTML();
      if (initialContent !== currentContent) {
         editor.commands.setContent(initialContent || '');
      }
    }
  }, [initialContent, editor, isEditing]);

  const handleSave = async () => {
    if (!editor) return;

    setIsSaving(true);
    const htmlContent = editor.getHTML();

    try {
      await onSave(textKey, htmlContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save text:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (editor) {
      editor.commands.setContent(initialContent || '');
    }
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 transition-all duration-200 hover:shadow-md" data-testid={`editor-${textKey}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 border-b border-gray-100 gap-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 break-all">
            {label || textKey}
          </label>

          <button
            onClick={() => setIsEditing(true)}
            className="w-full sm:w-auto text-center justify-center text-indigo-600 hover:text-indigo-800 text-xs font-medium uppercase tracking-wider flex items-center gap-1 hover:bg-indigo-50 px-3 py-1.5 rounded-lg sm:rounded-full transition-colors border sm:border-transparent border-indigo-100"
            data-testid={`edit-${textKey}`}
          >
            <Maximize2 size={14} /> Modifica
          </button>
        </div>

        <div className="p-3 sm:p-4 bg-gray-50/50 min-h-[60px] overflow-hidden">
           <div
             className="prose prose-sm max-w-none text-gray-600 break-words [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded"
             dangerouslySetInnerHTML={{ __html: initialContent || '<em class="text-gray-400">Nessun contenuto.</em>' }}
           />
        </div>
      </div>

      {/* Full Screen Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-fadeIn">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200 bg-white shadow-sm shrink-0 gap-3">
            <div className="flex flex-col w-full sm:w-auto">
              <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Modifica</span>
              <h2 className="text-sm sm:text-xl font-bold text-gray-800 truncate max-w-[280px] sm:max-w-md" title={label || textKey}>
                {label || textKey}
              </h2>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleCancel}
                className="flex-1 sm:flex-none justify-center items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                title="Annulla modifiche"
                data-testid={`cancel-${textKey}`}
              >
                <X size={16} /> <span className="sm:inline">Annulla</span>
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 sm:flex-none justify-center items-center gap-2 px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold shadow-lg shadow-indigo-200 transition-all transform active:scale-95"
                title="Salva modifiche"
                data-testid={`save-${textKey}`}
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <><Check size={16} /> <span className="sm:inline">Salva</span></>}
              </button>
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 overflow-hidden flex flex-col max-w-5xl mx-auto w-full border-x border-gray-100 shadow-xl sm:my-4 bg-white sm:rounded-lg">
             <MenuBar editor={editor} />
             <div className="flex-1 overflow-y-auto cursor-text" onClick={() => editor?.commands.focus()}>
                <EditorContent editor={editor} data-testid={`tiptap-content-${textKey}`} className="h-full" />
             </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConfigurableTextEditor;
