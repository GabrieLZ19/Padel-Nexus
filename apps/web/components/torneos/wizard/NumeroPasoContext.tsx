"use client";

import { createContext, useContext, type ReactNode } from "react";
import { numeroPasoVisible } from "@/components/torneos/wizard/stepLocks";

const HiddenStepsContext = createContext<readonly string[]>([]);

export function NumeroPasoProvider({
  hiddenStepIds = [],
  children,
}: {
  hiddenStepIds?: readonly string[];
  children: ReactNode;
}) {
  return (
    <HiddenStepsContext.Provider value={hiddenStepIds}>
      {children}
    </HiddenStepsContext.Provider>
  );
}

export function useNumeroPaso(stepId: string): number {
  return numeroPasoVisible(stepId, useContext(HiddenStepsContext));
}
