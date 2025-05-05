
import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ReturnToStartToggleProps {
  returnToStart: boolean;
  onReturnChange: (checked: boolean) => void;
  pointSpecificationType: string;
  onPointTypeChange: (value: string) => void;
}

const ReturnToStartToggle = ({ 
  returnToStart, 
  onReturnChange, 
  pointSpecificationType, 
  onPointTypeChange 
}: ReturnToStartToggleProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="returnToStart" className="cursor-pointer">
          Return to Start Location
        </Label>
        <Switch
          id="returnToStart"
          checked={returnToStart}
          onCheckedChange={onReturnChange}
        />
      </div>
      
      <div className="pl-4 border-l-2 border-gray-200">
        <Label className="block mb-3">
          {returnToStart ? 'Furthest Point Type' : 'End Point Type'}:
        </Label>
        <RadioGroup
          value={pointSpecificationType}
          onValueChange={onPointTypeChange}
          className="space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="specification" id="specification" />
            <Label htmlFor="specification" className="cursor-pointer">
              {returnToStart ? 'Furthest Point Specification' : 'End Point Specification'}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="distance" id="distance" />
            <Label htmlFor="distance" className="cursor-pointer">
              {returnToStart ? 'Furthest Point by Distance' : 'End Point by Distance'}
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};

export default ReturnToStartToggle;
