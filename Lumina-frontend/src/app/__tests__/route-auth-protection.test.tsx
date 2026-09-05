import React from "react";
import { render, screen } from "@testing-library/react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CreateQuizPage from "@/app/quizzes/create/page";
import QuizzesPage from "@/app/quizzes/page";
import BooksPage from "@/app/books/page";
import RecommendationsPage from "@/app/recommendations/page";
import ProfilePage from "@/app/profile/page";
import { useAuth } from "@/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import "@testing-library/jest-dom";

jest.mock("@/hooks/useAuth");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useParams: () => ({ id: "1" }),
}));
jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: jest.fn() }),
}));
jest.mock("@/services/quizService", () => ({
  quizService: {
    list: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue({ id: 1 }),
  },
}));
jest.mock("@/services/groupService", () => ({
  groupService: {
    list: jest.fn().mockResolvedValue([]),
  },
}));
jest.mock("@/hooks/useBooks", () => ({
  useBooks: () => ({ data: { items: [], total: 0 }, isLoading: false }),
}));
jest.mock("@/hooks/useRecommendations", () => ({
  useRecommendations: () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn() }),
}));
jest.mock("@/hooks/usePreferences", () => ({
  useUserPreferences: () => ({ data: {}, isLoading: false }),
  useUpdateUserPreferences: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/hooks/useProfile", () => ({
  useUpdateProfile: () => ({ mutate: jest.fn() }),
  useChangePassword: () => ({ mutate: jest.fn() }),
  useUploadAvatar: () => ({ mutate: jest.fn() }),
}));

describe("Route Authentication Protection & Session Redirection", () => {
  const mockReplace = jest.fn();
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
      push: mockPush,
    });
  });

  describe("DashboardLayout Global Guard", () => {
    it("redirects unauthenticated user from /quizzes/create to /login and displays Checking session loader", () => {
      (usePathname as jest.Mock).mockReturnValue("/quizzes/create");
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        logout: jest.fn(),
      });

      render(
        <DashboardLayout>
          <div data-testid="protected-content">Secret Quiz Create Form</div>
        </DashboardLayout>
      );

      // Should show Checking session loader and NOT render child protected content
      expect(screen.getByText("Checking session…")).toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });

    it("allows public /login and /signup pages without redirection", () => {
      (usePathname as jest.Mock).mockReturnValue("/login");
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        logout: jest.fn(),
      });

      render(
        <DashboardLayout>
          <div data-testid="login-form">Login Form</div>
        </DashboardLayout>
      );

      expect(screen.getByTestId("login-form")).toBeInTheDocument();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe("Individual Protected Pages under Unauthenticated Session", () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        logout: jest.fn(),
      });
    });

    it("CreateQuizPage triggers redirect to /login when unauthenticated", () => {
      (usePathname as jest.Mock).mockReturnValue("/quizzes/create");
      render(<CreateQuizPage />);
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });

    it("QuizzesPage triggers redirect to /login when unauthenticated", () => {
      (usePathname as jest.Mock).mockReturnValue("/quizzes");
      render(<QuizzesPage />);
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });

    it("BooksPage triggers redirect to /login when unauthenticated", () => {
      (usePathname as jest.Mock).mockReturnValue("/books");
      render(<BooksPage />);
      expect(mockPush).toHaveBeenCalledWith("/login");
    });

    it("RecommendationsPage triggers redirect to /login when unauthenticated", () => {
      (usePathname as jest.Mock).mockReturnValue("/recommendations");
      render(<RecommendationsPage />);
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });

    it("ProfilePage triggers redirect to /login when unauthenticated", () => {
      (usePathname as jest.Mock).mockReturnValue("/profile");
      render(<ProfilePage />);
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });
});
