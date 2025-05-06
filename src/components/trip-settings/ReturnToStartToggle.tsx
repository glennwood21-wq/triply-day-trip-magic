
import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import StartLocationInput from './StartLocationInput';

interface ReturnToStartToggleProps {
  returnToStart: boolean;
  onReturnChange: (checked: boolean) => void;
  pointSpecificationType: string;
  onPointTypeChange: (value: string) => void;
  pointSpecification: string;
  onPointSpecificationChange: (value: string) => void;
  distanceValue: number;
  onDistanceValueChange: (value: number) => void;
}

const ReturnToStartToggle = ({
  returnToStart,
  onReturnChange,
  pointSpecificationType,
  onPointTypeChange,
  pointSpecification,
  onPointSpecificationChange,
  distanceValue,
  onDistanceValueChange
}: ReturnToStartToggleProps) => {
  // Handle input change for autocomplete fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (fieldName === 'pointSpecification') {
      onPointSpecificationChange(e.target.value);
    }
  };

  const handleLocationSelect = (location: string) => {
    onPointSpecificationChange(location);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="return-toggle" className="text-base font-medium">
          Return to start
        </Label>
        <Switch 
          id="return-toggle" 
          checked={returnToStart}
          onCheckedChange={onReturnChange}
        />
      </div>
      
      {!returnToStart && (
        <div className="space-y-6 pl-2 border-l-2 border-gray-200">
          <div className="space-y-4">
            <Label className="text-base font-medium">
              Specify where your trip will end
            </Label>
            <RadioGroup 
              value={pointSpecificationType} 
              onValueChange={onPointTypeChange}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="end-point" id="end-point" />
                <Label htmlFor="end-point">Enter end point location</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="furthest-point" id="furthest-point" />
                <Label htmlFor="furthest-point">Enter furthest point location</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="distance" id="distance" />
                <Label htmlFor="distance">Specify distance from start</Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Conditional rendering based on the selected option */}
          {pointSpecificationType === 'end-point' && (
            <div className="space-y-2 pl-4">
              <StartLocationInput
                value={pointSpecification}
                onChange={(e) => handleInputChange(e, 'pointSpecification')}
                onLocationSelect={handleLocationSelect}
              />
            </div>
          )}
          
          {pointSpecificationType === 'furthest-point' && (
            <div className="space-y-2 pl-4">
              <StartLocationInput
                value={pointSpecification}
                onChange={(e) => handleInputChange(e, 'pointSpecification')}
                onLocationSelect={handleLocationSelect}
              />
            </div>
          )}
          
          {pointSpecificationType === 'distance' && (
            <div className="space-y-4 pl-4">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="distance-value" className="text-sm mb-2 block">
                    Distance ({distanceValue}km)
                  </Label>
                  <Slider 
                    id="distance-value"
                    value={[distanceValue]}
                    min={10}
                    max={500}
                    step={10}
                    onValueChange={(values) => onDistanceValueChange(values[0])}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReturnToStartToggle;
