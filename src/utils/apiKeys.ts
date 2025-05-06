
import { supabase } from '@/integrations/supabase/client';

export const getGoogleMapsApiKey = async (): Promise<string> => {
  try {
    console.log('Fetching Google Maps API key');
    
    const { data, error } = await supabase.functions.invoke('get-google-maps-key', {
      method: 'GET',
    });
    
    if (error) {
      console.error('Error from Edge Function:', error);
      throw new Error(`Failed to fetch API key: ${error.message}`);
    }
    
    if (!data) {
      console.error('No data returned from Edge Function');
      throw new Error('No data returned from Edge Function');
    }
    
    if (!data.apiKey) {
      console.error('API key missing in response:', data);
      throw new Error('API key missing in response from Edge Function');
    }
    
    if (data.apiKey.trim() === '') {
      console.error('Empty API key received');
      throw new Error('Empty API key received');
    }
    
    console.log('API key fetched successfully');
    return data.apiKey;
  } catch (error) {
    console.error('Error fetching Google Maps API Key:', error);
    throw error;
  }
};
