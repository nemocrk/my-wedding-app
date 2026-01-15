#!/bin/bash

# Colori per l'output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Percorso assoluto della directory target
TARGET_DIR=$(realpath "${1:-.}")
TEMP_DIR=".temp_i18n_scanner"

echo -e "${BLUE}=== INIZIO SCANSIONE REPOSITORY ===${NC}"
echo -e "Target: $TARGET_DIR\n"

# ==========================================
# PARTE 1: ANALISI PYTHON (AST)
# ==========================================
echo -e "${BLUE}[1/2] Analisi Python (usando AST nativo)...${NC}"

cat << 'EOF' > _temp_py_scanner.py
import os
import ast
import sys

IGNORED_DIRS = {'.git', 'node_modules', '__pycache__', 'dist', 'build', 'venv', '.venv', 'env', 'migrations', 'tests', '.temp_i18n_scanner'}
TRANSLATION_FUNCS = {'_', 'gettext', 'ugettext', 'lazy_gettext', 't', 'translate'}

class StringVisitor(ast.NodeVisitor):
    def __init__(self):
        self.issues = []
    
    def visit_Call(self, node):
        func_name = None
        if isinstance(node.func, ast.Name): func_name = node.func.id
        elif isinstance(node.func, ast.Attribute): func_name = node.func.attr
        if func_name in TRANSLATION_FUNCS: return
        self.generic_visit(node)

    def visit_Constant(self, node):
        if isinstance(node.value, str): self._check(node.value, node.lineno)
    
    def visit_Str(self, node): 
        self._check(node.s, node.lineno)

    def _check(self, text, lineno):
        text = text.strip()
        if not text or ' ' not in text: return 
        if text.startswith(('http', '/', '.', '{')): return
        self.issues.append((lineno, text))

def scan(path):
    count = 0
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f: tree = ast.parse(f.read())
                    v = StringVisitor()
                    v.visit(tree)
                    if v.issues:
                        print(f"\033[96m{os.path.relpath(filepath, path)}\033[0m")
                        for line, txt in v.issues:
                            print(f"  Line {line}: \"{txt}\"")
                            count += 1
                except: pass
    return count

if __name__ == "__main__":
    sys.exit(scan(sys.argv[1]))
EOF

python3 _temp_py_scanner.py "$TARGET_DIR"
rm _temp_py_scanner.py

echo -e "${GREEN}Analisi Python completata.${NC}\n"


# ==========================================
# PARTE 2: ANALISI REACT (Installazione Isolata)
# ==========================================
echo -e "${BLUE}[2/2] Analisi React (Setup ambiente temporaneo)...${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Errore: npm non trovato.${NC}"
    exit 1
fi

# 1. Creiamo una cartella temporanea per installare le dipendenze senza sporcare il progetto
mkdir -p "$TEMP_DIR"

# 2. Creiamo un package.json minimale nella temp dir
echo '{"private": true}' > "$TEMP_DIR/package.json"

# 3. Creiamo la config ESLint nella temp dir
cat << 'EOF' > "$TEMP_DIR/.eslintrc.json"
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module",
    "ecmaFeatures": { "jsx": true }
  },
  "plugins": ["i18next"],
  "rules": {
    "i18next/no-literal-string": ["warn", { 
      "markupOnly": true,
      "ignoreAttribute": ["className", "style", "src", "href", "to", "key", "id", "ref", "width", "height", "alt", "type", "role", "target", "as"]
    }]
  }
}
EOF

# 4. Installiamo le dipendenze nella cartella temporanea (silenziosamente)
# Usiamo versioni specifiche compatibili tra loro
echo "Installazione dipendenze scanner (richiede qualche secondo)..."
cd "$TEMP_DIR" || exit
npm install --silent --no-audit --no-fund \
    eslint@8.57.0 \
    typescript \
    @typescript-eslint/parser@7.0.0 \
    eslint-plugin-i18next

# 5. Eseguiamo ESLint puntando alla directory originale
echo -e "Esecuzione scansione React..."
./node_modules/.bin/eslint \
    --config .eslintrc.json \
    --no-eslintrc \
    --ext .js,.jsx,.ts,.tsx \
    "$TARGET_DIR"

# 6. Pulizia
cd ..
rm -rf "$TEMP_DIR"

echo -e "\n${BLUE}=== SCANSIONE COMPLETATA ===${NC}"