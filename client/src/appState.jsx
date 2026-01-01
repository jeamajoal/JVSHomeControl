import { createContext, useContext } from 'react';

export const AppStateContext = createContext(null);

// Optional app state access.
// Panels can use this to avoid prop-drilling while still remaining usable
// in isolation by falling back to props.
export function useAppState() {
  return useContext(AppStateContext);
}
