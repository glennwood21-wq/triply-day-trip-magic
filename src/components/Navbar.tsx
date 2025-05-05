
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    
    getSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="py-4 border-b border-gray-100">
      <div className="container-custom">
        <nav className="flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-triply-blue">Triply</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-gray-600 hover:text-triply-blue transition-colors">
              Home
            </Link>
            <Link to="#features" className="text-gray-600 hover:text-triply-blue transition-colors">
              Features
            </Link>
            <Link to="#testimonials" className="text-gray-600 hover:text-triply-blue transition-colors">
              Testimonials
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            {session ? (
              <>
                <Button 
                  variant="ghost" 
                  className="hidden md:inline-flex"
                  onClick={() => navigate('/dashboard')}
                >
                  My Trips
                </Button>
                <Button 
                  className="bg-triply-blue hover:bg-triply-dark-blue text-white"
                  onClick={() => navigate('/trip-settings')}
                >
                  Create Trip
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  className="hidden md:inline-flex"
                  onClick={() => navigate('/auth')}
                >
                  Sign In
                </Button>
                <Button 
                  className="bg-triply-blue hover:bg-triply-dark-blue text-white"
                  onClick={() => navigate('/auth', { state: { tab: 'signup' } })}
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
