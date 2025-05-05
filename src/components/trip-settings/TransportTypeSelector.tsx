
import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Car, Bus, Bike } from 'lucide-react';

interface TransportTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const TransportTypeSelector = ({ value, onChange }: TransportTypeSelectorProps) => {
  const renderTransportIcon = (type: string) => {
    switch (type) {
      case 'car':
        return <Car size={18} />;
      case 'public':
        return <Bus size={18} />;
      case 'bike':
        return <Bike size={18} />;
      case 'walking':
        return <span className="inline-flex items-center justify-center w-[18px] h-[18px]">🚶</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <Label>Transport Type:</Label>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        className="grid grid-cols-2 gap-3"
      >
        {['car', 'public', 'bike', 'walking'].map((type) => (
          <div 
            key={type}
            className={`flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-50 cursor-pointer ${
              value === type ? 'border-primary bg-primary/5' : 'border-gray-200'
            }`}
            onClick={() => onChange(type)}
          >
            <RadioGroupItem value={type} id={`transport-${type}`} />
            <Label htmlFor={`transport-${type}`} className="flex items-center gap-2 cursor-pointer">
              {renderTransportIcon(type)}
              <span className="capitalize">{type}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

export default TransportTypeSelector;
