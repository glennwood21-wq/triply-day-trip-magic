
import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Map, Save, RefreshCw, Clock, Navigation, Calendar, Coffee, Utensils, Camera, Landmark, Mountain, ShoppingBag } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

interface TripItinerary {
  title: string;
  summary: string;
  stops: TripStop[];
  rawContent?: string; // For error cases
}

interface TripStop {
  name: string;
  type: string;
  location: string;
  description: string;
  suggestedDuration: string;
  distanceFromPrevious: string;
  travelTimeFromPrevious: string;
  imagePrompt?: string; // Optional field for image generation
}

interface TripItineraryDisplayProps {
  itinerary: TripItinerary;
  startLocation: string;
  endLocation: string;
  returnToStart: boolean;
  onSave: () => void;
  onRegenerate: () => void;
  isSaving: boolean;
  isRegenerating: boolean;
}

const TripItineraryDisplay: React.FC<TripItineraryDisplayProps> = ({
  itinerary,
  startLocation,
  endLocation,
  returnToStart,
  onSave,
  onRegenerate,
  isSaving,
  isRegenerating
}) => {
  // Calculate total trip info including start/end points
  const totalTripInfo = useMemo(() => {
    if (!itinerary.stops || itinerary.stops.length === 0) {
      return { 
        activityTime: 0, 
        totalDistance: 0, 
        travelTime: 0, 
        totalTripTime: 0 
      };
    }

    const stopTotals = itinerary.stops.reduce((acc, stop) => {
      const duration = parseInt(stop.suggestedDuration) || 0;
      const distance = parseFloat(stop.distanceFromPrevious) || 0;
      const travelTime = parseInt(stop.travelTimeFromPrevious) || 0;

      return {
        activityTime: acc.activityTime + duration,
        totalDistance: acc.totalDistance + distance,
        travelTime: acc.travelTime + travelTime
      };
    }, { activityTime: 0, totalDistance: 0, travelTime: 0 });

    // Calculate total trip time (activity + travel)
    const totalTripTime = stopTotals.activityTime + stopTotals.travelTime;

    return {
      activityTime: stopTotals.activityTime,
      totalDistance: stopTotals.totalDistance,
      travelTime: stopTotals.travelTime,
      totalTripTime
    };
  }, [itinerary.stops]);

  // Helper function to get icon based on stop type
  const getStopTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'food':
        return <Utensils className="h-4 w-4" />;
      case 'restaurant':
        return <Utensils className="h-4 w-4" />;
      case 'cafe':
        return <Coffee className="h-4 w-4" />;
      case 'attraction':
        return <Camera className="h-4 w-4" />;
      case 'historical':
        return <Landmark className="h-4 w-4" />;
      case 'scenic':
        return <Mountain className="h-4 w-4" />;
      case 'shopping':
        return <ShoppingBag className="h-4 w-4" />;
      default:
        return <Landmark className="h-4 w-4" />;
    }
  };

  // Format duration in hours and minutes
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} mins`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0 ? `${hours} hr ${remainingMins} min` : `${hours} hr`;
  };

  // If there's a parsing error, show the raw content
  if (itinerary.rawContent) {
    return (
      <Card className="mt-8 border-red-300">
        <CardHeader>
          <CardTitle className="text-red-500">Error Generating Itinerary</CardTitle>
          <CardDescription>There was an error processing the response</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            <pre>{itinerary.rawContent}</pre>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl font-bold">{itinerary.title}</CardTitle>
            <CardDescription className="mt-2 text-base">{itinerary.summary}</CardDescription>
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              className="flex items-center"
              onClick={onSave}
              disabled={isSaving}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Trip'}
            </Button>
            <Button
              variant="outline"
              className="flex items-center"
              onClick={onRegenerate}
              disabled={isRegenerating}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Trip Overview */}
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-lg font-semibold mb-2">Trip Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-gray-600 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Activity Time</p>
                <p className="font-medium">{formatDuration(totalTripInfo.activityTime)}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Navigation className="h-5 w-5 text-gray-600 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Total Distance</p>
                <p className="font-medium">{totalTripInfo.totalDistance.toFixed(1)} miles</p>
              </div>
            </div>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-600 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Travel Time</p>
                <p className="font-medium">{formatDuration(totalTripInfo.travelTime)}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-gray-600 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Total Trip Time</p>
                <p className="font-medium">{formatDuration(totalTripInfo.totalTripTime)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Map Preview */}
        <div className="relative h-64 bg-gray-100 rounded-md flex items-center justify-center border">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Map className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Map Preview</p>
              <p className="text-xs text-gray-400">Interactive map coming soon</p>
            </div>
          </div>
        </div>

        {/* Timeline View */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Trip Timeline</h3>
          <div className="space-y-4">
            {/* Start Point */}
            <div className="flex">
              <div className="mr-4 relative">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-600 text-white">
                  START
                </div>
                <div className="absolute top-10 bottom-0 left-1/2 w-0.5 -ml-0.5 bg-gray-200" />
              </div>
              
              <div className="flex-1 pb-8">
                <div className="bg-white rounded-md shadow-sm border p-4 border-green-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-lg">{startLocation}</h4>
                      <Badge variant="outline" className="mt-1 border-green-300 text-green-700">
                        Starting Point
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Your journey begins here</p>
                  
                  {itinerary.stops.length > 0 && (
                    <div className="flex items-center mt-3 text-sm text-gray-500">
                      <Navigation className="h-4 w-4 mr-1" />
                      <span>
                        {itinerary.stops[0].travelTimeFromPrevious} min to first stop
                        ({itinerary.stops[0].name})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Intermediate Stops */}
            {itinerary.stops.map((stop, index) => (
              <div key={index} className="flex">
                <div className="mr-4 relative">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-white">
                    {index + 1}
                  </div>
                  {(index < itinerary.stops.length - 1 || !returnToStart) && (
                    <div className="absolute top-10 bottom-0 left-1/2 w-0.5 -ml-0.5 bg-gray-200" />
                  )}
                </div>
                
                <div className="flex-1 pb-8">
                  <div className="bg-white rounded-md shadow-sm border p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-lg">{stop.name}</h4>
                        <Badge 
                          variant="outline" 
                          className="flex items-center gap-1 mt-1"
                        >
                          {getStopTypeIcon(stop.type)}
                          <span className="capitalize">{stop.type}</span>
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatDuration(parseInt(stop.suggestedDuration))}</p>
                        <p className="text-xs text-gray-500">{stop.distanceFromPrevious} miles</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{stop.location}</p>
                    <p className="text-sm">{stop.description}</p>
                    
                    {index < itinerary.stops.length - 1 && (
                      <div className="flex items-center mt-3 text-sm text-gray-500">
                        <Navigation className="h-4 w-4 mr-1" />
                        <span>
                          {itinerary.stops[index + 1].travelTimeFromPrevious} min to next stop
                          ({itinerary.stops[index + 1].name})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* End Point (only if different from start) */}
            {!returnToStart && (
              <div className="flex">
                <div className="mr-4 relative">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-600 text-white">
                    END
                  </div>
                </div>
                
                <div className="flex-1 pb-8">
                  <div className="bg-white rounded-md shadow-sm border p-4 border-red-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-lg">{endLocation}</h4>
                        <Badge variant="outline" className="mt-1 border-red-300 text-red-700">
                          End Point
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">Your journey ends here</p>
                  </div>
                </div>
              </div>
            )}

            {/* Return to Start (if applicable) */}
            {returnToStart && itinerary.stops.length > 0 && (
              <div className="flex">
                <div className="mr-4 relative">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-600 text-white">
                    END
                  </div>
                </div>
                
                <div className="flex-1 pb-8">
                  <div className="bg-white rounded-md shadow-sm border p-4 border-green-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-lg">{startLocation}</h4>
                        <Badge variant="outline" className="mt-1 border-green-300 text-green-700">
                          Return to Start
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">Journey completes back at starting point</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Stop Information */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Detailed Stop Information</h3>
          <Accordion type="single" collapsible className="w-full">
            {itinerary.stops.map((stop, index) => (
              <AccordionItem key={index} value={`stop-${index}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center">
                    <span className="bg-gray-200 h-6 w-6 rounded-full flex items-center justify-center text-sm mr-2">
                      {index + 1}
                    </span>
                    <span className="font-medium">{stop.name}</span>
                    <Badge 
                      variant="outline" 
                      className="ml-3 flex items-center gap-1"
                    >
                      {getStopTypeIcon(stop.type)}
                      <span className="capitalize">{stop.type}</span>
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <p>{stop.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Location</p>
                        <p>{stop.location}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Suggested Duration</p>
                        <p>{formatDuration(parseInt(stop.suggestedDuration))}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Distance from Previous</p>
                        <p>{stop.distanceFromPrevious} miles</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Travel Time from Previous</p>
                        <p>{stop.travelTimeFromPrevious} minutes</p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
};

export default TripItineraryDisplay;
