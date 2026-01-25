import { act, fireEvent, render, screen } from "@testing-library/react";
import { useNavUnderline } from "../hooks/useNavUnderline";

const buildRect = (left: number, width: number) =>
  ({
    left,
    width,
    right: left + width,
    top: 0,
    bottom: 0,
    height: 0,
    x: left,
    y: 0,
    toJSON: () => ""
  }) as DOMRect;

const NavHarness = () => {
  const { navRef, updateNavUnderline } = useNavUnderline();

  return (
    <nav ref={navRef} aria-label="Primary">
      <a
        href="/"
        className="nav-link active"
        onMouseEnter={(event) => updateNavUnderline(event.currentTarget)}
      >
        Home
      </a>
      <a
        href="/profile"
        className="nav-link"
        onMouseEnter={(event) => updateNavUnderline(event.currentTarget)}
      >
        Profile
      </a>
    </nav>
  );
};

describe("useNavUnderline", () => {
  it("updates underline on hover and resets on resize", () => {
    render(<NavHarness />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    const homeLink = screen.getByText("Home");
    const profileLink = screen.getByText("Profile");

    nav.getBoundingClientRect = () => buildRect(10, 200);
    homeLink.getBoundingClientRect = () => buildRect(20, 60);
    profileLink.getBoundingClientRect = () => buildRect(110, 80);

    fireEvent.mouseEnter(profileLink);

    expect(nav.style.getPropertyValue("--nav-underline-left")).toBe("100px");
    expect(nav.style.getPropertyValue("--nav-underline-width")).toBe("80px");
    expect(nav.style.getPropertyValue("--nav-underline-opacity")).toBe("1");

    homeLink.getBoundingClientRect = () => buildRect(30, 70);

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(nav.style.getPropertyValue("--nav-underline-left")).toBe("20px");
    expect(nav.style.getPropertyValue("--nav-underline-width")).toBe("70px");
    expect(nav.style.getPropertyValue("--nav-underline-opacity")).toBe("1");
  });
});
