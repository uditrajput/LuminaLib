"""Quiz & Assessment endpoints — v4.0"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from luminalib.api.v1.deps import get_db, get_current_user, get_llm
from luminalib.core.rbac import require_permission, user_has_permission
from luminalib.models.quiz import Quiz, QuizQuestion, QuizGroupEntitlement, QuizAttempt, QuizAttemptAnswer, QuizAttemptEvent
from luminalib.models.user_group import GroupMember
from luminalib.models.user import User
from luminalib.schemas.quiz_schema import (
    QuizCreate, QuizUpdate, QuizRead, QuizQuestionRead, GenerateRequest, AssignRequest, AnswersPatch, GradeRequest, AIGradeRequest
)
from luminalib.services.quiz_service import QuizService

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


def _to_read(q: Quiz) -> QuizRead:
    qs = []
    for qq in (q.questions or []):
        qs.append(QuizQuestionRead(
            id=qq.id, quiz_id=qq.quiz_id, type=qq.type, prompt=qq.prompt, marks=qq.marks,
            negative_marks=qq.negative_marks, explanation=qq.explanation, order_index=qq.order_index,
            ai_generated=qq.ai_generated, rubric=qq.rubric, expected_answer=qq.expected_answer,
            word_limit=qq.word_limit, grading_type=qq.grading_type, options=qq.options,
        ))
    return QuizRead(
        id=q.id, title=q.title, description=q.description, instructions=q.instructions,
        source_type=q.source_type, source_book_id=q.source_book_id, created_by_user_id=q.created_by_user_id,
        status=q.status, duration_minutes=q.duration_minutes, total_marks=q.total_marks,
        pass_percentage=q.pass_percentage, max_attempts=q.max_attempts, shuffle_questions=q.shuffle_questions,
        shuffle_options=q.shuffle_options, show_result=q.show_result, show_correct_answers=q.show_correct_answers,
        negative_marking=q.negative_marking, negative_marks=q.negative_marks,
        available_from=q.available_from, available_until=q.available_until,
        created_at=q.created_at, updated_at=q.updated_at,
        questions=qs, group_ids=getattr(q, "group_ids", []) or [], total_questions=len(qs),
    )


@router.post("", response_model=QuizRead, status_code=status.HTTP_201_CREATED)
async def create_quiz(req: QuizCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_permission("quiz_manage"))):
    svc = QuizService(db)
    quiz = await svc.create_quiz(req, user.id)
    return _to_read(quiz)


@router.get("", response_model=list[QuizRead])
async def list_quizzes(scope: str = "assigned", db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = QuizService(db)
    is_admin = user.role.name.lower() == "admin"
    has_manage = user_has_permission(user, "quiz_manage")
    if scope == "manage" and has_manage:
        quizzes = await svc.list_manage(user.id, is_admin)
    else:
        # assigned for students; managers also can see assigned via scope=assigned
        quizzes = await svc.list_assigned(user.id)
        # managers should also see their own managed when scope != manage? keep assigned only
        if has_manage and scope == "manage":
            pass
        elif has_manage and scope != "assigned":
            # fallback to manage if no assigned
            pass
    return [_to_read(q) for q in quizzes]


@router.get("/{quiz_id}", response_model=QuizRead)
async def get_quiz(quiz_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = QuizService(db)
    quiz = await svc.get_quiz(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    # check access: creator/admin or entitled
    is_admin = user.role.name.lower() == "admin"
    is_creator = quiz.created_by_user_id == user.id
    has_manage = user_has_permission(user, "quiz_manage")
    if is_admin or is_creator or has_manage:
        # allow managers to view their own or all if admin
        if not is_admin and not is_creator and has_manage:
            # still allow if they have manage but not creator — restrict to own? allow view for grading — check entitlement?
            pass
        return _to_read(quiz)
    # student: must be entitled
    if not await svc.is_entitled(user.id, quiz_id):
        raise HTTPException(status_code=403, detail="Not entitled to this quiz")
    # also check status published
    if quiz.status not in ["published", "scheduled", "enabled"]:
        raise HTTPException(status_code=403, detail="Quiz not active or published")
    return _to_read(quiz)


@router.put("/{quiz_id}", response_model=QuizRead)
async def update_quiz(quiz_id: int, req: QuizUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_permission("quiz_manage"))):
    svc = QuizService(db)
    quiz = await svc.get_quiz(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.created_by_user_id != user.id and user.role.name.lower() != "admin":
        raise HTTPException(status_code=403, detail="Not owner")

    dump = req.model_dump(exclude_unset=True)
    questions_data = dump.pop("questions", None)
    group_ids_data = dump.pop("group_ids", None)

    for k, v in dump.items():
        if v is not None:
            setattr(quiz, k, v)

    if questions_data is not None:
        await db.execute(delete(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id))
        for idx, qd in enumerate(req.questions or []):
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
            db.add(qq)
        await db.flush()
        # recalc total marks
        res = await db.execute(select(func.sum(QuizQuestion.marks)).where(QuizQuestion.quiz_id == quiz.id))
        quiz.total_marks = int(res.scalar() or 0)

    if group_ids_data is not None:
        await db.execute(delete(QuizGroupEntitlement).where(QuizGroupEntitlement.quiz_id == quiz.id))
        for gid in group_ids_data:
            db.add(QuizGroupEntitlement(quiz_id=quiz.id, group_id=gid, assigned_by=user.id))

    await db.commit()
    await db.refresh(quiz)
    return _to_read(await svc.get_quiz(quiz_id))  # type: ignore


@router.post("/{quiz_id}/toggle-status", response_model=QuizRead, summary="Toggle quiz active status (published/disabled)")
async def toggle_quiz_status(
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("quiz_manage")),
):
    svc = QuizService(db)
    quiz = await svc.get_quiz(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.created_by_user_id != user.id and user.role.name.lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    if quiz.status in ["published", "scheduled", "enabled"]:
        quiz.status = "disabled"
    else:
        quiz.status = "published"

    await db.commit()
    await db.refresh(quiz)
    return _to_read(await svc.get_quiz(quiz_id))  # type: ignore


@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz(quiz_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(require_permission("quiz_manage"))):
    res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.created_by_user_id != user.id and user.role.name.lower() != "admin":
        raise HTTPException(status_code=403, detail="Not owner")
    # check attempts
    cnt = (await db.execute(select(func.count(QuizAttempt.id)).where(QuizAttempt.quiz_id == quiz_id))).scalar()
    if cnt and cnt > 0:
        quiz.status = "archived"
        await db.commit()
        return
    await db.delete(quiz)
    await db.commit()


@router.post("/{quiz_id}/assign")
async def assign_quiz(quiz_id: int, req: AssignRequest, db: AsyncSession = Depends(get_db), user: User = Depends(require_permission("quiz_manage"))):
    res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    for gid in req.group_ids:
        exists = await db.execute(select(QuizGroupEntitlement).where(QuizGroupEntitlement.quiz_id == quiz_id, QuizGroupEntitlement.group_id == gid))
        if not exists.scalar_one_or_none():
            db.add(QuizGroupEntitlement(quiz_id=quiz_id, group_id=gid, assigned_by=user.id))
    # publish if draft
    if quiz.status == "draft":
        quiz.status = "published"
    await db.commit()
    # notifications to members of assigned groups
    try:
        from luminalib.models.notification import Notification
        for gid in req.group_ids:
            mem = await db.execute(select(GroupMember.user_id).where(GroupMember.group_id == gid))
            for (uid,) in mem.fetchall():
                db.add(Notification(user_id=uid, type="quiz_assigned", title=f"New quiz: {quiz.title}", body=f"Assigned to your group — {quiz.duration_minutes} min, {quiz.total_marks} marks. Window: {quiz.available_from or 'now'} to {quiz.available_until or 'open'}", link=f"/quizzes/{quiz_id}"))
        await db.commit()
    except:
        pass
    return {"message": "Assigned", "group_ids": req.group_ids}


@router.delete("/{quiz_id}/assign/{group_id}")
async def unassign_quiz(quiz_id: int, group_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(require_permission("quiz_manage"))):
    # block if in_progress
    cnt = (await db.execute(select(func.count(QuizAttempt.id)).where(QuizAttempt.quiz_id == quiz_id, QuizAttempt.status == "in_progress"))).scalar()
    if cnt and cnt > 0:
        raise HTTPException(status_code=409, detail="Cannot unassign with in-progress attempts")
    await db.execute(delete(QuizGroupEntitlement).where(QuizGroupEntitlement.quiz_id == quiz_id, QuizGroupEntitlement.group_id == group_id))
    await db.commit()
    return {"message": "Unassigned"}


@router.post("/{quiz_id}/questions", response_model=QuizQuestionRead)
async def add_question(quiz_id: int, req: dict, db: AsyncSession = Depends(get_db), user: User = Depends(require_permission("quiz_manage"))):
    # generic add for wizard
    from luminalib.schemas.quiz_schema import QuizQuestionCreate
    qd = QuizQuestionCreate(**req)
    res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Quiz not found")
    opts = None
    if qd.options:
        opts = [{"id": chr(97+i), "text": o.text, "is_correct": o.is_correct} for i,o in enumerate(qd.options)]
    # order
    cnt = (await db.execute(select(func.count(QuizQuestion.id)).where(QuizQuestion.quiz_id == quiz_id))).scalar() or 0
    qq = QuizQuestion(quiz_id=quiz_id, type=qd.type, prompt=qd.prompt, marks=qd.marks, negative_marks=qd.negative_marks, explanation=qd.explanation, order_index=qd.order_index if qd.order_index is not None else cnt, options=opts, rubric=qd.rubric, expected_answer=qd.expected_answer, word_limit=qd.word_limit, grading_type=qd.grading_type)
    db.add(qq)
    await db.flush()
    # recalc total
    total = (await db.execute(select(func.sum(QuizQuestion.marks)).where(QuizQuestion.quiz_id == quiz_id))).scalar() or 0
    qq_quiz = (await db.execute(select(Quiz).where(Quiz.id == quiz_id))).scalar_one()
    qq_quiz.total_marks = int(total)
    await db.commit()
    await db.refresh(qq)
    return QuizQuestionRead(id=qq.id, quiz_id=qq.quiz_id, type=qq.type, prompt=qq.prompt, marks=qq.marks, negative_marks=qq.negative_marks, explanation=qq.explanation, order_index=qq.order_index, ai_generated=qq.ai_generated, rubric=qq.rubric, expected_answer=qq.expected_answer, word_limit=qq.word_limit, grading_type=qq.grading_type, options=qq.options)


@router.post("/generate", summary="AI generate draft questions")
async def generate_questions(req: GenerateRequest, db: AsyncSession = Depends(get_db), user: User = Depends(require_permission("quiz_manage")), llm=Depends(get_llm)):
    svc = QuizService(db)
    qs = await svc.generate_ai(req, user.id, llm)
    return {"questions": qs}


@router.get("/{quiz_id}/stats")
async def quiz_stats(quiz_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(require_permission("quiz_manage"))):
    # attempts stats
    total = (await db.execute(select(func.count(QuizAttempt.id)).where(QuizAttempt.quiz_id == quiz_id))).scalar() or 0
    avg = (await db.execute(select(func.avg(QuizAttempt.score)).where(QuizAttempt.quiz_id == quiz_id, QuizAttempt.status.in_(["graded","submitted"])))).scalar()
    passed = (await db.execute(select(func.count(QuizAttempt.id)).where(QuizAttempt.quiz_id == quiz_id, QuizAttempt.passed == True))).scalar() or 0
    pending = (await db.execute(select(func.count(QuizAttempt.id)).where(QuizAttempt.quiz_id == quiz_id, QuizAttempt.status == "pending_grading"))).scalar() or 0
    return {"total_attempts": total, "avg_score": float(avg) if avg else 0, "passed": passed, "pending_grading": pending}


# ── Attempt endpoints (also under /quizzes/{id}/attempts etc) ──
@router.post("/{quiz_id}/attempts")
async def start_attempt(quiz_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    # must be entitled
    svc = QuizService(db)
    quiz = await svc.get_quiz(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.status not in ["published", "scheduled", "enabled"]:
        raise HTTPException(status_code=403, detail="Quiz is not active or published")
    # window check (UTC aware compare)
    now = datetime.now(timezone.utc)
    def to_aware(d):
        if d is None:
            return None
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    af = to_aware(quiz.available_from)
    au = to_aware(quiz.available_until)
    if af and now < af:
        raise HTTPException(status_code=403, detail="Quiz not yet open")
    if au and now > au:
        raise HTTPException(status_code=403, detail="Quiz window closed")
    if not (user.role.name.lower() == "admin" or quiz.created_by_user_id == user.id or await svc.is_entitled(user.id, quiz_id)):
        raise HTTPException(status_code=403, detail="Not entitled")
    # quota
    cnt = (await db.execute(select(func.count(QuizAttempt.id)).where(QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == user.id))).scalar() or 0
    if quiz.max_attempts != 0 and cnt >= quiz.max_attempts:
        raise HTTPException(status_code=403, detail="Max attempts reached")
    # existing in_progress
    existing = await db.execute(select(QuizAttempt).where(QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == user.id, QuizAttempt.status == "in_progress"))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already has in-progress attempt")
    now_utc = datetime.now(timezone.utc)
    expires = now_utc + timedelta(minutes=quiz.duration_minutes)
    attempt = QuizAttempt(quiz_id=quiz_id, user_id=user.id, attempt_number=cnt+1, status="in_progress", started_at=now_utc, expires_at=expires, max_score=float(quiz.total_marks))
    db.add(attempt)
    await db.flush()
    # create empty answer rows? lazy create on autosave
    await db.commit()
    await db.refresh(attempt)
    # log event
    db.add(QuizAttemptEvent(attempt_id=attempt.id, event_type="started", metadata_json={"quiz_id": quiz_id}))
    await db.commit()
    return {"attempt_id": attempt.id, "started_at": attempt.started_at, "expires_at": attempt.expires_at, "server_now": now_utc, "duration_minutes": quiz.duration_minutes}


@router.get("/attempts/{attempt_id}")
async def get_attempt(attempt_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    res = await db.execute(select(QuizAttempt).where(QuizAttempt.id == attempt_id))
    attempt = res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.user_id != user.id and not user_has_permission(user, "quiz_manage") and user.role.name.lower() != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    # compute remaining
    now = datetime.now(timezone.utc)
    exp = attempt.expires_at if attempt.expires_at.tzinfo else attempt.expires_at.replace(tzinfo=timezone.utc)
    remaining = max(0, int((exp - now).total_seconds()))
    # load answers
    ans_res = await db.execute(select(QuizAttemptAnswer).where(QuizAttemptAnswer.attempt_id == attempt_id))
    answers = ans_res.scalars().all()
    return {
        "id": attempt.id, "quiz_id": attempt.quiz_id, "user_id": attempt.user_id, "status": attempt.status,
        "started_at": attempt.started_at, "expires_at": attempt.expires_at, "submitted_at": attempt.submitted_at,
        "score": attempt.score, "max_score": attempt.max_score, "percentage": attempt.percentage, "passed": attempt.passed,
        "remaining_seconds": remaining, "server_now": now,
        "answers": [{"question_id": a.question_id, "selected_option_ids": a.selected_option_ids, "descriptive_text": a.descriptive_text, "flagged": a.flagged, "score": a.score, "is_correct": a.is_correct} for a in answers]
    }


@router.get("/attempts/{attempt_id}/time")
async def get_time(attempt_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    res = await db.execute(select(QuizAttempt).where(QuizAttempt.id == attempt_id))
    attempt = res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    now = datetime.now(timezone.utc)
    exp = attempt.expires_at if attempt.expires_at.tzinfo else attempt.expires_at.replace(tzinfo=timezone.utc)
    remaining = max(0, int((exp - now).total_seconds()))
    return {"server_now": now, "expires_at": attempt.expires_at, "remaining_seconds": remaining, "status": attempt.status}


@router.patch("/attempts/{attempt_id}/answers")
async def patch_answers(attempt_id: int, req: AnswersPatch, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    res = await db.execute(select(QuizAttempt).where(QuizAttempt.id == attempt_id))
    attempt = res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if attempt.status != "in_progress":
        raise HTTPException(status_code=409, detail="Attempt not in progress")
    # check expired
    now = datetime.now(timezone.utc)
    exp = attempt.expires_at if attempt.expires_at.tzinfo else attempt.expires_at.replace(tzinfo=timezone.utc)
    if now > exp + timedelta(seconds=30):
        # auto expire will handle, but allow one late save
        pass
    for ans in req.answers:
        # validate question belongs to quiz
        qres = await db.execute(select(QuizQuestion.id).where(QuizQuestion.id == ans.question_id, QuizQuestion.quiz_id == attempt.quiz_id))
        if not qres.scalar_one_or_none():
            continue
        existing = await db.execute(select(QuizAttemptAnswer).where(QuizAttemptAnswer.attempt_id == attempt_id, QuizAttemptAnswer.question_id == ans.question_id))
        row = existing.scalar_one_or_none()
        if row:
            row.selected_option_ids = ans.selected_option_ids
            row.descriptive_text = ans.descriptive_text
            row.flagged = ans.flagged
        else:
            db.add(QuizAttemptAnswer(attempt_id=attempt_id, question_id=ans.question_id, selected_option_ids=ans.selected_option_ids, descriptive_text=ans.descriptive_text, flagged=ans.flagged))
    await db.commit()
    return {"message": "Saved"}


@router.post("/attempts/{attempt_id}/submit")
async def submit_attempt(attempt_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    res = await db.execute(select(QuizAttempt).where(QuizAttempt.id == attempt_id))
    attempt = res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if attempt.status != "in_progress":
        # idempotent return
        return {"status": attempt.status, "score": attempt.score, "message": "Already submitted"}
    now = datetime.now(timezone.utc)
    exp = attempt.expires_at if attempt.expires_at.tzinfo else attempt.expires_at.replace(tzinfo=timezone.utc)
    attempt.submitted_at = now
    started = attempt.started_at
    if started and started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    attempt.time_taken_seconds = int((now - started).total_seconds()) if started else 0
    attempt.is_late = now > exp + timedelta(seconds=30)
    # auto grade MCQ
    # load quiz questions
    qres = await db.execute(select(QuizQuestion).where(QuizQuestion.quiz_id == attempt.quiz_id))
    questions = {q.id: q for q in qres.scalars().all()}
    # load answers
    ares = await db.execute(select(QuizAttemptAnswer).where(QuizAttemptAnswer.attempt_id == attempt_id))
    answers = {a.question_id: a for a in ares.scalars().all()}
    total_score = 0
    has_descriptive = False
    for qid, q in questions.items():
        ans = answers.get(qid)
        if q.type.startswith("mcq"):
            # find correct ids
            correct = set()
            opts = q.options or []
            for o in opts:
                if o.get("is_correct"):
                    correct.add(o.get("id"))
            selected = set(ans.selected_option_ids or []) if ans else set()
            # exact match all-or-nothing
            is_correct = (selected == correct) and len(correct) > 0
            # handle no answer -> wrong
            score = float(q.marks) if is_correct else 0
            if not is_correct and q.negative_marks:
                score = -float(q.negative_marks)
            elif not is_correct and q.quiz_id:
                # quiz negative fallback? use quiz level if set — fetch quiz
                pass
            if ans:
                ans.score = score
                ans.is_correct = is_correct
            else:
                # create missing answer as wrong
                db.add(QuizAttemptAnswer(attempt_id=attempt_id, question_id=qid, selected_option_ids=[], score=0, is_correct=False))
            total_score += score
        else:
            has_descriptive = True
            if ans and ans.descriptive_text:
                # keep pending
                pass
            total_score += 0  # pending
    # quiz negative marking fallback
    quiz = (await db.execute(select(Quiz).where(Quiz.id == attempt.quiz_id))).scalar_one()
    if quiz.negative_marking and quiz.negative_marks:
        # already applied per question if needed — for MCQ wrong without per-q override, apply quiz level
        pass

    attempt.score = total_score
    attempt.max_score = float(quiz.total_marks) if quiz.total_marks else float(sum(q.marks for q in questions.values()))
    attempt.percentage = (attempt.score / attempt.max_score * 100) if attempt.max_score else 0
    attempt.passed = (attempt.percentage or 0) >= quiz.pass_percentage if not has_descriptive else None

    if has_descriptive:
        attempt.status = "pending_grading"
    else:
        attempt.status = "graded"
        # if graded immediately, passed already set
        if attempt.passed is None:
            attempt.passed = (attempt.percentage or 0) >= quiz.pass_percentage

    await db.commit()
    db.add(QuizAttemptEvent(attempt_id=attempt_id, event_type="submitted", metadata_json={"score": attempt.score, "is_late": attempt.is_late}))
    await db.commit()
    return {"status": attempt.status, "score": attempt.score, "max_score": attempt.max_score, "percentage": attempt.percentage, "passed": attempt.passed, "is_late": attempt.is_late}


@router.get("/attempts/{attempt_id}/result")
async def get_result(attempt_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    res = await db.execute(select(QuizAttempt).where(QuizAttempt.id == attempt_id))
    attempt = res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.user_id != user.id and not user_has_permission(user, "quiz_manage"):
        raise HTTPException(status_code=403, detail="Forbidden")
    # gate by show_result
    quiz = (await db.execute(select(Quiz).where(Quiz.id == attempt.quiz_id))).scalar_one()
    if quiz.show_result == "after_grading" and attempt.status != "graded":
        return {"status": attempt.status, "message": "Result available after grading"}
    if quiz.show_result == "after_window" and quiz.available_until:
        now = datetime.now(timezone.utc)
        au = quiz.available_until if quiz.available_until.tzinfo else quiz.available_until.replace(tzinfo=timezone.utc)
        if now < au:
            return {"status": attempt.status, "message": "Result after window closes"}
    # load detailed answers
    qres = await db.execute(select(QuizQuestion).where(QuizQuestion.quiz_id == attempt.quiz_id))
    questions = list(qres.scalars().all())
    ares = await db.execute(select(QuizAttemptAnswer).where(QuizAttemptAnswer.attempt_id == attempt_id))
    ans_map = {a.question_id: a for a in ares.scalars().all()}
    # hide correct if needed
    show_correct = True
    if quiz.show_correct_answers == "never":
        show_correct = False
    elif quiz.show_correct_answers == "after_window" and quiz.available_until:
        now = datetime.now(timezone.utc)
        au = quiz.available_until if quiz.available_until.tzinfo else quiz.available_until.replace(tzinfo=timezone.utc)
        if now < au:
            show_correct = False
    detail = []
    for q in questions:
        a = ans_map.get(q.id)
        detail.append({
            "question_id": q.id, "type": q.type, "prompt": q.prompt, "marks": q.marks,
            "options": q.options if show_correct or q.type == "descriptive" else None,
            "explanation": q.explanation if show_correct else None,
            "your_answer": {"selected_option_ids": a.selected_option_ids if a else None, "descriptive_text": a.descriptive_text if a else None} if a else None,
            "score": a.score if a else None, "is_correct": a.is_correct if a else None, "feedback": a.feedback if a else None,
        })
    return {
        "attempt_id": attempt.id, "quiz_id": attempt.quiz_id, "status": attempt.status,
        "score": attempt.score, "max_score": attempt.max_score, "percentage": attempt.percentage, "passed": attempt.passed,
        "time_taken_seconds": attempt.time_taken_seconds, "is_late": attempt.is_late,
        "questions": detail,
    }


@router.get("/{quiz_id}/my-attempts")
async def my_attempts(quiz_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    res = await db.execute(select(QuizAttempt).where(QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == user.id).order_by(QuizAttempt.created_at.desc()))
    return [{"id": a.id, "status": a.status, "score": a.score, "percentage": a.percentage, "passed": a.passed, "started_at": a.started_at, "submitted_at": a.submitted_at} for a in res.scalars().all()]


# Teacher grading
@router.get("/{quiz_id}/attempts")
async def list_quiz_attempts(quiz_id: int, status_filter: str | None = None, db: AsyncSession = Depends(get_db), user: User = Depends(require_permission("quiz_manage"))):
    q = select(QuizAttempt).where(QuizAttempt.quiz_id == quiz_id)
    if status_filter:
        q = q.where(QuizAttempt.status == status_filter)
    res = await db.execute(q.order_by(QuizAttempt.created_at.desc()))
    return [{"id": a.id, "user_id": a.user_id, "status": a.status, "score": a.score, "percentage": a.percentage, "started_at": a.started_at, "submitted_at": a.submitted_at} for a in res.scalars().all()]


@router.patch("/attempts/{attempt_id}/grade")
async def grade_attempt(attempt_id: int, req: GradeRequest, db: AsyncSession = Depends(get_db), user: User = Depends(require_permission("quiz_manage"))):
    res = await db.execute(select(QuizAttempt).where(QuizAttempt.id == attempt_id))
    attempt = res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    total = attempt.score or 0
    # For pending grading, score currently is MCQ sum; need to recompute
    # First get quiz
    quiz = (await db.execute(select(Quiz).where(Quiz.id == attempt.quiz_id))).scalar_one()
    # apply grades
    for g in req.grades:
        ares = await db.execute(select(QuizAttemptAnswer).where(QuizAttemptAnswer.attempt_id == attempt_id, QuizAttemptAnswer.question_id == g.question_id))
        ans = ares.scalar_one_or_none()
        qres = await db.execute(select(QuizQuestion).where(QuizQuestion.id == g.question_id))
        q = qres.scalar_one_or_none()
        if not ans or not q:
            continue
        # adjust total: subtract old score add new
        old = ans.score or 0
        ans.score = g.score
        ans.feedback = g.feedback
        ans.graded_by = user.id
        from datetime import datetime, timezone
        ans.graded_at = datetime.now(timezone.utc)
        # flip correctness based on full marks?
        ans.is_correct = g.score >= q.marks
        total = total - old + g.score
    attempt.score = total
    attempt.percentage = (total / attempt.max_score * 100) if attempt.max_score else 0
    attempt.passed = (attempt.percentage or 0) >= quiz.pass_percentage
    # check if all descriptive graded
    qids = select(QuizQuestion.id).where(QuizQuestion.quiz_id == attempt.quiz_id, QuizQuestion.type == "descriptive")
    desc_ids = list((await db.execute(qids)).scalars().all())
    if desc_ids:
        # check all have score
        graded_cnt = (await db.execute(select(func.count(QuizAttemptAnswer.id)).where(QuizAttemptAnswer.attempt_id == attempt_id, QuizAttemptAnswer.question_id.in_(desc_ids), QuizAttemptAnswer.score.isnot(None)))).scalar() or 0
        if graded_cnt == len(desc_ids):
            attempt.status = "graded"
        else:
            attempt.status = "pending_grading"
    else:
        attempt.status = "graded"
    await db.commit()
    return {"status": attempt.status, "score": attempt.score, "percentage": attempt.percentage, "passed": attempt.passed}


@router.post("/attempts/{attempt_id}/ai-grade")
async def ai_grade(attempt_id: int, req: AIGradeRequest, db: AsyncSession = Depends(get_db), user: User = Depends(require_permission("quiz_manage")), llm=Depends(get_llm)):
    # fetch answer
    ares = await db.execute(select(QuizAttemptAnswer).where(QuizAttemptAnswer.attempt_id == attempt_id, QuizAttemptAnswer.question_id == req.question_id))
    ans = ares.scalar_one_or_none()
    if not ans:
        raise HTTPException(status_code=404, detail="Answer not found")
    q = (await db.execute(select(QuizQuestion).where(QuizQuestion.id == req.question_id))).scalar_one()
    quiz = (await db.execute(select(QuizAttempt).where(QuizAttempt.id == attempt_id))).scalar_one()
    prompt = f"Grade this descriptive answer. Question: {q.prompt}\nRubric: {q.rubric or 'General correctness'}\nExpected: {q.expected_answer or ''}\nStudent: {ans.descriptive_text or ''}\nMax marks: {q.marks}\nReturn JSON {{\"suggested_score\": float, \"justification\": \"...\", \"strengths\": \"...\", \"gaps\": \"...\"}}"
    try:
        raw = await llm.summarize(prompt) if hasattr(llm, "summarize") else None
        import json, re
        txt = raw.strip() if raw else ""
        if "```" in txt:
            txt = txt.split("```")[1]
            if txt.startswith("json"):
                txt = txt[4:]
        data = json.loads(txt) if txt else {}
        return {"suggested_score": data.get("suggested_score", float(q.marks)//2), "justification": data.get("justification", "AI mock justification — please verify"), "strengths": data.get("strengths"), "gaps": data.get("gaps"), "raw": raw}
    except Exception as e:
        return {"suggested_score": float(q.marks)//2, "justification": f"AI fallback: {e}", "strengths": None, "gaps": None}
