
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
        // Use the New Places API Text Search
        const placesUrl = 'https://places.googleapis.com/v1/places:searchText';
        
        // Prepare the request body for New Places API
        const requestBody: any = {
          textQuery: query,
          maxResultCount: 5,
          includedType: "locality"
        };
        
        // Add location bias if available
        if (hasLocation) {
          console.log(`Adding location bias: ${userLat}, ${userLng}`);
          requestBody.locationBias = {
            circle: {
              center: {
                latitude: userLat,
                longitude: userLng
              },
              radius: 50000.0
            }
          };
        }
        
        // Call the New Places API with POST request
        const placesResponse = await fetch(placesUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types'
          },
          body: JSON.stringify(requestBody)
        });

        if (!placesResponse.ok) {
          const errorText = await placesResponse.text();
          console.error('New Places API error:', errorText);
          throw new Error(`New Places API error: ${placesResponse.status} - ${errorText}`);
        }
        
        const placesData = await placesResponse.json();
        
        console.log(`Found ${placesData.places?.length || 0} place predictions`);
        
        // Transform the New Places API response to match our expected format
        const results = (placesData.places || []).map(place => ({
          id: place.id,
          displayName: {
            text: place.displayName?.text || place.formattedAddress,
            languageCode: place.displayName?.languageCode || "en"
          },
          formattedAddress: place.formattedAddress,
          types: place.types || []
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
