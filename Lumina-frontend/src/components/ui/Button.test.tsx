import React from "react";
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";
import "@testing-library/jest-dom";

describe("Button Component", () => {
    it("renders with default props", () => {
        render(<Button>Click me</Button>);
        const button = screen.getByRole("button", { name: /click me/i });
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass("bg-blue-600");
    });

    it("applies the outline variant correctly", () => {
        render(<Button variant="outline">Outline</Button>);
        const button = screen.getByRole("button", { name: /outline/i });
        expect(button).toHaveClass("border-gray-300");
    });
});
