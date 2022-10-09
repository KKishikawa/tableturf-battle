/** tailwind darkmode util */
export const darkMode = {
  toDark() {
    document.documentElement.classList.add("dark");
    localStorage.theme = "dark";
  },
  toLight() {
    document.documentElement.classList.remove("dark");
    localStorage.theme = "light";
  },
  toggle() {
    if (document.documentElement.classList.contains("dark")) {
      this.toLight();
    } else {
      this.toDark();
    }
  }
}

