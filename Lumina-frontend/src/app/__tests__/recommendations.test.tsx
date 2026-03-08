import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import RecommendationsPage from "../recommendations/page";
import { useRecommendations } from "@/hooks/useRecommendations";
import "@testing-library/jest-dom";

// Mock hooks
jest.mock("@/hooks/useRecommendations");
jest.mock("@/components/layout/DashboardLayout", () => {
    return ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>;
});
jest.mock("@/components/books/BookCard", () => ({
    BookCard: ({ book }: { book: any }) => <div data-testid="book-card">{book.title}</div>,
}));

describe("Recommendations Page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders the page title and header section", () => {
        (useRecommendations as jest.Mock).mockReturnValue({
            data: [],
            isLoading: false,
            isError: false,
            refetch: jest.fn(),
        });

        render(<RecommendationsPage />);
        expect(screen.getByText("For You")).toBeInTheDocument();
        expect(screen.getByText(/Our AI engine has analyzed your preferences/i)).toBeInTheDocument();
    });

    it("shows loading skeletons when loading", () => {
        (useRecommendations as jest.Mock).mockReturnValue({
            data: null,
            isLoading: true,
            isError: false,
            refetch: jest.fn(),
        });

        render(<RecommendationsPage />);
        // Next.js uses animate-pulse for loading
        expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    });

    it("shows error state when recommendations fail to load", () => {
        (useRecommendations as jest.Mock).mockReturnValue({
            data: null,
            isLoading: false,
            isError: true,
            error: new Error("Server error"),
            refetch: jest.fn(),
        });

        render(<RecommendationsPage />);
        expect(screen.getByText(/Could not compute recommendations/i)).toBeInTheDocument();
        expect(screen.getByText("Server error")).toBeInTheDocument();
    });

    it("shows empty state when no recommendations are returned", () => {
        (useRecommendations as jest.Mock).mockReturnValue({
            data: [],
            isLoading: false,
            isError: false,
            refetch: jest.fn(),
        });

        render(<RecommendationsPage />);
        expect(screen.getByText(/No recommendations ready yet/i)).toBeInTheDocument();
    });

    it("renders book cards when recommendations are available", () => {
        const mockBooks = [
            { id: "1", title: "1984" },
            { id: "2", title: "Brave New World" },
        ];
        (useRecommendations as jest.Mock).mockReturnValue({
            data: mockBooks,
            isLoading: false,
            isError: false,
            refetch: jest.fn(),
        });

        render(<RecommendationsPage />);
        expect(screen.getAllByTestId("book-card")).toHaveLength(2);
        expect(screen.getByText("1984")).toBeInTheDocument();
        expect(screen.getByText("Brave New World")).toBeInTheDocument();
    });

    it("calls refetch when clicking the refresh button", () => {
        const mockRefetch = jest.fn();
        (useRecommendations as jest.Mock).mockReturnValue({
            data: [],
            isLoading: false,
            isError: false,
            refetch: mockRefetch,
        });

        render(<RecommendationsPage />);
        const refreshBtn = screen.getByRole("button", { name: /Refresh/i });
        fireEvent.click(refreshBtn);
        expect(mockRefetch).toHaveBeenCalled();
    });
});
