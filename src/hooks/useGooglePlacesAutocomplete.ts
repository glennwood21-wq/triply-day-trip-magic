
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
  const scriptLoadAttemptedRef = useRef(false);
  const loadCallbackTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // If no API key is provided, set an error and return early
    if (!apiKey || apiKey.trim() === '') {
      console.error('Google Maps API key is missing or empty');
      setError('Google Maps API key is missing. Please check your configuration.');
      return;
    }

    // Only attempt to load the script once
    if (scriptLoadAttemptedRef.current) {
      return;
    }

    // If Google Maps API is already loaded, initialize autocomplete
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('Google Maps API already loaded, initializing autocomplete');
      setLoaded(true);
      initAutocomplete();
      return;
    }

    scriptLoadAttemptedRef.current = true;

    // Clear any existing callback timeout
    if (loadCallbackTimeoutRef.current) {
      window.clearTimeout(loadCallbackTimeoutRef.current);
    }

    // Define the callback function that will be called when the script loads
    window.initPlacesAutocomplete = () => {
      console.log('Google Maps Places API loaded successfully');
      setLoaded(true);
      setError(null);
      initAutocomplete();
    };

    // Remove any existing Google Maps script to prevent duplicate loading
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      document.head.removeChild(existingScript);
    }

    // Sanitize API key for logging (only show first 5 characters)
    const sanitizedKey = apiKey.substring(0, 5) + '...';
    console.log('Loading Google Maps API with key:', sanitizedKey);

    // Load the Google Maps Places API script
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initPlacesAutocomplete`;
    script.async = true;
    script.defer = true;
    script.onerror = (e) => {
      console.error('Failed to load Google Maps API script:', e);
      setError('Failed to load Google Maps API. Please check your API key or internet connection.');
    };

    document.head.appendChild(script);

    // Set a timeout to detect if the callback doesn't execute
    loadCallbackTimeoutRef.current = window.setTimeout(() => {
      if (!loaded && !error) {
        console.error('Google Maps API script loading timed out');
        setError('Google Maps API loading timed out. Please check your API key or internet connection.');
      }
    }, 10000); // 10 second timeout

    return () => {
      // Clean up the script and the global callback when the component unmounts
      window.initPlacesAutocomplete = () => {};
      if (loadCallbackTimeoutRef.current) {
        window.clearTimeout(loadCallbackTimeoutRef.current);
      }
      const scriptToRemove = document.getElementById('google-maps-script');
      if (scriptToRemove) {
        document.head.removeChild(scriptToRemove);
      }
    };
  }, [apiKey, loaded, error]);

  const initAutocomplete = () => {
    if (!inputRef.current) {
      console.log('Input ref not available yet, waiting to initialize autocomplete');
      return;
    }

    try {
      console.log('Initializing Google Places Autocomplete');
      const options = {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'us' }, // Limit to US, remove or change as needed
        fields: ['address_components', 'formatted_address', 'geometry', 'name'],
      };

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        options
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && onPlaceSelect) {
          console.log('Place selected:', place.formatted_address);
          onPlaceSelect(place);
        }
      });
      
      console.log('Google Places Autocomplete initialized successfully');
    } catch (err) {
      console.error('Error initializing Google Places Autocomplete:', err);
      setError('Error initializing Google Places Autocomplete');
    }
  };

  return { loaded, error };
};

export default useGooglePlacesAutocomplete;
