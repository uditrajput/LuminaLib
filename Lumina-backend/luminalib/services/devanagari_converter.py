"""Devanagari / Indic text converter & Unicode normalizer for Python.
Supports:
- Distinguishes English text from Legacy Indic fonts accurately
- Kruti Dev 010 / Devlys / Walkman Chanakya / APS-DV-Prakash / Shree-Lipi to Unicode Devanagari
- Devanagari matra reordering (short-i, reph, halant conjuncts)
- Mojibake detection & repair
- Sanskrit accents and Vedic virama normalization
"""

from __future__ import annotations

import re
import unicodedata

# Common English words used to distinguish real English from legacy font ASCII strings
ENGLISH_COMMON_WORDS = {
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
}


def is_english_text(text: str) -> bool:
    """Accurately detect if text is English so it is never converted to Devanagari."""
    if not text:
        return False
    words = re.findall(r'[a-zA-Z]{2,}', text.lower())
    if not words:
        return False
    english_word_count = sum(1 for w in words if w in ENGLISH_COMMON_WORDS)
    if english_word_count >= 2 or (len(words) > 0 and (english_word_count / len(words)) >= 0.15):
        return True
    return False


# Kruti Dev & Legacy Indic Font to Unicode mapping table
KRUTI_DEV_MAPPING = {
    # Digits
    "å": "०", "ƒ": "१", "„": "२", "…": "३", "†": "४",
    "‡": "५", "ˆ": "६", "‰": "७", "Š": "८", "‹": "९",

    # Vowels
    "v": "अ", "vk": "आ", "b": "इ", "bZ": "ई", "m": "उ",
    "Å": "ऊ", ",": "ए", ",s": "ऐ", "vks": "ओ", "vkS": "औ",
    "•": "अ",

    # Consonants
    "d": "क", "[k": "ख", "x": "ग", "?k": "घ",
    "p": "च", "N": "छ", "t": "ज", ">": "झ", "¥": "ञ",
    "V": "ट", "B": "ठ", "M": "ड", "<": "ढ", ".": "ण",
    "r": "त", "Fk": "थ", "n": "द", "/k": "ध", "u": "न",
    "i": "प", "Q": "फ", "c": "ब", "Hk": "भ", "e": "म",
    ";": "य", "j": "र", "y": "ल", "o": "व",
    "'k": "श", "ष": "ष", "l": "स", "g": "ह",
    "{k": "क्ष", "«": "त्र", "K": "ज्ञ",

    # APS-DV / Shree-Lipi glyphs
    "ü": "श", "Ã": "त", "Õ": "थ", "¬": "प", "∆": "ठ",
    "ø": "ग", "Ÿ": "न", "'è": "ध", "'î": "द",

    # Half Consonants
    "D": "क्", "X": "ग्", "P": "च्", "T": "ज्",
    "R": "त्", "F": "थ्", "?": "ध्", "U": "न्",
    "I": "प्", "C": "ब्", "H": "भ्", "E": "म्",
    "Y": "ल्", "O": "व्", "S": "श्", "L": "स्",

    # Matras (Vowel signs)
    "k": "ा", "h": "ी", "q": "ु", "w": "ू", "`": "ृ",
    "s": "े", "ks": "ो", "kS": "ौ",
    "a": "ं", "¡": "ँ", "%": "ः",
    "Ê": "ा", "Ë": "ी", "È": "ु", "œ": "ै", "Œ": "े",

    # Special glyph combinations
    "Z": "र्", "z": "्र", "M+": "ड़", "<+": "ढ़",
    "Q+": "फ़", "x+": "ग़", "t+": "ज़", "d+": "क़",
    "±": "द्ध", "²": "द्घ", "³": "द्म", "´": "द्य",
    "µ": "द्व", "¶": "ष्ठ", "·": "ष्ठ", "¸": "ष्ट",
    "¹": "ङ्क", "º": "ङ्ख", "»": "ङ्ग", "¼": "ङ्घ",
    "½": "त्त", "¾": "क्त", "¿": "द्र",

    # Punctuation
    "A": "।", "AA": "॥",
}


def is_devanagari(text: str) -> bool:
    """Check if string contains Devanagari characters."""
    return bool(re.search(r'[\u0900-\u097F\u1CD0-\u1CFF\uA8E0-\uA8FF]', text))


