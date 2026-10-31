import { createContext, useContext, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { apps, people, photos } from "./shared";

export type DemoApplication = (typeof apps)[number] & { id: string };

export type DemoPost = {
  id: string;
  name: string;
  time: string;
  text: string;
  image?: string;
  comments: string[];
};

export type DemoData = {
  applications: DemoApplication[];
  activeApplicationId: string;
  posts: DemoPost[];
  likedPosts: string[];
  connections: string[];
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
  posts: [
    {
      id: "post-neha",
      name: "Neha Joshi",
      time: "2 hours ago",
      text: "Had a wonderful morning volunteering at the Learning Together session. The children’s curiosity and energy made the day unforgettable.",
      image: photos.children,
      comments: [],
    },
    {
      id: "post-ravi",
      name: "Ravi Kumar",
      time: "Yesterday",
      text: "Our Clean Shores team collected 42 bags of waste this weekend. Thank you to every volunteer who showed up and made it possible.",
      image: photos.cleanup,
      comments: [],
    },
  ],
  likedPosts: [],
  connections: [],
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
    if (!saved) return initialData;
    const parsed = JSON.parse(saved) as Partial<DemoData>;
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

const DemoStoreContext = createContext<{ data: DemoData; setData: Dispatch<SetStateAction<DemoData>> } | null>(null);

export function DemoStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DemoData>(readInitialData);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {}
  }, [data]);

  return <DemoStoreContext.Provider value={{ data, setData }}>{children}</DemoStoreContext.Provider>;
}

export function useDemoStore() {
  const store = useContext(DemoStoreContext);
  if (!store) throw new Error("useDemoStore must be used within DemoStoreProvider");
  return store;
}

export const suggestedPeople = people;