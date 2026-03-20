import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';

type AppStatusBarContextValue = {
  hubStatusExtras: ReactNode;
  setHubStatusExtras: Dispatch<SetStateAction<ReactNode>>;
};

const AppStatusBarContext = createContext<AppStatusBarContextValue | null>(null);

export function AppStatusBarProvider({ children }: { children: ReactNode }) {
  const [hubStatusExtras, setHubStatusExtras] = useState<ReactNode>(null);
  const value = useMemo(
    () => ({ hubStatusExtras, setHubStatusExtras }),
    [hubStatusExtras],
  );
  return <AppStatusBarContext.Provider value={value}>{children}</AppStatusBarContext.Provider>;
}

export function useAppStatusBar() {
  const ctx = useContext(AppStatusBarContext);
  if (!ctx) {
    return {
      hubStatusExtras: null as ReactNode,
      setHubStatusExtras: (() => {}) as Dispatch<SetStateAction<ReactNode>>,
    };
  }
  return ctx;
}
