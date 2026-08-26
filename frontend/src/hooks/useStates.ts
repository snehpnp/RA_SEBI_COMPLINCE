import { useState, useEffect } from 'react';

export interface State {
  id: string;
  name: string;
  gstCode: string | null;
}

export function useStates() {
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const baseUrl = (process.env.NODE_ENV as string) === 'production' 
          ? 'https://compliance.pnpuniverse.in/backend/api/v1' 
          : ((process.env.NODE_ENV as string) === 'production' ? 'https://compliance.pnpuniverse.in/backend/api/v1' : ((process.env.NODE_ENV as string) === 'production' ? 'https://compliance.pnpuniverse.in/backend' : 'http://localhost:5000') + '/api/v1') + '';
        
        const response = await fetch(`${baseUrl}/locations/states`);
        const data = await response.json();
        if (data.success) {
          setStates(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch states:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStates();
  }, []);

  return { states, loading };
}
