import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { 
  Loader2, Save, Bold, Italic, Underline as UnderlineIcon, 
  List, ListOrdered, Link as LinkIcon, Unlink, RotateCcw, RotateCw, 
  X, Check, Maximize2
} from 'lucide-react';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

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

  // Helper per classi bottone
  const btnClass = (isActive) => 
    `p-1.5 sm:p-2 rounded hover:bg-gray-200 transition-colors ${isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`;

  return (
    <div className="flex flex-wrap gap-0.5 sm:gap-1 p-2 border-b border-gray-200 bg-gray-50 sticky top-0 z-10 items-center justify-center sm:justify-start">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={btnClass(editor.isActive('bold'))}
        title="Grassetto"
      >
        <Bold size={16} className="sm:w-[18px] sm:h-[18px]" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={btnClass(editor.isActive('italic'))}
        title="Corsivo"
      >
        <Italic size={16} className="sm:w-[18px] sm:h-[18px]" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btnClass(editor.isActive('underline'))}
        title="Sottolineato"
      >
        <UnderlineIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
      </button>
      
      <div className="w-px h-6 sm:h-8 bg-gray-300 mx-1 self-center" />

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btnClass(editor.isActive('bulletList'))}
        title="Lista Puntata"
      >
        <List size={16} className="sm:w-[18px] sm:h-[18px]" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btnClass(editor.isActive('orderedList'))}
        title="Lista Numerata"
      >
        <ListOrdered size={16} className="sm:w-[18px] sm:h-[18px]" />
      </button>

      <div className="w-px h-6 sm:h-8 bg-gray-300 mx-1 self-center" />

      <button
        onClick={setLink}
        className={btnClass(editor.isActive('link'))}
        title="Inserisci Link"
      >
        <LinkIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
      </button>
      <button
        onClick={() => editor.chain().focus().unsetLink().run()}
        disabled={!editor.isActive('link')}
        className="p-1.5 sm:p-2 rounded text-gray-600 hover:bg-gray-200 disabled:opacity-30 transition-colors"
        title="Rimuovi Link"
      >
        <Unlink size={16} className="sm:w-[18px] sm:h-[18px]" />
      </button>

      <div className="hidden sm:block w-px h-8 bg-gray-300 mx-1 self-center" />

      <div className="flex ml-auto sm:ml-0 gap-0.5 sm:gap-1">
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="p-1.5 sm:p-2 rounded text-gray-600 hover:bg-gray-200 disabled:opacity-30 transition-colors"
          title="Annulla"
        >
          <RotateCcw size={16} className="sm:w-[18px] sm:h-[18px]" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="p-1.5 sm:p-2 rounded text-gray-600 hover:bg-gray-200 disabled:opacity-30 transition-colors"
          title="Ripeti"
        >
          <RotateCw size={16} className="sm:w-[18px] sm:h-[18px]" />
        </button>
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
    editable: true,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-lg max-w-none p-4 sm:p-6 focus:outline-none min-h-[50vh]',
      },
    },
  });

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
             className="prose prose-sm max-w-none text-gray-600 break-words"
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
