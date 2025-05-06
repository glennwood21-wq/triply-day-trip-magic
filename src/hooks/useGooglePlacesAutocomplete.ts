
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
  const initializationAttemptedRef = useRef(false);

  // Clear any existing autocomplete when API key changes or component unmounts
  useEffect(() => {
    // Reset initialization state when API key changes
    if (autocompleteRef.current) {
      console.log('API key changed, clearing existing autocomplete');
      autocompleteRef.current = null;
    }
    
    initializationAttemptedRef.current = false;
    scriptLoadAttemptedRef.current = false;
    
    // Reset the error state when API key changes
    if (apiKey) {
      setError(null);
      setLoaded(false);
    }
    
    return () => {
      // Clean up on unmount or API key change
      if (loadCallbackTimeoutRef.current) {
        window.clearTimeout(loadCallbackTimeoutRef.current);
      }
    };
  }, [apiKey]);

  // Load Google Maps API script with proper API key validation
  useEffect(() => {
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

    // Only attempt to load the script once for a given API key
    if (scriptLoadAttemptedRef.current) {
      return;
    }

    // If Google Maps API is already loaded, initialize autocomplete
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('Google Maps API already loaded, initializing autocomplete');
      setLoaded(true);
      setTimeout(() => {
        initAutocomplete();
      }, 100);
      return;
    }

    scriptLoadAttemptedRef.current = true;
    console.log('Loading Google Maps script with API key');

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

    // Load the Google Maps Places API script
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initPlacesAutocomplete`;
    script.async = true;
    script.defer = true;
    script.onerror = (e) => {
      console.error('Failed to load Google Maps API script:', e);
      setError('Failed to load Google Maps API. Please check your API key or internet connection.');
      scriptLoadAttemptedRef.current = false; // Allow retry on error
      setLoaded(false);
    };

    document.head.appendChild(script);

    // Set a timeout to detect if the callback doesn't execute
    loadCallbackTimeoutRef.current = window.setTimeout(() => {
      if (!loaded && !error) {
        console.error('Google Maps API script loading timed out');
        setError('Google Maps API loading timed out. Please check your API key or internet connection.');
        scriptLoadAttemptedRef.current = false; // Allow retry after timeout
        setLoaded(false);
      }
    }, 10000); // 10 second timeout

    return () => {
      // Clean up the global callback when the component unmounts
      window.initPlacesAutocomplete = () => {};
      if (loadCallbackTimeoutRef.current) {
        window.clearTimeout(loadCallbackTimeoutRef.current);
      }
    };
  }, [apiKey, loaded, error]);

  const initAutocomplete = () => {
    // Avoid initializing multiple times
    if (initializationAttemptedRef.current) {
      return;
    }
    
    initializationAttemptedRef.current = true;
    console.log('Attempting to initialize autocomplete, checking input ref');
    
    if (!inputRef.current) {
      console.log('Input ref not available yet, waiting to initialize autocomplete');
      
      // Try again in 100ms if input ref isn't available
      setTimeout(() => {
        initializationAttemptedRef.current = false;
        initAutocomplete();
      }, 100);
      return;
    }

    try {
      console.log('Input ref available, initializing Google Places Autocomplete');
      const options = {
        types: ['geocode', 'establishment'],
        fields: ['address_components', 'formatted_address', 'geometry', 'name'],
      };

      // CRITICAL: Ensure the input isn't disabled before initialization
      if (inputRef.current.disabled) {
        inputRef.current.disabled = false;
      }

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        options
      );

      // Make sure we don't disable the input field after initialization
      setTimeout(() => {
        if (inputRef.current && inputRef.current.disabled) {
          inputRef.current.disabled = false;
        }
      }, 100);

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && onPlaceSelect) {
          console.log('Place selected:', place.formatted_address);
          onPlaceSelect(place);
          
          // Ensure input remains enabled after place selection
          if (inputRef.current) {
            inputRef.current.disabled = false;
          }
        }
      });
      
      console.log('Google Places Autocomplete initialized successfully');
    } catch (err) {
      console.error('Error initializing Google Places Autocomplete:', err);
      setError('Error initializing Google Places Autocomplete');
      setLoaded(false);
      
      // Allow retry on error
      initializationAttemptedRef.current = false;
      
      // Ensure input remains enabled even if initialization fails
      if (inputRef.current) {
        inputRef.current.disabled = false;
      }
    }
  };

  // Ensure input field is never left disabled
  useEffect(() => {
    const enableInputInterval = setInterval(() => {
      if (inputRef.current && inputRef.current.disabled) {
        console.log('Enabling disabled input field');
        inputRef.current.disabled = false;
      }
    }, 500);
    
    return () => {
      clearInterval(enableInputInterval);
    };
  }, [inputRef]);

  return { loaded, error };
};

export default useGooglePlacesAutocomplete;
