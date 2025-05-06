
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Place {
  id: string;
  displayName: {
    text: string;
    languageCode: string;
  };
  formattedAddress: string;
  types?: string[];
}

interface UsePlacesAutocompleteProps {
  onPlaceSelect?: (place: Place) => void;
  debounceMs?: number;
  minChars?: number;
}

interface UsePlacesAutocompleteResult {
  suggestions: Place[];
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
  clearSuggestions: () => void;
  searchImmediately: (query: string) => Promise<void>;
}

export const usePlacesAutocomplete = ({
  onPlaceSelect,
  debounceMs = 300,
  minChars = 2
}: UsePlacesAutocompleteProps = {}): UsePlacesAutocompleteResult => {
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { toast } = useToast();
  
  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Function to get user's current location if available
  const getUserLocation = useCallback(async (): Promise<{lat: number, lng: number} | null> => {
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        
        return {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
      } catch (err) {
        console.log('Geolocation permission denied or unavailable');
        return null;
      }
    }
    return null;
  }, []);

  // Immediate search function (no debounce)
  const searchImmediately = useCallback(async (query: string) => {
    if (!query || query.trim().length < minChars) {
      clearSuggestions();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching place suggestions for:', query);
      
      // Try to get user's location for better results
      const userLocation = await getUserLocation();
      let url = `get-google-maps-key/autocomplete?query=${encodeURIComponent(query)}`;
      
      // Add user's location to the request if available
      if (userLocation) {
        url += `&lat=${userLocation.lat}&lng=${userLocation.lng}`;
      }
      
      const { data, error: apiError } = await supabase.functions.invoke(url, {
        method: 'GET'
      });

      if (apiError) {
        console.error('Error fetching place suggestions:', apiError);
        throw new Error(apiError.message || 'Failed to fetch place suggestions');
      }

      if (!data || data.status === 'error') {
        throw new Error(data?.error || 'Failed to fetch place suggestions');
      }

      console.log('Place suggestions received:', data.results);
      setSuggestions(data.results || []);
    } catch (err) {
      console.error('Error in places autocomplete:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch place suggestions';
      setError(errorMsg);
      
      // Only show toast for network errors, not for input validation
      if (query.trim().length >= minChars) {
        toast({
          title: "Search Error",
          description: "Could not retrieve location suggestions",
          variant: "destructive",
        });
      }
      
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [clearSuggestions, getUserLocation, minChars, toast]);

  // Debounced search function
  const search = useCallback((query: string) => {
    setSearchTerm(query);
  }, []);

  // Effect for debouncing
  useEffect(() => {
    if (!searchTerm || searchTerm.trim() === '') {
      clearSuggestions();
      return undefined;
    }
    
    if (searchTerm.trim().length < minChars) {
      return undefined;
    }
    
    const timer = setTimeout(() => {
      searchImmediately(searchTerm);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm, debounceMs, minChars, searchImmediately, clearSuggestions]);

  // Clean up function
  useEffect(() => {
    return () => {
      clearSuggestions();
    };
  }, [clearSuggestions]);

  return {
    suggestions,
    loading,
    error,
    search,
    clearSuggestions,
    searchImmediately
  };
};

export default usePlacesAutocomplete;
