
import { supabase } from '@/integrations/supabase/client';

export const getGoogleMapsApiKey = async (): Promise<string> => {
  try {
    console.log('Fetching Google Maps API key from Supabase Edge Function');
    
    // Add retry mechanism with exponential backoff
    const maxRetries = 3;
    let retryCount = 0;
    let lastError;
    
    while (retryCount < maxRetries) {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-maps-key', {
          method: 'GET',
        });
        
        if (error) {
          console.error(`Error from Edge Function (attempt ${retryCount + 1}):`, error);
          throw new Error(`Failed to fetch API key: ${error.message}`);
        }
        
        if (!data || !data.apiKey) {
          console.error(`No API key returned from Edge Function (attempt ${retryCount + 1}):`, data);
          throw new Error('No API key found. Please check your Supabase Edge Function configuration.');
        }
        
        console.log('API key fetched successfully');
        return data.apiKey;
      } catch (err) {
        lastError = err;
        retryCount++;
        
        if (retryCount < maxRetries) {
          // Exponential backoff: wait 2^retryCount * 500ms before retrying
          const delay = Math.pow(2, retryCount) * 500;
          console.log(`Retrying API key fetch in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    console.error(`Failed to fetch Google Maps API key after ${maxRetries} attempts:`, lastError);
    throw lastError;
  } catch (error) {
    console.error('Error fetching Google Maps API Key:', error);
    throw error;
  }
};
