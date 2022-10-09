/** tailwind darkmode util */
export namespace darkMode {
  export function toDark() {
    document.documentElement.classList.add("dark");
    localStorage.theme = "dark";
  }
  export function toLight() {
    document.documentElement.classList.remove("dark");
    localStorage.theme = "light";
  }
  export function toggle() {
    if (document.documentElement.classList.contains("dark")) {
      toLight();
    } else {
      toDark();
    }
  }
}

