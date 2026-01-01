import React from 'react';

import { AppStateContext } from './appState';

export function AppStateProvider({ value, children }) {
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
