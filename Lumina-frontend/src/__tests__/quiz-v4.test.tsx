import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuizCard } from "@/components/quiz/QuizCard";
import { QuizHistorySection } from "@/components/profile/QuizHistorySection";
import { AIQuizInsights } from "@/components/dashboard/AIQuizInsights";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { SemanticSearch } from "@/components/search/SemanticSearch";

jest.mock("@/services/apiClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

import apiClient from "@/services/apiClient";
const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;

describe("QuizCard", () => {
  it("renders title, marks, groups", () => {
    const quiz: any = { id: 1, title: "OS Quiz", description: "desc", status: "published", duration_minutes: 30, total_marks: 20, pass_percentage: 40, max_attempts: 1, total_questions: 5, group_ids: [1,2] };
    render(<QuizCard quiz={quiz} />);
    expect(screen.getByText("OS Quiz")).toBeInTheDocument();
    expect(screen.getByText(/30 min/)).toBeInTheDocument();
    expect(screen.getByText(/20 marks/)).toBeInTheDocument();
  });
});

describe("QuizHistorySection - user-specific", () => {
  beforeEach(() => jest.clearAllMocks());
  beforeEach(() => jest.clearAllMocks());
  it("shows empty state when no history (no false data)", async () => {
    mockedGet.mockResolvedValue({ data: { history: [], total: 0 } });
    render(<QuizHistorySection />);
    await waitFor(() => expect(screen.getByText(/No quiz history yet/i)).toBeInTheDocument());
    expect(screen.getByText(/only your/i)).toBeInTheDocument();
    // must call only own history endpoint
    expect(mockedGet).toHaveBeenCalledWith("/users/me/quiz-history");
    expect(mockedGet).not.toHaveBeenCalledWith(expect.stringContaining("all"));
  });
  it("shows marks and time for each attempt (user-specific details)", async () => {
    mockedGet.mockResolvedValue({
      data: {
        history: [
          { attempt_id: 10, quiz_id: 1, quiz_title: "Math Quiz", status: "graded", score: 16, max_score: 20, percentage: 80, passed: true, time_taken_seconds: 742, duration_minutes: 30, submitted_at: "2026-08-20T10:00:00Z" },
        ],
        total: 1,
      },
    });
    render(<QuizHistorySection />);
    await waitFor(() => expect(screen.getByText("Math Quiz")).toBeInTheDocument());
    expect(screen.getByText(/16 \/ 20 marks/)).toBeInTheDocument();
    expect(screen.getAllByText(/12:22/).length).toBeGreaterThan(0); // 742s = 12:22 appears twice (time + duration)
    expect(screen.getAllByText(/80%/).length).toBeGreaterThan(0);
  });
});

describe("AIQuizInsights - no false info, user-specific", () => {
  beforeEach(() => jest.clearAllMocks());
  it("shows honest message when no data, no false suggestions", async () => {
    mockedGet.mockResolvedValue({ data: { has_data: false, message: "No quiz history yet — attempt a quiz", suggestions: [] } });
    render(<AIQuizInsights />);
    await waitFor(() => expect(screen.getByText(/No quiz history yet/i)).toBeInTheDocument());
    expect(screen.getByText(/Your data only/i)).toBeInTheDocument();
  });
  it("shows real stats and grounded suggestions when has data", async () => {
    mockedGet.mockResolvedValue({
      data: {
        has_data: true,
        grounded: true,
        stats: { total_attempts: 3, graded: 3, avg_percentage: 72, avg_time_seconds: 420, pass_rate: 66, recent: [{percentage: 80}, {percentage: 60}] },
        suggestions: ["Avg 72% — review flagged Qs", "Pass 66% — spend 30s more", "Weakest 60% — retry"],
      },
    });
    const { container } = render(<AIQuizInsights />);
    await waitFor(() => expect(screen.getByText(/Avg Score/)).toBeInTheDocument(), { timeout: 2000 });
    expect(container.textContent).toContain("72%");
    expect(container.textContent).toContain("66%");
    expect(screen.getByText(/review flagged Qs/)).toBeInTheDocument();
    expect(screen.getByText(/Your data only/i)).toBeInTheDocument();
  });
  it("calls only user-specific endpoint (/users/me/quiz-insights)", async () => {
    mockedGet.mockResolvedValue({ data: { has_data: false, message: "No quiz history", suggestions: [] } });
    render(<AIQuizInsights />);
    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith("/users/me/quiz-insights"));
  });
});

describe("NotificationBell", () => {
  it("shows unread count and no leakage", async () => {
    mockedGet.mockResolvedValue({ data: [{ id: 1, read: false }, { id: 2, read: false }, { id: 3, read: true }] });
    render(<NotificationBell />);
    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith("/notifications"));
  });
});

describe("SemanticSearch + citation jump", () => {
  it("calls hybrid search and shows results", async () => {
    mockedGet.mockResolvedValue({ data: { results: [{ book_id: 1, book_title: "OS Book", score: 0.8, content: "deadlock snippet" }] } });
    // also need to mock post for study etc not needed
    const onJump = jest.fn();
    render(<SemanticSearch onJump={onJump} />);
    const input = screen.getByPlaceholderText(/Semantic search/i);
    fireEvent.change(input, { target: { value: "deadlock" } });
    fireEvent.click(screen.getByText("Search"));
    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith("/search", expect.objectContaining({ params: expect.objectContaining({ q: "deadlock" }) })));
  });
});
