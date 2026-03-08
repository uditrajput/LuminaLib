import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SignupPage from "../signup/page";
import { useAuth } from "@/hooks/useAuth";
import { registerUser } from "@/services/authService";
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

describe("Signup Page", () => {
    const mockPush = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
        (useAuth as jest.Mock).mockReturnValue({
            isAuthenticated: false,
            isLoading: false,
        });
    });

    it("renders the signup form elements", () => {
        render(<SignupPage />);

        expect(screen.getByText(/Create Account/i, { selector: 'h2' })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/John Doe/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
        expect(screen.getAllByPlaceholderText(/••••••••••••/i)).toHaveLength(2);
        expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
    });

    it("shows password strength indicators as user types", async () => {
        render(<SignupPage />);

        const passwordInput = screen.getAllByPlaceholderText(/••••••••••••/i)[0];
        fireEvent.change(passwordInput, { target: { value: "abc" } });

        expect(screen.getByText("At least 12 characters")).toBeInTheDocument();
        expect(screen.getByText(/Contains a letter/i)).toBeInTheDocument();

        // Check if "abc" satisfies "Contains a letter" (it should mock the color change in a real browser, but here we just check presence)
    });

    it("shows validation errors on empty submission", async () => {
        render(<SignupPage />);

        fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

        await waitFor(() => {
            expect(screen.getByText(/Invalid email address/i)).toBeInTheDocument();
            expect(screen.getByText(/Password must be at least 12 characters/i)).toBeInTheDocument();
        });
    });

    it("shows error if passwords do not match", async () => {
        render(<SignupPage />);

        const pwdInputs = screen.getAllByPlaceholderText(/••••••••••••/i);
        fireEvent.change(pwdInputs[0], { target: { value: "Password123!!!" } });
        fireEvent.change(pwdInputs[1], { target: { value: "Different123!!!" } });

        fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

        await waitFor(() => {
            expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
        });
    });

    it("handles successful registration", async () => {
        (registerUser as jest.Mock).mockResolvedValue({});

        render(<SignupPage />);

        fireEvent.change(screen.getByPlaceholderText(/John Doe/i), { target: { value: "Test User" } });
        fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: "test@example.com" } });
        const pwdInputs = screen.getAllByPlaceholderText(/••••••••••••/i);
        fireEvent.change(pwdInputs[0], { target: { value: "Password123!!!" } });
        fireEvent.change(pwdInputs[1], { target: { value: "Password123!!!" } });

        fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

        await waitFor(() => {
            expect(registerUser).toHaveBeenCalledWith({
                email: "test@example.com",
                password: "Password123!!!",
                full_name: "Test User",
            });
            expect(screen.getByText(/Welcome aboard!/i)).toBeInTheDocument();
        });
    });
});
