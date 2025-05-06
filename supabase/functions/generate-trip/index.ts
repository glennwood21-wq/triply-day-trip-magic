
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

    // Debug API key info (carefully)
    console.log('Request received with prompt length:', prompt.length);
    
    // Validate API key format - basic check that it has expected structure
    if (!openAIApiKey) {
      console.error('OpenAI API key is not set in environment variables');
      throw new Error('OpenAI API key is not configured. Please set the OPENAI_API_KEY secret in your Supabase project.');
    }
    
    if (!openAIApiKey.startsWith('sk-') || openAIApiKey.length < 20) {
      console.error('OpenAI API key appears to be in invalid format (should start with sk- and be sufficiently long)');
      throw new Error('OpenAI API key appears to be invalid. Please check the OPENAI_API_KEY secret in your Supabase project.');
    }
    
    console.log('Using valid OpenAI API key format, first 4 chars:', openAIApiKey.substring(0, 4));

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

    // Debug response status before parsing
    console.log('OpenAI API response status:', response.status);
    
    // Check for API response issues
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error raw response:', errorText);
      
      // Try to parse as JSON if possible
      try {
        const errorData = JSON.parse(errorText);
        console.error('OpenAI API error details:', errorData);
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      } catch (parseError) {
        // If can't parse as JSON, use the text directly
        throw new Error(`OpenAI API error: ${errorText.substring(0, 200)}`);
      }
    }

    // Process successful response
    console.log('Received successful response from OpenAI');
    const data = await response.json();
    let itinerary;
    
    try {
      // Extract the content from OpenAI response
      const content = data.choices[0].message.content;
      console.log('Raw content from OpenAI (first 100 chars):', content.substring(0, 100));
      
      // Attempt to parse the JSON response
      itinerary = JSON.parse(content);
      
      console.log('Successfully parsed itinerary JSON');
      
      // Generate images for each stop if we have a valid itinerary
      if (itinerary && itinerary.stops && Array.isArray(itinerary.stops)) {
        console.log(`Generating images for ${itinerary.stops.length} stops`);
        
        // Process stops sequentially to avoid rate limiting
        for (let i = 0; i < itinerary.stops.length; i++) {
          const stop = itinerary.stops[i];
          if (stop.imagePrompt) {
            try {
              console.log(`Generating image for stop ${i + 1}: ${stop.name}`);
              
              // Call OpenAI image generation API
              const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${openAIApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'dall-e-3',
                  prompt: `A photorealistic image of ${stop.name}: ${stop.imagePrompt}`,
                  n: 1,
                  size: '1024x1024',
                  quality: 'standard',
                }),
              });
              
              if (!imageResponse.ok) {
                const imageErrorText = await imageResponse.text();
                console.error(`Image generation error for stop ${i + 1}:`, imageErrorText);
                continue; // Skip to next stop if image generation fails
              }
              
              const imageData = await imageResponse.json();
              if (imageData.data && imageData.data[0] && imageData.data[0].url) {
                stop.imageUrl = imageData.data[0].url;
                console.log(`Successfully generated image for stop ${i + 1}`);
              } else {
                console.error(`Unexpected image response format for stop ${i + 1}:`, imageData);
              }
            } catch (imageError) {
              console.error(`Error generating image for stop ${i + 1}:`, imageError);
            }
          }
          
          // Add a small delay between image requests to avoid rate limiting
          if (i < itinerary.stops.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
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
