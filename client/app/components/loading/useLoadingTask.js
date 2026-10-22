"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useLoadingTask({
  timeoutMs = 30_000,
  minimumDisplayMs = 250,
} = {}) {
  const [state, setState] = useState({
    status: "idle",
    error: null,
    startedAt: null,
    finishedAt: null,
  });

  const controllerRef = useRef(null);
  const runIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      runIdRef.current += 1;
      controllerRef.current?.abort();
    };
  }, []);

  const cancel = useCallback(() => {
    runIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;

    if (mountedRef.current) {
      setState({
        status: "cancelled",
        error: null,
        startedAt: null,
        finishedAt: Date.now(),
      });
    }
  }, []);

  const reset = useCallback(() => {
    runIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;

    setState({
      status: "idle",
      error: null,
      startedAt: null,
      finishedAt: null,
    });
  }, []);

  const run = useCallback(
    async (task) => {
      if (typeof task !== "function") {
        throw new TypeError("run() expects an async function.");
      }

      controllerRef.current?.abort();

      const controller = new AbortController();
      controllerRef.current = controller;

      const runId = ++runIdRef.current;
      const startedAt = Date.now();

      setState({
        status: "loading",
        error: null,
        startedAt,
        finishedAt: null,
      });

      let timeout;

      try {
        const taskPromise = Promise.resolve().then(() =>
          task({
            signal: controller.signal,
            startedAt,
          }),
        );

        const timeoutPromise = new Promise((_, reject) => {
          timeout = setTimeout(() => {
            controller.abort();

            const error = new Error("The operation timed out.");
            error.name = "TimeoutError";
            reject(error);
          }, timeoutMs);
        });

        const result = await Promise.race([taskPromise, timeoutPromise]);

        const remaining = Math.max(
          0,
          minimumDisplayMs - (Date.now() - startedAt),
        );

        if (remaining > 0) {
          await new Promise((resolve) => {
            setTimeout(resolve, remaining);
          });
        }

        if (!mountedRef.current || runId !== runIdRef.current) {
          return undefined;
        }

        setState({
          status: "success",
          error: null,
          startedAt,
          finishedAt: Date.now(),
        });

        return result;
      } catch (error) {
        if (!mountedRef.current || runId !== runIdRef.current) {
          return undefined;
        }

        if (error?.name === "AbortError") {
          setState({
            status: "cancelled",
            error: null,
            startedAt,
            finishedAt: Date.now(),
          });
        } else {
          setState({
            status: "error",
            error,
            startedAt,
            finishedAt: Date.now(),
          });
        }

        throw error;
      } finally {
        clearTimeout(timeout);

        if (runId === runIdRef.current) {
          controllerRef.current = null;
        }
      }
    },
    [minimumDisplayMs, timeoutMs],
  );

  return {
    ...state,
    isLoading: state.status === "loading",
    isSuccess: state.status === "success",
    isError: state.status === "error",
    run,
    cancel,
    reset,
  };
}
