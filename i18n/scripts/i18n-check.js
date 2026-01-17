import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// CONFIGURAZIONE
// ==========================================

// Cartella dove risiedono i file di traduzione (es. i18n/*.json)
// Risaliamo di uno step da scripts/
const LOCALES_DIR = path.join(__dirname, '..'); 

// Root del repository (../../ da i18n/scripts/)
const REPO_ROOT = path.join(__dirname, '../../');

// Cartelle sorgenti React da scansionare per l'uso delle chiavi
const SOURCE_DIRS = [
    path.join(REPO_ROOT, 'frontend-user/src'),
    path.join(REPO_ROOT, 'frontend-admin/src'),
    // Aggiungi qui eventuali altre cartelle future
];

// Colori per output console
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    bold: "\x1b[1m"
};

// ==========================================
// UTILS
// ==========================================

function flattenObject(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
            Object.assign(acc, flattenObject(obj[k], pre + k));
        } else {
            acc[pre + k] = obj[k];
        }
        return acc;
    }, {});
}

function getAllFiles(dirPath, arrayOfFiles) {
    if (!fs.existsSync(dirPath)) return arrayOfFiles || [];
    
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            // Cerca file sorgente JS/TS
            if (file.match(/\.(js|jsx|ts|tsx)$/)) {
                arrayOfFiles.push(fullPath);
            }
        }
    });

    return arrayOfFiles;
}

// ==========================================
// 1. Verifica Allineamento Chiavi (Cross-File)
// ==========================================
async function checkKeyAlignment() {
    console.log(`${colors.cyan}${colors.bold}=== 1. CONTROLLO ALLINEAMENTO FILE JSON ===${colors.reset}\n`);

    // Trova tutti i file .json nella LOCALES_DIR (non ricorsivo, solo root i18n)
    const localeFiles = fs.readdirSync(LOCALES_DIR)
        .filter(file => file.endsWith('.json') && !file.startsWith('package')); // Escludi package.json se presente

    if (localeFiles.length < 2) {
        console.log(`${colors.yellow}Meno di 2 file di traduzione trovati (${localeFiles.join(', ')}). Impossibile confrontare.${colors.reset}`);
        // Se c'è un solo file, restituiscilo comunque per il controllo codice
        if (localeFiles.length === 1) {
             const content = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, localeFiles[0]), 'utf8'));
             return Object.keys(flattenObject(content));
        }
        return [];
    }

    console.log(`File di traduzione trovati: ${localeFiles.join(', ')}\n`);

    const fileContentMap = {};
    const fileKeysMap = {};
    let allKeysSet = new Set();

    // Carica tutti i file e appiattisci le chiavi
    localeFiles.forEach(file => {
        try {
            const content = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'));
            fileContentMap[file] = content;
            const flat = flattenObject(content);
            const keys = Object.keys(flat);
            fileKeysMap[file] = keys;
            keys.forEach(k => allKeysSet.add(k));
        } catch (err) {
            console.error(`${colors.red}Errore lettura ${file}:${colors.reset}`, err.message);
        }
    });

    const allKeys = Array.from(allKeysSet).sort();
    let hasErrors = false;

    // Confronta ogni file contro l'insieme completo di tutte le chiavi trovate
    localeFiles.forEach(file => {
        const myKeys = fileKeysMap[file];
        const missing = allKeys.filter(k => !myKeys.includes(k));

        if (missing.length > 0) {
            hasErrors = true;
            console.log(`${colors.yellow}⚠ Nel file ${colors.bold}${file}${colors.reset}${colors.yellow} mancano ${missing.length} chiavi:${colors.reset}`);
            missing.forEach(k => {
                // Tenta di trovare il valore originale in un altro file per suggerimento
                const otherFile = localeFiles.find(f => f !== file && fileContentMap[f] && flattenObject(fileContentMap[f])[k]);
                const suggestion = otherFile ? flattenObject(fileContentMap[otherFile])[k] : '???';
                console.log(`  - ${k} ${colors.blue}(es. in ${otherFile}: "${suggestion}")${colors.reset}`);
            });
            console.log('');
        } else {
            console.log(`${colors.green}✔ ${file} è completo (ha tutte le chiavi note).${colors.reset}`);
        }
    });

    if (!hasErrors) {
        console.log(`\n${colors.green}${colors.bold}Tutti i file di traduzione sono allineati!${colors.reset}\n`);
    } else {
        console.log(`\n${colors.red}${colors.bold}Ci sono disallineamenti tra i file di traduzione.${colors.reset}\n`);
    }

    return allKeys; // Restituisce tutte le chiavi valide conosciute per il controllo successivo
}

// ==========================================
// 2. Verifica Chiavi Mancanti nel Codice
// ==========================================
async function findMissingKeys(validKeys) {
    console.log(`${colors.cyan}${colors.bold}=== 2. RICERCA CHIAVI NEL CODICE SORGENTE ===${colors.reset}\n`);

    if (!validKeys || validKeys.length === 0) {
        console.error("Nessuna chiave valida caricata dai file JSON. Salto controllo codice.");
        return;
    }

    console.log(`Scansione directory sorgenti:`);
    SOURCE_DIRS.forEach(d => console.log(`  - ${path.relative(REPO_ROOT, d)}`));
    console.log('');

    let allSourceFiles = [];
    SOURCE_DIRS.forEach(dir => {
        allSourceFiles = allSourceFiles.concat(getAllFiles(dir));
    });

    console.log(`Analisi di ${allSourceFiles.length} file sorgente...\n`);

    const usedKeys = new Set();
    
    // Regex migliorata:
    // Cattura t('key'), t("key"), i18nKey="key", i18nKey='key', getText('key'), getTranslation('key')
    // Supporta anche spazi variabili
    const regex = /[^a-zA-Z0-9](?:t|getTranslation)\s*\(\s*['"]([a-zA-Z0-9_.-]+)['"]|i18nKey\s*=\s*['"]([a-zA-Z0-9_.-]+)['"]/g;

    allSourceFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        let match;
        while ((match = regex.exec(content)) !== null) {
            const key = match[1] || match[2];
            // Filtra chiavi palesemente dinamiche o interpolate (se contengono ${ o +)
            // La regex sopra cattura stringhe fisse, ma per sicurezza:
            if (key && !key.includes('${') && !key.includes("' +") && !key.includes('" +')) {
                usedKeys.add(key);
            }
        }
    });

    const definedKeys = new Set(validKeys);
    const missingKeys = [...usedKeys].filter(key => !definedKeys.has(key));

    if (missingKeys.length === 0) {
        console.log(`${colors.green}${colors.bold}✔ Tutte le chiavi fisse trovate nel codice sono definite nei file di traduzione!${colors.reset}`);
    } else {
        console.log(`${colors.red}${colors.bold}✘ Trovate ${missingKeys.length} chiavi usate nel codice ma NON definite nei file JSON:${colors.reset}`);
        missingKeys.sort().forEach(k => console.log(`  - ${k}`));
    }
    
    // Optional: Check unused keys
    const unusedKeys = validKeys.filter(k => !usedKeys.has(k));
    console.log(`\n(Info) Chiavi definite ma apparentemente non usate (${unusedKeys.length}) - Nota: potrebbero essere usate dinamicamente.`);
    unusedKeys.sort().forEach(k => console.log(`  - ${k}`));
}

// ==========================================
// Esecuzione
// ==========================================
async function run() {
    try {
        const validKeys = await checkKeyAlignment();
        await findMissingKeys(validKeys);
    } catch (e) {
        console.error("Errore script:", e);
    }
}

run();