"""Quiz & Assessment schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, model_validator


class QuizOptionCreate(BaseModel):
    text: str
    is_correct: bool = False


class QuizQuestionCreate(BaseModel):
    type: Literal["mcq_single", "mcq_multi", "descriptive"]
    prompt: str
    marks: float = 1
    negative_marks: float | None = None
    explanation: str | None = None
    order_index: int | None = None
    options: list[QuizOptionCreate] | None = None
    rubric: str | None = None
    expected_answer: str | None = None
    word_limit: int | None = None
    grading_type: str | None = "manual"


class QuizCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    instructions: str | None = None
    source_type: str = "manual"
    source_book_id: int | None = None
    source_context: str | None = None
    duration_minutes: int = Field(ge=5, le=180, default=30)
    pass_percentage: int = Field(ge=0, le=100, default=40)
    max_attempts: int = Field(ge=0, default=1)
    shuffle_questions: bool = False
    shuffle_options: bool = False
    show_result: str = "immediately"
    show_correct_answers: str = "after_submit"
    negative_marking: bool = False
    negative_marks: float = 0
    available_from: datetime | None = None
    available_until: datetime | None = None
    status: str | None = "published"
    questions: list[QuizQuestionCreate] = Field(default_factory=list)
    group_ids: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_schedule(self) -> "QuizCreate":
        if self.available_from and self.available_until:
            if self.available_until <= self.available_from:
                raise ValueError("Schedule end time (available_until) must be strictly after start time (available_from). Dates cannot overlap.")
            diff_mins = (self.available_until - self.available_from).total_seconds() / 60
            if diff_mins < self.duration_minutes:
                raise ValueError(f"Schedule window must be at least {self.duration_minutes} minutes (the defined quiz duration).")
        return self


class QuizUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    instructions: str | None = None
    source_type: str | None = None
    source_book_id: int | None = None
    source_context: str | None = None
    duration_minutes: int | None = Field(default=None, ge=5, le=180)
    pass_percentage: int | None = Field(default=None, ge=0, le=100)
    max_attempts: int | None = None
    shuffle_questions: bool | None = None
    shuffle_options: bool | None = None
    show_result: str | None = None
    show_correct_answers: str | None = None
    negative_marking: bool | None = None
    negative_marks: float | None = None
    available_from: datetime | None = None
    available_until: datetime | None = None
    status: str | None = None
    questions: list[QuizQuestionCreate] | None = None
    group_ids: list[int] | None = None

    @model_validator(mode="after")
    def validate_schedule(self) -> "QuizUpdate":
        if self.available_from and self.available_until:
            if self.available_until <= self.available_from:
                raise ValueError("Schedule end time (available_until) must be strictly after start time (available_from). Dates cannot overlap.")
            if self.duration_minutes:
                diff_mins = (self.available_until - self.available_from).total_seconds() / 60
                if diff_mins < self.duration_minutes:
                    raise ValueError(f"Schedule window must be at least {self.duration_minutes} minutes (the defined quiz duration).")
        return self


class QuizQuestionRead(BaseModel):
    id: int
    quiz_id: int
    type: str
    prompt: str
    marks: float
    negative_marks: float | None = None
    explanation: str | None = None
    order_index: int
    ai_generated: bool
    rubric: str | None = None
    expected_answer: str | None = None
    word_limit: int | None = None
    grading_type: str | None = None
    options: list[dict] | None = None

    model_config = {"from_attributes": True}


class QuizRead(BaseModel):
    id: int
    title: str
    description: str | None = None
    instructions: str
    source_type: str
    source_book_id: int | None = None
    created_by_user_id: int
    status: str
    duration_minutes: int
    total_marks: int
    pass_percentage: int
    max_attempts: int
    shuffle_questions: bool
    shuffle_options: bool
    show_result: str
    show_correct_answers: str
    negative_marking: bool
    negative_marks: float
    available_from: datetime | None = None
    available_until: datetime | None = None
    created_at: datetime
    updated_at: datetime
    questions: list[QuizQuestionRead] = Field(default_factory=list)
    group_ids: list[int] = Field(default_factory=list)
    total_questions: int = 0

    model_config = {"from_attributes": True}


class GenerateRequest(BaseModel):
    source: Literal["book", "topic", "prompt"] = "topic"
    book_id: int | None = None
    topic: str | None = None
    prompt: str | None = None
    num_questions: int = Field(ge=1, le=50, default=10)
    mcq_single: int | None = None
    mcq_multi: int | None = None
    descriptive: int | None = None
    difficulty: str = "mixed"
    marks_per_question: float = 1


class AssignRequest(BaseModel):
    group_ids: list[int]


class AnswerSave(BaseModel):
    question_id: int
    selected_option_ids: list[str] | None = None
    descriptive_text: str | None = None
    flagged: bool = False


class AnswersPatch(BaseModel):
    answers: list[AnswerSave]


class GradeItem(BaseModel):
    question_id: int
    score: float
    feedback: str | None = None


class GradeRequest(BaseModel):
    grades: list[GradeItem]


class AIGradeRequest(BaseModel):
    question_id: int
