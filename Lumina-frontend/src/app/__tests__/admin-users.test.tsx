import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AdminUsersPage from "../admin/users/page";
import { useAuth } from "@/hooks/useAuth";
import {
    useUserStats, useUserList, useAdminCreateUser,
    useAdminUpdateUser, useAdminDeleteUser
} from "@/hooks/useAdminUsers";
import { useRouter } from "next/navigation";
import "@testing-library/jest-dom";

// Mock hooks
jest.mock("@/hooks/useAuth");
jest.mock("@/hooks/useAdminUsers");
jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
}));

jest.mock("@/components/layout/DashboardLayout", () => {
    return ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>;
});

describe("Admin Users Page", () => {
    const mockRouter = { replace: jest.fn() };
    const mockUsers = {
        items: [
            { id: "1", email: "udit.rajput@hotmail.com", full_name: "Admin User", role: "admin", is_active: true },
            { id: "2", email: "user@example.com", full_name: "Regular User", role: "user", is_active: false },
        ],
        total: 2,
        page: 1,
        pages: 1,
    };
    const mockStats = { total: 2, admins: 1, regular_users: 1, newest_user_email: "user@example.com" };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useAuth as jest.Mock).mockReturnValue({
            user: { id: "1", role: "admin" },
            isLoading: false,
        });
        (useUserStats as jest.Mock).mockReturnValue({ data: mockStats, isLoading: false });
        (useUserList as jest.Mock).mockReturnValue({
            data: mockUsers,
            isLoading: false,
            isError: false,
            refetch: jest.fn(),
        });
        (useAdminDeleteUser as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
        (useAdminUpdateUser as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
        (useAdminCreateUser as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
    });

    it("renders the user management title for admins", () => {
        render(<AdminUsersPage />);
        expect(screen.getByText("User Management")).toBeInTheDocument();
    });

    it("displays user statistics correctly", () => {
        render(<AdminUsersPage />);
        expect(screen.getByText("Total Users")).toBeInTheDocument();
        expect(screen.getAllByText("2")[0]).toBeInTheDocument(); // total users count
        expect(screen.getByText("Admins")).toBeInTheDocument();
        expect(screen.getByText("Regular Users")).toBeInTheDocument();
    });

    it("renders the user table with correct data", () => {
        render(<AdminUsersPage />);
        expect(screen.getByText("udit.rajput@hotmail.com")).toBeInTheDocument();
        expect(screen.getByText("Admin User")).toBeInTheDocument();
        expect(screen.getAllByText("user@example.com")[0]).toBeInTheDocument();
        expect(screen.getAllByText("Regular User")[0]).toBeInTheDocument();

        // Roles
        expect(screen.getAllByText("Admin")[0]).toBeInTheDocument();
        expect(screen.getAllByText("User")[0]).toBeInTheDocument();

        // Status
        expect(screen.getByText("Active")).toBeInTheDocument();
        expect(screen.getByText("Blocked")).toBeInTheDocument();
    });

    it("opens the 'Add User' modal on button click", () => {
        render(<AdminUsersPage />);
        const addBtn = screen.getByRole("button", { name: /Add User/i });
        fireEvent.click(addBtn);

        expect(screen.getByRole("heading", { name: "Create User" })).toBeInTheDocument();
    });

    it("shows the delete confirmation modal", () => {
        render(<AdminUsersPage />);

        // Find all delete buttons (we have 2 users, but the first one is the logged-in admin, so delete should be disabled for them)
        const deleteBtns = screen.getAllByTitle("Delete user");

        fireEvent.click(deleteBtns[1]);

        expect(screen.getByRole("heading", { name: "Delete User" })).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
        expect(screen.getAllByText("Regular User")[0]).toBeInTheDocument();
    });

    it("filters users by role", () => {
        render(<AdminUsersPage />);
        const roleSelect = screen.getByRole("combobox");
        fireEvent.change(roleSelect, { target: { value: "admin" } });

        expect(useUserList).toHaveBeenCalledWith(expect.objectContaining({ role: "admin" }));
    });
});
