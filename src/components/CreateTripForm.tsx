
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getGoogleMapsApiKey } from '@/utils/apiKeys';
import useGooglePlacesAutocomplete from '@/hooks/useGooglePlacesAutocomplete';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CreateTripFormProps {
  onSuccess: () => void;
}

const CreateTripForm = ({ onSuccess }: CreateTripFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
  });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Google Places API setup
  const [apiKey, setApiKey] = useState<string>('');
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
    };
    
    getCurrentUser();
    
    // Fetch Google Maps API key
    const fetchApiKey = async () => {
      setApiLoading(true);
      setApiError(null);
      try {
        console.log('Fetching Google Maps API key for CreateTripForm');
        const key = await getGoogleMapsApiKey();
        console.log('API key fetched successfully');
        setApiKey(key);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to fetch Google Maps API key:', errorMessage);
        setApiError('Failed to load location services');
      } finally {
        setApiLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLocationSelect = (place: google.maps.places.PlaceResult) => {
    if (place.formatted_address) {
      setFormData({
        ...formData,
        location: place.formatted_address,
      });
    }
  };

  // Initialize Google Places Autocomplete
  const { loaded, error: placesError } = useGooglePlacesAutocomplete({
    apiKey,
    onPlaceSelect: handleLocationSelect,
    inputRef: locationInputRef,
  });

  // Handle retry
  const handleRetry = async () => {
    setApiLoading(true);
    setApiError(null);
    try {
      const key = await getGoogleMapsApiKey();
      setApiKey(key);
    } catch (error) {
      setApiError('Failed to load location services');
    } finally {
      setApiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a trip.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.from('trips').insert({
        title: formData.title,
        description: formData.description,
        location: formData.location,
        date: formData.date || null,
        user_id: user.id
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Trip created successfully",
      });
      
      onSuccess();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create trip.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Combine errors
  const locationError = apiError || placesError;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="title">Trip Title</Label>
        <Input 
          id="title" 
          name="title" 
          placeholder="Weekend in Paris" 
          value={formData.title}
          onChange={handleChange}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <div className="relative">
          <Input 
            id="location" 
            name="location" 
            placeholder="Enter a location" 
            value={formData.location}
            onChange={handleChange}
            ref={locationInputRef}
            className={locationError ? 'border-red-400' : ''}
          />
          {apiLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {loaded && !apiLoading && !locationError && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
          )}
        </div>
        
        {locationError && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-col text-sm gap-2">
              <span>{locationError}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs">You can still enter a location manually.</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRetry}
                  disabled={apiLoading}
                  className="ml-auto"
                >
                  {apiLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                  Retry
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {loaded && !locationError && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Location search ready
          </p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input 
          id="date" 
          name="date" 
          type="date" 
          value={formData.date}
          onChange={handleChange}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea 
          id="description" 
          name="description" 
          placeholder="Details about your trip" 
          value={formData.description}
          onChange={handleChange}
        />
      </div>
      
      <div className="pt-4">
        <Button className="w-full" type="submit" disabled={loading || !user}>
          {loading ? 
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> :
            'Create Trip'
          }
        </Button>
      </div>
    </form>
  );
};

export default CreateTripForm;
