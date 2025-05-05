
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();
  
  const handleCreateTrip = () => {
    navigate('/trip-settings');
  };

  return (
    <section className="pt-10 pb-20 md:pt-16 md:pb-32 overflow-hidden">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900">
              Plan the Perfect Day Trip in Seconds with AI
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-lg">
              Discover personalized day trip itineraries tailored to your interests, location, and schedule.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={handleCreateTrip}
                size="lg" 
                className="btn-primary text-lg"
              >
                Create My Trip
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="text-lg"
              >
                How It Works
              </Button>
            </div>
          </div>
          
          <div className="relative animate-slide-in">
            <div className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=2070" 
                alt="Day trip destination" 
                className="w-full h-full object-cover transition-transform duration-10000 hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
            </div>
            
            <div className="absolute bottom-5 left-5 right-5 p-4 bg-white/90 backdrop-blur rounded-lg shadow-lg">
              <p className="font-medium text-triply-dark-blue">Today's recommendation</p>
              <h3 className="text-lg font-bold">Coastal Adventure: Pacific Beach</h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
