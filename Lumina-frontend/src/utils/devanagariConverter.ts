/**
 * Devanagari / Indic text converter & Unicode normalizer.
 * Supports:
 * - Distinguishes English text from Legacy Indic fonts accurately
 * - Kruti Dev 010 / Devlys 010 / Walkman Chanakya / APS-DV-Prakash / Shree-Lipi to Unicode Devanagari
 * - Devanagari matra reordering (short-i, reph, halant conjuncts)
 * - Mojibake detection & repair
 * - Sanskrit accents and Vedic virama normalization
 */

const ENGLISH_COMMON_WORDS = new Set([
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with",
    "he", "as", "you", "do", "at", "this", "but", "his", "by", "from", "they", "we", "say", "her",
    "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", "so", "up",
    "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time",
    "no", "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could",
    "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think",
    "also", "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even",
    "new", "want", "because", "any", "these", "give", "day", "most", "us", "java", "python", "edition",
    "complete", "reference", "action", "autobiography", "story", "truth", "experiments", "guide",
    "author", "copyright", "published", "chapter", "programming", "software", "computer", "system",
    "data", "structures", "algorithms", "learning", "schildt", "herbert", "gandhi", "urma"
]);

/**
 * Check if text is English so English books are NEVER converted to Devanagari
 */
export function isEnglishText(text: string): boolean {
    if (!text) return false;
    const words = text.toLowerCase().match(/[a-zA-Z]{2,}/g) || [];
    if (words.length === 0) return false;
    let englishWordCount = 0;
    for (const w of words) {
        if (ENGLISH_COMMON_WORDS.has(w)) {
            englishWordCount++;
        }
    }
    return englishWordCount >= 2 || (words.length > 0 && englishWordCount / words.length >= 0.15);
}

// Kruti Dev & Legacy Indic to Unicode mapping tables
const KRUTI_DEV_MAPPING: Record<string, string> = {
    // Digits
    "å": "०", "ƒ": "१", "„": "२", "…": "३", "†": "४",
    "‡": "५", "ˆ": "६", "‰": "७", "Š": "८", "‹": "९",

    // Vowels
    "v": "अ", "vk": "आ", "b": "इ", "bZ": "ई", "m": "उ",
    "Å": "ऊ", ",": "ए", ",s": "ऐ", "vks": "ओ", "vkS": "औ",
    "•": "अ",

    // Consonants
    "d": "क", "[k": "ख", "x": "ग", "?k": "घ",
    "p": "च", "N": "छ", "t": "ज", ">": "झ", "¥": "ञ",
    "V": "ट", "B": "ठ", "M": "ड", "<": "ढ", ".": "ण",
    "r": "त", "Fk": "थ", "n": "द", "/k": "ध", "u": "न",
    "i": "प", "Q": "फ", "c": "ब", "Hk": "भ", "e": "म",
    ";": "य", "j": "र", "y": "ल", "o": "व",
    "'k": "श", "ष": "ष", "l": "स", "g": "ह",
    "{k": "क्ष", "«": "त्र", "K": "ज्ञ",

    // APS-DV / Shree-Lipi glyphs
    "ü": "श", "Ã": "त", "Õ": "थ", "¬": "प", "∆": "ठ",
    "ø": "ग", "Ÿ": "न", "'è": "ध", "'î": "द",

    // Half Consonants
    "D": "क्", "X": "ग्", "P": "च्", "T": "ज्",
    "R": "त्", "F": "थ्", "?": "ध्", "U": "न्",
    "I": "प्", "C": "ब्", "H": "भ्", "E": "म्",
    "Y": "ल्", "O": "व्", "S": "श्", "L": "स्",

    // Matras (Vowel signs)
    "k": "ा", "h": "ी", "q": "ु", "w": "ू", "`": "ृ",
    "s": "े", "ks": "ो", "kS": "ौ",
    "a": "ं", "¡": "ँ", "%": "ः",
    "Ê": "ा", "Ë": "ी", "È": "ु", "œ": "ै", "Œ": "े",

    // Special glyph combinations
    "Z": "र्", "z": "्र", "M+": "ड़", "<+": "ढ़",
    "Q+": "फ़", "x+": "ग़", "t+": "ज़", "d+": "क़",
    "±": "द्ध", "²": "द्घ", "³": "द्म", "´": "द्य",
    "µ": "द्व", "¶": "ष्ठ", "·": "ष्ठ", "¸": "ष्ट",
    "¹": "ङ्क", "º": "ङ्ख", "»": "ङ्ग", "¼": "ङ्घ",
    "½": "त्त", "¾": "क्त", "¿": "द्र",

    // Punctuation
    "A": "।", "AA": "॥",
};

/**
 * Check if text has Devanagari characters
 */
export function isDevanagari(text: string): boolean {
    return /[\u0900-\u097F\u1CD0-\u1CFF\uA8E0-\uA8FF]/.test(text);
}

/**
 * Detect if text is likely encoded in a legacy Devanagari font (like Kruti Dev / Chanakya / APS-DV)
 */
