#!/bin/sh
# scripts/generate_languages_config.sh
# Genera un file JSON con le lingue disponibili basandosi sui file in i18n/*.json
# Destinazione: Backend (così l'API può servirlo)

I18N_DIR="./i18n"
# Creiamo la directory fixtures se non esiste
OUTPUT_DIR="./backend/core/fixtures"
OUTPUT_FILE="$OUTPUT_DIR/languages.json"

mkdir -p "$OUTPUT_DIR"

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
        
        # Semplice estrazione label/flag potrebbe essere aggiunta se i file i18n contenessero metadati
        # Per ora usiamo switch case bash brutale per flag, o solo codice.
        # Facciamo un oggetto JSON più ricco
        
        FLAG=""
        LABEL=""
        case "$lang" in
            "it") FLAG="🇮🇹"; LABEL="Italiano" ;;
            "en") FLAG="🇬🇧"; LABEL="English" ;;
            "es") FLAG="🇪🇸"; LABEL="Español" ;;
            "fr") FLAG="🇫🇷"; LABEL="Français" ;;
            "de") FLAG="🇩🇪"; LABEL="Deutsch" ;;
            *) FLAG="🌍"; LABEL="$lang" ;;
        esac
        
        echo "  {\"code\": \"$lang\", \"label\": \"$LABEL\", \"flag\": \"$FLAG\"}" >> "$OUTPUT_FILE"
    fi
done

echo "]" >> "$OUTPUT_FILE"

echo "Generated $OUTPUT_FILE with languages found in $I18N_DIR"
