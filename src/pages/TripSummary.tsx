
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardNavbar from '@/components/DashboardNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Rocket } from 'lucide-react';
import useTripSettings from '@/hooks/useTripSettings';

const TripSummary = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Get trip settings from the custom hook
  const {
    tripId,
    tripSettings
  } = useTripSettings();
  
  const goBack = () => {
    navigate('/trip-additional-preferences' + (tripId ? `?tripId=${tripId}` : ''));
  };
  
  const generateTrip = async () => {
    setLoading(true);
    
    try {
      // Generate the prompt
      const prompt = generatePrompt(tripSettings);
      
      // For now, we'll just show the prompt as a success message
      toast({
        title: "Trip Generation Ready",
        description: "Your trip details have been processed and are ready for generation.",
      });
      
      // Store the prompt in the trip description
      if (tripId) {
        const { error } = await supabase
          .from('trips')
          .update({
            description: JSON.stringify({
              ...tripSettings,
              generatedPrompt: prompt
            })
          })
          .eq('id', tripId);
          
        if (error) throw error;
      }
      
      // Navigate to dashboard for now
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate trip.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Function to generate a structured prompt for OpenAI
  const generatePrompt = (settings: any) => {
    const {
      startLocation,
      duration,
      returnToStart,
      pointSpecificationType,
      transportType,
      pointSpecification,
      distanceValue,
      stopTypes,
      maxStops,
      foodStops,
      foodPreferences,
      travelingWithKids,
      travelingWithPets,
      accessibilityNeeds,
      preferenceType,
      budgetLevel,
      weatherSensitive
    } = settings;
    
    // Build destination specification
    let destinationSpec = "";
    if (pointSpecificationType === 'specification' && pointSpecification) {
      destinationSpec = `The ${returnToStart ? 'furthest point' : 'end point'} of the journey should be ${pointSpecification}.`;
    } else if (pointSpecificationType === 'distance' && distanceValue) {
      destinationSpec = `The ${returnToStart ? 'furthest point' : 'end point'} should be approximately ${distanceValue} miles from the starting location.`;
    }
    
    // Format stop types
    const stopTypesStr = stopTypes && stopTypes.length > 0 
      ? `Include these types of stops: ${stopTypes.join(', ')}.` 
      : "";
    
    // Format food preferences
    const foodPreferencesStr = foodPreferences && foodPreferences.length > 0 
      ? `For food stops, prioritize: ${foodPreferences.join(', ')}.` 
      : "";
    
    // Format accessibility needs
    const accessibilityStr = accessibilityNeeds && accessibilityNeeds.length > 0 
      ? `Ensure all locations accommodate these accessibility needs: ${accessibilityNeeds.join(', ')}.` 
      : "";
    
    // Build the prompt
    return `
Create a detailed ${duration}-hour day trip itinerary starting from ${startLocation}${returnToStart ? ' and returning to the same location' : ''}.
${destinationSpec}

Transportation method: ${transportType}.
Plan for a maximum of ${maxStops} stops, including ${foodStops} food stops.
${stopTypesStr}
${foodPreferencesStr}

${travelingWithKids ? 'This trip is kid-friendly. Include appropriate activities and stops.' : ''}
${travelingWithPets ? 'This trip is pet-friendly. Ensure locations allow pets.' : ''}
${accessibilityStr}

Focus on ${preferenceType === 'hidden-gems' ? 'lesser-known, local favorite locations' : 
  preferenceType === 'top-rated' ? 'popular, highly-rated attractions' : 
  'a mix of popular attractions and hidden gems'}.

Budget level: ${budgetLevel} (${budgetLevel === 'low' ? 'prioritize free or low-cost activities' : 
  budgetLevel === 'high' ? 'can include premium experiences' : 'moderate spending'}).

${weatherSensitive ? 'This trip is weather-sensitive. Suggest indoor/outdoor alternatives based on weather.' : ''}

IMPORTANT GUIDELINES:
1. Ensure a direct, logical journey between the start and ${returnToStart ? 'furthest point' : 'end point'}, avoiding zigzagging.
2. Only use real, verifiable locations.
3. Schedule food stops at logical meal times.
4. Provide specific location names, not generic descriptions.
5. Include realistic travel times between stops based on the transportation method.
6. Account for opening hours of attractions.
7. Provide a well-paced itinerary that allows enough time at each stop.
    `;
  };
  
  // Helper function to format lists for display
  const formatList = (list: string[] | undefined) => {
    if (!list || list.length === 0) return 'None selected';
    return list.join(', ');
  };
  
  // Helper function for boolean values
  const formatBoolean = (value: boolean | undefined) => {
    return value ? 'Yes' : 'No';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardNavbar />
      
      <main className="flex-grow py-8 px-4 bg-gray-50">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Trip Summary</h1>
            
            <Card>
              <CardHeader>
                <CardTitle>Review Your Trip Details</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-8">
                {/* Basic Trip Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Starting Location</p>
                      <p className="font-medium">{tripSettings.startLocation || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Trip Duration</p>
                      <p className="font-medium">{tripSettings.duration} hours</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Return to Start</p>
                      <p className="font-medium">{formatBoolean(tripSettings.returnToStart)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Transportation</p>
                      <p className="font-medium capitalize">{tripSettings.transportType}</p>
                    </div>
                    
                    {/* Destination Information */}
                    {tripSettings.pointSpecificationType === 'specification' && (
                      <div>
                        <p className="text-sm text-gray-500">
                          {tripSettings.returnToStart ? 'Furthest Point' : 'End Point'}
                        </p>
                        <p className="font-medium">{tripSettings.pointSpecification || 'Not specified'}</p>
                      </div>
                    )}
                    
                    {tripSettings.pointSpecificationType === 'distance' && (
                      <div>
                        <p className="text-sm text-gray-500">Maximum Distance</p>
                        <p className="font-medium">{tripSettings.distanceValue} miles</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                {/* Stop Preferences */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Stops & Activities</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Maximum Stops</p>
                      <p className="font-medium">{tripSettings.maxStops}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Food Stops</p>
                      <p className="font-medium">{tripSettings.foodStops}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">Stop Types</p>
                      <p className="font-medium">{formatList(tripSettings.stopTypes)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">Food Preferences</p>
                      <p className="font-medium">{formatList(tripSettings.foodPreferences)}</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Additional Preferences */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Additional Preferences</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Traveling with Kids</p>
                      <p className="font-medium">{formatBoolean(tripSettings.travelingWithKids)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Traveling with Pets</p>
                      <p className="font-medium">{formatBoolean(tripSettings.travelingWithPets)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Weather Sensitive</p>
                      <p className="font-medium">{formatBoolean(tripSettings.weatherSensitive)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Budget Level</p>
                      <p className="font-medium capitalize">{tripSettings.budgetLevel}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Preference Type</p>
                      <p className="font-medium capitalize">{tripSettings.preferenceType}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">Accessibility Needs</p>
                      <p className="font-medium">{formatList(tripSettings.accessibilityNeeds)}</p>
                    </div>
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
                    Back to Preferences
                  </Button>
                  
                  <Button 
                    onClick={generateTrip}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    disabled={loading}
                  >
                    {loading ? 'Generating...' : 'Generate My Trip'} 
                    <Rocket size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TripSummary;