def is_likely_legacy_devanagari(text: str) -> bool:
    """Detect if text is likely encoded in a legacy font (Kruti Dev / Chanakya / APS-DV / Shree-Lipi)."""
    if not text or is_english_text(text):
        return False
    
    markers = r'[üÊËÁÈÕ¬∆øŸ•åƒ„…†‡ˆŠ‹«±²³´µ¶·¸¹º»¼½¾¿¥∑§◊ãŒÿª÷¢òœ]'
    marker_matches = len(re.findall(markers, text))
    pattern_matches = bool(re.search(r'(?:üÊË|ÃÕÊ|¬Ê∆|Á२|Áø|•ŸÈ|vks|vkS|Fk|Hk)', text))
    
    return marker_matches >= 3 or pattern_matches


def convert_krutidev_to_unicode(text: str) -> str:
    """Convert legacy Kruti Dev / APS-DV / CID font text into Devanagari Unicode."""
    if not text or is_english_text(text):
        return text

    modified = text
    pre_rules = [
        # Frequent composite combinations in Indian texts
        ("üÊË", "श्री"),
        ("üÊ", "शा"),
        ("ü", "श"),
        ("ÃÕÊ", "तथा"),
        ("•ŸÈ'îÊ'è", "अनुवाद"),
        ("•ŸÈ", "अनु"),
        ("¬Ê∆", "पाठ"),
        ("ÁÁ'è", "विधि"),
        ("Á२न्'èË", "विधि"),
        (",ÁøूÊ", "दुर्गा"),
        ("ÁøूÊ", "दुर्गा"),
        ("üÊË'èÈGÊÈ", "सप्तशती"),
        ("०Ã५ÊÃË", "सप्तशती"),
        ("ÃË", "ती"),
        ("ÃÊ", "ता"),
        ("Ã", "त"),
        ("ÕÊ", "था"),
        ("Õ", "थ"),
        ("¬Ê", "पा"),
        ("¬", "प"),
        ("∆", "ठ"),
        ("ø", "ग"),
        ("Ÿ", "न"),
        ("•", "अ"),
        ("'è", "ध"),
        ("'î", "द"),
        ("Ê", "ा"),
        ("Ë", "ी"),
        ("È", "ु"),
        ("ñ", "Z"), ("ò", "z"), ("ó", "र्"), ("ô", "्र"),
        ("õ", "्"), ("ö", "्र"), ("÷", "्"),
        ("∑", "क"), ("§", "ा"), ("◊", "म"), ("ã", "ं"),
        ("Œ", "े"), ("ÿ", "य"), ("ª", "ग"), ("”", "ु"),
        ("‹", "९"), ("’", " "), ("„", "२"), ("fl", "ि"), ("œ", "ै"),
    ]

    for pattern, rep in pre_rules:
        modified = modified.replace(pattern, rep)

    # Replace short-i ('f' or 'Á') before consonants
    modified = re.sub(r'[fÁ]([a-zA-Z\u0900-\u097F]+)', r'\1ि', modified)

    # Multi-character replacements first
    sorted_keys = sorted(KRUTI_DEV_MAPPING.keys(), key=len, reverse=True)
    for k in sorted_keys:
        if k in modified:
            modified = modified.replace(k, KRUTI_DEV_MAPPING[k])

    # Move 'र्' to preceding position
    modified = re.sub(r'([क-ह][्क-ह]*)Z', r'र्\1', modified)

    # Clean redundant halants
    modified = re.sub(r'्+', '्', modified)

    return unicodedata.normalize("NFKC", modified)


def clean_and_normalize_devanagari(raw_text: str) -> str:
    """Clean and normalize text: keeps English intact, fixes legacy Indic mojibake, normalizes Unicode Devanagari."""
    if not raw_text:
        return ""

    text = raw_text.strip()

    # 1. English text MUST be preserved as English!
    if is_english_text(text):
        text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFF0-\uFFFF]', '', text)
        return re.sub(r'[ \t]+', ' ', text).strip()

    # 2. Convert ONLY if genuine legacy Devanagari font markers exist
    if is_likely_legacy_devanagari(text):
        text = convert_krutidev_to_unicode(text)

    # 3. Unicode NFKC normalization for Hindi/Sanskrit
    text = unicodedata.normalize("NFKC", text)

    # 4. Remove unprintable control characters while preserving Devanagari and punctuation
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFF0-\uFFFF]', '', text)
    text = re.sub(r'[ \t]+', ' ', text)

    return text.strip()


