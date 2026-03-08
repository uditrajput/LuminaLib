import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfilePage from "../profile/page";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences, useUpdateUserPreferences } from "@/hooks/usePreferences";
import { useUpdateProfile, useChangePassword } from "@/hooks/useProfile";
import "@testing-library/jest-dom";

// Mock all the hooks
jest.mock("@/hooks/useAuth");
jest.mock("@/hooks/usePreferences");
jest.mock("@/hooks/useProfile");

jest.mock("@/components/layout/DashboardLayout", () => {
    return ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>;
});

describe("Profile Page", () => {
    const mockUser = {
        email: "test@example.com",
        full_name: "Test User",
        role: "user",
        bio: "Test bio",
        avatar_url: "",
    };

    const mockMutate = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useAuth as jest.Mock).mockReturnValue({
            user: mockUser,
            refreshUser: jest.fn(),
        });
        (useUserPreferences as jest.Mock).mockReturnValue({
            data: { preferences: { favoriteGenre: "Sci-Fi", language: "English" } },
            isLoading: false,
        });
        (useUpdateUserPreferences as jest.Mock).mockReturnValue({ mutate: mockMutate, reset: jest.fn() });
        (useUpdateProfile as jest.Mock).mockReturnValue({ mutate: mockMutate, reset: jest.fn() });
        (useChangePassword as jest.Mock).mockReturnValue({ mutate: mockMutate, reset: jest.fn() });
    });

    it("renders the profile management header", () => {
        render(<ProfilePage />);
        expect(screen.getByText("Profile Management")).toBeInTheDocument();
    });

    it("displays user information in the sidebar", () => {
        render(<ProfilePage />);
        expect(screen.getByText("Test User")).toBeInTheDocument();
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
        expect(screen.getByText(/Test bio/i)).toBeInTheDocument();
    });

    it("switches between tabs", () => {
        render(<ProfilePage />);

        // Default tab is Account Info
        expect(screen.getByText("Account Information")).toBeInTheDocument();

        // Switch to Security
        const securityBtn = screen.getByRole("button", { name: /Security/i });
        fireEvent.click(securityBtn);
        expect(screen.getByText("Change Password")).toBeInTheDocument();

        // Switch to Preferences
        const prefsBtn = screen.getByRole("button", { name: /Preferences/i });
        fireEvent.click(prefsBtn);
        expect(screen.getByText("Reading Preferences")).toBeInTheDocument();
    });

    it("updates account information", async () => {
        render(<ProfilePage />);

        const nameInput = screen.getByPlaceholderText(/e.g. Jane Doe/i);
        fireEvent.change(nameInput, { target: { value: "New Name" } });

        const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(mockMutate).toHaveBeenCalled();
        });
    });

    it("validates password change form", async () => {
        render(<ProfilePage />);

        // Go to security tab
        fireEvent.click(screen.getByRole("button", { name: /Security/i }));

        const updateBtn = screen.getByRole("button", { name: /Update Password/i });
        fireEvent.click(updateBtn);

        await waitFor(() => {
            expect(screen.getByText(/Current password is required/i)).toBeInTheDocument();
        });
    });
});
