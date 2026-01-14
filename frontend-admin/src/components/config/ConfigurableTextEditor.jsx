import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { 
  Loader2, Save, Undo, Bold, Italic, Underline as UnderlineIcon, 
  List, ListOrdered, Link as LinkIcon, Unlink, RotateCcw, RotateCw, 
  Trash2, X, Check
} from 'lucide-react';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-1 rounded ${editor.isActive('bold') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Grassetto"
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-1 rounded ${editor.isActive('italic') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Corsivo"
      >
        <Italic size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-1 rounded ${editor.isActive('underline') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Sottolineato"
      >
        <UnderlineIcon size={16} />
      </button>
      
      <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1 rounded ${editor.isActive('bulletList') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Lista Puntata"
      >
        <List size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1 rounded ${editor.isActive('orderedList') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Lista Numerata"
      >
        <ListOrdered size={16} />
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

      <button
        onClick={setLink}
        className={`p-1 rounded ${editor.isActive('link') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Inserisci Link"
      >
        <LinkIcon size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().unsetLink().run()}
        disabled={!editor.isActive('link')}
        className="p-1 rounded text-gray-600 hover:bg-gray-200 disabled:opacity-30"
        title="Rimuovi Link"
      >
        <Unlink size={16} />
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="p-1 rounded text-gray-600 hover:bg-gray-200 disabled:opacity-30"
        title="Annulla"
      >
        <RotateCcw size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="p-1 rounded text-gray-600 hover:bg-gray-200 disabled:opacity-30"
        title="Ripeti"
      >
        <RotateCw size={16} />
      </button>
    </div>
  );
};

const ConfigurableTextEditor = ({ textKey, initialContent, onSave, label }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // TipTap configuration
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-600 hover:underline',
        },
      }),
    ],
    content: initialContent || '',
    editable: isEditing,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none p-4 min-h-[100px] focus:outline-none',
      },
    },
  });

  // Sync content when initialContent changes or edit mode changes
  useEffect(() => {
    if (editor && initialContent !== undefined) {
      const currentContent = editor.getHTML();
      // Only set content if it's different to prevent cursor jumps or resets, 
      // but always set it if we are just entering edit mode or initial load
      if (initialContent !== currentContent && !isEditing) {
         editor.commands.setContent(initialContent || '');
      }
    }
  }, [initialContent, editor, isEditing]);

  // Toggle editable state on editor when React state changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
    }
  }, [isEditing, editor]);

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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 transition-all duration-200 hover:shadow-md" data-testid={`editor-${textKey}`}>
      <div className="flex justify-between items-center p-3 bg-gray-50 border-b border-gray-100 rounded-t-lg">
        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          {label || textKey}
        </label>
        
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium uppercase tracking-wider flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
            data-testid={`edit-${textKey}`}
          >
            Modifica
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-xs font-medium px-2 py-1 hover:bg-gray-200 rounded transition-colors"
              title="Annulla modifiche"
              data-testid={`cancel-${textKey}`}
            >
              <X size={14} /> Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 text-green-600 hover:text-green-800 text-xs font-bold px-2 py-1 hover:bg-green-50 rounded transition-colors"
              title="Salva modifiche"
              data-testid={`save-${textKey}`}
            >
              {isSaving ? <Loader2 className="animate-spin" size={14} /> : <><Check size={14} /> Salva</>}
            </button>
          </div>
        )}
      </div>

      <div className={`transition-colors ${isEditing ? 'bg-white' : 'bg-gray-50/50'}`}>
        {isEditing && <MenuBar editor={editor} />}
        
        <div className={!isEditing ? 'opacity-90' : ''}>
          <EditorContent editor={editor} data-testid={`tiptap-content-${textKey}`} />
        </div>
      </div>
      
      {!isEditing && !initialContent && (
        <div className="px-4 pb-3 pt-0 text-gray-400 text-xs italic">
          Nessun contenuto configurato. Clicca su Modifica per aggiungere del testo.
        </div>
      )}
    </div>
  );
};

export default ConfigurableTextEditor;
