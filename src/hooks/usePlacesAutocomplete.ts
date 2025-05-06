
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Place {
  id: string;
  displayName: {
    text: string;
    languageCode: string;
  };
  formattedAddress: string;
}

interface UsePlacesAutocompleteProps {
  onPlaceSelect?: (place: Place) => void;
}

interface UsePlacesAutocompleteResult {
  suggestions: Place[];
  loading: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  clearSuggestions: () => void;
}

export const usePlacesAutocomplete = ({
  onPlaceSelect
}: UsePlacesAutocompleteProps = {}): UsePlacesAutocompleteResult => {
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Debounced search function
  const search = useCallback(async (query: string) => {
    if (!query || query.trim() === '') {
      clearSuggestions();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching place suggestions for:', query);
      // Fix: Pass query as a URL parameter instead of query object
      const { data, error: apiError } = await supabase.functions.invoke(`get-google-maps-key/autocomplete?query=${encodeURIComponent(query)}`, {
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
      setError(err instanceof Error ? err.message : 'Failed to fetch place suggestions');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [clearSuggestions]);

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
    clearSuggestions
  };
};

export default usePlacesAutocomplete;
