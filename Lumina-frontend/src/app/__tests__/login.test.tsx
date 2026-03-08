import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "../login/page";
import { useAuth } from "@/hooks/useAuth";
import { loginUser } from "@/services/authService";
import { useRouter } from "next/navigation";
import "@testing-library/jest-dom";

// Mock hooks and services
jest.mock("@/hooks/useAuth");
jest.mock("@/services/authService");
jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
}));

jest.mock("@/components/layout/DashboardLayout", () => {
    return ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>;
});

describe("Login Page", () => {
    const mockPush = jest.fn();
    const mockLogin = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
        (useAuth as jest.Mock).mockReturnValue({
            login: mockLogin,
            isAuthenticated: false,
            isLoading: false,
        });
    });

    it("redirects to /books if already authenticated", () => {
        (useAuth as jest.Mock).mockReturnValue({
            login: mockLogin,
            isAuthenticated: true,
            isLoading: false,
        });

        render(<LoginPage />);
        expect(mockPush).toHaveBeenCalledWith("/books");
    });

    it("renders the login form elements", () => {
        render(<LoginPage />);

        expect(screen.getByText(/Sign In/i, { selector: 'h2' })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    it("shows validation errors on empty submission", async () => {
        render(<LoginPage />);

        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText(/Invalid email address/i)).toBeInTheDocument();
            expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
        });
    });

    it("handles successful login", async () => {
        (loginUser as jest.Mock).mockResolvedValue("fake-token");

        render(<LoginPage />);

        fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
            target: { value: "test@example.com" },
        });
        fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
            target: { value: "password123" },
        });

        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

        await waitFor(() => {
            expect(loginUser).toHaveBeenCalledWith("test@example.com", "password123");
            expect(mockLogin).toHaveBeenCalledWith("fake-token");
        });
    });

    it("handles login failure", async () => {
        (loginUser as jest.Mock).mockRejectedValue({
            response: { data: { detail: "Invalid credentials" } }
        });

        render(<LoginPage />);

        fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
            target: { value: "wrong@example.com" },
        });
        fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
            target: { value: "wrongpass" },
        });

        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
        });
    });
});
