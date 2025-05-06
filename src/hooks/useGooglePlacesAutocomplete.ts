
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
  const scriptLoadedRef = useRef(false);

  // Load Google Maps API script
  useEffect(() => {
    // Don't do anything if API key is missing or empty
    if (!apiKey) {
      console.log('No API key provided, waiting...');
      setError('Waiting for API key...');
      return;
    }

    // Reset error state when key changes
    setError(null);

    // Check if script is already loaded
    if (window.google?.maps?.places) {
      console.log('Google Maps API already loaded, initializing autocomplete');
      setLoaded(true);
      scriptLoadedRef.current = true;
      initAutocomplete();
      return;
    }
    
    // If we already tried loading the script but it didn't work, don't try again
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      console.log('Removing existing Google Maps script before loading new one');
      existingScript.remove();
      window.initPlacesAutocomplete = undefined as any;
    }

    console.log('Loading Google Maps script with key:', apiKey.substring(0, 3) + '...');
    
    // Define callback function
    window.initPlacesAutocomplete = () => {
      console.log('Google Maps Places API script loaded successfully');
      setLoaded(true);
      scriptLoadedRef.current = true;
      setError(null);
      initAutocomplete();
    };

    // Create script element with async loading for better performance
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initPlacesAutocomplete&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = (e) => {
      console.error('Failed to load Google Maps API script:', e);
      setError('Failed to load Google Maps API');
      setLoaded(false);
      scriptLoadedRef.current = false;
    };

    document.head.appendChild(script);

    return () => {
      // Clean up
      window.initPlacesAutocomplete = undefined as any;
    };
  }, [apiKey]);

  const initAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) {
      console.log('Input ref or Google Maps Places not available yet');
      return;
    }

    try {
      console.log('Initializing Google Places Autocomplete');
      
      // Create the autocomplete instance
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode', 'establishment'],
        fields: ['address_components', 'formatted_address', 'geometry', 'name'],
      });

      // Add listener for place selection
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
      setError(`Error initializing Places Autocomplete: ${err}`);
    }
  };

  return { loaded, error };
};

export default useGooglePlacesAutocomplete;
