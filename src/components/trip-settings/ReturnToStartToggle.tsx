
import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';

interface ReturnToStartToggleProps {
  returnToStart: boolean;
  onReturnChange: (checked: boolean) => void;
  pointSpecificationType: string;
  onPointTypeChange: (value: string) => void;
  pointSpecification?: string;
  onPointSpecificationChange?: (value: string) => void;
  distanceValue?: number;
  onDistanceValueChange?: (value: number) => void;
}

const ReturnToStartToggle = ({ 
  returnToStart, 
  onReturnChange, 
  pointSpecificationType, 
  onPointTypeChange,
  pointSpecification = '',
  onPointSpecificationChange,
  distanceValue = 0,
  onDistanceValueChange
}: ReturnToStartToggleProps) => {
  // Local state to manage input values if props are not provided
  const [localPointSpecification, setLocalPointSpecification] = useState(pointSpecification);
  const [localDistanceValue, setLocalDistanceValue] = useState(distanceValue);

  // Update local state when props change
  useEffect(() => {
    setLocalPointSpecification(pointSpecification);
    setLocalDistanceValue(distanceValue);
  }, [pointSpecification, distanceValue]);

  const handlePointSpecificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalPointSpecification(value);
    if (onPointSpecificationChange) {
      onPointSpecificationChange(value);
    }
  };

  const handleDistanceValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setLocalDistanceValue(value);
    if (onDistanceValueChange) {
      onDistanceValueChange(value);
    }
  };

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
      
      <div className="pl-4 border-l-2 border-gray-200 space-y-4">
        <Label className="block mb-3">
          {returnToStart ? 'Furthest Point Type' : 'End Point Type'}:
        </Label>
        <RadioGroup
          value={pointSpecificationType}
          onValueChange={onPointTypeChange}
          className="space-y-4"
        >
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="specification" id="specification" />
              <Label htmlFor="specification" className="cursor-pointer">
                {returnToStart ? 'Furthest Point Specification' : 'End Point Specification'}
              </Label>
            </div>
            
            {pointSpecificationType === 'specification' && (
              <div className="ml-6 mt-2">
                <div className="space-y-1">
                  <Label>
                    Enter {returnToStart ? 'furthest point' : 'end point'} location:
                  </Label>
                  <Input 
                    type="text" 
                    placeholder="e.g. Los Angeles, CA"
                    value={localPointSpecification}
                    onChange={handlePointSpecificationChange}
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="distance" id="distance" />
              <Label htmlFor="distance" className="cursor-pointer">
                {returnToStart ? 'Furthest Point by Distance' : 'End Point by Distance'}
              </Label>
            </div>
            
            {pointSpecificationType === 'distance' && (
              <div className="ml-6 mt-2">
                <div className="space-y-1">
                  <Label>
                    Maximum distance (miles):
                  </Label>
                  <Input 
                    type="number" 
                    min="0"
                    placeholder="e.g. 100"
                    value={localDistanceValue || ''}
                    onChange={handleDistanceValueChange}
                  />
                </div>
              </div>
            )}
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};

export default ReturnToStartToggle;
