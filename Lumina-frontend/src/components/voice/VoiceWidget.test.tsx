import React from "react";
import { render, screen } from "@testing-library/react";
import VoiceWidget from "./VoiceWidget";

describe("VoiceWidget Component", () => {
    it("renders floating mic button when showFloatingButton is true", () => {
        render(<VoiceWidget showFloatingButton={true} />);
        const button = screen.getByRole("button", { name: /open voice assistant/i });
        expect(button).toBeInTheDocument();
    });

    it("renders active book title badge when provided", () => {
        render(<VoiceWidget showFloatingButton={true} bookTitle="The Great Gatsby" />);
        expect(screen.getByText("The Great Gatsby")).toBeInTheDocument();
    });
});
