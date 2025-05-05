
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Navbar = () => {
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
            <Button variant="ghost" className="hidden md:inline-flex">Sign In</Button>
            <Button className="bg-triply-blue hover:bg-triply-dark-blue text-white">Sign Up</Button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
