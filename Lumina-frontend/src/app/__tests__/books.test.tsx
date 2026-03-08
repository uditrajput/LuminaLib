import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BooksPage from "../books/page";
import { useAuth } from "@/hooks/useAuth";
import "@testing-library/jest-dom";

// Mock hooks
jest.mock("@/hooks/useAuth");
jest.mock("@/components/layout/DashboardLayout", () => {
    return ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>;
});
jest.mock("@/components/books/BookList", () => ({
    BookList: ({ searchQuery }: { searchQuery: string }) => (
        <div data-testid="book-list">Books for: {searchQuery}</div>
    ),
}));
jest.mock("@/components/books/BookUploadModal", () => ({
    __esModule: true,
    default: ({ onClose }: { onClose: () => void }) => (
        <div data-testid="upload-modal">
            <button onClick={onClose}>Close Modal</button>
        </div>
    ),
}));

describe("Books Page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders the page title and search bar", () => {
        (useAuth as jest.Mock).mockReturnValue({ user: { role: "user" } });

        render(<BooksPage />);

        expect(screen.getByText("Library")).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Search by title, author, or genre/i)).toBeInTheDocument();
    });

    it("does not show 'Upload Book' button for regular users", () => {
        (useAuth as jest.Mock).mockReturnValue({ user: { role: "user" } });

        render(<BooksPage />);

        expect(screen.queryByRole("button", { name: /upload book/i })).not.toBeInTheDocument();
    });

    it("shows 'Upload Book' button for admin users", () => {
        (useAuth as jest.Mock).mockReturnValue({ user: { role: "admin" } });

        render(<BooksPage />);

        expect(screen.getByRole("button", { name: /upload book/i })).toBeInTheDocument();
    });

    it("updates the search query when typing in search input", () => {
        (useAuth as jest.Mock).mockReturnValue({ user: { role: "user" } });

        render(<BooksPage />);

        const searchInput = screen.getByPlaceholderText(/Search by title, author, or genre/i);
        fireEvent.change(searchInput, { target: { value: "Orwell" } });

        expect(screen.getByTestId("book-list")).toHaveTextContent("Books for: Orwell");
    });

    it("opens and closes the upload modal when clicking the button", () => {
        (useAuth as jest.Mock).mockReturnValue({ user: { role: "admin" } });

        render(<BooksPage />);

        const uploadBtn = screen.getByRole("button", { name: /upload book/i });
        fireEvent.click(uploadBtn);

        expect(screen.getByTestId("upload-modal")).toBeInTheDocument();

        const closeModalBtn = screen.getByText("Close Modal");
        fireEvent.click(closeModalBtn);

        expect(screen.queryByTestId("upload-modal")).not.toBeInTheDocument();
    });
});
