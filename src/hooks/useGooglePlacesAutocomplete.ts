
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
    // Clear any existing error when API key changes
    setError(null);
    
    // If no API key is provided, set an error and return early
    if (!apiKey) {
      console.error('No Google Maps API key provided');
      setError('Google Maps API key is required');
      setLoaded(false);
      return;
    }

    if (apiKey.trim() === '') {
      console.error('Empty Google Maps API key provided');
      setError('Google Maps API key cannot be empty');
      setLoaded(false);
      return;
    }

    // If script is already loaded, don't load it again
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('Google Maps API already loaded');
      setLoaded(true);
      scriptLoadedRef.current = true;
      initAutocomplete();
      return;
    }
    
    if (scriptLoadedRef.current) {
      return;
    }

    console.log('Loading Google Maps script with API key');
    
    // Define callback function
    window.initPlacesAutocomplete = () => {
      console.log('Google Maps Places API loaded successfully');
      setLoaded(true);
      scriptLoadedRef.current = true;
      setError(null);
      initAutocomplete();
    };

    // Create script element
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initPlacesAutocomplete`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error('Failed to load Google Maps API script');
      setError('Failed to load Google Maps API. Please check your API key or internet connection.');
      setLoaded(false);
      scriptLoadedRef.current = false;
    };

    document.head.appendChild(script);

    return () => {
      // Clean up
      window.initPlacesAutocomplete = () => {};
    };
  }, [apiKey]);

  const initAutocomplete = () => {
    if (!inputRef.current) {
      console.log('Input ref not available yet');
      return;
    }

    try {
      console.log('Initializing Google Places Autocomplete');
      
      // Ensure input isn't disabled
      if (inputRef.current.disabled) {
        inputRef.current.disabled = false;
      }
      
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['geocode', 'establishment'],
          fields: ['address_components', 'formatted_address', 'geometry', 'name'],
        }
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
      setLoaded(false);
    }
  };

  // Ensure input is never disabled
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.disabled = false;
    }
  }, [inputRef]);

  return { loaded, error };
};

export default useGooglePlacesAutocomplete;
