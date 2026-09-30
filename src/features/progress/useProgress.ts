import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export type Progress = {
  read: string[];
  bookmarks: string[];
  recent: string[];
  theme: "dark" | "light";
};
const STORAGE_KEY = "react-mastery-v1";
const empty: Progress = { read: [], bookmarks: [], recent: [], theme: "dark" };

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function readProgress(): Progress {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const value =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    return {
      read: stringList(value.read),
      bookmarks: stringList(value.bookmarks),
      recent: stringList(value.recent),
      theme: value.theme === "light" ? "light" : "dark",
    };
  } catch {
    return empty;
  }
}

export function useProgress(): {
  progress: Progress;
  setProgress: Dispatch<SetStateAction<Progress>>;
  storageError: boolean;
} {
  const [progress, setProgress] = useState(readProgress);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = progress.theme;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      // Storage status is an external-system result; update after the effect completes.
      queueMicrotask(() => setStorageError(false));
    } catch {
      queueMicrotask(() => setStorageError(true));
    }
  }, [progress]);
  return { progress, setProgress, storageError };
}
