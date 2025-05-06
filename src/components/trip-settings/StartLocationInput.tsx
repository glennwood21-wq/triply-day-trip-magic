
import React, { useRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, AlertCircle } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiKey = async () => {
      setLoading(true);
      try {
        const key = await getGoogleMapsApiKey();
        console.log('API key fetched successfully (redacted for security)');
        setApiKey(key);
        setApiKeyError(null);
      } catch (error) {
        console.error('Failed to fetch Google Maps API key:', error);
        setApiKeyError('Failed to load location services. Please try again later.');
        toast({
          title: 'Error',
          description: 'Failed to load location autocomplete. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchApiKey();
  }, [toast]);

  const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
    if (place.formatted_address && onLocationSelect) {
      onLocationSelect(place.formatted_address);
    }
  };

  // Only initialize the autocomplete when we have the API key
  const { error: autocompleteError } = useGooglePlacesAutocomplete({
    apiKey,
    onPlaceSelect: handlePlaceSelect,
    inputRef,
  });

  // Combine API key errors with autocomplete errors
  const error = apiKeyError || autocompleteError;

  useEffect(() => {
    if (autocompleteError) {
      console.error('Google Places Autocomplete error:', autocompleteError);
      toast({
        title: 'Error',
        description: autocompleteError,
        variant: 'destructive',
      });
    }
  }, [autocompleteError, toast]);

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
          required
          className="focus:border-primary focus:ring-primary"
          ref={inputRef}
          disabled={loading}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <p className="text-xs text-gray-500">
        Provide a specific location for better trip planning results
      </p>
    </div>
  );
};

export default StartLocationInput;
