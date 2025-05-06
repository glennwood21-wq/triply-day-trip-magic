
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardNavbar from '@/components/DashboardNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight } from 'lucide-react';

// Import our new components
import StartLocationInput from '@/components/trip-settings/StartLocationInput';
import DurationSlider from '@/components/trip-settings/DurationSlider';
import ReturnToStartToggle from '@/components/trip-settings/ReturnToStartToggle';
import TransportTypeSelector from '@/components/trip-settings/TransportTypeSelector';
import useTripSettings from '@/hooks/useTripSettings';

const TripSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    tripId,
    tripSettings,
    loading,
    setLoading,
    handleInputChange,
    handleSliderChange,
    handleSwitchChange,
    handleRadioChange,
    handlePointSpecificationChange,
    handleDistanceValueChange
  } = useTripSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to save your trip settings.",
        });
        navigate('/auth');
        return;
      }

      // Create a title based on the settings if we don't have a trip ID
      const title = `Trip from ${tripSettings.startLocation} (${tripSettings.duration}h)`;
      
      // Serialize the settings to JSON and store them in the description field
      const settingsJson = JSON.stringify(tripSettings);

      if (tripId) {
        // Update existing trip
        const { error } = await supabase
          .from('trips')
          .update({
            location: tripSettings.startLocation,
            description: settingsJson
          })
          .eq('id', tripId);
          
        if (error) throw error;
        
        // Navigate to preferences page
        navigate(`/trip-preferences-settings?tripId=${tripId}`);
      } else {
        // Save to the trips table as a new trip
        const { data, error } = await supabase.from('trips').insert({
          title,
          description: settingsJson,
          location: tripSettings.startLocation,
          user_id: session.user.id
        }).select();
        
        if (error) throw error;
        
        // Navigate to preferences page if we created a new trip
        if (data && data.length > 0) {
          navigate(`/trip-preferences-settings?tripId=${data[0].id}`);
        } else {
          throw new Error("Failed to create trip");
        }
      }
      
      toast({
        title: "Trip settings saved",
        description: "Your trip settings have been saved. Let's add some preferences!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save trip settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardNavbar />
      
      <main className="flex-grow py-8 px-4 bg-gray-50">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Trip Settings</h1>
            
            <Card>
              <CardHeader>
                <CardTitle>Configure Your Trip</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Start Location */}
                  <StartLocationInput 
                    value={tripSettings.startLocation}
                    onChange={handleInputChange}
                  />
                  
                  {/* Trip Duration */}
                  <DurationSlider 
                    value={tripSettings.duration}
                    onValueChange={handleSliderChange}
                  />
                  
                  {/* Return to Start */}
                  <ReturnToStartToggle 
                    returnToStart={tripSettings.returnToStart}
                    onReturnChange={handleSwitchChange}
                    pointSpecificationType={tripSettings.pointSpecificationType}
                    onPointTypeChange={(value) => handleRadioChange('pointSpecificationType', value)}
                    pointSpecification={tripSettings.pointSpecification}
                    onPointSpecificationChange={handlePointSpecificationChange}
                    distanceValue={tripSettings.distanceValue}
                    onDistanceValueChange={handleDistanceValueChange}
                  />
                  
                  {/* Transport Type */}
                  <TransportTypeSelector 
                    value={tripSettings.transportType}
                    onChange={(value) => handleRadioChange('transportType', value)}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full mt-6 flex items-center justify-center gap-2" 
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Continue to Preferences'}
                    <ArrowRight size={16} />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TripSettings;
