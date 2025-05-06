
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
          error: "Google Maps API key not configured",
          status: "error"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (apiKey.trim() === "") {
      console.error("Google Maps API key is empty");
      return new Response(
        JSON.stringify({ 
          error: "Google Maps API key is empty",
          status: "error"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Returning Google Maps API key successfully");
    
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
