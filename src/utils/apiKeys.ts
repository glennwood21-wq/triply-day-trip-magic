
import { supabase } from '@/integrations/supabase/client';

export const getGoogleMapsApiKey = async (): Promise<string> => {
  try {
    console.log('Fetching Google Maps API key from Supabase Edge Function');
    
    const { data, error } = await supabase.functions.invoke('get-google-maps-key', {
      method: 'GET',
    });
    
    if (error) {
      console.error('Error from Edge Function:', error);
      throw new Error(`Failed to fetch API key: ${error.message}`);
    }
    
    if (!data || !data.apiKey) {
      console.error('No API key returned from Edge Function');
      throw new Error('No API key found. Please check your Supabase Edge Function configuration.');
    }
    
    return data.apiKey;
  } catch (error) {
    console.error('Error fetching Google Maps API Key:', error);
    throw error;
  }
};
