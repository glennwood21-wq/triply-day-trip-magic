
import React, { useRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, AlertCircle, Loader2 } from 'lucide-react';
import useGooglePlacesAutocomplete from '@/hooks/useGooglePlacesAutocomplete';
import { getGoogleMapsApiKey } from '@/utils/apiKeys';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StartLocationInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLocationSelect?: (location: string) => void;
}

const StartLocationInput = ({ value, onChange, onLocationSelect }: StartLocationInputProps) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const maxRetries = 3;

  useEffect(() => {
    const fetchApiKey = async () => {
      if (retryCount >= maxRetries) {
        console.log(`Max retries (${maxRetries}) reached. Stopping API key fetch attempts.`);
        return;
      }

      setLoading(true);
      try {
        console.log('Attempting to fetch Google Maps API key');
        const key = await getGoogleMapsApiKey();
        
        // Validate the key
        if (!key) {
          throw new Error('No API key received');
        }
        
        if (key.trim() === '') {
          throw new Error('Empty API key received');
        }
        
        console.log('API key fetched successfully');
        setApiKey(key);
        setApiKeyError(null);
        // Reset retry count on success
        setRetryCount(0);
        setIsInitialLoad(false);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to fetch Google Maps API key:', errorMessage);
        setApiKeyError('Failed to load location services. Please try again later.');
        setIsInitialLoad(false);
        
        // Only show toast on first error to avoid spamming
        if (retryCount === 0) {
          toast({
            title: 'Location Service Error',
            description: 'Failed to load location autocomplete. You can still enter a location manually.',
            variant: 'default',
          });
        }
        
        // Auto-retry with exponential backoff
        if (retryCount < maxRetries) {
          const timeout = setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000 * Math.pow(2, retryCount));
          
          return () => clearTimeout(timeout);
        }
      } finally {
        setLoading(false);
      }
    };

    // Only fetch API key if we don't have one or if we are retrying
    if (!apiKey || retryCount > 0) {
      fetchApiKey();
    }
  }, [toast, retryCount, maxRetries]);

  const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
    if (place.formatted_address && onLocationSelect) {
      onLocationSelect(place.formatted_address);
    }
  };

  // Only initialize the autocomplete when we have the API key
  const { error: autocompleteError, loaded } = useGooglePlacesAutocomplete({
    apiKey,
    onPlaceSelect: handlePlaceSelect,
    inputRef,
  });

  // Combine API key errors with autocomplete errors
  const error = apiKeyError || autocompleteError;

  // Show toast for autocomplete errors
  useEffect(() => {
    if (autocompleteError && !apiKeyError) {
      console.error('Google Places Autocomplete error:', autocompleteError);
      toast({
        title: 'Error',
        description: autocompleteError,
        variant: 'default',
      });
    }
  }, [autocompleteError, apiKeyError, toast]);

  // Ensure the input field is never disabled
  useEffect(() => {
    const enableInputInterval = setInterval(() => {
      if (inputRef.current && inputRef.current.disabled) {
        console.log('Force enabling input field');
        inputRef.current.disabled = false;
      }
    }, 300);
    
    return () => {
      clearInterval(enableInputInterval);
    };
  }, []);

  // Custom input onChange handler to ensure the input stays enabled
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e);
    // Make sure the input is not disabled after the change
    if (inputRef.current) {
      inputRef.current.disabled = false;
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="startLocation" className="flex items-center gap-2">
        <MapPin size={16} />
        Start Location
      </Label>
      <div className="relative">
        <Input
          id="startLocation"
          name="startLocation"
          placeholder={isInitialLoad ? "Loading location search..." : "Enter your starting point (city, landmark, address)"}
          value={value}
          onChange={handleInputChange}
          required
          className={`focus:border-primary focus:ring-primary ${error ? 'border-red-500' : ''}`}
          ref={inputRef}
          disabled={false} // Never disable the input
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          </div>
        )}
      </div>
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <p className="text-xs mt-1">You can still enter a location manually.</p>
          </AlertDescription>
        </Alert>
      )}
      {loaded && !error && (
        <p className="text-xs text-gray-500 mt-1">
          <span className="text-green-600">✓</span> Location search ready
        </p>
      )}
      <p className="text-xs text-gray-500">
        Provide a specific location for better trip planning results
      </p>
    </div>
  );
};

export default StartLocationInput;
