
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Features = () => {
  const features = [
    {
      title: "AI-Powered Itineraries",
      description: "Our intelligent AI creates personalized day trip plans based on your preferences, weather, and local events."
    },
    {
      title: "Local Hidden Gems",
      description: "Discover unique spots that tourists often miss, recommended by locals and travel experts."
    },
    {
      title: "Time-Optimized Routes",
      description: "Make the most of your day with efficient routes that minimize travel time and maximize experiences."
    },
    {
      title: "Budget Friendly Options",
      description: "Filter recommendations based on your spending preferences, from luxury experiences to free activities."
    }
  ];

  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="container-custom">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How Triply Works</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From busy professionals to weekend adventurers, our AI-powered platform helps everyone make the most of their free time.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="card-hover border-none shadow-md">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 bg-triply-blue/10 flex items-center justify-center rounded-full mb-4">
                  <span className="text-triply-blue font-bold">{index + 1}</span>
                </div>
                <CardTitle className="text-xl font-bold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
