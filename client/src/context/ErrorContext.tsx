import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ErrorState {
  title: string;
  message: string;
}

interface ErrorContextValue {
  error: ErrorState | null;
  showError: (title: string, message: string) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<ErrorState | null>(null);

  const showError = useCallback((title: string, message: string) => {
    setError({ title, message });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <ErrorContext.Provider value={{ error, showError, clearError }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const ctx = useContext(ErrorContext);
  if (!ctx) throw new Error("useError must be used inside ErrorProvider");
  return ctx;
}
