import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardNavbar from '@/components/DashboardNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import useTripSettings from '@/hooks/useTripSettings';

const TripAdditionalPreferences = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Get trip settings from the custom hook
  const {
    tripId,
    tripSettings,
    setTripSettings
  } = useTripSettings();
  
  // Component state for form values
  const [withKids, setWithKids] = useState<boolean>(tripSettings.travelingWithKids || false);
  const [withPets, setWithPets] = useState<boolean>(tripSettings.travelingWithPets || false);
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<string[]>(tripSettings.accessibilityNeeds || []);
  const [preferenceType, setPreferenceType] = useState<'hidden-gems' | 'top-rated' | 'mix'>(
    (tripSettings.preferenceType as 'hidden-gems' | 'top-rated' | 'mix') || 'mix'
  );
  const [budgetLevel, setBudgetLevel] = useState<'low' | 'medium' | 'high'>(
    (tripSettings.budgetLevel as 'low' | 'medium' | 'high') || 'medium'
  );
  const [weatherSensitive, setWeatherSensitive] = useState<boolean>(tripSettings.weatherSensitive || false);
  
  // Accessibility needs options
  const accessibilityOptions = [
    { id: 'wheelchair', label: 'Wheelchair Access' },
    { id: 'step-free', label: 'Step-Free Access' },
    { id: 'hearing', label: 'Hearing Accessible' },
    { id: 'vision', label: 'Vision Accessible' },
    { id: 'sensory', label: 'Sensory-Friendly' },
    { id: 'quiet', label: 'Quiet Spaces Needed' }
  ];
  
  const handleAccessibilityChange = (checked: boolean, id: string) => {
    if (checked) {
      setAccessibilityNeeds(prev => [...prev, id]);
    } else {
      setAccessibilityNeeds(prev => prev.filter(need => need !== id));
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
        travelingWithKids: withKids,
        travelingWithPets: withPets,
        accessibilityNeeds,
        preferenceType,
        budgetLevel,
        weatherSensitive
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
        
        toast({
          title: "Additional preferences saved",
          description: "Your trip's additional preferences have been saved successfully.",
        });
        
        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        toast({
          title: "Complete previous settings first",
          description: "Please complete the previous settings before saving these preferences.",
        });
        navigate('/trip-settings');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save additional preferences.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const goBack = () => {
    navigate('/trip-preferences-settings' + (tripId ? `?tripId=${tripId}` : ''));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardNavbar />
      
      <main className="flex-grow py-8 px-4 bg-gray-50">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Additional Trip Preferences</h1>
            
            <Card>
              <CardHeader>
                <CardTitle>Customize your experience</CardTitle>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Traveling with kids/pets */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="with-kids" className="text-lg font-medium">Traveling with kids?</Label>
                      <Switch 
                        id="with-kids" 
                        checked={withKids}
                        onCheckedChange={setWithKids}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="with-pets" className="text-lg font-medium">Traveling with pets?</Label>
                      <Switch 
                        id="with-pets" 
                        checked={withPets}
                        onCheckedChange={setWithPets}
                      />
                    </div>
                  </div>
                  
                  {/* Accessibility needs */}
                  <div className="space-y-4">
                    <Label className="text-lg font-medium">Any mobility or accessibility needs?</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {accessibilityOptions.map(option => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`accessibility-${option.id}`}
                            checked={accessibilityNeeds.includes(option.id)}
                            onCheckedChange={(checked) => handleAccessibilityChange(checked as boolean, option.id)}
                          />
                          <Label htmlFor={`accessibility-${option.id}`} className="cursor-pointer">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Hidden gems vs. top-rated */}
                  <div className="space-y-4">
                    <Label className="text-lg font-medium">Want hidden gems or top-rated spots?</Label>
                    <RadioGroup 
                      value={preferenceType} 
                      onValueChange={(value: 'hidden-gems' | 'top-rated' | 'mix') => setPreferenceType(value)}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="hidden-gems" id="hidden-gems" />
                        <Label htmlFor="hidden-gems">Hidden gems (less-known local favorites)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="top-rated" id="top-rated" />
                        <Label htmlFor="top-rated">Top-rated spots (popular attractions)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="mix" id="mix" />
                        <Label htmlFor="mix">A mix of both</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {/* Budget level */}
                  <div className="space-y-4">
                    <Label className="text-lg font-medium">Budget level</Label>
                    <RadioGroup 
                      value={budgetLevel} 
                      onValueChange={(value: 'low' | 'medium' | 'high') => setBudgetLevel(value)}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="low" id="budget-low" />
                        <Label htmlFor="budget-low">Budget-friendly (low cost)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="medium" id="budget-medium" />
                        <Label htmlFor="budget-medium">Moderate spending (medium cost)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="high" id="budget-high" />
                        <Label htmlFor="budget-high">Luxury experience (high cost)</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {/* Weather sensitivity */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="weather-sensitive" className="text-lg font-medium">Weather-sensitive trip?</Label>
                    <Switch 
                      id="weather-sensitive" 
                      checked={weatherSensitive}
                      onCheckedChange={setWeatherSensitive}
                    />
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
                      Back to Preferences
                    </Button>
                    
                    <Button 
                      type="submit" 
                      className="flex items-center gap-2"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Complete Setup'} 
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

export default TripAdditionalPreferences;
