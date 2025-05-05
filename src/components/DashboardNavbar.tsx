
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { User, LogOut, Settings } from 'lucide-react';

const DashboardNavbar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    getUser();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      navigate('/');
      
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign out.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="py-4 border-b border-gray-100 bg-white">
      <div className="container-custom">
        <nav className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center">
            <span className="text-2xl font-bold text-triply-blue">Triply</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User size={16} />
                  {user?.email?.split('@')[0] || 'Profile'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Account</DialogTitle>
                  <DialogDescription>
                    Manage your account settings
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-gray-500">{user?.email || 'Not available'}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" className="gap-2 justify-start">
                    <Settings size={16} />
                    Account Settings
                  </Button>
                  <Button variant="outline" className="gap-2 justify-start text-red-500" onClick={handleSignOut}>
                    <LogOut size={16} />
                    Sign Out
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default DashboardNavbar;
