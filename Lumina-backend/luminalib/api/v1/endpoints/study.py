"""AI Study Companion — flashcards, MCQ, summary, mindmap from highlights & books."""

from __future__ import annotations

import json
import logging
import re
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.api.v1.deps import get_db, get_current_user, get_llm
from luminalib.models.highlight import Highlight
from luminalib.models.user import User
from luminalib.models.book import Book
from luminalib.models.borrow import BookBorrow
from luminalib.models.document_chunk import DocumentChunk

logger = logging.getLogger("luminalib.study")

router = APIRouter(prefix="/study", tags=["study"])


class GenerateIn(BaseModel):
    book_id: int | None = None
    type: str = "flashcards"  # flashcards | mcq | summary | mindmap
    count: int = 5
    source: str = "highlights"  # highlights | book | all_highlights


def _clean_json_str(raw: str) -> str:
    txt = raw.strip()
    if "```" in txt:
        parts = txt.split("```")
        for p in parts[1:]:
            cleaned = p.strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()
            if cleaned.startswith("[") or cleaned.startswith("{"):
                return cleaned
    start_bracket = txt.find("[")
    start_brace = txt.find("{")
    if start_bracket != -1 and (start_brace == -1 or start_bracket < start_brace):
        end_bracket = txt.rfind("]")
        if end_bracket != -1:
            return txt[start_bracket : end_bracket + 1]
    elif start_brace != -1:
        end_brace = txt.rfind("}")
        if end_brace != -1:
            return txt[start_brace : end_brace + 1]
    return txt


