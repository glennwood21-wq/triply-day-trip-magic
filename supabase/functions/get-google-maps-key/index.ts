
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
          error: "Invalid Google Maps API key format",
          status: "error"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log success to help with debugging
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
    console.error("Error retrieving Google Maps API key:", error);
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
