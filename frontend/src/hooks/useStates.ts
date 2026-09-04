import { useState, useEffect } from 'react';
import { base_api_url } from '../utils/config';

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
        const baseUrl = base_api_url;
        
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
