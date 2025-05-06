
import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, AlertCircle, Loader2, CheckCircle2, X, Search } from 'lucide-react';
import usePlacesAutocomplete from '@/hooks/usePlacesAutocomplete';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface StartLocationInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLocationSelect?: (location: string) => void;
  label?: string;
}

const StartLocationInput = ({ 
  value, 
  onChange, 
  onLocationSelect,
  label = "Start Location" 
}: StartLocationInputProps) => {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Setup Places autocomplete with improved configuration
  const { 
    suggestions, 
    loading, 
    error, 
    search, 
    clearSuggestions,
    searchImmediately
  } = usePlacesAutocomplete({
    debounceMs: 400, // Increased debounce time for better performance
    minChars: 3      // Only search when user has typed at least 3 characters
  });

  // Update inputValue when value prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(e);
    
    if (newValue.trim()) {
      search(newValue);
      setDropdownOpen(true);
    } else {
      clearSuggestions();
      setDropdownOpen(false);
    }
  };

  // Handle place selection
  const handleSelectPlace = (place: any) => {
    if (onLocationSelect) {
      onLocationSelect(place.formattedAddress);
    }
    
    const syntheticEvent = {
      target: {
        name: inputRef.current?.name || "location",
        value: place.formattedAddress
      }
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    
    onChange(syntheticEvent);
    setInputValue(place.formattedAddress);
    clearSuggestions();
    setDropdownOpen(false);
    setIsFocused(false);
    
    toast({
      description: `Selected ${place.displayName.text}`,
    });
  };

  // Handle manually searching when user clicks search button
  const handleManualSearch = () => {
    if (inputValue.trim().length >= 3) {
      searchImmediately(inputValue);
      setDropdownOpen(true);
    }
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
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor={inputRef.current?.id || "location"} className="flex items-center gap-2">
        <MapPin size={16} />
        {label}
      </Label>
      <div className="relative">
        <div className="relative flex items-center">
          <Input
            id={inputRef.current?.id || "location"}
            name={inputRef.current?.name || "location"}
            placeholder="Enter location (city, landmark, address)"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleManualSearch();
                e.preventDefault();
              }
            }}
            ref={inputRef}
            className={`pr-16 focus:border-primary focus:ring-primary ${error ? 'border-red-400' : ''}`}
            aria-invalid={!!error}
          />
          
          <div className="absolute right-2 flex items-center space-x-1">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              inputValue && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setInputValue('');
                    clearSuggestions();
                    setDropdownOpen(false);
                    const syntheticEvent = {
                      target: {
                        name: inputRef.current?.name || "location",
                        value: ""
                      }
                    } as unknown as React.ChangeEvent<HTMLInputElement>;
                    onChange(syntheticEvent);
                  }}
                  className="h-6 w-6 text-gray-400 hover:text-gray-600"
                  aria-label="Clear input"
                >
                  <X size={16} />
                </Button>
              )
            )}
            
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleManualSearch}
              disabled={loading || inputValue.trim().length < 3}
              className="h-6 w-6 text-gray-600"
              aria-label="Search"
            >
              <Search size={16} />
            </Button>
          </div>
        </div>
        
        {/* Suggestions dropdown with improved display - removed third line showing location types */}
        {dropdownOpen && suggestions.length > 0 && (
          <div 
            ref={suggestionsRef}
            className="absolute z-10 w-full bg-white shadow-lg border rounded-md mt-1 max-h-60 overflow-auto"
          >
            {suggestions.map((place) => (
              <div
                key={place.id}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => handleSelectPlace(place)}
              >
                <div className="font-medium">{place.displayName.text}</div>
                <div className="text-sm text-gray-500">{place.formattedAddress}</div>
              </div>
            ))}
          </div>
        )}
        
        {dropdownOpen && !loading && suggestions.length === 0 && inputValue.trim().length >= 3 && (
          <div 
            ref={suggestionsRef}
            className="absolute z-10 w-full bg-white shadow-lg border rounded-md mt-1 p-3 text-center"
          >
            <p className="text-gray-500">No locations found</p>
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
                onClick={() => searchImmediately(inputValue)}
                disabled={loading || inputValue.trim().length < 3}
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
