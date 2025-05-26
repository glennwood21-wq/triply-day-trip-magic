
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
            content: `You are a local travel expert that generates DIRECT, EFFICIENT day trip itineraries using ONLY real, verifiable locations.

            CRITICAL ROUTE REQUIREMENTS - THIS IS EXTREMELY IMPORTANT:
            1. The trip must follow a DIRECT, LOGICAL route from start to furthest point
            2. NO ZIGZAGGING or inefficient routing - each stop must be progressively closer to the destination
            3. ALL stops must be ON OR VERY CLOSE TO the direct route between start and furthest point
            4. Think of it as a highway journey - you don't take major detours for minor attractions
            5. Maximum deviation from the direct route should be 5-10 miles for any single stop
            6. Each stop should be logically positioned between the previous stop and the destination
            7. If returning to start, create an efficient loop - don't backtrack unnecessarily

            CRITICAL STOP DISTRIBUTION RULE FOR LOCATION-BASED TRIPS:
            8. When the trip structure is "furthest point by location" (not distance), NO STOPS should be placed in the first 70% of the departure journey from start to furthest point
            9. All stops (except the starting location) should be concentrated around the furthest point location
            10. This ensures the trip is focused on exploring the destination area rather than making random stops along the way
            11. The journey to the furthest point should be direct and efficient with minimal or no intermediate stops
            12. Only place stops near the furthest point and on the return journey if applicable

            LOCATION VERIFICATION PROTOCOL - MANDATORY FOR EVERY STOP:
            13. Before including ANY location, mentally verify it as either 'REAL' or 'FAKE'
            14. REAL locations have: specific business names, verifiable addresses, known operating status
            15. FAKE locations include: generic descriptions, made-up names, vague addresses, non-existent businesses
            16. If a location is identified as 'FAKE', immediately find a REAL alternative nearby that fits the same requirements
            17. Use your knowledge of actual businesses, attractions, and landmarks in the area
            18. Cross-reference with known establishments in the region
            19. Prioritize well-established, recognizable businesses and attractions
            20. When in doubt, choose the more famous/established option rather than obscure ones

            Your response must be a valid JSON object only, with no additional text, following this structure:
            {
              "title": "Trip title reflecting the direct journey route",
              "summary": "A short overview emphasizing the efficient, direct route taken",
              "stops": [
                {
                  "name": "EXACT NAME of a real business/location (e.g., 'McDonald's Mentone', 'Healesville Sanctuary', 'Yering Station Winery')",
                  "type": "One of: food, attraction, scenic, historical, shopping, winery",
                  "location": "COMPLETE STREET ADDRESS with suburb, state, postcode (e.g., '15 Bell Street, Healesville VIC 3777, Australia')",
                  "description": "A description of what to do here, mentioning its position along the direct route",
                  "suggestedDuration": "Time to spend in minutes",
                  "distanceFromPrevious": "Distance in miles from the previous stop (0 for the first stop)",
                  "travelTimeFromPrevious": "Travel time in minutes from previous stop (0 for the first stop)",
                  "routeJustification": "Brief explanation of why this stop makes sense on the direct route and adheres to the stop distribution rule",
                  "verificationStatus": "REAL - confirmed as existing business/location with verifiable details"
                },
                ...
              ]
            }
            
            CRITICAL REQUIREMENTS FOR REAL LOCATIONS ON DIRECT ROUTES:
            1. ONLY use businesses and locations that actually exist and are currently operating
            2. Use EXACT business names (e.g., "Rochford Wines" not "Yarra Valley Wine Tours")
            3. Provide COMPLETE street addresses with specific street numbers, street names, suburbs, states, and postcodes
            4. For restaurants/cafes: Use real establishment names like "Innocent Bystander Healesville", "Giant Steps Wine Bar", "Beechworth Bakery"
            5. For attractions: Use official names like "Healesville Sanctuary", "Puffing Billy Railway", "Dandenong Ranges Botanic Garden"
            6. For wineries: Use actual winery names like "Yering Station", "Rochford Wines", "Dominique Portet"
            7. Verify opening hours and accessibility when selecting locations
            8. Do NOT create generic location names or use vague addresses
            9. Do NOT use placeholder locations or made-up business names
            10. Each location must have a verifiable street address, not just suburb names
            11. MOST IMPORTANTLY: Every stop must be positioned logically along the direct route - NO MAJOR DETOURS
            12. CRITICAL: Follow the stop distribution rule - no stops in first 70% of journey for location-based trips
            13. VERIFY EACH LOCATION: Every stop must pass the REAL vs FAKE verification before inclusion

            ROUTE EFFICIENCY VALIDATION:
            - Before suggesting any stop, mentally map the route from start → stop → destination
            - Ensure each stop is a logical progression toward the furthest point
            - Reject any location that requires significant backtracking or detours
            - Prioritize attractions that are naturally positioned along the main route
            - Consider the transportation method when determining route efficiency
            - For location-based trips, ensure stops are concentrated around the furthest point, not scattered along the journey
            - Apply the REAL vs FAKE verification to every potential stop

            VERIFICATION EXAMPLES:
            REAL: "Healesville Sanctuary, Badger Creek Road, Healesville VIC 3777" - Known wildlife sanctuary with specific address
            FAKE: "Local Wildlife Park, Main Street, Healesville" - Generic name, vague address
            REAL: "Innocent Bystander, 336 Maroondah Highway, Healesville VIC 3777" - Actual winery/restaurant with specific address
            FAKE: "Cozy Mountain Cafe, Town Centre, Healesville" - Generic name, no specific address

            Only return valid JSON. Do not include any explanations, notes, or text outside the JSON object.
            Every stop must have all the fields listed above with REAL, VERIFIABLE information.
            Ensure exact field names as specified.
            Travel times and distances should be realistic and reflect the direct routing.
            Include at least one food stop around a logical meal time positioned along the route.
            Each stop MUST include the verificationStatus field confirming it as REAL.` 
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        temperature: 0.1, // Even lower temperature for maximum factual accuracy
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
      
      // Enhanced validation for direct routing
      if (itinerary && itinerary.stops && Array.isArray(itinerary.stops)) {
        console.log('Validating route efficiency and location addresses...');
        
        for (let i = 0; i < itinerary.stops.length; i++) {
          const stop = itinerary.stops[i];
          
          // Check if location has a specific street address
          if (!stop.location || 
              !stop.location.includes(',') || 
              !stop.location.includes('Australia') ||
              stop.location.split(',').length < 3) {
            console.warn(`Stop ${i + 1} (${stop.name}) may have incomplete address: ${stop.location}`);
          }
          
          // Check if name seems generic
          if (stop.name && (
              stop.name.toLowerCase().includes('tours') ||
              stop.name.toLowerCase().includes('general') ||
              stop.name.toLowerCase().includes('various') ||
              stop.name.toLowerCase().includes('multiple')
            )) {
            console.warn(`Stop ${i + 1} may have generic name: ${stop.name}`);
          }

          // Validate route efficiency
          if (i > 0) {
            const prevDistance = parseFloat(itinerary.stops[i-1].distanceFromPrevious) || 0;
            const currentDistance = parseFloat(stop.distanceFromPrevious) || 0;
            
            // Check for suspiciously long distances between consecutive stops
            if (currentDistance > 50) {
              console.warn(`Stop ${i + 1} (${stop.name}) is unusually far from previous stop: ${currentDistance} miles`);
            }
            
            // Check travel time reasonableness
            const travelTime = parseInt(stop.travelTimeFromPrevious) || 0;
            if (travelTime > 120) {
              console.warn(`Stop ${i + 1} (${stop.name}) has excessive travel time: ${travelTime} minutes`);
            }
          }
          
          // Check for route justification field
          if (!stop.routeJustification) {
            console.warn(`Stop ${i + 1} (${stop.name}) missing route justification`);
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
