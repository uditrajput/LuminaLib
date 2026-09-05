import * as pdfjsLib from 'pdfjs-dist';
import { cleanAndNormalizeDevanagari, isEnglishText } from './devanagariConverter';

// Use a specific version of pdf.js worker from a reliable CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

export interface PdfMetadata {
    title: string;
    author: string;
    year: string;
    genre: string;
    description: string;
    coverFile: File | null;
}

/**
 * Cleanly extract or generate a 10-line comprehensive description ending in complete sentences.
 */
export function formatTenLineDescription(title: string, author: string, genre: string, rawText?: string): string {
    const cleanT = cleanAndNormalizeDevanagari(title || "Book");
    const cleanA = author ? cleanAndNormalizeDevanagari(author) : "";
    const cleanG = genre ? cleanAndNormalizeDevanagari(genre) : "Non-Fiction";
    const isIndic = !isEnglishText(cleanT) && /[\u0900-\u097F]/.test(cleanT);

    // If we have raw extracted text, extract clean, complete sentences up to ~8-10 sentences
    if (rawText && rawText.trim().length > 100) {
        const sentences = rawText
            .replace(/\s+/g, " ")
            .split(/(?<=[.!?।])\s+/)
            .map(s => s.trim())
            .filter(s => s.length > 25 && !/^(page|\d+|http|copyright|all rights)/i.test(s));

        if (sentences.length >= 6) {
            const selected = sentences.slice(0, 10);
            return selected.join(" ");
        }
    }

    // Generate a structured, 10-sentence rich overview
    if (isIndic) {
        return [
            `'${cleanT}' पुस्तक ${cleanA ? "रचयिता " + cleanA : "विद्वान लेखकों"} द्वारा रचित एक अत्यंत ज्ञानवर्धक एवं प्रामाणिक ग्रंथ है।`,
            `यह ग्रंथ ${cleanG} विधा के गहन सिद्धांतों और व्यावहारिक पहलुओं का विस्तृत विश्लेषण प्रस्तुत करता है।`,
            `पुस्तक में वर्णित प्रत्येक अध्याय पाठकों को विषय की मूल अवधारणाओं से सरलतापूर्वक परिचित कराता है।`,
            `इसमें जीवनोपयोगी ज्ञान, शास्त्रीय संदर्भों एवं व्यावहारिक दृष्टांतों का सुंदर समन्वय किया गया है।`,
            `यह कृति विद्यार्थियों, शोधार्थियों एवं ज्ञान-पिपासु पाठकों के सर्वांगीण बौद्धिक विकास में सहायक सिद्ध होती है।`,
            `सरल एवं सुबोध भाषा-शैली के माध्यम से गूढ़ विषयों को भी अत्यंत रोचक ढंग से समझाया गया है।`,
            `पुस्तक में दिए गए अभ्यास एवं मार्गदर्शन पाठकों को स्वाध्याय और आत्म-विकास के लिए प्रेरित करते हैं।`,
            `यह रचना न केवल समकालीन संदर्भों में उपयोगी है बल्कि चिरकालिक ज्ञान का मार्ग भी प्रशस्त करती है।`,
            `विषय-वस्तु का क्रमबद्ध नियोजन अध्ययन को अत्यंत सुगम एवं परिणामोन्मुखी बनाता है।`,
            `समग्र रूप से, यह पुस्तक आत्म-उन्नति, ज्ञान-संवर्धन एवं समग्र चेतना के उत्थान हेतु एक अनिवार्य एवं मूल्यवान संकलन है।`
        ].join(" ");
    } else {
        return [
            `'${cleanT}' ${cleanA ? "by " + cleanA : ""} provides a comprehensive and authoritative examination of its subject matter.`,
            `This work delves deeply into core principles, foundational methodologies, and contemporary applications within the field of ${cleanG}.`,
            `Each chapter is structured systematically to guide readers from foundational concepts to advanced practical insights.`,
            `The author integrates rich explanations, analytical clarity, and real-world examples to foster deep conceptual understanding.`,
            `Designed for students, professionals, and avid learners, this volume bridges academic rigor with practical utility.`,
            `Complex ideas are presented in an accessible, engaging, and structured narrative style.`,
            `Detailed case studies and focused illustrations help solidify the practical relevance of every topic discussed.`,
            `The text emphasizes critical thinking, problem-solving techniques, and best practices essential for mastery.`,
            `Readers will find actionable knowledge, thoughtful discussions, and reliable reference material throughout the chapters.`,
            `Overall, this volume stands as an indispensable resource, empowering readers with lasting knowledge and transformative insights.`
        ].join(" ");
    }
}

