
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import useGooglePlacesAutocomplete from '@/hooks/useGooglePlacesAutocomplete';
import { getGoogleMapsApiKey } from '@/utils/apiKeys';
import { Loader2, AlertCircle } from 'lucide-react';
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
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [apiKey, setApiKey] = useState<string>('');
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
      try {
        const key = await getGoogleMapsApiKey();
        if (!key || key.trim() === '') {
          throw new Error('Empty API key received');
        }
        setApiKey(key);
        setApiError(null);
      } catch (error) {
        console.error('Failed to fetch Google Maps API key:', error);
        setApiError('Location autocomplete is not available. You can still enter location manually.');
        toast({
          title: 'Warning',
          description: 'Location autocomplete is not available. You can still enter location manually.',
          variant: 'default',
        });
      } finally {
        setApiLoading(false);
      }
    };

    fetchApiKey();
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    
    // Ensure input stays enabled
    if (e.target.name === 'location' && locationInputRef.current) {
      locationInputRef.current.disabled = false;
    }
  };

  const handleLocationSelect = (place: google.maps.places.PlaceResult) => {
    if (place.formatted_address) {
      setFormData({
        ...formData,
        location: place.formatted_address,
      });
    }
  };

  // Initialize Google Places Autocomplete when API key is available
  const { error: autocompleteError, loaded } = useGooglePlacesAutocomplete({
    apiKey,
    onPlaceSelect: handleLocationSelect,
    inputRef: locationInputRef,
  });

  // Combined error state
  const error = apiError || autocompleteError;

  // Make sure input stays enabled
  useEffect(() => {
    if (locationInputRef.current && apiKey && !error && !apiLoading) {
      locationInputRef.current.disabled = false;
    }
  }, [apiKey, error, apiLoading]);

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
            placeholder={apiLoading ? "Loading location search..." : "Paris, France"} 
            value={formData.location}
            onChange={handleChange}
            ref={locationInputRef}
          />
          {apiLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            </div>
          )}
        </div>
        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loaded && !error && (
          <p className="text-xs text-gray-500 mt-1">
            <span className="text-green-600">✓</span> Location search ready
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
          {loading ? 'Creating...' : 'Create Trip'}
        </Button>
      </div>
    </form>
  );
};

export default CreateTripForm;
