
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the API key from environment variables
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    
    if (!apiKey) {
      console.error("Google Maps API key not found in environment variables");
      return new Response(
        JSON.stringify({ 
          error: "Google Maps API key not configured in Supabase secrets",
          status: "error"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the API key format (simple validation)
    if (!apiKey.startsWith('AIza')) {
      console.error("Invalid Google Maps API key format");
      return new Response(
        JSON.stringify({ 
          error: "Invalid Google Maps API key format. Should start with 'AIza'",
          status: "error"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Check if this is a place autocomplete request
    const url = new URL(req.url);
    const searchPath = url.pathname.split('/').pop();
    
    if (searchPath === 'autocomplete') {
      // Get query from URL search params
      const query = url.searchParams.get('query');
      if (!query) {
        return new Response(
          JSON.stringify({
            error: "Missing query parameter",
            status: "error"
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`Fetching place autocomplete results for: ${query}`);
      
      // Get user location from request parameters, if available
      const userLat = parseFloat(url.searchParams.get('lat') || '0');
      const userLng = parseFloat(url.searchParams.get('lng') || '0');
      const hasLocation = !isNaN(userLat) && !isNaN(userLng) && (userLat !== 0 || userLng !== 0);
      
      try {
        // Use the legacy Places Autocomplete API
        let placesUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}&types=(cities)`;
        
        // Add location bias if available
        if (hasLocation) {
          console.log(`Adding location bias: ${userLat}, ${userLng}`);
          placesUrl += `&location=${userLat},${userLng}&radius=50000`;
        }
        
        // Call the legacy Places API with GET request
        const placesResponse = await fetch(placesUrl);

        if (!placesResponse.ok) {
          const errorText = await placesResponse.text();
          console.error('Places API error:', errorText);
          throw new Error(`Places API error: ${placesResponse.status} - ${errorText}`);
        }
        
        const placesData = await placesResponse.json();
        
        // Check legacy API status
        if (placesData.status !== "OK" && placesData.status !== "ZERO_RESULTS") {
          console.error('Places API returned error status:', placesData.status, placesData.error_message);
          throw new Error(`Places API returned: ${placesData.status} - ${placesData.error_message || 'Unknown error'}`);
        }
        
        console.log(`Found ${placesData.predictions?.length || 0} place predictions`);
        
        // Transform the legacy response to match our expected format
        const results = (placesData.predictions || []).map(prediction => ({
          id: prediction.place_id,
          displayName: {
            text: prediction.structured_formatting?.main_text || prediction.description,
            languageCode: "en"
          },
          formattedAddress: prediction.description,
          types: prediction.types
        }));
        
        return new Response(
          JSON.stringify({
            results,
            status: "success"
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
        
      } catch (error) {
        console.error('Error fetching from Places API:', error);
        return new Response(
          JSON.stringify({
            error: error.message || "Failed to fetch places",
            status: "error"
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Default response is just to return the API key
    console.log("Successfully retrieved Google Maps API key");
    
    return new Response(
      JSON.stringify({ 
        apiKey,
        status: "success" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in edge function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Unknown error",
        status: "error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
