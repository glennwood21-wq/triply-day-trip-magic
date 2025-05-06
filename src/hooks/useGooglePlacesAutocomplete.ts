
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
  
  // Clear any previous Google Maps scripts to avoid conflicts
  useEffect(() => {
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.remove();
    }
    
    // Also clean up Google Maps objects
    if (window.google && window.google.maps) {
      // @ts-ignore - cleaning up global Google Maps object
      window.google = undefined;
    }
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey) {
      setError('No API key provided');
      return;
    }
    
    setError(null);
    
    // Define the callback function that Google Maps will call
    window.initPlacesAutocomplete = () => {
      try {
        setLoaded(true);
        
        if (!inputRef.current) {
          console.warn('Input ref is not available for Google Places Autocomplete');
          return;
        }
        
        // Initialize Google Places Autocomplete
        const autocompleteOptions: google.maps.places.AutocompleteOptions = {
          fields: ['formatted_address', 'geometry', 'name'],
          types: ['geocode', 'establishment']
        };
        
        // Create the autocomplete instance
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          inputRef.current,
          autocompleteOptions
        );
        
        // Add place_changed event listener
        if (onPlaceSelect) {
          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current?.getPlace();
            if (place) {
              onPlaceSelect(place);
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
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initPlacesAutocomplete&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onerror = (e) => {
      console.error('Error loading Google Maps script:', e);
      setError('Failed to load location search service');
    };
    
    // Add the script to the document
    document.head.appendChild(script);
    
    // Cleanup function
    return () => {
      // Remove the callback from the window object
      // @ts-ignore - cleaning up global callback
      window.initPlacesAutocomplete = undefined;
      
      // Clean up autocomplete instance
      if (autocompleteRef.current) {
        // Remove event listeners
        window.google?.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
      
      // Remove the script tag
      const scriptToRemove = document.getElementById('google-maps-script');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    }
  }, [apiKey, inputRef, onPlaceSelect]);

  // Set up a global error handler for the Google Maps API
  useEffect(() => {
    // Add event listener for unhandled errors which might be from Google Maps
    const handleError = (event: ErrorEvent) => {
      // Check if this is a Google Maps API error
      if (event.message && 
          (event.message.includes('Google Maps') || 
           event.message.includes('google.maps') || 
           event.filename?.includes('maps.googleapis.com'))) {
        
        console.error('Google Maps API error caught:', event.message);
        
        // Prevent default behavior to avoid crashing the app
        event.preventDefault();
        
        if (event.message.includes('ApiNotActivatedMapError')) {
          setError('Google Maps API not activated. Please enable Places API in Google Cloud Console.');
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
