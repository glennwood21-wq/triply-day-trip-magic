
import { useState, useEffect, useRef } from 'react';

interface PlacesAutocompleteProps {
  apiKey: string;
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

const useGooglePlacesAutocomplete = ({ 
  apiKey, 
  onPlaceSelect,
  inputRef
}: PlacesAutocompleteProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    // If no API key is provided, set an error and return early
    if (!apiKey || apiKey.trim() === '') {
      console.error('Google Maps API key is missing or empty');
      setError('Google Maps API key is missing. Please check your configuration.');
      return;
    }

    // If Google Maps API is already loaded, initialize autocomplete
    if (window.google && window.google.maps && window.google.maps.places) {
      initAutocomplete();
      return;
    }

    // Define the callback function that will be called when the script loads
    window.initPlacesAutocomplete = () => {
      setLoaded(true);
      initAutocomplete();
    };

    // Remove any existing Google Maps script to prevent duplicate loading
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      document.head.removeChild(existingScript);
    }

    // Load the Google Maps Places API script
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initPlacesAutocomplete`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error('Failed to load Google Maps API script');
      setError('Failed to load Google Maps API');
    };

    document.head.appendChild(script);

    return () => {
      // Clean up the script and the global callback when the component unmounts
      window.initPlacesAutocomplete = () => {};
      const scriptToRemove = document.getElementById('google-maps-script');
      if (scriptToRemove) {
        document.head.removeChild(scriptToRemove);
      }
    };
  }, [apiKey]);

  const initAutocomplete = () => {
    if (!inputRef.current) return;

    try {
      const options = {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'us' }, // Limit to US, remove or change as needed
      };

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        options
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && onPlaceSelect) {
          onPlaceSelect(place);
        }
      });
    } catch (err) {
      console.error('Error initializing Google Places Autocomplete:', err);
      setError('Error initializing Google Places Autocomplete');
    }
  };

  return { loaded, error };
};

export default useGooglePlacesAutocomplete;
