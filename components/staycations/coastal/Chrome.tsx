'use client';

import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Which bottom bar a screen gets.
 *
 * A stay page ends in a price and one action, and two stacked bars would
 * bury it — so that screen asks for the tab bar to stand down while it is
 * open, and takes the bottom of the window itself. Everything else keeps
 * the four destinations.
 */
type Chrome = { tabsHidden: boolean; setTabsHidden: (hidden: boolean) => void };

const ChromeContext = createContext<Chrome>({ tabsHidden: false, setTabsHidden: () => undefined });

export function ChromeProvider({ children }: { children: React.ReactNode }) {
  const [tabsHidden, setTabsHidden] = useState(false);
  return <ChromeContext.Provider value={{ tabsHidden, setTabsHidden }}>{children}</ChromeContext.Provider>;
}

export function useTabsHidden() {
  return useContext(ChromeContext).tabsHidden;
}

/** Call from a screen that owns the bottom of the window. */
export function useHideTabBar(active = true) {
  const { setTabsHidden } = useContext(ChromeContext);
  useEffect(() => {
    if (!active) return;
    setTabsHidden(true);
    return () => setTabsHidden(false);
  }, [active, setTabsHidden]);
}
