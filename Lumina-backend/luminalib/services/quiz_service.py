"""Quiz service — business logic, AI generation, grading."""

from __future__ import annotations

import json
import logging
import random
from datetime import datetime, timezone, timedelta
from typing import Sequence

from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from luminalib.models.quiz import Quiz, QuizQuestion, QuizGroupEntitlement, QuizAttempt, QuizAttemptAnswer
from luminalib.models.user_group import GroupMember
from luminalib.models.document_chunk import DocumentChunk

logger = logging.getLogger("luminalib.quiz")


def _recalc_total(quiz: Quiz):
    quiz.total_marks = int(sum(q.marks for q in (quiz.questions or [])))


class QuizService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def is_entitled(self, user_id: int, quiz_id: int) -> bool:
        # Admin bypass handled by caller; check group entitlement
        q = select(QuizGroupEntitlement.quiz_id).where(QuizGroupEntitlement.quiz_id == quiz_id)
        ent = (await self.db.execute(q)).scalars().all()
        if not ent:
            return False
        # get user groups
        g = select(GroupMember.group_id).where(GroupMember.user_id == user_id)
        user_groups = set((await self.db.execute(g)).scalars().all())
        # get quiz groups
        qg = select(QuizGroupEntitlement.group_id).where(QuizGroupEntitlement.quiz_id == quiz_id)
        quiz_groups = set((await self.db.execute(qg)).scalars().all())
        return bool(user_groups & quiz_groups)

    async def get_quiz(self, quiz_id: int) -> Quiz | None:
        res = await self.db.execute(select(Quiz).options(selectinload(Quiz.questions)).where(Quiz.id == quiz_id))
        quiz = res.scalar_one_or_none()
        if quiz:
            # load group_ids
            g = await self.db.execute(select(QuizGroupEntitlement.group_id).where(QuizGroupEntitlement.quiz_id == quiz_id))
            quiz.group_ids = list(g.scalars().all())  # type: ignore
            quiz.total_questions = len(quiz.questions)  # type: ignore
        return quiz

    async def list_manage(self, user_id: int, is_admin: bool) -> Sequence[Quiz]:
        if is_admin:
            res = await self.db.execute(select(Quiz).options(selectinload(Quiz.questions)).order_by(Quiz.created_at.desc()))
        else:
            res = await self.db.execute(select(Quiz).options(selectinload(Quiz.questions)).where(Quiz.created_by_user_id == user_id).order_by(Quiz.created_at.desc()))
        quizzes = list(res.scalars().all())
        for q in quizzes:
            g = await self.db.execute(select(QuizGroupEntitlement.group_id).where(QuizGroupEntitlement.quiz_id == q.id))
            q.group_ids = list(g.scalars().all())  # type: ignore
            q.total_questions = len(q.questions)  # type: ignore
        return quizzes

    async def list_assigned(self, user_id: int) -> Sequence[Quiz]:
        # get user groups
        g = select(GroupMember.group_id).where(GroupMember.user_id == user_id)
        user_groups = list((await self.db.execute(g)).scalars().all())
        if not user_groups:
            return []
        q = (
            select(Quiz)
            .options(selectinload(Quiz.questions))
            .join(QuizGroupEntitlement, QuizGroupEntitlement.quiz_id == Quiz.id)
            .where(QuizGroupEntitlement.group_id.in_(user_groups), Quiz.status.in_(["published", "scheduled", "enabled"]))
            .order_by(Quiz.created_at.desc())
        )
        res = await self.db.execute(q)
        # dedupe by id
        seen = {}
        for quiz in res.scalars().all():
            seen[quiz.id] = quiz
        quizzes = list(seen.values())

        # Query user attempts for each quiz
        quiz_ids = [quiz.id for quiz in quizzes]
        attempts_by_quiz = {}
        if quiz_ids:
            att_q = (
                select(QuizAttempt.quiz_id, func.count(QuizAttempt.id))
                .where(
                    QuizAttempt.user_id == user_id,
                    QuizAttempt.quiz_id.in_(quiz_ids),
                )
                .group_by(QuizAttempt.quiz_id)
            )
            att_res = await self.db.execute(att_q)
            attempts_by_quiz = dict(att_res.all())

        # filter window and max attempts
        now = datetime.now(timezone.utc)
        def to_aware(d):
            if d is None:
                return None
            return d if d.tzinfo else d.replace(tzinfo=timezone.utc)

        out = []
        for quiz in quizzes:
            af = to_aware(quiz.available_from)
            au = to_aware(quiz.available_until)
            if af and af > now:
                continue
            if au and au < now:
                # Auto-disabled by schedule window
                continue
            
            # Check user max attempts
            user_attempts = attempts_by_quiz.get(quiz.id, 0)
            if quiz.max_attempts > 0 and user_attempts >= quiz.max_attempts:
                # Max attempt reached for this quiz -> remove from assigned quizzes page
                continue

            g2 = await self.db.execute(select(QuizGroupEntitlement.group_id).where(QuizGroupEntitlement.quiz_id == quiz.id))
            quiz.group_ids = list(g2.scalars().all())  # type: ignore
            quiz.total_questions = len(quiz.questions)  # type: ignore
            out.append(quiz)
        return out

    async def create_quiz(self, data, creator_id: int) -> Quiz:
        quiz = Quiz(
            title=data.title,
            description=data.description,
            instructions=data.instructions or "Read all questions carefully. Timer starts on Start. Auto-submit on timeout.",
            source_type=data.source_type,
            source_book_id=data.source_book_id,
            source_context=data.source_context,
            created_by_user_id=creator_id,
            status=getattr(data, "status", None) or "published",
            duration_minutes=data.duration_minutes,
            pass_percentage=data.pass_percentage,
            max_attempts=data.max_attempts,
            shuffle_questions=data.shuffle_questions,
            shuffle_options=data.shuffle_options,
            show_result=data.show_result,
            show_correct_answers=data.show_correct_answers,
            negative_marking=data.negative_marking,
            negative_marks=data.negative_marks,
            available_from=data.available_from,
            available_until=data.available_until,
        )
        self.db.add(quiz)
        await self.db.flush()
        for idx, qd in enumerate(data.questions):
            opts = None
            if qd.options:
                opts = [{"id": chr(97 + i), "text": o.text, "is_correct": o.is_correct} for i, o in enumerate(qd.options)]
            qq = QuizQuestion(
                quiz_id=quiz.id,
                type=qd.type,
                prompt=qd.prompt,
                marks=qd.marks,
                negative_marks=qd.negative_marks,
                explanation=qd.explanation,
                order_index=qd.order_index if qd.order_index is not None else idx,
                rubric=qd.rubric,
                expected_answer=qd.expected_answer,
                word_limit=qd.word_limit,
                grading_type=qd.grading_type,
                options=opts,
                ai_generated=False,
            )
            self.db.add(qq)
        await self.db.flush()
        # recalc
        res = await self.db.execute(select(func.sum(QuizQuestion.marks)).where(QuizQuestion.quiz_id == quiz.id))
        quiz.total_marks = int(res.scalar() or 0)
        # entitlements
        for gid in data.group_ids:
            self.db.add(QuizGroupEntitlement(quiz_id=quiz.id, group_id=gid, assigned_by=creator_id))
        await self.db.commit()
        await self.db.refresh(quiz)
        return await self.get_quiz(quiz.id)  # type: ignore

    async def generate_ai(self, req, user_id: int, llm) -> list[dict]:
        context = ""
        if req.source == "book" and req.book_id:
            # pull chunks
            res = await self.db.execute(select(DocumentChunk.content).where(DocumentChunk.book_id == req.book_id).limit(8))
            chunks = [r[0] for r in res.fetchall()]
            context = "\n\n".join(chunks[:4])[:12000]
            if not context:
                # fallback to book content_text
                from luminalib.models.book import Book
                br = await self.db.execute(select(Book.content_text).where(Book.id == req.book_id))
                txt = br.scalar_one_or_none()
                if txt:
                    context = txt[:12000]
        elif req.source == "topic" and req.topic:
            context = f"Topic: {req.topic}"
        elif req.source == "prompt" and req.prompt:
            context = req.prompt

        if not context:
            context = req.topic or req.prompt or "General knowledge"

        # decide mix
        total = req.num_questions
        if req.mcq_single is not None:
            n_single = req.mcq_single
            n_multi = req.mcq_multi or 0
            n_desc = req.descriptive or 0
        else:
            # default 60% single, 20% multi, 20% descriptive
            n_single = max(1, int(total * 0.6))
            n_desc = max(0, int(total * 0.2))
            n_multi = total - n_single - n_desc

        system_prompt = f"""You are LuminaLib Quiz Generator. Context: {context[:4000]}
Task: Generate {total} unique, high-quality, non-repetitive educational questions as a JSON array.
Mix: {n_single} mcq_single, {n_multi} mcq_multi, {n_desc} descriptive. Difficulty: {req.difficulty}.
Requirements:
1. Every question MUST be completely distinct and cover different sub-topics, principles, or applications.
2. For mcq_single: MUST provide exactly 4 distinct options with EXACTLY ONE option having is_correct: true, and 3 having is_correct: false.
3. Each object schema:
   {{
     "type": "mcq_single" | "mcq_multi" | "descriptive",
     "prompt": "Clear question text",
     "options": [
       {{"text": "Option A text", "is_correct": true}},
       {{"text": "Option B text", "is_correct": false}},
       {{"text": "Option C text", "is_correct": false}},
       {{"text": "Option D text", "is_correct": false}}
     ],
     "explanation": "Why the correct answer is right",
     "rubric": "Evaluation criteria for descriptive questions"
   }}
Return ONLY a valid JSON array of question objects without markdown fences."""

        # Try LLM, fallback to smart generator if fails
        raw = None
        try:
            if hasattr(llm, "generate"):
                raw = await llm.generate(system_prompt)  # type: ignore
            elif hasattr(llm, "summarize"):
                raw = await llm.summarize(system_prompt)
        except Exception as e:
            logger.warning("LLM generate failed: %s", e)
            raw = None

        if raw:
            try:
                txt = raw.strip()
                if "```" in txt:
                    txt = txt.split("```")[1]
                    if txt.startswith("json"):
                        txt = txt[4:]
                arr = json.loads(txt)
                if isinstance(arr, dict) and "questions" in arr:
                    arr = arr["questions"]
                if isinstance(arr, list) and len(arr) > 0:
                    out = []
                    for i, q in enumerate(arr[:total]):
                        t = q.get("type", "mcq_single")
                        if t not in ("mcq_single", "mcq_multi", "descriptive"):
                            t = "mcq_single"
                        opts = q.get("options")
                        if t == "mcq_single" and opts:
                            # ensure at least 4 options and exactly 1 correct
                            if not any(o.get("is_correct") for o in opts):
                                opts[0]["is_correct"] = True
                        out.append({
                            "type": t,
                            "prompt": q.get("prompt") or q.get("question") or f"Question {i+1}",
                            "marks": req.marks_per_question,
                            "options": opts,
                            "explanation": q.get("explanation") or "Standard curriculum concept.",
                            "rubric": q.get("rubric"),
                            "ai_generated": True,
                        })
                    return out
            except Exception as e:
                logger.warning("AI JSON parse failed: %s", e)

        # Smart Diverse Topic-Aware Question Generator (Fallback)
        clean_topic = context.replace("Topic:", "").strip()[:80].strip()
        if len(clean_topic) < 3:
            clean_topic = "General Science & Knowledge"
        
        diff_tag = req.difficulty if req.difficulty != "mixed" else "Intermediate"
        lower_topic = clean_topic.lower()

        # Domain Knowledge Banks for common subjects
        subject_templates = []
        if any(w in lower_topic for w in ("science", "physics", "chemistry", "biology")):
            subject_templates = [
                (
                    f"Which of the following is the fundamental unit of life in biological systems related to {clean_topic}?",
                    [
                        {"text": "The Cell", "is_correct": True},
                        {"text": "The Atom", "is_correct": False},
                        {"text": "The Molecule", "is_correct": False},
                        {"text": "The Organelle", "is_correct": False},
                    ],
                    "The cell is the basic structural and functional unit of all living organisms."
                ),
                (
                    f"What is the primary law governing conservation of energy in {clean_topic}?",
                    [
                        {"text": "Energy cannot be created or destroyed, only transformed", "is_correct": True},
                        {"text": "Energy is continually depleted over time", "is_correct": False},
                        {"text": "Energy can be generated from nothing in closed systems", "is_correct": False},
                        {"text": "Energy transforms without any entropy change", "is_correct": False},
                    ],
                    "The First Law of Thermodynamics states energy conservation."
                ),
                (
                    f"What type of chemical bond involves the sharing of electron pairs between atoms in {clean_topic}?",
                    [
                        {"text": "Covalent Bond", "is_correct": True},
                        {"text": "Ionic Bond", "is_correct": False},
                        {"text": "Hydrogen Bond", "is_correct": False},
                        {"text": "Metallic Bond", "is_correct": False},
                    ],
                    "Covalent bonding involves electron pair sharing."
                ),
                (
                    f"Which process describes the movement of solvent molecules through a semipermeable membrane in {clean_topic}?",
                    [
                        {"text": "Osmosis", "is_correct": True},
                        {"text": "Diffusion", "is_correct": False},
                        {"text": "Active Transport", "is_correct": False},
                        {"text": "Precipitation", "is_correct": False},
                    ],
                    "Osmosis is solvent movement down water potential."
                ),
                (
                    f"What is the standard unit of measurement for electrical resistance studied under {clean_topic}?",
                    [
                        {"text": "Ohm (Ω)", "is_correct": True},
                        {"text": "Volt (V)", "is_correct": False},
                        {"text": "Ampere (A)", "is_correct": False},
                        {"text": "Watt (W)", "is_correct": False},
                    ],
                    "Electrical resistance is measured in Ohms."
                ),
                (
                    f"Which organelle is known as the powerhouse of the cell in cellular biology related to {clean_topic}?",
                    [
                        {"text": "Mitochondria", "is_correct": True},
                        {"text": "Ribosome", "is_correct": False},
                        {"text": "Endoplasmic Reticulum", "is_correct": False},
                        {"text": "Golgi Apparatus", "is_correct": False},
                    ],
                    "Mitochondria produce ATP via cellular respiration."
                ),
                (
                    f"What is the acceleration due to gravity on the surface of Earth in {clean_topic}?",
                    [
                        {"text": "Approximately 9.8 m/s²", "is_correct": True},
                        {"text": "Approximately 3.14 m/s²", "is_correct": False},
                        {"text": "Approximately 15.2 m/s²", "is_correct": False},
                        {"text": "Approximately 0 m/s²", "is_correct": False},
                    ],
                    "Standard Earth gravitational acceleration is ~9.8 m/s²."
                ),
                (
                    f"What is the pH level of pure water at standard room temperature (25°C)?",
                    [
                        {"text": "7.0 (Neutral)", "is_correct": True},
                        {"text": "1.0 (Strong Acid)", "is_correct": False},
                        {"text": "14.0 (Strong Base)", "is_correct": False},
                        {"text": "4.5 (Mild Acid)", "is_correct": False},
                    ],
                    "Pure neutral water has a pH of 7.0."
                ),
            ]
        elif any(w in lower_topic for w in ("math", "algebra", "trigonometry", "geometry", "calculus")):
            subject_templates = [
                (
                    f"What is the value of the trigonometric identity sin²(θ) + cos²(θ) for any real angle θ in {clean_topic}?",
                    [
                        {"text": "1", "is_correct": True},
                        {"text": "0", "is_correct": False},
                        {"text": "-1", "is_correct": False},
                        {"text": "tan(θ)", "is_correct": False},
                    ],
                    "The Pythagorean trigonometric identity states sin²(θ) + cos²(θ) = 1."
                ),
                (
                    f"Which algebraic identity correctly expresses (a + b)² in {clean_topic}?",
                    [
                        {"text": "a² + 2ab + b²", "is_correct": True},
                        {"text": "a² + b²", "is_correct": False},
                        {"text": "a² - 2ab + b²", "is_correct": False},
                        {"text": "2a + 2b", "is_correct": False},
                    ],
                    "(a+b)² expands to a² + 2ab + b²."
                ),
                (
                    f"What is the derivative of f(x) = x³ with respect to x?",
                    [
                        {"text": "3x²", "is_correct": True},
                        {"text": "x²", "is_correct": False},
                        {"text": "3x", "is_correct": False},
                        {"text": "x⁴/4", "is_correct": False},
                    ],
                    "By the power rule, d/dx (x^n) = n*x^(n-1), so d/dx(x³) = 3x²."
                ),
                (
                    f"In a right-angled triangle, what is the ratio defining the cosine of an acute angle θ?",
                    [
                        {"text": "Adjacent side / Hypotenuse", "is_correct": True},
                        {"text": "Opposite side / Hypotenuse", "is_correct": False},
                        {"text": "Opposite side / Adjacent side", "is_correct": False},
                        {"text": "Hypotenuse / Opposite side", "is_correct": False},
                    ],
                    "Cosine is Adjacent / Hypotenuse."
                ),
                (
                    f"What are the roots of the quadratic equation x² - 5x + 6 = 0 in {clean_topic}?",
                    [
                        {"text": "x = 2 and x = 3", "is_correct": True},
                        {"text": "x = -2 and x = -3", "is_correct": False},
                        {"text": "x = 1 and x = 6", "is_correct": False},
                        {"text": "x = -1 and x = -6", "is_correct": False},
                    ],
                    "(x-2)(x-3) = 0 yields roots x = 2, 3."
                ),
                (
                    f"What is the sum of interior angles in any Euclidean triangle in {clean_topic}?",
                    [
                        {"text": "180 degrees (π radians)", "is_correct": True},
                        {"text": "360 degrees (2π radians)", "is_correct": False},
                        {"text": "90 degrees (π/2 radians)", "is_correct": False},
                        {"text": "270 degrees (3π/2 radians)", "is_correct": False},
                    ],
                    "The interior angle sum of a triangle is always 180°."
                ),
            ]
        elif any(w in lower_topic for w in ("computer", "programming", "python", "software", "data", "algorithm", "os", "operating")):
            subject_templates = [
                (
                    f"What is the average time complexity of searching for an element in a balanced Binary Search Tree (BST)?",
                    [
                        {"text": "O(log n)", "is_correct": True},
                        {"text": "O(1)", "is_correct": False},
                        {"text": "O(n)", "is_correct": False},
                        {"text": "O(n log n)", "is_correct": False},
                    ],
                    "Balanced BST search cuts the search space in half at each step: O(log n)."
                ),
                (
                    f"Which data structure operates on a Last-In, First-Out (LIFO) principle in {clean_topic}?",
                    [
                        {"text": "Stack", "is_correct": True},
                        {"text": "Queue", "is_correct": False},
                        {"text": "Array", "is_correct": False},
                        {"text": "Linked List", "is_correct": False},
                    ],
                    "Stacks strictly enforce LIFO order."
                ),
                (
                    f"Which of the following is an immutable sequence data type in Python?",
                    [
                        {"text": "Tuple", "is_correct": True},
                        {"text": "List", "is_correct": False},
                        {"text": "Dictionary", "is_correct": False},
                        {"text": "Set", "is_correct": False},
                    ],
                    "Tuples cannot be modified after creation in Python."
                ),
                (
                    f"What condition is NOT one of Coffman's four necessary conditions for deadlock in operating systems?",
                    [
                        {"text": "Preemption Allowed", "is_correct": True},
                        {"text": "Mutual Exclusion", "is_correct": False},
                        {"text": "Hold and Wait", "is_correct": False},
                        {"text": "Circular Wait", "is_correct": False},
                    ],
                    "No-preemption is required for deadlocks; allowing preemption prevents deadlocks."
                ),
                (
                    f"What protocol provides secure, encrypted transmission of web pages over the Internet?",
                    [
                        {"text": "HTTPS (SSL/TLS)", "is_correct": True},
                        {"text": "HTTP", "is_correct": False},
                        {"text": "FTP", "is_correct": False},
                        {"text": "Telnet", "is_correct": False},
                    ],
                    "HTTPS encrypts HTTP traffic using TLS/SSL."
                ),
                (
                    f"What is the primary function of an operating system kernel in {clean_topic}?",
                    [
                        {"text": "Manage hardware resources and process scheduling", "is_correct": True},
                        {"text": "Design graphic user interfaces and icons", "is_correct": False},
                        {"text": "Compile source code into assembly language", "is_correct": False},
                        {"text": "Browse the World Wide Web", "is_correct": False},
                    ],
                    "The kernel is the core component managing memory, CPU, and device I/O."
                ),
            ]
        
        # General topic aspects for dynamic distinct generation
        aspects = [
            ("Core Principle & Fundamental Definition", "What is the primary defining principle of", "A comprehensive and accurate conceptual definition", "An overly narrow operational assumption", "An unrelated domain property", "An inverted cause-and-effect relationship"),
            ("Practical Application & Methodology", "In practical applications of", "Applied execution that follows established standards", "Arbitrary trial-and-error without verification", "Omitting foundational prerequisite steps", "Applying invalid contextual criteria"),
            ("Key Distinguishing Characteristics", "Which key feature distinguishes", "Specific verifiable core characteristics", "Generic non-distinctive traits", "Conflicting attributes from unrelated systems", "Outdated or deprecated specifications"),
            ("Analytical Evaluation & Optimization", "When analyzing performance and optimization in", "Optimal systematic evaluation based on metrics", "Unmonitored subjective estimation", "Overfitting without generalization", "Ignoring baseline validation parameters"),
            ("Component Interactions & Workflow", "How do the core components of", "Seamless coordinated interaction following systematic flow", "Isolated processing without error propagation", "Uncontrolled race conditions", "Static bypass of critical stages"),
            ("Best Practices & Common Pitfalls", "Which practice is recommended when working with", "Following validated guidelines and safety constraints", "Ignoring edge case validation", "Relying on unauthenticated inputs", "Skipping regression verification"),
            ("Theoretical Foundations", "What theoretical model underpins", "Rigorous validated conceptual models", "Empirically disproven hypotheses", "Purely coincidental correlations", "Inapplicable statistical artifacts"),
            ("Impact & Outcome Assessment", "What is the primary positive outcome when correctly applying", "Measurable improvement in efficiency and accuracy", "Increased systemic vulnerability", "Unpredictable variance in results", "Permanent loss of audit trails")
        ]

        out = []
        for i in range(total):
            if i < n_single:
                if i < len(subject_templates):
                    prompt_txt, opt_list, expl = subject_templates[i]
                else:
                    asp_name, q_prefix, correct_ans, dist1, dist2, dist3 = aspects[i % len(aspects)]
                    prompt_txt = f"{q_prefix} {clean_topic}? ({diff_tag} — Concept #{i+1})"
                    opt_list = [
                        {"text": f"{correct_ans} regarding {clean_topic}", "is_correct": True},
                        {"text": f"{dist1}", "is_correct": False},
                        {"text": f"{dist2}", "is_correct": False},
                        {"text": f"{dist3}", "is_correct": False},
                    ]
                    expl = f"Concept #{i+1} relates to {asp_name} in {clean_topic}."
                out.append({
                    "type": "mcq_single",
                    "prompt": prompt_txt,
                    "marks": req.marks_per_question,
                    "options": opt_list,
                    "explanation": expl,
                    "rubric": None,
                    "ai_generated": True,
                })
            elif i < n_single + n_multi:
                out.append({
                    "type": "mcq_multi",
                    "prompt": f"Select all verified valid principles associated with '{clean_topic}' (Section #{i+1}):",
                    "marks": req.marks_per_question,
                    "options": [
                        {"text": f"Accurate foundational statement regarding {clean_topic}", "is_correct": True},
                        {"text": f"Properly validated operational standard for {clean_topic}", "is_correct": True},
                        {"text": f"Plausible but incorrect assumption regarding {clean_topic}", "is_correct": False},
                        {"text": f"Contradictory hypothesis that violates {clean_topic} rules", "is_correct": False},
                    ],
                    "explanation": f"Multiple choice question covering validated principles of {clean_topic}.",
                    "rubric": None,
                    "ai_generated": True,
                })
            else:
                out.append({
                    "type": "descriptive",
                    "prompt": f"Provide a detailed technical analysis of '{clean_topic}', explaining its key principles, real-world application, and common challenges.",
                    "marks": req.marks_per_question * 5,
                    "options": None,
                    "explanation": None,
                    "rubric": f"Criteria: Conceptual understanding (40%), Technical depth & examples (30%), Clarity & structure (20%), Practical considerations (10%).",
                    "ai_generated": True,
                })
        return out
