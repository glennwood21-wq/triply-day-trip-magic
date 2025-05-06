
import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, AlertCircle, Loader2, CheckCircle2, X } from 'lucide-react';
import usePlacesAutocomplete from '@/hooks/usePlacesAutocomplete';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/useDebounce';

interface StartLocationInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLocationSelect?: (location: string) => void;
}

const StartLocationInput = ({ value, onChange, onLocationSelect }: StartLocationInputProps) => {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const debouncedInputValue = useDebounce(inputValue, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Setup Places autocomplete
  const { suggestions, loading, error, search, clearSuggestions } = usePlacesAutocomplete({
    onPlaceSelect: (place) => {
      if (place.formattedAddress && onLocationSelect) {
        onLocationSelect(place.formattedAddress);
        
        // Also update via the onChange handler to ensure the input value is updated
        const syntheticEvent = {
          target: {
            name: "startLocation",
            value: place.formattedAddress
          }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        
        onChange(syntheticEvent);
        setInputValue(place.formattedAddress);
        clearSuggestions();
      }
    }
  });

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(e);
  };

  // Handle place selection
  const handleSelectPlace = (place: any) => {
    if (onLocationSelect) {
      onLocationSelect(place.formattedAddress);
    }
    
    const syntheticEvent = {
      target: {
        name: "startLocation",
        value: place.formattedAddress
      }
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    
    onChange(syntheticEvent);
    setInputValue(place.formattedAddress);
    clearSuggestions();
    setIsFocused(false);
  };

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) && 
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Search for places when the input changes
  useEffect(() => {
    if (debouncedInputValue) {
      search(debouncedInputValue);
    } else {
      clearSuggestions();
    }
  }, [debouncedInputValue, search, clearSuggestions]);

  // Show error toast when API error occurs
  useEffect(() => {
    if (error) {
      toast({
        title: 'Location Service Issue',
        description: 'Search suggestions may be limited. You can still enter a location manually.',
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
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          ref={inputRef}
          className={`focus:border-primary focus:ring-primary ${error ? 'border-red-400' : ''}`}
          aria-invalid={!!error}
        />
        
        {inputValue && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              clearSuggestions();
              const syntheticEvent = {
                target: {
                  name: "startLocation",
                  value: ""
                }
              } as unknown as React.ChangeEvent<HTMLInputElement>;
              onChange(syntheticEvent);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear input"
          >
            <X size={16} />
          </button>
        )}
        
        {loading && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        
        {/* Suggestions dropdown */}
        {isFocused && suggestions.length > 0 && (
          <div 
            ref={suggestionsRef}
            className="absolute z-10 w-full bg-white shadow-lg border rounded-md mt-1 max-h-60 overflow-auto"
          >
            {suggestions.map((place) => (
              <div
                key={place.id}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelectPlace(place)}
              >
                <div className="font-medium">{place.displayName.text}</div>
                <div className="text-sm text-gray-500">{place.formattedAddress}</div>
              </div>
            ))}
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
                onClick={() => search(inputValue)}
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
      
      <p className="text-xs text-muted-foreground">
        Provide a specific location for better trip planning results
      </p>
    </div>
  );
};

export default StartLocationInput;