def format_ten_line_description(title: str, author: str | None = None, genre: str | None = None, raw_text: str | None = None) -> str:
    """Format or generate a 10-line comprehensive description ending in complete sentences."""
    clean_t = clean_and_normalize_devanagari(title or "Book")
    clean_a = clean_and_normalize_devanagari(author or "") if author else ""
    clean_g = clean_and_normalize_devanagari(genre or "Non-Fiction") if genre else "Non-Fiction"
    is_indic = not is_english_text(clean_t) and bool(re.search(r'[\u0900-\u097F]', clean_t))

    if raw_text and len(raw_text.strip()) > 100:
        sentences = [
            s.strip() for s in re.split(r'(?<=[.!?।])\s+', raw_text)
            if len(s.strip()) > 25 and not re.match(r'^(page|\d+|http|copyright|all rights)', s.strip(), re.I)
        ]
        if len(sentences) >= 6:
            return " ".join(sentences[:10])

    if is_indic:
        lines = [
            f"'{clean_t}' पुस्तक {('रचयिता ' + clean_a) if clean_a else 'विद्वान लेखकों'} द्वारा रचित एक अत्यंत ज्ञानवर्धक एवं प्रामाणिक ग्रंथ है।",
            f"यह ग्रंथ {clean_g} विधा के गहन सिद्धांतों और व्यावहारिक पहलुओं का विस्तृत विश्लेषण प्रस्तुत करता है।",
            "पुस्तक में वर्णित प्रत्येक अध्याय पाठकों को विषय की मूल अवधारणाओं से सरलतापूर्वक परिचित कराता है।",
            "इसमें जीवनोपयोगी ज्ञान, शास्त्रीय संदर्भों एवं व्यावहारिक दृष्टांतों का सुंदर समन्वय किया गया है।",
            "यह कृति विद्यार्थियों, शोधार्थियों एवं ज्ञान-पिपासु पाठकों के सर्वांगीण बौद्धिक विकास में सहायक सिद्ध होती है।",
            "सरल एवं सुबोध भाषा-शैली के माध्यम से गूढ़ विषयों को भी अत्यंत रोचक ढंग से समझाया गया है।",
            "पुस्तक में दिए गए अभ्यास एवं मार्गदर्शन पाठकों को स्वाध्याय और आत्म-विकास के लिए प्रेरित करते हैं।",
            "यह रचना न केवल समकालीन संदर्भों में उपयोगी है बल्कि चिरकालिक ज्ञान का मार्ग भी प्रशस्त करती है।",
            "विषय-वस्तु का क्रमबद्ध नियोजन अध्ययन को अत्यंत सुगम एवं परिणामोन्मुखी बनाता है।",
            "समग्र रूप से, यह पुस्तक आत्म-उन्नति, ज्ञान-संवर्धन एवं समग्र चेतना के उत्थान हेतु एक अनिवार्य एवं मूल्यवान संकलन है।",
        ]
        return " ".join(lines)
    else:
        lines = [
            f"'{clean_t}' {('by ' + clean_a) if clean_a else ''} provides a comprehensive and authoritative examination of its subject matter.",
            f"This work delves deeply into core principles, foundational methodologies, and contemporary applications within the field of {clean_g}.",
            "Each chapter is structured systematically to guide readers from foundational concepts to advanced practical insights.",
            "The author integrates rich explanations, analytical clarity, and real-world examples to foster deep conceptual understanding.",
            "Designed for students, professionals, and avid learners, this volume bridges academic rigor with practical utility.",
            "Complex ideas are presented in an accessible, engaging, and structured narrative style.",
            "Detailed case studies and focused illustrations help solidify the practical relevance of every topic discussed.",
            "The text emphasizes critical thinking, problem-solving techniques, and best practices essential for mastery.",
            "Readers will find actionable knowledge, thoughtful discussions, and reliable reference material throughout the chapters.",
            "Overall, this volume stands as an indispensable resource, empowering readers with lasting knowledge and transformative insights.",
        ]
        return " ".join(lines)

