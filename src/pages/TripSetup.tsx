
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const TripSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [formData, setFormData] = useState({
    location: '',
    date: '',
    interests: '',
    distance: '',
  });
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save your trip.",
      });
      navigate('/auth');
      return;
    }
    
    try {
      const { error } = await supabase.from('trips').insert({
        title: `Trip to ${formData.location}`,
        description: `Interests: ${formData.interests}. Distance: ${formData.distance} miles.`,
        location: formData.location,
        date: formData.date || null,
        user_id: session.user.id
      });
      
      if (error) throw error;
      
      toast({
        title: "Trip created",
        description: "Your trip has been created successfully.",
      });
      
      navigate('/dashboard');
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create trip.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow py-12">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">Create Your Perfect Day Trip</h1>
              <p className="text-lg text-gray-600">
                Tell us a bit about what you're looking for and we'll create the perfect itinerary.
              </p>
            </div>
            
            <Card>
              <CardContent className="p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="location">Starting Location</Label>
                    <Input 
                      id="location" 
                      name="location"
                      placeholder="Enter your starting point" 
                      value={formData.location}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date">When are you going?</Label>
                    <Input 
                      id="date" 
                      name="date"
                      type="date" 
                      value={formData.date}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="interests">What are you interested in?</Label>
                    <Input 
                      id="interests" 
                      name="interests"
                      placeholder="Nature, Food, History, Art, etc." 
                      value={formData.interests}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="distance">How far are you willing to travel? (miles)</Label>
                    <Input 
                      id="distance" 
                      name="distance"
                      type="number" 
                      placeholder="50" 
                      value={formData.distance}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="pt-4">
                    <Button className="w-full btn-primary" type="submit">
                      Generate My Trip Itinerary
                    </Button>
                  </div>
                  
                  <div className="text-center pt-2">
                    <Link to="/" className="text-sm text-gray-500 hover:text-triply-blue">
                      Back to home
                    </Link>
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

export default TripSetup;
