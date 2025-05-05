
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface CreateTripFormProps {
  onSuccess: () => void;
}

const CreateTripForm = ({ onSuccess }: CreateTripFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.from('trips').insert([
        {
          title: formData.title,
          description: formData.description,
          location: formData.location,
          date: formData.date || null,
        }
      ]);
      
      if (error) throw error;
      
      onSuccess();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create trip.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="title">Trip Title</Label>
        <Input 
          id="title" 
          name="title" 
          placeholder="Weekend in Paris" 
          value={formData.title}
          onChange={handleChange}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input 
          id="location" 
          name="location" 
          placeholder="Paris, France" 
          value={formData.location}
          onChange={handleChange}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input 
          id="date" 
          name="date" 
          type="date" 
          value={formData.date}
          onChange={handleChange}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea 
          id="description" 
          name="description" 
          placeholder="Details about your trip" 
          value={formData.description}
          onChange={handleChange}
        />
      </div>
      
      <div className="pt-4">
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Trip'}
        </Button>
      </div>
    </form>
  );
};

export default CreateTripForm;
