
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardNavbar from '@/components/DashboardNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Clock, Car, Bus, Bike, Walking } from 'lucide-react';

const TripSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tripSettings, setTripSettings] = useState({
    startLocation: '',
    duration: 4, // Default 4 hours
    returnToStart: true,
    pointSpecificationType: 'distance', // 'specification' or 'distance'
    transportType: 'car' // 'car', 'public', 'bike', 'walking'
  });

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

      // Create a title based on the settings
      const title = `Trip from ${tripSettings.startLocation} (${tripSettings.duration}h)`;
      const description = `Transport: ${tripSettings.transportType}. ${
        tripSettings.returnToStart 
          ? `Return trip with ${tripSettings.pointSpecificationType} furthest point.` 
          : `One-way trip with ${tripSettings.pointSpecificationType} end point.`
      }`;

      // Save to the trips table
      const { error } = await supabase.from('trips').insert({
        title,
        description,
        location: tripSettings.startLocation,
        user_id: session.user.id
      });
      
      if (error) throw error;
      
      toast({
        title: "Trip settings saved",
        description: "Your trip settings have been saved successfully.",
      });
      
      navigate('/dashboard');
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

  const renderTransportIcon = (type: string) => {
    switch (type) {
      case 'car':
        return <Car size={18} />;
      case 'public':
        return <Bus size={18} />;
      case 'bike':
        return <Bike size={18} />;
      case 'walking':
        return <Walking size={18} />;
      default:
        return null;
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
                  <div className="space-y-2">
                    <Label htmlFor="startLocation" className="flex items-center gap-2">
                      <MapPin size={16} />
                      Start Location
                    </Label>
                    <Input
                      id="startLocation"
                      name="startLocation"
                      placeholder="Enter your starting point"
                      value={tripSettings.startLocation}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  {/* Trip Duration */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Clock size={16} />
                      Trip Duration: {tripSettings.duration} hours
                    </Label>
                    <Slider
                      value={[tripSettings.duration]}
                      min={1}
                      max={12}
                      step={1}
                      onValueChange={handleSliderChange}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>1h</span>
                      <span>6h</span>
                      <span>12h</span>
                    </div>
                  </div>
                  
                  {/* Return to Start */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="returnToStart" className="cursor-pointer">
                        Return to Start Location
                      </Label>
                      <Switch
                        id="returnToStart"
                        checked={tripSettings.returnToStart}
                        onCheckedChange={handleSwitchChange}
                      />
                    </div>
                    
                    {/* Option depends on return choice */}
                    <div className="pl-4 border-l-2 border-gray-200">
                      <Label className="block mb-3">
                        {tripSettings.returnToStart ? 'Furthest Point Type' : 'End Point Type'}:
                      </Label>
                      <RadioGroup
                        value={tripSettings.pointSpecificationType}
                        onValueChange={(value) => handleRadioChange('pointSpecificationType', value)}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="specification" id="specification" />
                          <Label htmlFor="specification" className="cursor-pointer">
                            {tripSettings.returnToStart ? 'Furthest Point Specification' : 'End Point Specification'}
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="distance" id="distance" />
                          <Label htmlFor="distance" className="cursor-pointer">
                            {tripSettings.returnToStart ? 'Furthest Point by Distance' : 'End Point by Distance'}
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  
                  {/* Transport Type */}
                  <div className="space-y-3">
                    <Label>Transport Type:</Label>
                    <RadioGroup
                      value={tripSettings.transportType}
                      onValueChange={(value) => handleRadioChange('transportType', value)}
                      className="grid grid-cols-2 gap-3"
                    >
                      {['car', 'public', 'bike', 'walking'].map((type) => (
                        <div 
                          key={type}
                          className={`flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-50 cursor-pointer ${
                            tripSettings.transportType === type ? 'border-primary bg-primary/5' : 'border-gray-200'
                          }`}
                          onClick={() => handleRadioChange('transportType', type)}
                        >
                          <RadioGroupItem value={type} id={`transport-${type}`} />
                          <Label htmlFor={`transport-${type}`} className="flex items-center gap-2 cursor-pointer">
                            {renderTransportIcon(type)}
                            <span className="capitalize">{type}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full mt-6" 
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Trip Settings'}
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
