
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface TripSettings {
  startLocation: string;
  duration: number;
  returnToStart: boolean;
  pointSpecificationType: string;
  transportType: string;
  // Point specification fields
  pointSpecification?: string;
  distanceValue?: number;
  // Preference fields
  stopTypes?: string[];
  maxStops?: number;
  foodStops?: number;
  foodPreferences?: string[];
  // Additional preference fields
  travelingWithKids?: boolean;
  travelingWithPets?: boolean;
  accessibilityNeeds?: string[];
  preferenceType?: 'hidden-gems' | 'top-rated' | 'mix';
  budgetLevel?: 'low' | 'medium' | 'high';
  weatherSensitive?: boolean;
}

// This interface is for what we get back from the database
interface TripData {
  id: string;
  location: string | null;
  description: string | null;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  date: string | null;
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
    transportType: 'car',
    pointSpecification: '',
    distanceValue: 100,
    stopTypes: [],
    maxStops: 5,
    foodStops: 2,
    foodPreferences: [],
    travelingWithKids: false,
    travelingWithPets: false,
    accessibilityNeeds: [],
    preferenceType: 'mix',
    budgetLevel: 'medium',
    weatherSensitive: false
  });

  useEffect(() => {
    // Check if we have a trip ID from the previous page
    const params = new URLSearchParams(location.search);
    const id = params.get('tripId');
    if (id) {
      setTripId(id);
      
      // If we have a trip ID, fetch the trip data
      const fetchTripData = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('trips')
            .select('*')
            .eq('id', id)
            .single();
            
          if (data && !error) {
            // Pre-fill the location from the trip data if available
            const tripData = data as TripData;
            console.log("Trip data fetched:", tripData);
            
            // Log the location directly from the database for debugging
            console.log("Location from database:", tripData.location);
            
            // Try to parse settings from the description field if available
            let parsedSettings: Partial<TripSettings> = {};
            
            if (tripData.description) {
              try {
                // Try to parse JSON from description
                parsedSettings = JSON.parse(tripData.description);
                console.log("Parsed settings from description:", parsedSettings);
              } catch (e) {
                console.error("Could not parse settings from description:", e);
              }
            }
            
            // CRITICAL FIX: Ensure we use the location from the database first
            // This is what the user entered on the first page
            if (tripData.location) {
              console.log("Using location from database:", tripData.location);
            }
            
            // Update the trip settings with data from the database
            // Prioritize the location from the database as it's the original user input
            setTripSettings(prev => {
              const newSettings = {
                ...prev,
                ...parsedSettings,
              };
              
              // Explicitly prioritize location from the database (first user input)
              if (tripData.location) {
                newSettings.startLocation = tripData.location;
              }
              
              return newSettings;
            });
          }
        } catch (error) {
          console.error("Error fetching trip data:", error);
        } finally {
          setLoading(false);
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

  const handlePointSpecificationChange = (value: string) => {
    setTripSettings({
      ...tripSettings,
      pointSpecification: value
    });
  };

  const handleDistanceValueChange = (value: number) => {
    setTripSettings({
      ...tripSettings,
      distanceValue: value
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
    handlePointSpecificationChange,
    handleDistanceValueChange,
    setTripSettings
  };
};

export default useTripSettings;
