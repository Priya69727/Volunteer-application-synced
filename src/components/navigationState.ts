import { pageTitles, type Page } from "./shared";

type SelectedOpportunity = { kind: "project" | "event"; id: string } | null;

export type NavigationState = {
  page: Page;
  searchQuery: string;
  selected: SelectedOpportunity;
  selectedApplicationId: string;
  selectedAssignmentId: string;
};

const STORAGE_KEY = "volunteer-portal-navigation";
const DEFAULT_STATE: NavigationState = {
  page: "dashboard",
  searchQuery: "",
  selected: null,
  selectedApplicationId: "",
  selectedAssignmentId: "",
};

export function readNavigationState(): NavigationState {
  try {
    const saved: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return DEFAULT_STATE;

    const value = saved as Partial<NavigationState>;
    const page = typeof value.page === "string" && Object.prototype.hasOwnProperty.call(pageTitles, value.page)
      ? value.page as Page
      : DEFAULT_STATE.page;
    const selected = value.selected
      && (value.selected.kind === "project" || value.selected.kind === "event")
      && typeof value.selected.id === "string"
      ? value.selected
      : null;

    return {
      page,
      searchQuery: typeof value.searchQuery === "string" ? value.searchQuery : "",
      selected,
      selectedApplicationId: typeof value.selectedApplicationId === "string" ? value.selectedApplicationId : "",
      selectedAssignmentId: typeof value.selectedAssignmentId === "string" ? value.selectedAssignmentId : "",
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function updateNavigationState(update: Partial<NavigationState>) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readNavigationState(), ...update }));
  } catch {
    // Navigation persistence is an enhancement; keep the app usable if browser storage is unavailable.
  }
}

export function clearNavigationState() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Navigation persistence is an enhancement; keep the app usable if browser storage is unavailable.
  }
}
