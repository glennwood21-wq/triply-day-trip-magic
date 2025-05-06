
import { useState, useEffect, useRef } from 'react';

interface UseGooglePlacesAutocompleteProps {
  apiKey: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void;
}

const useGooglePlacesAutocomplete = ({
  apiKey,
  inputRef,
  onPlaceSelect,
}: UseGooglePlacesAutocompleteProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const scriptId = 'google-maps-script';
  
  // Clean up function to remove Google Maps objects and event listeners
  const cleanUp = () => {
    // Clean up autocomplete instance
    if (autocompleteRef.current) {
      // Remove event listeners if Google Maps is available
      if (window.google?.maps) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      autocompleteRef.current = null;
    }
    
    // Remove the script tag
    const scriptToRemove = document.getElementById(scriptId);
    if (scriptToRemove) {
      scriptToRemove.remove();
    }
    
    // Remove the callback from the window object
    if (window.initPlacesAutocomplete) {
      // @ts-ignore - cleaning up global callback
      window.initPlacesAutocomplete = undefined;
    }
  };

  // Effect to reset the API when the key changes
  useEffect(() => {
    // Clean up any previous instances
    cleanUp();
    
    if (!apiKey) {
      setError('No API key provided');
      return;
    }
    
    setError(null);
    
    // Define the callback function that Google Maps will call
    window.initPlacesAutocomplete = () => {
      try {
        console.log('Google Maps Places API initialized successfully');
        setLoaded(true);
        
        if (!inputRef.current) {
          console.warn('Input ref is not available for Google Places Autocomplete');
          return;
        }
        
        // Initialize Google Places Autocomplete with proper options
        const autocompleteOptions: google.maps.places.AutocompleteOptions = {
          fields: ['formatted_address', 'geometry', 'name', 'place_id'],
          types: ['geocode', 'establishment']
        };
        
        // Create the autocomplete instance
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          inputRef.current,
          autocompleteOptions
        );
        
        // Add place_changed event listener
        if (onPlaceSelect && autocompleteRef.current) {
          autocompleteRef.current.addListener('place_changed', () => {
            if (autocompleteRef.current) {
              const place = autocompleteRef.current.getPlace();
              if (place) {
                console.log('Place selected:', place.formatted_address);
                onPlaceSelect(place);
              }
            }
          });
        }
      } catch (err) {
        console.error('Error initializing Google Places Autocomplete:', err);
        setError('Failed to initialize location search');
      }
    };
    
    // Create script element with async loading for better performance
    const script = document.createElement('script');
    script.id = scriptId;
    // Use a specific version of the API and add required libraries explicitly
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initPlacesAutocomplete&v=quarterly`;
    script.async = true;
    script.defer = true;
    
    // Add error handling for script loading
    script.onerror = (e) => {
      console.error('Error loading Google Maps script:', e);
      setError('Failed to load location search service');
    };
    
    // Add the script to the document
    document.head.appendChild(script);
    
    // Return cleanup function
    return cleanUp;
  }, [apiKey, inputRef, onPlaceSelect]);

  // Set up a global error handler for the Google Maps API
  useEffect(() => {
    // Add event listener for unhandled errors which might be from Google Maps
    const handleError = (event: ErrorEvent) => {
      // Check if this is a Google Maps API error
      if (event.message && 
          (event.message.includes('Google Maps') || 
           event.message.includes('google.maps') || 
           event.message.includes('maps.googleapis.com'))) {
        
        console.error('Google Maps API error caught:', event.message);
        
        // Prevent default behavior to avoid crashing the app
        event.preventDefault();
        
        if (event.message.includes('ApiNotActivatedMapError')) {
          setError('You need to enable Places API in Google Cloud Console.');
        } else if (event.message.includes('InvalidKeyMapError')) {
          setError('Invalid Google Maps API key. Please check your key.');
        } else if (event.message.includes('RefererNotAllowedMapError')) {
          setError('The current URL is not allowed to use the Google Maps JavaScript API.');
        } else {
          setError(`Maps API error: ${event.message}`);
        }
      }
    };

    window.addEventListener('error', handleError);
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  return { loaded, error };
};

export default useGooglePlacesAutocomplete;