@router.post("/generate")
async def generate_study(
    req: GenerateIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    llm=Depends(get_llm),
):
    context = ""
    topic_title = "Study Material"

    # 1. Resolve context based on book_id or general user library
    if req.book_id:
        bk_res = await db.execute(select(Book).where(Book.id == req.book_id))
        bk = bk_res.scalar_one_or_none()
        if bk:
            topic_title = bk.title
            header = f"Book: {bk.title} by {bk.author} (Genre: {bk.genre or 'General'})\nDescription: {bk.description or ''}"
            
            # Fetch highlights first if requested
            hl_res = await db.execute(
                select(Highlight.text).where(Highlight.user_id == user.id, Highlight.book_id == req.book_id).limit(12)
            )
            hl_texts = [r[0] for r in hl_res.fetchall() if r[0]]
            
            # Fetch document chunks if needed
            chunk_res = await db.execute(
                select(DocumentChunk.content).where(DocumentChunk.book_id == req.book_id).limit(6)
            )
            chunks = [r[0] for r in chunk_res.fetchall() if r[0]]
            
            body = "\n\n".join(hl_texts + chunks)
            if not body and bk.content_text:
                body = bk.content_text[:6000]
            context = f"{header}\n\n{body}".strip()[:6000]
    else:
        # User dashboard context: check user highlights across all books
        hl_res = await db.execute(
            select(Highlight.text).where(Highlight.user_id == user.id).order_by(Highlight.id.desc()).limit(15)
        )
        hl_texts = [r[0] for r in hl_res.fetchall() if r[0]]
        
        if hl_texts:
            topic_title = "My Reading Highlights"
            context = "User Highlights & Notes:\n" + "\n---\n".join(hl_texts[:10])
        else:
            # Check user's borrowed books
            borrow_res = await db.execute(
                select(Book).join(BookBorrow, BookBorrow.book_id == Book.id).where(BookBorrow.user_id == user.id).limit(3)
            )
            borrowed_books = list(borrow_res.scalars().all())
            if not borrowed_books:
                # Check recent public books
                recent_res = await db.execute(
                    select(Book).where(or_(Book.access_level == "public", Book.access_level == None)).order_by(Book.id.desc()).limit(3)
                )
                borrowed_books = list(recent_res.scalars().all())
            
            if borrowed_books:
                bks_info = []
                for b in borrowed_books:
                    bks_info.append(f"Title: {b.title}\nAuthor: {b.author}\nOverview: {b.description or 'Covers foundational concepts and principles.'}")
                topic_title = borrowed_books[0].title
                context = "Library Books & Topics:\n\n" + "\n\n---\n\n".join(bks_info)

    if not context or len(context.strip()) < 20:
        topic_title = "Fundamental Concepts & Principles"
        context = (
            "Subject Area: Core scientific principles, literature, algorithms, data structures, and problem-solving methodology.\n"
            "Overview: Systematic analytical frameworks, foundational definitions, algorithmic complexity, and practical application strategies."
        )

    # 2. Language Detection (Hindi, Sanskrit, English)
    from luminalib.services.devanagari_converter import is_devanagari, clean_and_normalize_devanagari

    context_clean = clean_and_normalize_devanagari(context)
    is_indic = is_devanagari(context_clean) or is_devanagari(topic_title)
    
    # Detect Sanskrit vs Hindi
    sanskrit_markers = ["अस्ति", "भवति", "संस्कृत", "श्लोक", "सूक्त", "वेद", "उपनिषद्", "गीता", "धर्म", "कर्म", "इति", "च", "वा", "एव", "नमः", "आसीत्", "कुरुते"]
    is_sanskrit = is_indic and any(m in context_clean for m in sanskrit_markers)
    is_hindi = is_indic and not is_sanskrit

    lang_instruction = ""
    if is_sanskrit:
        lang_instruction = (
            "LANGUAGE REQUIREMENT (CRITICAL):\n"
            "The subject material is in SANSKRIT. You MUST generate all questions, options, explanations, summaries, and mindmap nodes in FLUENT SANSKRIT (संस्कृत भाषायां).\n"
        )
    elif is_hindi:
        lang_instruction = (
            "LANGUAGE REQUIREMENT (CRITICAL):\n"
            "The subject material is in HINDI. You MUST generate all questions, options, explanations, summaries, and mindmap nodes in CLEAR, NATURAL HINDI (हिन्दी भाषा में).\n"
        )

    # 3. Construct precise prompts
    count = max(3, min(req.count, 10))
    prompt_map = {
        "flashcards": (
            f"Generate {count} unique, varied educational flashcards based on the following material.\n"
            f"{lang_instruction}"
            f"Context:\n{context_clean[:3500]}\n\n"
            f"CRITICAL REQUIREMENTS:\n"
            f"1. Every question MUST be framed differently. DO NOT repeat the same question prefix.\n"
            f"2. Each object MUST have 'front' (question/concept) and 'back' (clear, direct explanation).\n"
            f"3. Return ONLY a valid JSON array: [{{\"front\": \"Question\", \"back\": \"Answer\"}}]\n"
            f"Do not include markdown codeblocks or conversational text."
        ),
        "mcq": (
            f"Generate {count} distinct multiple-choice questions (MCQs) with 4 choices each based on the following material.\n"
            f"{lang_instruction}"
            f"Context:\n{context_clean[:3500]}\n\n"
            f"Requirements:\n"
            f"1. Every question must explore a different concept or practical scenario with varied sentence structure.\n"
            f"2. Each question must have 'question', 'options' (array of 4 distinct strings), 'answer' (0-indexed integer 0-3), and 'explanation'.\n"
            f"3. Return ONLY a valid JSON array of objects: [{{\"question\": \"...\", \"options\": [\"A\",\"B\",\"C\",\"D\"], \"answer\": 0, \"explanation\": \"...\"}}]\n"
            f"Do not include markdown codeblocks or conversational text."
        ),
        "summary": (
            f"Provide a structured study summary based on the following material.\n"
            f"{lang_instruction}"
            f"Context:\n{context_clean[:3500]}\n\n"
            f"Requirements:\n"
            f"1. Include an overview paragraph ('summary') and 5-6 distinct key takeaway bullet points ('bullets').\n"
            f"2. Return ONLY a valid JSON object: {{\"summary\": \"Comprehensive overview...\", \"bullets\": [\"Point 1...\", \"Point 2...\", \"Point 3...\"]}}"
        ),
        "mindmap": (
            f"Create an educational mindmap based on the following material.\n"
            f"{lang_instruction}"
            f"Context:\n{context_clean[:3500]}\n\n"
            f"Requirements:\n"
            f"1. Return ONLY a valid JSON object with 'root' (string title), 'branches' (array of 4-8 objects each with 'name': str and 'children': array of strings), and 'mermaid' (string in Mermaid mindmap syntax).\n"
            f"Schema: {{\"root\": \"{topic_title[:30]}\", \"branches\": [{{\"name\": \"Main Branch\", \"children\": [\"Sub-concept 1\", \"Sub-concept 2\"]}}], \"mermaid\": \"mindmap\\n  root(({topic_title[:30]}))\\n    ...\"}}"
        ),
    }

    prompt = prompt_map.get(req.type, prompt_map["flashcards"])
    data = None
    raw = None

    try:
        if hasattr(llm, "generate"):
            system_role = "You are an expert AI study tutor specializing in multilingual education, Hindi, Sanskrit, and computer science."
            raw = await llm.generate(prompt=prompt, system_prompt=system_role)
        elif hasattr(llm, "summarize"):
            raw = await llm.summarize(prompt)
        
        if raw:
            cleaned = _clean_json_str(raw)
            data = json.loads(cleaned)
    except Exception as e:
        logger.warning("LLM Study generation failed or produced invalid JSON: %s. Using smart extractor.", e)
        data = None

    # 4. Smart fallback generator if LLM was unavailable or returned non-JSON
    import random

    if not data:
        # Extract meaningful distinct statements from context, filtering out boilerplate
        raw_snippets = [s.strip() for s in re.split(r'[\n\.\?\!।॥]+', context_clean) if len(s.strip()) > 15]
        
        noise_keywords = ["author", "bestseller", "published", "isbn", "copyright", "rights reserved", "edition", "mcgraw", "prentice", "press", "inc.", "library of congress", "लेखकाधिकार", "प्रकाशक"]
        cleaned_snippets = []
        for s in raw_snippets:
            clean = re.sub(r'\s+', ' ', s).strip()
            clean_lower = clean.lower()
            if any(k in clean_lower for k in noise_keywords):
                continue
            if len(clean) > 20 and clean not in cleaned_snippets:
                cleaned_snippets.append(clean)
        
        if not cleaned_snippets:
            if is_sanskrit:
                cleaned_snippets = [
                    f"{topic_title} इत्यस्य मूलसंकल्पनाः सैद्धान्तिकं च स्वरूपम्।",
                    "सत्यं वद धर्मं चर, स्वाध्यायान्मा प्रमदः इति मूलभूतः उपदेशः।",
                    "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन इति निष्कामकर्मयोगस्य रहस्यम्।",
                    "विद्या ददाति विनयं विनयाद्याति पात्रताम् इति ज्ञानस्य महत्त्वम्।",
                    "व्याकरणस्य सूत्राणां प्रयोगाः पदसंरचना च विशदतया व्याख्यायन्ते।",
                ]
            elif is_hindi:
                cleaned_snippets = [
                    f"{topic_title} के मूल सिद्धांत, सैद्धांतिक संरचना और मुख्य अवधारणाएं।",
                    "व्यवस्थित समस्या समाधान, तार्किक विश्लेषण और व्यावहारिक अनुप्रयोग।",
                    "कार्यान्वयन के प्रमुख नियम, वाक्य विन्यास और प्रक्रियागत अनुकूलन।",
                    "सत्यापन, सीमाएं और त्रुटि निवारण तंत्र का विधिवत अध्ययन।",
                    "महत्वपूर्ण परिभाषाएं, संप्रत्यय और व्यावहारिक दृष्टिकोण।",
                ]
            else:
                cleaned_snippets = [
                    "String searching methods such as indexOf() and lastIndexOf() locate substring positions scanning forward or backward.",
                    "The startIndex parameter defines the offset boundary where the search operation begins scanning.",
                    "Immutability in String objects guarantees thread safety and enables caching in the String Constant Pool.",
                    "Checked exceptions require explicit handling or declaration at compile time, whereas unchecked exceptions occur at runtime.",
                    "StringBuilder utilizes a mutable internal character buffer to avoid excessive object allocations during string assembly.",
                    "Decomposing algorithms into modular, testable components prevents boundary defects and runtime exceptions.",
                ]

        # Shuffle snippets so repeated clicks generate different questions every time
        shuffled_snippets = list(cleaned_snippets)
        random.shuffle(shuffled_snippets)

        stop_words = {"the", "a", "an", "this", "that", "for", "here", "when", "in", "to", "is", "are", "and", "or", "of", "with", "as", "by", "on", "का", "की", "के", "में", "पर", "से", "है", "हैं", "च", "इति", "वा", "एव"}

        if req.type == "flashcards":
            cards = []
            for i in range(count):
                snip = shuffled_snippets[i % len(shuffled_snippets)]
                method_match = re.search(r'([A-Za-z0-9_\u0900-\u097F]+\s*\([^)]*\)|[A-Za-z0-9_\u0900-\u097F]{4,25})', snip)
                term = method_match.group(0).strip() if method_match else ""
                if term.lower() in stop_words or len(term) < 3:
                    term = topic_title

                if is_sanskrit:
                    q_styles = [
                        f"{term} इत्यस्य प्रमुखं प्रयोजनं कार्यविधिः च किम्?",
                        f"{term} कस्य सिद्धांतस्य प्रतिपादनं करोति?",
                        f"{term} विषये अधोलिखितेषु किं समीचीनम् अस्ति?",
                        f"{term} प्रयोगे कीदृशः परिणामः सम्भाव्यते?",
                        f"{term} इत्यस्य मुख्यं लक्षणं किं वर्तते?",
                    ]
                    q = q_styles[i % len(q_styles)]
                    cards.append({
                        "front": q,
                        "back": f"{snip} — इदं {topic_title} विषये महत्त्वपूर्णं ज्ञानम् अस्ति।"
                    })
                elif is_hindi:
                    q_styles = [
                        f"{term} का मुख्य उद्देश्य और कार्यप्रणाली क्या है?",
                        f"{term} के संदर्भ में कौन सा सिद्धांत लागू होता है?",
                        f"{term} का सही उपयोग और अपेक्षित परिणाम क्या होता है?",
                        f"{term} के प्रमुख नियम एवं विशेषताएं क्या हैं?",
                        f"{term} का व्यावहारिक अनुप्रयोग किस प्रकार किया जाता है?",
                    ]
                    q = q_styles[i % len(q_styles)]
                    cards.append({
                        "front": q,
                        "back": f"{snip}। यह {topic_title} के लिए अत्यंत महत्वपूर्ण है।"
                    })
                else:
                    q_styles = [
                        f"What is the function and operational role of {term} in {topic_title}?",
                        f"How does {term} handle directional execution and boundary constraints?",
                        f"Explain the key principles and expected results when utilizing {term}.",
                        f"Under what condition should {term} be applied during development?",
                        f"What key rule or return value is associated with {term}?",
                    ]
                    q = q_styles[i % len(q_styles)]
                    cards.append({
                        "front": q,
                        "back": f"{snip}. This is essential knowledge for {topic_title}."
                    })
            data = cards
        elif req.type == "mcq":
            mcqs = []
            for i in range(count):
                snip = shuffled_snippets[i % len(shuffled_snippets)]
                method_match = re.search(r'([A-Za-z0-9_\u0900-\u097F]+\s*\([^)]*\)|[A-Za-z0-9_\u0900-\u097F]{4,25})', snip)
                term = method_match.group(0).strip() if method_match else ""
                if term.lower() in stop_words or len(term) < 3:
                    term = f"{topic_title}"

                if is_sanskrit:
                    q_styles = [
                        f"{term} विषये अधोलिखितेषु किं कथनं सत्यम् अस्ति?",
                        f"{term} प्रयोगे कीदृशः व्यवहारः दृश्यते?",
                        f"{term} संदर्भे कः नियमः प्रयुज्यते?",
                        f"{term} इत्यस्य वास्तविकं प्रयोजनं किम्?",
                        f"{term} सिद्धान्तस्य मूलं किम्?",
                    ]
                    q = q_styles[i % len(q_styles)]
                    distractor_pool = [
                        f"इदं {topic_title} संदर्भे सर्वान् नियमान् उल्लङ्घयति",
                        "अयं प्रयोगः सर्वदा निष्फलः भवति",
                        "अस्य किमपि शास्त्रीयं प्रमाणं न वर्तते",
                        "इदं प्रक्रियायाः विपरीतं परिणामं जनयति",
                    ]
                    explanation_msg = f"समीचीनम्। पाठ्यानुसारेण: {snip}।"
                elif is_hindi:
                    q_styles = [
                        f"{term} के संदर्भ में कौन सा कथन सर्वथा सत्य है?",
                        f"{term} का उपयोग करने पर क्या परिणाम अपेक्षित है?",
                        f"{term} की मुख्य कार्यप्रणाली और नियम क्या हैं?",
                        f"{term} किस प्रकार की संरचना प्रस्तुत करता है?",
                        f"{term} के प्रयोग का मुख्य लाभ क्या है?",
                    ]
                    q = q_styles[i % len(q_styles)]
                    distractor_pool = [
                        f"यह {topic_title} में बिना सत्यापन के प्रक्रिया को उलट देता है",
                        "यह प्रत्येक मानक निष्पादन पर अपरिहार्य त्रुटि उत्पन्न करता है",
                        "यह सभी मापदंडों और सीमाओं को पूरी तरह से अनदेखा करता है",
                        "यह सभी प्रक्रियाओं को एक अंतहीन लूप में बदल देता है",
                    ]
                    explanation_msg = f"सही उत्तर। अध्ययन सामग्री के अनुसार: {snip}।"
                else:
                    q_styles = [
                        f"Which statement accurately describes {term}?",
                        f"When executing {term}, what behavior or outcome is expected?",
                        f"What is the primary technical rule concerning {term} in {topic_title}?",
                        f"How does {term} operate within this architectural framework?",
                        f"What is a critical consideration when applying {term}?",
                    ]
                    q = q_styles[i % len(q_styles)]
                    distractor_pool = [
                        f"It reverses the entire execution sequence without verification in {topic_title}",
                        "It throws an uncatchable fatal error on every standard invocation",
                        "It completely bypasses all parameters and index bounds",
                        "It converts all runtime exceptions into silent infinite loops",
                        "It permanently clears system cache and heap memory without saving state",
                    ]
                    explanation_msg = f"Correct. According to the study material: {snip}."

                distractors = random.sample(distractor_pool, 3)
                options = [snip] + distractors
                random.shuffle(options)
                ans_idx = options.index(snip)

                mcqs.append({
                    "question": q,
                    "options": options,
                    "answer": ans_idx,
                    "explanation": explanation_msg
                })
            data = mcqs
        elif req.type == "mindmap":
            if is_sanskrit:
                all_branches = [
                    {"name": "मूलसिद्धान्ताः", "children": ["परिभाषा", "शास्त्रप्रमाणम्", "मूलसंकल्पनाः", "उद्देश्यम्"]},
                    {"name": "प्रयोगविधिः", "children": ["व्याकरणनियमाः", "पदसंरचना", "उदाहरणानि", "प्रयोगाः"]},
                    {"name": "प्रमुखप्रक्रिया", "children": ["अध्ययनक्रमः", "सूत्राणि", "विस्तारः", "समीक्षा"]},
                    {"name": "परीक्षणम् च मूल्याङ्कनम्", "children": ["अभ्यासः", "प्रश्नोत्तराणि", "निष्कर्षः"]},
                ]
            elif is_hindi:
                all_branches = [
                    {"name": "मूल सिद्धांत", "children": ["परिभाषाएं", "सैद्धांतिक ढांचा", "आधारभूत नियम", "उद्देश्य"]},
                    {"name": "व्यावहारिक विधि", "children": ["चरणबद्ध प्रक्रिया", "कार्यान्वयन नियम", "उदाहरण", "केस स्टडी"]},
                    {"name": "मुख्य प्रक्रिया", "children": ["कार्यप्रणाली", "पैरामीटर नियंत्रण", "दक्षता एवं अनुकूलन"]},
                    {"name": "परीक्षण एवं मूल्यांकन", "children": ["त्रुटि निवारण", "सीमाएं", "अभ्यास एवं निष्कर्ष"]},
                ]
            elif "java" in topic_title.lower() or "index" in context_clean.lower():
                all_branches = [
                    {"name": "Strings & Methods", "children": ["indexOf() & lastIndexOf()", "startIndex Offset Search", "Immutability & Memory", "StringBuilder Utility"]},
                    {"name": "Exception Handling", "children": ["try-catch-finally", "Checked vs Unchecked", "Custom Exceptions", "AutoCloseable"]},
                    {"name": "Object-Oriented Design", "children": ["Encapsulation", "Inheritance & Polymorphism", "Abstraction & Interfaces", "Class Modifiers"]},
                    {"name": "JVM & Runtime", "children": ["Heap & Stack Allocation", "Garbage Collection Cycles", "ClassLoaders", "JIT Compiler"]},
                    {"name": "Collections & Generics", "children": ["List, Set, & Map Hierarchy", "ArrayList vs LinkedList", "HashMap Hashing", "Iterators"]},
                    {"name": "Concurrency & Multithreading", "children": ["Thread Lifecycle", "Synchronized & Locks", "Executors & ThreadPools", "Volatile & Atomic"]},
                ]
            else:
                all_branches = [
                    {"name": "Core Principles", "children": ["Foundational Definitions", "Theoretical Framework", "Baseline Assumptions"]},
                    {"name": "Practical Methodology", "children": ["Step-by-Step Workflow", "Implementation Rules", "Case Studies"]},
                    {"name": "Key Mechanisms", "children": ["Operational Lifecycle", "Parameter Handling", "Performance Optimization"]},
                    {"name": "Validation & Testing", "children": ["Edge Case Analysis", "Boundary Constraints", "Verification Metrics"]},
                ]

            branches = random.sample(all_branches, min(len(all_branches), 5))
            mermaid_lines = [f"mindmap\n  root(({topic_title[:25]}))"]
            for b in branches:
                mermaid_lines.append(f"    {b['name']}")
                for c in b["children"]:
                    mermaid_lines.append(f"      {c}")

            data = {
                "root": topic_title,
                "branches": branches,
                "mermaid": "\n".join(mermaid_lines),
            }
        else:  # summary
            if is_sanskrit:
                data = {
                    "summary": f"{topic_title} इत्यस्य समग्रम् अध्ययनविवरणम्। अस्मिन् भागे मूलसंकल्पनानां, शास्त्रीयनियमानां, व्यावहारिकप्रयोगाणां च गहनं विवेचनं विद्यते।",
                    "bullets": [
                        f"मूलतत्त्वम्: {shuffled_snippets[0] if len(shuffled_snippets) > 0 else 'मूलसिद्धान्ताः प्रतिष्ठिताः।'}",
                        f"प्रमुखसंकल्पना: {shuffled_snippets[1] if len(shuffled_snippets) > 1 else 'व्यवस्थितं ज्ञानम् आवश्यकम्।'}",
                        f"व्यावहारिकप्रयोगः: {shuffled_snippets[2] if len(shuffled_snippets) > 2 else 'निरन्तराभ्यासेन सिद्धिः।'}",
                        f"अन्तिमनिष्कर्षः: {shuffled_snippets[3] if len(shuffled_snippets) > 3 else 'सर्वतोमुखं ज्ञानवर्धनम्।'}",
                    ]
                }
            elif is_hindi:
                data = {
                    "summary": f"{topic_title} का व्यापक अध्ययन सारांश। यह मॉड्यूल आधारभूत सिद्धांतों, व्यावहारिक अनुप्रयोगों और प्रमुख विश्लेषणात्मक निष्कर्षों का गहन विवरण प्रस्तुत करता है।",
                    "bullets": [
                        f"मूल आधार: {shuffled_snippets[0] if len(shuffled_snippets) > 0 else 'आधारभूत सिद्धांतों की स्थापना।'}",
                        f"मुख्य अवधारणा: {shuffled_snippets[1] if len(shuffled_snippets) > 1 else 'समस्या समाधान के लिए तार्किक दृष्टिकोण।'}",
                        f"व्यावहारिक अनुप्रयोग: {shuffled_snippets[2] if len(shuffled_snippets) > 2 else 'नियमित अभ्यास और सतत मूल्यांकन।'}",
                        f"अंतिम निष्कर्ष: {shuffled_snippets[3] if len(shuffled_snippets) > 3 else 'सटीकता और वैचारिक स्पष्टता सुनिश्चित करना।'}",
                    ]
                }
            else:
                data = {
                    "summary": f"Comprehensive study synthesis for {topic_title}. This module explores primary theoretical definitions, practical application strategies, and key analytical takeaways.",
                    "bullets": [
                        f"Core Foundation: {shuffled_snippets[0] if len(shuffled_snippets) > 0 else 'Foundational principles established.'}",
                        f"Key Concept: {shuffled_snippets[1] if len(shuffled_snippets) > 1 else 'Systematic approach to problem solving.'}",
                        f"Practical Application: {shuffled_snippets[2] if len(shuffled_snippets) > 2 else 'Iterative testing and structured review.'}",
                        f"Advanced Takeaway: {shuffled_snippets[3] if len(shuffled_snippets) > 3 else 'Validation ensures consistency across use cases.'}",
                    ]
                }

    # Ensure all MCQs have randomized answer positions across A, B, C, D
    if req.type == "mcq" and isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and "options" in item and "answer" in item:
                opts = list(item.get("options", []))
                ans_idx = item.get("answer", 0)
                if 0 <= ans_idx < len(opts):
                    correct_text = opts[ans_idx]
                    shuffled_opts = list(opts)
                    random.shuffle(shuffled_opts)
                    item["options"] = shuffled_opts
                    item["answer"] = shuffled_opts.index(correct_text)

    # If LLM returned mindmap with only mermaid string, normalize to include branches
    if req.type == "mindmap" and isinstance(data, dict) and "branches" not in data:
        branches = []
        mermaid_txt = data.get("mermaid", "")
        current_branch = None
        for line in mermaid_txt.split("\n"):
            stripped = line.strip()
            if not stripped or stripped.startswith("mindmap") or stripped.startswith("root"):
                continue
            indent = len(line) - len(line.lstrip())
            if indent <= 4:
                current_branch = {"name": stripped, "children": []}
                branches.append(current_branch)
            elif current_branch and indent > 4:
                current_branch["children"].append(stripped)
        data["root"] = data.get("root") or topic_title
        data["branches"] = branches or [
            {"name": "Fundamentals", "children": ["Core Definitions", "Basic Rules"]},
            {"name": "Applications", "children": ["Workflows", "Examples"]},
            {"name": "Advanced", "children": ["Edge Cases", "Optimizations"]}
        ]

    return {
        "type": req.type,
        "topic": topic_title,
        "data": data,
        "raw": raw,
        "context_used": bool(context),
    }
