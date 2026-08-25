import { useState, useEffect } from 'react';
import { State, City } from 'country-state-city';

export function useCities(stateName: string | undefined) {
  const [cities, setCities] = useState<{name: string}[]>([]);

  useEffect(() => {
    if (!stateName) {
      setCities([]);
      return;
    }

    // Find the state code for the selected state name in India
    const statesOfIndia = State.getStatesOfCountry('IN');
    const selectedState = statesOfIndia.find(s => s.name.toLowerCase() === stateName.toLowerCase());

    if (selectedState) {
      const stateCities = City.getCitiesOfState('IN', selectedState.isoCode);
      setCities(stateCities);
    } else {
      setCities([]);
    }
  }, [stateName]);

  return { cities };
}
