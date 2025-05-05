
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Check, ArrowLeft, ArrowRight } from 'lucide-react';

const TripPreferences = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Preferences state
  const [stopTypes, setStopTypes] = useState<string[]>([]);
  const [maxStops, setMaxStops] = useState<number>(5);
  const [foodStops, setFoodStops] = useState<number>(2);
  const [foodPreferences, setFoodPreferences] = useState<string[]>([]);
  
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
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    
    checkAuth();
    
    // Check if we have a trip ID from the previous page
    const params = new URLSearchParams(location.search);
    const id = params.get('tripId');
    if (id) {
      setTripId(id);
    }
  }, [location]);
  
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
    
    if (!tripId) {
      toast({
        title: "Error",
        description: "No trip ID found. Please start from the beginning.",
        variant: "destructive",
      });
      navigate('/trip-setup');
      return;
    }
    
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save your preferences.",
      });
      navigate('/auth');
      return;
    }
    
    setLoading(true);
    
    try {
      // Update the trip with preferences
      const { error } = await supabase
        .from('trips')
        .update({
          preferences: {
            stopTypes,
            maxStops,
            foodStops,
            foodPreferences
          }
        })
        .eq('id', tripId);
      
      if (error) throw error;
      
      toast({
        title: "Preferences saved",
        description: "Your trip preferences have been saved successfully.",
      });
      
      // Navigate to the trip settings or dashboard
      navigate('/trip-settings?tripId=' + tripId);
      
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
    navigate('/trip-setup');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow py-12">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-4">Trip Preferences</h1>
              <p className="text-lg text-gray-600">
                Tell us what you'd like to experience on your trip.
              </p>
            </div>
            
            <Card>
              <CardContent className="p-6 md:p-8">
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
                      Back
                    </Button>
                    
                    <Button 
                      type="submit" 
                      className="flex items-center gap-2"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Continue'} 
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TripPreferences;
