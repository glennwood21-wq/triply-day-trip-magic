
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';

interface StartLocationInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const StartLocationInput = ({ value, onChange }: StartLocationInputProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="startLocation" className="flex items-center gap-2">
        <MapPin size={16} />
        Start Location
      </Label>
      <Input
        id="startLocation"
        name="startLocation"
        placeholder="Enter your starting point"
        value={value}
        onChange={onChange}
        required
      />
    </div>
  );
};

export default StartLocationInput;
