import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import QAPage from "../qa/page";
import { askQuestion } from "@/services/qaService";
import "@testing-library/jest-dom";

// Mock services
jest.mock("@/services/qaService");
jest.mock("@/components/layout/DashboardLayout", () => {
    return ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>;
});

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe("Q&A Page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders the page title and initial welcome message", () => {
        render(<QAPage />);
        expect(screen.getByText("AI Q&A")).toBeInTheDocument();
        expect(screen.getByText(/Hello! I'm LuminaLib's AI assistant/i)).toBeInTheDocument();
    });

    it("handles sending a question and display response", async () => {
        const mockResponse = {
            answer: "The answer is 42.",
            excerpts: [{ content: "Excerpt 1", book_title: "The Book" }],
        };
        (askQuestion as jest.Mock).mockResolvedValue(mockResponse);

        render(<QAPage />);

        const input = screen.getByPlaceholderText(/Ask a question about your library/i);
        fireEvent.change(input, { target: { value: "What is the answer?" } });

        const sendBtn = screen.getByRole("button", { name: /send/i });
        fireEvent.click(sendBtn);

        // Check user message
        expect(screen.getByText("What is the answer?")).toBeInTheDocument();

        // Wait for response
        await waitFor(() => {
            expect(screen.getByText("The answer is 42.")).toBeInTheDocument();
        });

        expect(askQuestion).toHaveBeenCalledWith("What is the answer?");
    });

    it("toggles source excerpts visibility", async () => {
        const mockResponse = {
            answer: "Look at the sources.",
            excerpts: [{ content: "Highly secret content", book_title: "Top Secret" }],
        };
        (askQuestion as jest.Mock).mockResolvedValue(mockResponse);

        render(<QAPage />);

        fireEvent.change(screen.getByPlaceholderText(/Ask a question/i), { target: { value: "Show me secrets" } });
        fireEvent.click(screen.getByRole("button", { name: /send/i }));

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /Source Excerpts/i })).toBeInTheDocument();
        });

        const toggleBtn = screen.getByRole("button", { name: /Source Excerpts/i });

        // Excerpt is hidden initially
        expect(screen.queryByText(/Highly secret content/i)).not.toBeInTheDocument();

        // Click to show
        fireEvent.click(toggleBtn);
        expect(screen.getByText(/Highly secret content/i)).toBeInTheDocument();
        expect(screen.getByText("Top Secret")).toBeInTheDocument();

        // Click to hide
        fireEvent.click(toggleBtn);
        expect(screen.queryByText(/Highly secret content/i)).not.toBeInTheDocument();
    });

    it("handles API errors gracefully", async () => {
        (askQuestion as jest.Mock).mockRejectedValue({
            response: { data: { detail: "Failed to connect to index" } }
        });

        render(<QAPage />);

        fireEvent.change(screen.getByPlaceholderText(/Ask a question/i), { target: { value: "Broken?" } });
        fireEvent.click(screen.getByRole("button", { name: /send/i }));

        await waitFor(() => {
            expect(screen.getByText(/Failed to connect to index/i)).toBeInTheDocument();
        });
    });
});
