import React from "react";
import { render, screen } from "@testing-library/react";
import Home from "../page";
import { useAuth } from "@/hooks/useAuth";
import "@testing-library/jest-dom";

// Mock the useAuth hook
jest.mock("@/hooks/useAuth");

// Mock the next/navigation hooks
jest.mock("next/navigation", () => ({
    usePathname: () => "/",
    useRouter: () => ({
        push: jest.fn(),
    }),
}));

// Mock the DashboardLayout to simplify the test
// We want to test the Home page content specifically
jest.mock("@/components/layout/DashboardLayout", () => {
    return ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>;
});

describe("Home Page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders the hero section with main title", () => {
        (useAuth as jest.Mock).mockReturnValue({
            isAuthenticated: false,
            isLoading: false,
        });

        render(<Home />);

        expect(screen.getByText(/Experience Books in/i)).toBeInTheDocument();
        expect(screen.getByText(/Three Dimensions/i)).toBeInTheDocument();
        expect(screen.getByText(/Semantic AI/i)).toBeInTheDocument();
    });

    it("shows 'Explore Library' and 'Join for Free' buttons when not authenticated", () => {
        (useAuth as jest.Mock).mockReturnValue({
            isAuthenticated: false,
            isLoading: false,
        });

        render(<Home />);

        expect(screen.getByRole("button", { name: /explore library/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /join for free/i })).toBeInTheDocument();
    });

    it("does not show 'Join for Free' button when authenticated", () => {
        (useAuth as jest.Mock).mockReturnValue({
            isAuthenticated: true,
            isLoading: false,
        });

        render(<Home />);

        expect(screen.getByRole("button", { name: /explore library/i })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /join for free/i })).not.toBeInTheDocument();
    });

    it("renders all feature cards", () => {
        (useAuth as jest.Mock).mockReturnValue({
            isAuthenticated: false,
            isLoading: false,
        });

        render(<Home />);

        expect(screen.getByText(/Vast Library Access/i)).toBeInTheDocument();
        expect(screen.getByText(/ML Recommendations/i)).toBeInTheDocument();
        expect(screen.getByText(/Semantic Q&A/i)).toBeInTheDocument();
        expect(screen.getByText(/Automated Ingestion/i)).toBeInTheDocument();
        expect(screen.getByText(/Rolling Consensus/i)).toBeInTheDocument();
        expect(screen.getByText(/Enterprise Secure/i)).toBeInTheDocument();
    });

    it("renders the stats section", () => {
        (useAuth as jest.Mock).mockReturnValue({
            isAuthenticated: false,
            isLoading: false,
        });

        render(<Home />);

        expect(screen.getByText("10K+")).toBeInTheDocument();
        expect(screen.getByText("Instant")).toBeInTheDocument();
        expect(screen.getByText("4.8 ★")).toBeInTheDocument();
    });
});
