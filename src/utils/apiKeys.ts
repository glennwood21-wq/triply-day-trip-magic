
import { supabase } from '@/integrations/supabase/client';

export const getGoogleMapsApiKey = async (): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-google-maps-key', {
      method: 'GET',
    });
    
    if (error) throw error;
    return data.apiKey;
  } catch (error) {
    console.error('Error fetching Google Maps API Key:', error);
    throw error;
  }
};
