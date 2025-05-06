
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Retrieve the OpenAI API key from environment variables
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    // Log diagnostic information
    console.log('Sending prompt to OpenAI:', prompt);
    console.log('API key status:', openAIApiKey ? 'API key is set' : 'API key is missing');
    
    // Validate API key
    if (!openAIApiKey) {
      console.error('OpenAI API key is not configured');
      throw new Error('OpenAI API key is not configured. Please set the OPENAI_API_KEY secret in your Supabase project.');
    }
    
    // Mask the API key for logging purposes (show first 5 chars)
    const maskedKey = openAIApiKey.substring(0, 5) + '...' + openAIApiKey.substring(openAIApiKey.length - 4);
    console.log('Using API key starting with:', maskedKey);

    // Make the request to OpenAI
    console.log('Sending request to OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `You are a fun and helpful local travel expert that generates detailed day trip itineraries.
            Your response must be a valid JSON object only, with no additional text, following this structure:
            {
              "title": "Trip title reflecting the journey",
              "summary": "A short, engaging overview of the trip written in a fun and helpful tone",
              "stops": [
                {
                  "name": "Name of the location",
                  "type": "One of: food, attraction, scenic, historical, shopping, etc.",
                  "location": "Physical address or coordinates",
                  "description": "A fun and engaging description of what to do here written in a helpful, enthusiastic tone",
                  "suggestedDuration": "Time to spend in minutes",
                  "distanceFromPrevious": "Distance in miles from the previous stop (0 for the first stop)",
                  "travelTimeFromPrevious": "Travel time in minutes from previous stop (0 for the first stop)",
                  "imagePrompt": "A detailed description for generating an image of this location"
                },
                ...
              ]
            }
            
            Only return valid JSON. Do not include any explanations, notes, or text outside the JSON object.
            Every stop must have all the fields listed above.
            Ensure exact field names as specified.
            Travel times and distances should be realistic based on the transportation method.
            Include at least one food stop around a logical meal time.
            For the imagePrompt field, create a detailed, visual description that would help generate a representative image of the location.` 
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        temperature: 0.7,
      }),
    });

    // Check for API response issues
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error details:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    // Process successful response
    console.log('Received successful response from OpenAI');
    const data = await response.json();
    let itinerary;
    
    try {
      // Extract the content from OpenAI response
      const content = data.choices[0].message.content;
      console.log('Raw content from OpenAI:', content.substring(0, 200) + '...');
      
      // Attempt to parse the JSON response
      itinerary = JSON.parse(content);
      
      console.log('Successfully parsed itinerary JSON');
    } catch (parseError) {
      console.error('Error parsing itinerary JSON:', parseError);
      console.log('Raw content:', data.choices[0].message.content);
      
      // If parsing fails, return the raw text
      itinerary = {
        title: "Parsing Error",
        summary: "There was an error parsing the itinerary data.",
        rawContent: data.choices[0].message.content,
        stops: []
      };
    }

    return new Response(JSON.stringify({ 
      success: true, 
      itinerary: itinerary 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-trip function:', error);
    // Include more details about the error
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString(),
      details: error.stack || 'No stack trace available'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