export async function extractPdfMetadata(file: File): Promise<PdfMetadata> {
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/",
        cMapPacked: true,
        standardFontDataUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/standard_fonts/",
    });
    const pdf = await loadingTask.promise;

    // Extract basic metadata
    const metadata = await pdf.getMetadata();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const info: any = metadata.info || {};

    let rawTitle = info.Title || '';
    let rawGenre = info.Subject || info.Keywords || '';
    let year = '';

    // Advanced Title and Author Extraction from filename if not in PDF metadata
    const baseFileName = file.name.replace(/\.[^/.]+$/, "");
    let textAuthor = '';
    
    if (baseFileName.includes(" - ")) {
        const parts = baseFileName.split(" - ");
        if (!rawTitle) rawTitle = parts[0].trim();
        textAuthor = parts.slice(1).join(" - ").trim();
    } else if (baseFileName.toLowerCase().includes(" by ")) {
        const parts = baseFileName.split(/ by /i);
        if (!rawTitle) rawTitle = parts[0].trim();
        textAuthor = parts[1].trim();
    } else if (!rawTitle) {
        rawTitle = baseFileName;
    }

    // Advanced Author Extraction from first 3 pages
    try {
        for (let p = 1; p <= Math.min(pdf.numPages, 3); p++) {
            if (textAuthor) break;
            const page = await pdf.getPage(p);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const textContent = await page.getTextContent() as any;
            const pageText = textContent.items.map((item: any) => item.str).join(' ');

            const authorRegex = /(?:written\s+by|Author|by|लेखक|रचयिता|संपादक)[:\s]+([^\n\r,\.\|]+)/i;
            const authorMatch = pageText.match(authorRegex);
            if (authorMatch && authorMatch[1] && authorMatch[1].trim().length > 2) {
                textAuthor = authorMatch[1].trim();
                break;
            }
        }
    } catch (e) {
        console.error("Failed to extract author from text:", e);
    }

    const author = cleanAndNormalizeDevanagari(textAuthor || info.Author || '');

    if (info.CreationDate) {
        const match = info.CreationDate.match(/D:(\d{4})/);
        if (match) {
            year = match[1];
        }
    }
    if (!year) {
        const yearMatch = file.name.match(/\b(19\d\d|20\d\d)\b/);
        if (yearMatch) {
            year = yearMatch[1];
        }
    }

    // Auto-detect genre from title/content if missing
    if (!rawGenre) {
        const lowerName = (rawTitle + " " + file.name).toLowerCase();
        if (/hanuman|siddhi|ram|krishna|gita|durga|puja|chalisa|mantra|stotra|ved|upanishad|spiritual|yoga|pranayam|धार्मिक|अध्यात्म/i.test(lowerName)) {
            rawGenre = "Spiritual";
        } else if (/java|python|programming|code|computer|software|react|algorithm|data/i.test(lowerName)) {
            rawGenre = "Technology";
        } else if (/history|ancient|war|empire|dynasty|historical/i.test(lowerName)) {
            rawGenre = "History";
        } else if (/biography|autobiography|life|memoir/i.test(lowerName)) {
            rawGenre = "Biography";
        } else if (/science|physics|chemistry|biology/i.test(lowerName)) {
            rawGenre = "Science";
        } else {
            rawGenre = "Non-Fiction";
        }
    }

    // Extract cover image from the first page
    let coverFile: File | null = null;
    try {
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
            if (blob) {
                coverFile = new File([blob], 'cover.jpg', { type: 'image/jpeg' });
            }
        }
    } catch (e) {
        console.error("Failed to extract cover image from PDF:", e);
    }

    // Extract text for description across pages
    let collectedText = '';
    try {
        for (let i = 1; i <= Math.min(pdf.numPages, 15); i++) {
            if (collectedText.length >= 1000) break;

            const page = await pdf.getPage(i);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const textContent = await page.getTextContent() as any;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawPageText = textContent.items.map((item: any) => item.str).join(' ');
            const pageText = cleanAndNormalizeDevanagari(rawPageText);

            const words = pageText.split(/\s+/).filter((w: string) => w.length > 0);
            if (words.length >= 5) {
                collectedText += pageText + ' ';
            }
        }
    } catch (e) {
        console.error("Failed to extract text from PDF:", e);
    }

    const cleanTitle = cleanAndNormalizeDevanagari(rawTitle || baseFileName);
    const finalDescription = formatTenLineDescription(cleanTitle, author, rawGenre, collectedText);

    return {
        title: cleanTitle,
        author: author,
        year: year,
        genre: rawGenre,
        description: finalDescription,
        coverFile
    };
}
