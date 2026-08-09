import * as pdfjsLib from 'pdfjs-dist';

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

export async function extractPdfMetadata(file: File): Promise<PdfMetadata> {

    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    // Extract basic metadata
    const metadata = await pdf.getMetadata();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const info: any = metadata.info || {};

    const title = info.Title || '';
    const genre = info.Subject || info.Keywords || '';
    let year = '';

    // Advanced Author Extraction from Text
    let textAuthor = '';
    try {
        const firstPage = await pdf.getPage(1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const firstPageTextContent = await firstPage.getTextContent() as any;
        const firstPageText = firstPageTextContent.items
            .map((item: any) => item.str)
            .join(' ');

        // Regex to search for "Written By", "written by", or "Author" followed by a name
        const authorRegex = /(?:written\s+by|Author)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i;
        const authorMatch = firstPageText.match(authorRegex);
        if (authorMatch && authorMatch[1]) {
            textAuthor = authorMatch[1].trim();
        }
    } catch (e) {
        console.error("Failed to extract author from text:", e);
    }

    const author = textAuthor || info.Author || '';

    if (info.CreationDate) {
        // PDF dates often look like D:YYYYMMDDHHmmSSOHH'mm'
        const match = info.CreationDate.match(/D:(\d{4})/);
        if (match) {
            year = match[1];
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

    // Extract text for description (up to 400 words)
    let description = '';
    let wordCount = 0;
    const maxWords = 200;

    try {
        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
            if (wordCount >= maxWords) break;

            const page = await pdf.getPage(i);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const textContent = await page.getTextContent() as any;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pageText = textContent.items.map((item: any) => item.str).join(' ');

            const words = pageText.split(/\s+/).filter((w: string) => w.length > 0);

            if (wordCount + words.length <= maxWords) {
                description += pageText + ' ';
                wordCount += words.length;
            } else {
                const remainingWords = maxWords - wordCount;
                description += words.slice(0, remainingWords).join(' ') + '...';
                wordCount = maxWords;
                break;
            }
        }
    } catch (e) {
        console.error("Failed to extract text from PDF:", e);
    }

    return {
        title: title.trim(),
        author: author.trim(),
        year: year,
        genre: genre.trim(),
        description: description.trim(),
        coverFile
    };
}
