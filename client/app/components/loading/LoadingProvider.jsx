"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import LoadingScreen from "./LoadingScreen";

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const sequenceRef = useRef(0);
  const activeRef = useRef(new Map());

  const [activeTasks, setActiveTasks] = useState([]);

  const publish = useCallback(() => {
    setActiveTasks(Array.from(activeRef.current.values()));
  }, []);

  const startLoading = useCallback(
    (options = {}) => {
      const id = ++sequenceRef.current;

      const task = {
        id,
        label: options.label || "Preparing your workspace",
        detail: options.detail || "Please wait a moment.",
        variant: options.variant || "default",
      };

      activeRef.current.set(id, task);
      publish();

      let stopped = false;

      return {
        id,
        update(nextOptions = {}) {
          if (stopped || !activeRef.current.has(id)) return;

          activeRef.current.set(id, {
            ...activeRef.current.get(id),
            ...nextOptions,
          });

          publish();
        },
        stop() {
          if (stopped) return;

          stopped = true;
          activeRef.current.delete(id);
          publish();
        },
      };
    },
    [publish],
  );

  const value = useMemo(
    () => ({
      isLoading: activeTasks.length > 0,
      activeTasks,
      startLoading,
    }),
    [activeTasks, startLoading],
  );

  const currentTask = activeTasks[activeTasks.length - 1];

  return (
    <LoadingContext.Provider value={value}>
      {children}

      {currentTask && (
        <LoadingScreen
          key={currentTask.id}
          variant={currentTask.variant}
          label={currentTask.label}
          detail={currentTask.detail}
        />
      )}
    </LoadingContext.Provider>
  );
}

export function useGlobalLoading() {
  const context = useContext(LoadingContext);

  if (!context) {
    throw new Error("useGlobalLoading must be used inside LoadingProvider.");
  }

  return context;
}
