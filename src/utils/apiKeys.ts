
import { supabase } from '@/integrations/supabase/client';

export const getGoogleMapsApiKey = async (): Promise<string> => {
  console.log('Fetching Google Maps API key...');
  
  try {
    // Make the request to the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('get-google-maps-key', {
      method: 'GET',
    });
    
    if (error) {
      console.error('Error fetching API key from Edge Function:', error);
      throw new Error(`Failed to fetch API key: ${error.message}`);
    }
    
    if (!data || !data.apiKey) {
      console.error('No API key returned from Edge Function:', data);
      throw new Error('No valid API key returned');
    }
    
    console.log('API key fetched successfully');
    return data.apiKey;
  } catch (error) {
    console.error('Failed to get Google Maps API key:', error);
    throw error;
  }
};
