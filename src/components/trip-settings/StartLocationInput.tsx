
import React, { useRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import useGooglePlacesAutocomplete from '@/hooks/useGooglePlacesAutocomplete';
import { getGoogleMapsApiKey } from '@/utils/apiKeys';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

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
  
  // Fetch the Google Maps API key
  const fetchApiKey = async () => {
    setLoading(true);
    setApiKeyError(null);
    
    try {
      console.log('Fetching Google Maps API key for StartLocationInput');
      const key = await getGoogleMapsApiKey();
      console.log('API key fetched successfully');
      setApiKey(key);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to fetch Google Maps API key:', errorMessage);
      setApiKeyError('Failed to load location services');
      
      toast({
        title: 'Location Service Issue',
        description: 'Search suggestions are not available. You can still enter a location manually.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch API key on component mount
  useEffect(() => {
    fetchApiKey();
  }, []);

  // Handle location selection
  const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
    if (place.formatted_address && onLocationSelect) {
      onLocationSelect(place.formatted_address);
      
      // Also update via the onChange handler to ensure the input value is updated
      if (inputRef.current) {
        const syntheticEvent = {
          target: {
            name: "startLocation",
            value: place.formatted_address
          }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        
        onChange(syntheticEvent);
      }
    }
  };

  // Initialize Google Places Autocomplete
  const { error: autocompleteError, loaded } = useGooglePlacesAutocomplete({
    apiKey,
    onPlaceSelect: handlePlaceSelect,
    inputRef,
  });

  // Combine errors
  const error = apiKeyError || autocompleteError;

  // Handle retry
  const handleRetry = () => {
    fetchApiKey();
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
          placeholder="Enter your starting point (city, landmark, address)"
          value={value}
          onChange={onChange}
          ref={inputRef}
          className={`focus:border-primary focus:ring-primary ${error ? 'border-red-400' : ''}`}
          required
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {loaded && !loading && !error && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
        )}
      </div>
      
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col text-sm gap-2">
            <span>{error}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs">You can still enter a location manually.</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry}
                disabled={loading}
                className="ml-auto"
              >
                {loading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {loaded && !error && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Location search ready
        </p>
      )}
      
      <p className="text-xs text-muted-foreground">
        Provide a specific location for better trip planning results
      </p>
    </div>
  );
};

export default StartLocationInput;
