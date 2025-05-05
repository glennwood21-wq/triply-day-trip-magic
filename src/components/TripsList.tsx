
import React from 'react';
import { formatDistance } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

type Trip = Database['public']['Tables']['trips']['Row'];

interface TripsListProps {
  trips: Trip[];
  loading: boolean;
  onTripDeleted: () => void;
}

const TripsList = ({ trips, loading, onTripDeleted }: TripsListProps) => {
  const { toast } = useToast();

  const handleDeleteTrip = async (tripId: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);
      
      if (error) throw error;
      
      onTripDeleted();
      
      toast({
        title: "Trip deleted",
        description: "Your trip has been deleted successfully.",
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete trip.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-center">
          <p className="text-gray-500">Loading your trips...</p>
        </div>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center">
          <h3 className="text-xl font-medium mb-2">No trips found</h3>
          <p className="text-gray-500 mb-4">Create your first trip to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {trips.map((trip) => (
        <Card key={trip.id} className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>{trip.title}</CardTitle>
            <CardDescription>{trip.location}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-gray-700">
              {trip.description || 'No description provided'}
            </p>
            {trip.date && (
              <p className="text-sm mt-4 font-medium">
                Date: {new Date(trip.date).toLocaleDateString()}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <span className="text-xs text-gray-500">
              Created {formatDistance(new Date(trip.created_at), new Date(), { addSuffix: true })}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-500">
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      trip and remove it from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteTrip(trip.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default TripsList;
