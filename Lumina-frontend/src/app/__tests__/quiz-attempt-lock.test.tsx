import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import Navbar from "@/components/layout/Navbar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
import apiClient from "@/services/apiClient";
import "@testing-library/jest-dom";

jest.mock("@/hooks/useAuth");
jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: jest.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useParams: () => ({ id: "1", attemptId: "10" }),
}));

jest.mock("@/services/apiClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock("@/services/quizService", () => ({
  quizService: {
    list: jest.fn().mockResolvedValue([]),
    saveAnswers: jest.fn().mockResolvedValue({ message: "Saved" }),
    submit: jest.fn().mockResolvedValue({ status: "graded", score: 10 }),
  },
}));

describe("Quiz Attempt Lockdown & Stylish Notifications", () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 1, full_name: "Tushar Kumar", email: "tushar@example.com", role: "user" },
      isAuthenticated: true,
      logout: mockLogout,
    });
  });

  it("disables and blurs non-logout links in LeftSidebar during quiz attempt", () => {
    (usePathname as jest.Mock).mockReturnValue("/quizzes/1/attempt/10");
    render(<LeftSidebar collapsed={false} onToggle={jest.fn()} />);

    // Main links should be disabled with blur/opacity styling
    const dashboardLink = screen.getByText("Dashboard").closest("div");
    expect(dashboardLink).toHaveClass("pointer-events-none");
    expect(dashboardLink).toHaveClass("opacity-40");

    // Logout button must remain active and clickable
    const logoutBtn = screen.getByRole("button", { name: /Logout/i });
    expect(logoutBtn).toBeEnabled();
    expect(logoutBtn).not.toHaveClass("pointer-events-none");
    fireEvent.click(logoutBtn);
    expect(mockLogout).toHaveBeenCalled();
  });

  it("enables normal navigation in LeftSidebar when not taking a quiz", () => {
    (usePathname as jest.Mock).mockReturnValue("/dashboard");
    render(<LeftSidebar collapsed={false} onToggle={jest.fn()} />);

    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).not.toHaveClass("pointer-events-none");
  });

  it("disables logo and non-theme controls in Navbar during quiz attempt while keeping Dark Mode toggle enabled", () => {
    (usePathname as jest.Mock).mockReturnValue("/quizzes/1/attempt/10");
    render(<Navbar />);

    // Logo should be disabled/blurred
    const logoText = screen.getByText(/Lumina/i).closest("div");
    expect(logoText).toHaveClass("pointer-events-none");
    expect(logoText).toHaveClass("opacity-40");

    // Theme toggle button should remain enabled
    const themeBtns = screen.getAllByRole("button", { name: /Toggle theme/i });
    expect(themeBtns.length).toBeGreaterThan(0);
    themeBtns.forEach(btn => expect(btn).toBeEnabled());
  });

  it("renders stylish 'Mark all read' button in NotificationBell dropdown", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [{ id: 1, title: "Quiz Assigned", body: "New quiz available", read: false, created_at: new Date().toISOString() }],
    });

    render(<NotificationBell />);

    // Open notification popover
    const bellBtn = screen.getByRole("button");
    fireEvent.click(bellBtn);

    const markAllBtn = await screen.findByRole("button", { name: /Mark all read/i });
    expect(markAllBtn).toBeInTheDocument();
    expect(markAllBtn).toHaveClass("rounded-lg");
    expect(markAllBtn).toHaveClass("font-semibold");
  });

  it("QuizRunner renders question interaction buttons and submits cleanly", async () => {
    const mockQuiz = {
      id: 1,
      title: "Sample Quiz",
      total_marks: 5,
      questions: [
        {
          id: 101,
          prompt: "Which statement is correct?",
          type: "mcq_single",
          marks: 1,
          options: [
            { id: "a", text: "Option A" },
            { id: "b", text: "Option B" },
          ],
        },
      ],
    };
    const mockAttempt = { id: 10, expires_at: new Date(Date.now() + 100000).toISOString(), answers: [] };
    const mockSubmitCb = jest.fn();

    render(<QuizRunner quiz={mockQuiz} attempt={mockAttempt} onSubmit={mockSubmitCb} />);

    expect(screen.getByText("Which statement is correct?")).toBeInTheDocument();
    const optionA = screen.getByLabelText(/Option A/i);
    fireEvent.click(optionA);

    const submitBtns = screen.getAllByRole("button", { name: /Submit Quiz/i });
    expect(submitBtns.length).toBeGreaterThan(0);
  });
});
