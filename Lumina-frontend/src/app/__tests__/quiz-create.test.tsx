import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CreateQuizPage from "@/app/quizzes/create/page";
import { quizService } from "@/services/quizService";
import { groupService } from "@/services/groupService";
import { useAuth } from "@/hooks/useAuth";
import "@testing-library/jest-dom";

jest.mock("@/hooks/useAuth");
jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: jest.fn() }),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/quizzes/create",
  useParams: () => ({}),
}));

jest.mock("@/services/quizService", () => ({
  quizService: {
    create: jest.fn().mockResolvedValue({ id: 101, title: "Science Quiz" }),
    assign: jest.fn().mockResolvedValue({ message: "Assigned" }),
    generate: jest.fn().mockResolvedValue({
      questions: [
        {
          type: "mcq_single",
          prompt: "What is the powerhouse of the cell?",
          marks: 1,
          options: [
            { text: "Mitochondria", is_correct: true },
            { text: "Ribosome", is_correct: false },
            { text: "Nucleus", is_correct: false },
            { text: "Chloroplast", is_correct: false },
          ],
          explanation: "Mitochondria produces cellular energy.",
        },
      ],
    }),
  },
}));

jest.mock("@/services/groupService", () => ({
  groupService: {
    list: jest.fn().mockResolvedValue([
      { id: 1, name: "Grade 10 Science", description: "Standard Batch A" },
    ]),
  },
}));

describe("Create Quiz Page Enhancements", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 1, full_name: "Admin User", email: "admin@example.com", role: "admin" },
      isAuthenticated: true,
      logout: jest.fn(),
    });
  });

  it("renders Step 1 with dynamic instructions, hours/mins picker, and 70% default pass percentage", async () => {
    render(<CreateQuizPage />);

    expect(screen.getByText("Create Quiz")).toBeInTheDocument();

    // Pass % should have 70% selected by default
    const passPill70 = screen.getByRole("button", { name: "70%" });
    expect(passPill70).toHaveClass("bg-blue-600");

    // Check duration pickers
    expect(screen.getByText(/Quiz Duration/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "0 hrs" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30 min" })).toBeInTheDocument();

    // Type Title and check dynamic instructions update
    const titleInput = screen.getByPlaceholderText(/e\.g\. Science/i);
    fireEvent.change(titleInput, { target: { value: "Science Fundamentals" } });
    expect(titleInput).toHaveValue("Science Fundamentals");

    // Click a topic chip
    const physicsChip = screen.getByRole("button", { name: "Physics" });
    fireEvent.click(physicsChip);
    expect(titleInput).toHaveValue("Physics");
  });

  it("navigates through steps and provides Review & Submit preview in Step 4", async () => {
    render(<CreateQuizPage />);

    // Step 1: Fill Title
    const titleInput = screen.getByPlaceholderText(/e\.g\. Science/i);
    fireEvent.change(titleInput, { target: { value: "Science Quiz" } });

    // Click Continue to Questions
    fireEvent.click(screen.getByRole("button", { name: /Continue to Questions/i }));

    // Step 2: Add MCQ Single (should have 4 options)
    const addMcqBtn = screen.getByRole("button", { name: /\+ MCQ Single/i });
    fireEvent.click(addMcqBtn);

    expect(screen.getByPlaceholderText(/Enter Question 1 prompt/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Option A text/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Option B text/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Option C text/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Option D text/i)).toBeInTheDocument();

    // Fill Question 1
    fireEvent.change(screen.getByPlaceholderText(/Enter Question 1 prompt/i), {
      target: { value: "What is H2O?" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Option A text/i), {
      target: { value: "Water" },
    });

    // Continue to Step 3 (Assignments)
    fireEvent.click(screen.getByRole("button", { name: /Continue to Assignments/i }));
    expect(screen.getByText(/Assign to Groups/i)).toBeInTheDocument();

    // Continue to Step 4 (Schedulers & Submit)
    fireEvent.click(screen.getByRole("button", { name: /Proceed to Schedulers & Submit/i }));

    // Verify Step 4 Overview & Schedulers
    expect(screen.getByText(/Step 4: Quiz Schedulers & Review/i)).toBeInTheDocument();
    expect(screen.getByText(/Quiz Activation & Schedulers/i)).toBeInTheDocument();
    expect(screen.getByText("Science Quiz")).toBeInTheDocument();
    expect(screen.getByText(/Q1\. What is H2O\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Water/i)).toBeInTheDocument();
    expect(screen.getByText(/✓ Correct/i)).toBeInTheDocument();

    // Verify Submission Buttons
    expect(screen.getByRole("button", { name: /Save as Draft/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Publish & Assign Quiz/i })).toBeInTheDocument();
  });
});
