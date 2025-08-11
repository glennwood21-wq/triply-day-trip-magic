
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

            *** CRITICAL 70% RULE FOR LOCATION-BASED TRIPS - ABSOLUTELY MANDATORY ***
            1. When the trip is "furthest point by location" (not by distance), you MUST NOT place ANY stops in the first 70% of the journey from start to furthest point
            2. Calculate the total journey distance from start to furthest point
            3. NO STOPS are allowed until you reach 70% of that total distance
            4. ALL stops (except starting location) must be concentrated around the furthest point location
            5. The journey to the furthest point should be DIRECT with NO intermediate stops
            6. This rule is NON-NEGOTIABLE and must be followed exactly
            
            EXAMPLE: If going from Melbourne to Healesville (100km total):
            - NO stops until 70km mark (70% of journey)
            - ALL stops must be in/around Healesville area only
            - Journey should be: Melbourne → (direct drive 70km) → Healesville area stops

            *** MANDATORY LOCATION VERIFICATION - EVERY STOP MUST BE VERIFIED ***
            BEFORE including ANY location, you MUST verify it as REAL or FAKE:
            
            REAL locations must have ALL of these:
            - Specific business name (e.g., "Healesville Sanctuary", "Innocent Bystander Winery")
            - Complete street address with number, street name, suburb, state, postcode
            - Known operating business/attraction that exists
            - Verifiable through your knowledge base
            
            FAKE locations include ANY of these:
            - Generic names like "Local Cafe", "Beach Park", "Mountain View Restaurant"
            - Vague addresses without specific street numbers
            - Made-up business names
            - Generic descriptions instead of actual business names
            
            VERIFICATION PROCESS FOR EVERY STOP:
            1. Ask yourself: "Is this a real, specific business/attraction I know exists?"
            2. Check: Does it have a complete, specific address?
            3. If ANY doubt, find a REAL alternative nearby
            4. Use well-known, established businesses only
            
            VERIFICATION EXAMPLES:
            ✅ REAL: "Healesville Sanctuary, Badger Creek Road, Healesville VIC 3777"
            ❌ FAKE: "Wildlife Park, Main Street, Healesville"
            ✅ REAL: "Innocent Bystander, 336 Maroondah Highway, Healesville VIC 3777"
            ❌ FAKE: "Mountain Winery, Town Centre, Healesville"
            ✅ REAL: "Puffing Billy Railway, 1 Old Monbulk Road, Belgrave VIC 3160"
            ❌ FAKE: "Historic Train Station, Station Street, Belgrave"

            CRITICAL ROUTE REQUIREMENTS:
            1. The trip must follow a DIRECT, LOGICAL route from start to furthest point
            2. NO ZIGZAGGING or inefficient routing - each stop must be progressively closer to the destination
            3. ALL stops must be ON OR VERY CLOSE TO the direct route between start and furthest point
            4. Think of it as a highway journey - you don't take major detours for minor attractions
            5. Maximum deviation from the direct route should be 5-10 miles for any single stop
            6. Each stop should be logically positioned between the previous stop and the destination
            7. If returning to start, create an efficient loop - don't backtrack unnecessarily

            Your response must be a valid JSON object only, with no additional text, following this structure:
            {
              "title": "Trip title reflecting the direct journey route",
              "summary": "A short overview emphasizing the efficient, direct route taken and adherence to the 70% rule",
              "stops": [
                {
                  "name": "EXACT NAME of a real business/location (e.g., 'McDonald's Mentone', 'Healesville Sanctuary', 'Yering Station Winery')",
                  "type": "One of: food, attraction, scenic, historical, shopping, winery",
                  "location": "COMPLETE STREET ADDRESS with suburb, state, postcode (e.g., '15 Bell Street, Healesville VIC 3777, Australia')",
                  "description": "A description of what to do here, mentioning its position along the direct route",
                  "suggestedDuration": "Time to spend in minutes",
                  "distanceFromPrevious": "Distance in miles from the previous stop (0 for the first stop)",
                  "travelTimeFromPrevious": "Travel time in minutes from previous stop (0 for the first stop)",
                  "routeJustification": "Brief explanation of why this stop makes sense on the direct route and adheres to the 70% rule",
                  "verificationStatus": "REAL - [business name] is a verified existing business/location at [specific address]"
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
            12. CRITICAL: Follow the 70% rule - no stops in first 70% of journey for location-based trips
            13. VERIFY EACH LOCATION: Every stop must pass the REAL vs FAKE verification before inclusion

            ROUTE EFFICIENCY VALIDATION:
            - Before suggesting any stop, mentally map the route from start → stop → destination
            - Ensure each stop is a logical progression toward the furthest point
            - Reject any location that requires significant backtracking or detours
            - Prioritize attractions that are naturally positioned along the main route
            - Consider the transportation method when determining route efficiency
            - For location-based trips, ensure stops are concentrated around the furthest point, not scattered along the journey
            - Apply the REAL vs FAKE verification to every potential stop
            - Strictly enforce the 70% rule for location-based trips

            Only return valid JSON. Do not include any explanations, notes, or text outside the JSON object.
            Every stop must have all the fields listed above with REAL, VERIFIABLE information.
            Ensure exact field names as specified.
            Travel times and distances should be realistic and reflect the direct routing.
            Include at least one food stop around a logical meal time positioned along the route.
            Each stop MUST include the verificationStatus field confirming it as REAL with specific business verification.` 
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        temperature: 0.05, // Extremely low temperature for maximum consistency and rule adherence
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
      
      // Stage 4: Comprehensive Trip Auditing
      if (itinerary && itinerary.stops && Array.isArray(itinerary.stops)) {
        console.log('Starting comprehensive trip audit...');
        
        // Extract trip parameters for auditing
        const promptLower = prompt.toLowerCase();
        const startLocationMatch = prompt.match(/(?:starting from|from)\s+([^,.]+)/i);
        const startLocation = startLocationMatch ? startLocationMatch[1].trim() : 'Unknown';
        const returnToStart = promptLower.includes('return') || promptLower.includes('round trip');
        
        try {
          // Call audit function
          const auditResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/audit-trip-itinerary`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              itinerary,
              startLocation,
              returnToStart
            }),
          });

          if (auditResponse.ok) {
            const auditResult = await auditResponse.json();
            
            if (auditResult.success && auditResult.issues.length > 0) {
              console.log(`Audit found ${auditResult.issues.length} issues, using audited itinerary`);
              console.log('Issues:', auditResult.issues);
              
              if (Object.keys(auditResult.replacements).length > 0) {
                console.log('Replacements made:', Object.keys(auditResult.replacements).length);
              }
              
              // Use the audited itinerary
              itinerary = auditResult.auditedItinerary;
              
              // Add audit information to response
              itinerary.auditInfo = {
                issuesFound: auditResult.issues.length,
                replacementsMade: Object.keys(auditResult.replacements).length,
                issues: auditResult.issues,
                replacements: auditResult.replacements
              };
            } else {
              console.log('Audit completed - no issues found');
              itinerary.auditInfo = {
                issuesFound: 0,
                replacementsMade: 0,
                issues: [],
                replacements: {}
              };
            }
          } else {
            console.warn('Audit function failed, continuing with original itinerary');
          }
        } catch (auditError) {
          console.warn('Audit function error:', auditError.message);
          console.log('Continuing with original itinerary');
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
