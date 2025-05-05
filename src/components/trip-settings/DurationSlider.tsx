
import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Clock } from 'lucide-react';

interface DurationSliderProps {
  value: number;
  onValueChange: (value: number[]) => void;
}

const DurationSlider = ({ value, onValueChange }: DurationSliderProps) => {
  return (
    <div className="space-y-4">
      <Label className="flex items-center gap-2">
        <Clock size={16} />
        Trip Duration: {value} hours
      </Label>
      <Slider
        value={[value]}
        min={1}
        max={12}
        step={1}
        onValueChange={onValueChange}
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>1h</span>
        <span>6h</span>
        <span>12h</span>
      </div>
    </div>
  );
};

export default DurationSlider;
