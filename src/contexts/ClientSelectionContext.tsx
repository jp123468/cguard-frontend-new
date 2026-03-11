import React, { createContext, useContext, useState } from 'react';

export type SelectedClient = {
  id: string;
  name: string;
  [key: string]: any;
} | null;

interface ClientSelectionContextProps {
  selectedClient: SelectedClient;
  setSelectedClient: (client: SelectedClient) => void;
}

const ClientSelectionContext = createContext<ClientSelectionContextProps | undefined>(undefined);

export const ClientSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedClient, setSelectedClient] = useState<SelectedClient>(null);
  return (
    <ClientSelectionContext.Provider value={{ selectedClient, setSelectedClient }}>
      {children}
    </ClientSelectionContext.Provider>
  );
};

export function useClientSelection() {
  const ctx = useContext(ClientSelectionContext);
  if (!ctx) throw new Error('useClientSelection must be used within ClientSelectionProvider');
  return ctx;
}
