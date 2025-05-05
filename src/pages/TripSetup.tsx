
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';

const TripSetup = () => {
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
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="location">Starting Location</Label>
                    <Input id="location" placeholder="Enter your starting point" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date">When are you going?</Label>
                    <Input id="date" type="date" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="interests">What are you interested in?</Label>
                    <Input id="interests" placeholder="Nature, Food, History, Art, etc." />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="distance">How far are you willing to travel? (miles)</Label>
                    <Input id="distance" type="number" placeholder="50" />
                  </div>
                  
                  <div className="pt-4">
                    <Button className="w-full btn-primary">
                      Generate My Trip Itinerary
                    </Button>
                  </div>
                  
                  <div className="text-center pt-2">
                    <Link to="/" className="text-sm text-gray-500 hover:text-triply-blue">
                      Back to home
                    </Link>
                  </div>
                </div>
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
