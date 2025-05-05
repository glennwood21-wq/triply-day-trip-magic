
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardNavbar from '@/components/DashboardNavbar';
import TripsList from '@/components/TripsList';
import CreateTripForm from '@/components/CreateTripForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { Calendar, Plus } from 'lucide-react';

type Trip = Database['public']['Tables']['trips']['Row'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        navigate('/auth');
        return;
      }
      
      setUser(data.session.user);
    };

    checkUser();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          navigate('/auth');
        } else if (session) {
          setUser(session.user);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchTrips();
    }
  }, [user]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setTrips(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch trips",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTripCreated = () => {
    setOpenDialog(false);
    fetchTrips();
    toast({
      title: "Trip Created",
      description: "Your new trip has been created successfully.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardNavbar />
      
      <main className="flex-grow py-8 px-4 bg-gray-50">
        <div className="container-custom">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">My Trips</h1>
            
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus size={16} />
                  Create New Trip
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Trip</DialogTitle>
                </DialogHeader>
                <CreateTripForm onSuccess={handleTripCreated} />
              </DialogContent>
            </Dialog>
          </div>
          
          <TripsList trips={trips} loading={loading} onTripDeleted={fetchTrips} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
