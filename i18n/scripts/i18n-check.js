import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurazione
const LOCALES_DIR = path.join(__dirname, '../');
const SRC_DIR = path.join(__dirname, '../../frontend-user/src');

// Colori per output console
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m"
};

// ==========================================
// 1. Verifica Allineamento Chiavi (IT vs EN)
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

async function checkKeyAlignment() {
    console.log(`${colors.cyan}=== CONTROLLO ALLINEAMENTO CHIAVI (IT <-> EN) ===${colors.reset}\n`);

    const itPath = path.join(LOCALES_DIR, 'it.json');
    const enPath = path.join(LOCALES_DIR, 'en.json');

    if (!fs.existsSync(itPath) || !fs.existsSync(enPath)) {
        console.error(`${colors.red}ERRORE: File di traduzione non trovati in ${LOCALES_DIR}${colors.reset}`);
        // Tenta di trovarli se path diverso
        console.log(`Cerco in posizioni alternative...`);
        return;
    }

    try {
        const itJson = JSON.parse(fs.readFileSync(itPath, 'utf8'));
        const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));

        const it = flattenObject(itJson);
        const en = flattenObject(enJson);

        const itKeys = Object.keys(it);
        const enKeys = Object.keys(en);

        const missingInEn = itKeys.filter(k => !enKeys.includes(k));
        const missingInIt = enKeys.filter(k => !itKeys.includes(k));

        if (missingInEn.length === 0 && missingInIt.length === 0) {
            console.log(`${colors.green}✔ I file sono perfettamente allineati!${colors.reset}`);
        } else {
            if (missingInEn.length > 0) {
                console.log(`${colors.yellow}⚠ Chiavi presenti in IT ma mancanti in EN (${missingInEn.length}):${colors.reset}`);
                missingInEn.forEach(k => console.log(`  - ${k} ==> Valore IT: "${it[k]}"`));
            }
            if (missingInIt.length > 0) {
                console.log(`${colors.yellow}⚠ Chiavi presenti in EN ma mancanti in IT (${missingInIt.length}):${colors.reset}`);
                missingInIt.forEach(k => console.log(`  - ${k} ==> Valore EN: "${en[k]}"`));
            }
        }
    } catch (err) {
        console.error(`${colors.red}Errore durante il parsing dei JSON:${colors.reset}`, err.message);
    }
    console.log("\n");
}

// ==========================================
// 2. Verifica Chiavi Mancanti nel Codice
// ==========================================
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(file => {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.ts')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

async function findMissingKeys() {
    console.log(`${colors.cyan}=== RICERCA CHIAVI MANCANTI NEL CODICE ===${colors.reset}\n`);

    const itPath = path.join(LOCALES_DIR, 'it.json');
    if (!fs.existsSync(itPath)) {
        console.error("File IT non trovato, impossibile verificare.");
        return;
    }

    const itJson = JSON.parse(fs.readFileSync(itPath, 'utf8'));
    const definedKeys = Object.keys(flattenObject(itJson));

    const files = getAllFiles(SRC_DIR);
    const usedKeys = new Set();
    
    // Regex per trovare t('chiave') o i18nKey="chiave"
    // Cattura: t('key'), t("key"), i18nKey="key", i18nKey='key'
    const regex = /[^a-zA-Z0-9](?:t\s*\(\s*['"]([a-zA-Z0-9_.-]+)['"]|i18nKey\s*=\s*['"]([a-zA-Z0-9_.-]+)['"])/g;

    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        let match;
        while ((match = regex.exec(content)) !== null) {
            const key = match[1] || match[2];
            if (key) usedKeys.add(key);
        }
    });

    const missingKeys = [...usedKeys].filter(key => !definedKeys.includes(key));

    if (missingKeys.length === 0) {
        console.log(`${colors.green}✔ Tutte le chiavi usate nel codice sono definite nei file di traduzione!${colors.reset}`);
    } else {
        console.log(`${colors.red}✘ Trovate ${missingKeys.length} chiavi usate nel codice ma NON definite in it.json:${colors.reset}`);
        missingKeys.sort().forEach(k => console.log(`  - ${k}`));
    }
    
    // Optional: Check unused keys
    const unusedKeys = definedKeys.filter(k => !usedKeys.has(k));
    console.log(`\n(Info) Chiavi definite ma apparentemente non usate (${unusedKeys.length})`);
}

// ==========================================
// Esecuzione
// ==========================================
async function run() {
    await checkKeyAlignment();
    await findMissingKeys();
}

run();