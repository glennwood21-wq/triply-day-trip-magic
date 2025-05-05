
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardNavbar from '@/components/DashboardNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import useTripSettings from '@/hooks/useTripSettings';

const TripPreferencesSettings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Get trip settings from the custom hook
  const {
    tripId,
    tripSettings,
    setTripSettings
  } = useTripSettings();
  
  // Preferences state
  const [stopTypes, setStopTypes] = useState<string[]>(tripSettings.stopTypes || []);
  const [maxStops, setMaxStops] = useState<number>(tripSettings.maxStops || 5);
  const [foodStops, setFoodStops] = useState<number>(tripSettings.foodStops || 2);
  const [foodPreferences, setFoodPreferences] = useState<string[]>(tripSettings.foodPreferences || []);
  
  // Available options
  const stopTypeOptions = [
    { id: 'scenic', label: 'Scenic Views' },
    { id: 'food', label: 'Food & Drinks' },
    { id: 'kids', label: 'Kid-Friendly' },
    { id: 'beaches', label: 'Beaches' },
    { id: 'art', label: 'Art & Culture' },
    { id: 'wineries', label: 'Wineries' },
    { id: 'shopping', label: 'Shopping' },
    { id: 'hiking', label: 'Hiking' },
    { id: 'historical', label: 'Historical Sites' }
  ];
  
  const foodPreferenceOptions = [
    { id: 'vegan', label: 'Vegan' },
    { id: 'vegetarian', label: 'Vegetarian' },
    { id: 'gluten-free', label: 'Gluten-Free' },
    { id: 'local', label: 'Local Cuisine' },
    { id: 'bakery', label: 'Bakery' },
    { id: 'cafe', label: 'Café' },
    { id: 'restaurant', label: 'Restaurant' },
    { id: 'pub', label: 'Pub/Bar' },
    { id: 'fastfood', label: 'Fast Food' }
  ];
  
  const handleStopTypeChange = (checked: boolean, id: string) => {
    if (checked) {
      setStopTypes(prev => [...prev, id]);
    } else {
      setStopTypes(prev => prev.filter(type => type !== id));
    }
  };
  
  const handleFoodPreferenceChange = (checked: boolean, id: string) => {
    if (checked) {
      setFoodPreferences(prev => [...prev, id]);
    } else {
      setFoodPreferences(prev => prev.filter(pref => pref !== id));
    }
  };
  
  const handleMaxStopsChange = (value: number[]) => {
    setMaxStops(value[0]);
    // Ensure food stops is not greater than max stops
    if (foodStops > value[0]) {
      setFoodStops(value[0]);
    }
  };
  
  const handleFoodStopsChange = (value: number[]) => {
    // Ensure food stops is not greater than max stops
    if (value[0] <= maxStops) {
      setFoodStops(value[0]);
    } else {
      setFoodStops(maxStops);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to save your preferences.",
        });
        navigate('/auth');
        return;
      }
      
      // Update the tripSettings object with the preferences
      const updatedSettings = {
        ...tripSettings,
        stopTypes,
        maxStops,
        foodStops,
        foodPreferences
      };
      
      // Update the trip settings state
      setTripSettings(updatedSettings);
      
      // Serialize settings to JSON
      const settingsJson = JSON.stringify(updatedSettings);
      
      if (tripId) {
        // Update existing trip
        const { error } = await supabase
          .from('trips')
          .update({
            description: settingsJson
          })
          .eq('id', tripId);
          
        if (error) throw error;
      } else {
        // No trip ID yet, so we first need to complete the basic settings
        toast({
          title: "Complete basic settings first",
          description: "Please complete the basic settings before saving preferences.",
        });
        navigate('/trip-settings');
        return;
      }
      
      toast({
        title: "Preferences saved",
        description: "Your trip preferences have been saved successfully.",
      });
      
      // Navigate to dashboard
      navigate('/dashboard');
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save preferences.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const goBack = () => {
    navigate('/trip-settings' + (tripId ? `?tripId=${tripId}` : ''));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardNavbar />
      
      <main className="flex-grow py-8 px-4 bg-gray-50">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Trip Preferences</h1>
            
            <Card>
              <CardHeader>
                <CardTitle>What would you like to experience?</CardTitle>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Types of Stops */}
                  <div className="space-y-4">
                    <Label className="text-lg font-medium">What types of stops would you like to make?</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {stopTypeOptions.map(option => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`stop-${option.id}`} 
                            checked={stopTypes.includes(option.id)}
                            onCheckedChange={(checked) => handleStopTypeChange(checked as boolean, option.id)}
                          />
                          <Label htmlFor={`stop-${option.id}`} className="cursor-pointer">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Max Number of Stops */}
                  <div className="space-y-4">
                    <Label className="text-lg font-medium">
                      Maximum number of stops: {maxStops}
                    </Label>
                    <Slider
                      value={[maxStops]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={handleMaxStopsChange}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>1</span>
                      <span>5</span>
                      <span>10</span>
                    </div>
                  </div>
                  
                  {/* Food Stops */}
                  <div className="space-y-4">
                    <Label className="text-lg font-medium">
                      Number of food stops: {foodStops}
                    </Label>
                    <Slider
                      value={[foodStops]}
                      min={0}
                      max={maxStops}
                      step={1}
                      onValueChange={handleFoodStopsChange}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0</span>
                      <span>{Math.floor(maxStops / 2)}</span>
                      <span>{maxStops}</span>
                    </div>
                  </div>
                  
                  {/* Food Preferences */}
                  <div className="space-y-4">
                    <Label className="text-lg font-medium">Food preferences</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {foodPreferenceOptions.map(option => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`food-${option.id}`}
                            checked={foodPreferences.includes(option.id)}
                            onCheckedChange={(checked) => handleFoodPreferenceChange(checked as boolean, option.id)}
                          />
                          <Label htmlFor={`food-${option.id}`} className="cursor-pointer">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-4">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={goBack}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft size={16} />
                      Back to Settings
                    </Button>
                    
                    <Button 
                      type="submit" 
                      className="flex items-center gap-2"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Preferences'} 
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TripPreferencesSettings;
