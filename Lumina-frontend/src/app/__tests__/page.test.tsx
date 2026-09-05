import React from "react";
import { render, screen } from "@testing-library/react";
import Home from "../page";
import { useRouter } from "next/navigation";
import "@testing-library/jest-dom";

jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
}));

describe("Home Page Root Redirect", () => {
    const mockReplace = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({
            replace: mockReplace,
            push: jest.fn(),
        });
        localStorage.clear();
    });

    it("redirects to /dashboard when user has an active token in localStorage", () => {
        localStorage.setItem("token", "fake-active-jwt-token");

        render(<Home />);

        expect(screen.getByText(/Redirecting/i)).toBeInTheDocument();
        expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });

    it("redirects to /login when user has no token in localStorage", () => {
        render(<Home />);

        expect(screen.getByText(/Redirecting/i)).toBeInTheDocument();
        expect(mockReplace).toHaveBeenCalledWith("/login");
    });
});

