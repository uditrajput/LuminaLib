import React from "react";
import { render, screen } from "@testing-library/react";
import Home from "../page";
import { useAuth } from "@/hooks/useAuth";
import "@testing-library/jest-dom";

// Mock the useAuth hook
jest.mock("@/hooks/useAuth");

// Mock bookService
jest.mock("@/services/bookService", () => ({
    getPublicBookStats: jest.fn().mockResolvedValue({
        books_count: 10000,
        summaries_count: 10000,
        rating: "4.9 ★",
    }),
}));

// Mock framer-motion
jest.mock("framer-motion", () => ({
    motion: {
        div: ({ children, whileInView, whileHover, whileTap, viewport, initial, animate, transition, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, whileInView, whileHover, whileTap, viewport, initial, animate, transition, ...props }: any) => <button {...props}>{children}</button>,
        h2: ({ children, whileInView, viewport, initial, animate, transition, ...props }: any) => <h2 {...props}>{children}</h2>,
        p: ({ children, whileInView, viewport, initial, animate, transition, ...props }: any) => <p {...props}>{children}</p>,
        span: ({ children, whileInView, viewport, initial, animate, transition, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock the next/navigation hooks
jest.mock("next/navigation", () => ({
    usePathname: () => "/",
    useRouter: () => ({
        push: jest.fn(),
    }),
}));

// Mock DashboardLayout
jest.mock("@/components/layout/DashboardLayout", () => {
    return ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>;
});

describe("Home Page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders the 3D hero section with main title", () => {
        (useAuth as jest.Mock).mockReturnValue({
            isAuthenticated: false,
            isLoading: false,
        });

        render(<Home />);

        expect(screen.getByText(/Experience Books in/i)).toBeInTheDocument();
        expect(screen.getByText(/Three Dimensions/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Semantic AI/i).length).toBeGreaterThan(0);
    });

    it("shows 'Explore Library' and 3D 'Join for Free' buttons when not authenticated", () => {
        (useAuth as jest.Mock).mockReturnValue({
            isAuthenticated: false,
            isLoading: false,
        });

        render(<Home />);

        expect(screen.getByRole("button", { name: /explore library/i })).toBeInTheDocument();
        expect(screen.getAllByRole("button", { name: /join for free/i }).length).toBeGreaterThan(0);
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
        expect(screen.getAllByText(/Semantic Q&A/i).length).toBeGreaterThan(0);
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

        expect(screen.getByText(/10,000\+/i)).toBeInTheDocument();
        expect(screen.getByText(/Sub-Second/i)).toBeInTheDocument();
        expect(screen.getByText(/4.9 ★/i)).toBeInTheDocument();
    });
});
