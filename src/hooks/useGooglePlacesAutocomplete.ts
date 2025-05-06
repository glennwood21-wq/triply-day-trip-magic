
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

  useEffect(() => {
    // If no API key is provided, set an error and return early
    if (!apiKey || apiKey.trim() === '') {
      console.error('Google Maps API key is missing or empty');
      setError('Google Maps API key is missing. Please check your configuration.');
      return;
    }

    // If Google Maps API is already loaded, initialize autocomplete
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('Google Maps API already loaded, initializing autocomplete');
      setLoaded(true);
      initAutocomplete();
      return;
    }

    // Only attempt to load the script once
    if (scriptLoadAttemptedRef.current) {
      return;
    }

    scriptLoadAttemptedRef.current = true;

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

    console.log('Loading Google Maps API with key:', apiKey.substring(0, 5) + '...');

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
    if (!inputRef.current) {
      console.log('Input ref not available yet, waiting to initialize autocomplete');
      return;
    }

    try {
      console.log('Initializing Google Places Autocomplete');
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
