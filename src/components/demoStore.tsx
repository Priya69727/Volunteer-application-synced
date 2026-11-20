import { createContext, useContext, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { apps } from "./shared";

export type DemoApplication = (typeof apps)[number] & { id: string };

export type DemoData = {
  applications: DemoApplication[];
  activeApplicationId: string;
  profile: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    about: string;
    skills: string[];
    avatar?: string;
  };
  notificationRead: boolean[];
  notificationPreferences: boolean[];
  unavailableDays: string[];
  privacyPreferences: boolean[];
};

const storageKey = "volunteer-portal-demo-v1";

const initialData: DemoData = {
  applications: apps.map((application, index) => ({ ...application, id: `application-${index + 1}` })),
  activeApplicationId: "application-1",
  profile: {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    about: "",
    skills: [],
  },
  notificationRead: [false, false, false, false],
  notificationPreferences: [true, true, true, false],
  unavailableDays: [],
  privacyPreferences: [true, false],
};

function readInitialData(): DemoData {
  if (typeof window === "undefined") return initialData;
  try {
    const saved = window.localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) as Partial<DemoData> : {};
    return {
      ...initialData,
      ...parsed,
      profile: { ...initialData.profile, ...parsed.profile },
      notificationPreferences: parsed.notificationPreferences ?? initialData.notificationPreferences,
      privacyPreferences: parsed.privacyPreferences ?? initialData.privacyPreferences,
    };
  } catch {
    return initialData;
  }
}

const DemoStoreContext = createContext<{ data: DemoData; setData: Dispatch<SetStateAction<DemoData>>; storageError: string } | null>(null);

export function DemoStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DemoData>(readInitialData);
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(data));
      setStorageError("");
    } catch {
      setStorageError("Your local preferences could not be saved in this browser. Check available storage and try again.");
    }
  }, [data]);

  return <DemoStoreContext.Provider value={{ data, setData, storageError }}>{children}{storageError && <p className="toast" role="alert">{storageError}</p>}</DemoStoreContext.Provider>;
}

export function useDemoStore() {
  const store = useContext(DemoStoreContext);
  if (!store) throw new Error("useDemoStore must be used within DemoStoreProvider");
  return store;
}