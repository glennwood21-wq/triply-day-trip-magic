
import React, { useRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';
import useGooglePlacesAutocomplete from '@/hooks/useGooglePlacesAutocomplete';
import { getGoogleMapsApiKey } from '@/utils/apiKeys';
import { useToast } from '@/hooks/use-toast';

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

  useEffect(() => {
    const fetchApiKey = async () => {
      setLoading(true);
      try {
        const key = await getGoogleMapsApiKey();
        setApiKey(key);
      } catch (error) {
        console.error('Failed to fetch Google Maps API key:', error);
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
  const { error } = useGooglePlacesAutocomplete({
    apiKey,
    onPlaceSelect: handlePlaceSelect,
    inputRef,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

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
      <p className="text-xs text-gray-500">
        Provide a specific location for better trip planning results
      </p>
    </div>
  );
};

export default StartLocationInput;
