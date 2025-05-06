
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
    
    console.log("API Key exists:", !!apiKey); // Log if the key exists, not the actual key for security
    
    if (!apiKey) {
      console.error("ERROR: Google Maps API key is not found in environment variables");
      return new Response(
        JSON.stringify({ 
          error: "Google Maps API key not configured",
          message: "Please configure the GOOGLE_MAPS_API_KEY in Supabase Edge Function Secrets"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Further validate that the key isn't just whitespace
    if (apiKey.trim() === "") {
      console.error("ERROR: Google Maps API key is empty (all whitespace)");
      return new Response(
        JSON.stringify({ 
          error: "Google Maps API key is empty",
          message: "Please configure a valid GOOGLE_MAPS_API_KEY in Supabase Edge Function Secrets"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log that we're returning a valid key (sanitized for security)
    const sanitizedKey = apiKey.substring(0, 3) + "..." + apiKey.substring(apiKey.length - 3);
    console.log(`Returning valid Google Maps API key: ${sanitizedKey}`);
    
    // Return the API key with a clear success status
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
    console.error("Error retrieving Google Maps API key:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: "Failed to retrieve Google Maps API key",
        status: "error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
