
import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Map, Save, RefreshCw } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
}

interface TripItineraryDisplayProps {
  itinerary: TripItinerary;
  onSave: () => void;
  onRegenerate: () => void;
  isSaving: boolean;
  isRegenerating: boolean;
}

const TripItineraryDisplay: React.FC<TripItineraryDisplayProps> = ({
  itinerary,
  onSave,
  onRegenerate,
  isSaving,
  isRegenerating
}) => {
  // Calculate total trip time
  const totalTripInfo = useMemo(() => {
    if (!itinerary.stops || itinerary.stops.length === 0) {
      return { totalDuration: 0, totalDistance: 0, totalTravelTime: 0 };
    }

    return itinerary.stops.reduce((acc, stop) => {
      const duration = parseInt(stop.suggestedDuration) || 0;
      const distance = parseFloat(stop.distanceFromPrevious) || 0;
      const travelTime = parseInt(stop.travelTimeFromPrevious) || 0;

      return {
        totalDuration: acc.totalDuration + duration,
        totalDistance: acc.totalDistance + distance,
        totalTravelTime: acc.totalTravelTime + travelTime
      };
    }, { totalDuration: 0, totalDistance: 0, totalTravelTime: 0 });
  }, [itinerary.stops]);

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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Time</p>
              <p className="font-medium">{Math.round(totalTripInfo.totalDuration / 60)} hours {totalTripInfo.totalDuration % 60} mins</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Distance</p>
              <p className="font-medium">{totalTripInfo.totalDistance.toFixed(1)} miles</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Travel Time</p>
              <p className="font-medium">{Math.round(totalTripInfo.totalTravelTime / 60)} hours {totalTripInfo.totalTravelTime % 60} mins</p>
            </div>
          </div>
        </div>

        {/* Map Placeholder */}
        <div className="relative h-64 bg-gray-100 rounded-md flex items-center justify-center border">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Map className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Map Preview</p>
              <p className="text-xs text-gray-400">Interactive map coming soon</p>
            </div>
          </div>
        </div>

        {/* Itinerary Table */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Itinerary Details</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Stop</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itinerary.stops.map((stop, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{stop.name}</TableCell>
                  <TableCell>
                    <span className="capitalize px-2 py-1 bg-gray-100 rounded-full text-xs">
                      {stop.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{stop.suggestedDuration} mins</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
                    <span className="capitalize ml-3 px-2 py-1 bg-gray-100 rounded-full text-xs">
                      {stop.type}
                    </span>
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
                        <p>{stop.suggestedDuration} minutes</p>
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
