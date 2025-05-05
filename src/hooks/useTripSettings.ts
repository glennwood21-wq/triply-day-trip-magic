
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface TripSettings {
  startLocation: string;
  duration: number;
  returnToStart: boolean;
  pointSpecificationType: string;
  transportType: string;
}

const useTripSettings = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [tripId, setTripId] = useState<string | null>(null);
  const [tripSettings, setTripSettings] = useState<TripSettings>({
    startLocation: '',
    duration: 4,
    returnToStart: true,
    pointSpecificationType: 'distance',
    transportType: 'car'
  });

  useEffect(() => {
    // Check if we have a trip ID from the previous page
    const params = new URLSearchParams(location.search);
    const id = params.get('tripId');
    if (id) {
      setTripId(id);
      
      // If we have a trip ID, fetch the trip data
      const fetchTripData = async () => {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .eq('id', id)
          .single();
          
        if (data && !error) {
          // Pre-fill the location from the trip data if available
          setTripSettings(prev => ({
            ...prev,
            startLocation: data.location || '',
            // If settings exist in the data, use them
            ...(data.settings && {
              duration: data.settings.duration || prev.duration,
              returnToStart: data.settings.returnToStart !== undefined ? data.settings.returnToStart : prev.returnToStart,
              pointSpecificationType: data.settings.pointSpecificationType || prev.pointSpecificationType,
              transportType: data.settings.transportType || prev.transportType
            })
          }));
        }
      };
      
      fetchTripData();
    }
  }, [location]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTripSettings({
      ...tripSettings,
      [name]: value
    });
  };

  const handleSliderChange = (value: number[]) => {
    setTripSettings({
      ...tripSettings,
      duration: value[0]
    });
  };

  const handleSwitchChange = (checked: boolean) => {
    setTripSettings({
      ...tripSettings,
      returnToStart: checked
    });
  };

  const handleRadioChange = (name: string, value: string) => {
    setTripSettings({
      ...tripSettings,
      [name]: value
    });
  };

  return {
    tripId,
    tripSettings,
    loading,
    setLoading,
    handleInputChange,
    handleSliderChange,
    handleSwitchChange,
    handleRadioChange,
    setTripSettings
  };
};

export default useTripSettings;
