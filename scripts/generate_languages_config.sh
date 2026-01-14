#!/bin/sh
# scripts/generate_languages_config.sh
# Genera un file JSON con le lingue disponibili basandosi sui file in i18n/*.json

# Path configurazione
I18N_DIR="./i18n"
OUTPUT_FILE="./frontend-admin/src/config/languages.json"
mkdir -p ./frontend-admin/src/config

# Genera array JSON
echo "[" > "$OUTPUT_FILE"
FIRST=1

for file in "$I18N_DIR"/*.json; do
    if [ -f "$file" ]; then
        filename=$(basename -- "$file")
        lang="${filename%.*}"
        
        if [ $FIRST -eq 1 ]; then
            FIRST=0
        else
            echo "," >> "$OUTPUT_FILE"
        fi
        
        echo "  \"$lang\"" >> "$OUTPUT_FILE"
    fi
done

echo "]" >> "$OUTPUT_FILE"

echo "Generated $OUTPUT_FILE with languages found in $I18N_DIR"
