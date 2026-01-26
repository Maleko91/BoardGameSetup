import { render, screen } from "@testing-library/react";
import RequestPage from "../pages/RequestPage";

describe("RequestPage", () => {
  it("shows the placeholder message", () => {
    render(<RequestPage />);

    expect(screen.getByText("Request form coming soon.")).toBeInTheDocument();
  });
});