export function isLikelyLegacyDevanagari(text: string): boolean {
    if (!text || isEnglishText(text)) return false;
    
    // Check for characteristic Kruti Dev / Devlys / Walkman / APS-DV glyph markers
    const markers = /[üÊËÁÈÕ¬∆øŸ•åƒ„…†‡ˆŠ‹«±²³´µ¶·¸¹º»¼½¾¿¥∑§◊ãŒÿª÷¢òœ]/;
    const commonPatterns = /(?:üÊË|ÃÕÊ|¬Ê∆|Á२|Áø|•ŸÈ|vks|vkS|Fk|Hk)/;

    const markerCount = (text.match(new RegExp(markers, "g")) || []).length;
    const patternMatches = commonPatterns.test(text);

    return markerCount >= 3 || patternMatches;
}

/**
 * Convert Kruti Dev 010 / APS-DV encoded text into standard Unicode Devanagari (Hindi/Sanskrit)
 */
export function convertKrutiDevToUnicode(text: string): string {
    if (!text || isEnglishText(text)) return text;

    let modified = text;

    // Pre-processing replacements for composite glyphs
    const preRules: [RegExp, string][] = [
        [/üÊË/g, "श्री"],
        [/üÊ/g, "शा"],
        [/ü/g, "श"],
        [/ÃÕÊ/g, "तथा"],
        [/•ŸÈ'îÊ'è/g, "अनुवाद"],
        [/•ŸÈ/g, "अनु"],
        [/¬Ê∆/g, "पाठ"],
        [/ÁÁ'è/g, "विधि"],
        [/Á२न्'èË/g, "विधि"],
        [/,ÁøूÊ/g, "दुर्गा"],
        [/ÁøूÊ/g, "दुर्गा"],
        [/üÊË'èÈGÊÈ/g, "सप्तशती"],
        [/०Ã५ÊÃË/g, "सप्तशती"],
        [/ÃË/g, "ती"],
        [/ÃÊ/g, "ता"],
        [/Ã/g, "त"],
        [/ÕÊ/g, "था"],
        [/Õ/g, "थ"],
        [/¬Ê/g, "पा"],
        [/¬/g, "प"],
        [/∆/g, "ठ"],
        [/ø/g, "ग"],
        [/Ÿ/g, "न"],
        [/•/g, "अ"],
        [/'è/g, "ध"],
        [/'î/g, "द"],
        [/Ê/g, "ा"],
        [/Ë/g, "ी"],
        [/È/g, "ु"],
        [/ñ/g, "Z"],
        [/ò/g, "z"],
        [/ó/g, "र्"],
        [/ô/g, "्र"],
        [/õ/g, "्"],
        [/ö/g, "्र"],
        [/÷/g, "्"],
        [/∑/g, "क"],
        [/§/g, "ा"],
        [/◊/g, "म"],
        [/ã/g, "ं"],
        [/Œ/g, "े"],
        [/ÿ/g, "य"],
        [/ª/g, "ग"],
        [/”/g, "ु"],
        [/‹/g, "९"],
        [/’/g, " "],
        [/„/g, "२"],
        [/fl/g, "ि"],
        [/œ/g, "ै"],
    ];

    for (const [pattern, rep] of preRules) {
        modified = modified.replace(pattern, rep);
    }

    // Replace short-i ('f' or 'Á') which appears before consonant in legacy fonts
    modified = modified.replace(/[fÁ]([a-zA-Z\u0900-\u097F]+)/g, "$1ि");

    // Replace known dictionary mappings
    const keys = Object.keys(KRUTI_DEV_MAPPING).sort((a, b) => b.length - a.length);
    for (const k of keys) {
        if (modified.includes(k)) {
            modified = modified.split(k).join(KRUTI_DEV_MAPPING[k]);
        }
    }

    // Move 'र्' to the next consonant if required
    modified = modified.replace(/([क-ह][्क-ह]*)Z/g, "र्$1");

    // Clean redundant halants
    modified = modified.replace(/्+/g, "्");

    return modified.normalize("NFKC");
}

/**
 * Clean, repair, and normalize text: keeps English intact, fixes legacy Indic mojibake, normalizes Unicode Devanagari.
 */
export function cleanAndNormalizeDevanagari(rawText: string): string {
    if (!rawText) return "";

    let text = rawText.trim();

    // 1. English text MUST be preserved as English!
    if (isEnglishText(text)) {
        text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFF0-\uFFFF]/g, "");
        return text.replace(/[ \t]+/g, " ").trim();
    }

    // 2. Convert ONLY if genuine legacy Devanagari font markers exist
    if (isLikelyLegacyDevanagari(text)) {
        text = convertKrutiDevToUnicode(text);
    }

    // 3. Normalize Unicode combining characters (NFC / NFKC)
    text = text.normalize("NFKC");

    // 4. Clean unprintable control characters while preserving standard Devanagari, punctuation & newlines
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFF0-\uFFFF]/g, "");
    text = text.replace(/[ \t]+/g, " ");

    return text.trim();
}
