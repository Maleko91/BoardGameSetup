import "./styles.css";

const buttons = document.querySelectorAll("button");
buttons.forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.add("clicked");
    window.setTimeout(() => button.classList.remove("clicked"), 300);
  });
});
