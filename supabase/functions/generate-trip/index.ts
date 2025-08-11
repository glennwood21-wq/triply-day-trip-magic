
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Retrieve API keys from environment variables
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Suspicious pattern blacklist for immediate rejection
const SUSPICIOUS_PATTERNS = [
  /\b\d+\/\d+[A-Za-z]?\b/,                    // "1/1A", "1/2-4", "1/1-3"
  /\b\d+\/\d+-\d+\b/,                         // "1/2-4", "2/3-5" 
  /corner\s+of\s+\w+\s+and\s+\w+/i,          // "Corner of X and Y"
  /\blocal\s+(cafe|restaurant|bar|shop)\b/i,  // "Local Cafe"
  /\b(generic|main|central)\s+\w+/i,          // "Generic Park", "Main Street"
  /\beach\s+park\b/i,                         // "Beach Park"
  /\bmountain\s+view\s+\w+/i,                 // "Mountain View Restaurant"
  /\btown\s+(centre|center)\b/i,              // "Town Centre"
  /\bstation\s+street\b/i,                    // "Station Street" (too generic)
  /^\d+\s+\w+$/,                              // Just "123 Main" without more detail
  /\bthe\s+\w+\s+(cafe|deli|restaurant|bar)\b/i, // "The Something Cafe/Deli"
  /\b\d+[A-Za-z]?\s*-\s*\d+[A-Za-z]?\s+\w+/,     // "1-3 Something", "2A-4B Road"
];

// Real-time location verification using Google Places API
async function verifyLocationWithGooglePlaces(locationString: string): Promise<{
  isReal: boolean;
  verifiedName?: string;
  verifiedAddress?: string;
  coordinates?: { lat: number; lng: number };
  error?: string;
}> {
  try {
    console.log(`Verifying location: "${locationString}"`);
    
    const encodedLocation = encodeURIComponent(locationString);
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodedLocation}&key=${googleMapsApiKey}`;
    
    const response = await fetch(placesUrl);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const place = data.results[0];
      
      // Additional validation - check if it's a legitimate business/location
      const hasValidTypes = place.types && place.types.some((type: string) => 
        !['establishment', 'point_of_interest'].includes(type) || 
        place.types.includes('tourist_attraction') ||
        place.types.includes('restaurant') ||
        place.types.includes('store') ||
        place.types.includes('lodging')
      );
      
      if (hasValidTypes && place.business_status !== 'CLOSED_PERMANENTLY') {
        console.log(`✅ Verified: ${place.name} at ${place.formatted_address}`);
        return {
          isReal: true,
          verifiedName: place.name,
          verifiedAddress: place.formatted_address,
          coordinates: place.geometry?.location
        };
      }
    }
    
    console.log(`❌ Failed verification: "${locationString}" - ${data.status}`);
    return {
      isReal: false,
      error: `Location not found or invalid: ${data.status}`
    };
  } catch (error) {
    console.error(`Error verifying location "${locationString}":`, error);
    return {
      isReal: false,
      error: `Verification failed: ${error.message}`
    };
  }
}

// Detect suspicious patterns before API calls
function detectSuspiciousPatterns(locationString: string): boolean {
  const normalizedLocation = locationString.toLowerCase().trim();
  
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(normalizedLocation)) {
      console.log(`🚨 Suspicious pattern detected: "${locationString}" matches ${pattern}`);
      return true;
    }
  }
  
  // Additional checks
  if (normalizedLocation.length < 5) {
    console.log(`🚨 Location too short: "${locationString}"`);
    return true;
  }
  
  if (!normalizedLocation.includes(' ')) {
    console.log(`🚨 Location lacks proper formatting: "${locationString}"`);
    return true;
  }
  
  return false;
}

// Regenerate a single failed location with OpenAI
async function regenerateFailedLocation(
  originalPrompt: string,
  itinerary: any,
  failedLocationIndex: number,
  context: string,
  failureReason?: string
): Promise<{ success: boolean; newLocation?: any; error?: string }> {
  try {
    console.log(`Regenerating location at index ${failedLocationIndex}`);
    
    const failedStop = itinerary.stops[failedLocationIndex];
    
    // Create specific instructions based on failure reason
    let avoidanceInstructions = '';
    if (failureReason && failureReason.includes('suspicious pattern')) {
      avoidanceInstructions = `
*** CRITICAL: AVOID THESE EXACT PATTERNS THAT CAUSED THE FAILURE ***
- NO addresses like "1/1-3", "1/2-4", "2/3-5" or any "number/number-number" format
- NO addresses like "1-3 Something", "2A-4B Road" or "number-number" formats  
- NO generic names like "The [Something] Cafe", "The [Something] Deli"
- NO made-up unit numbers or shop numbers
- Use ONLY simple street addresses like "123 Main Street" or "45 High Street"
- Use ONLY well-known, established businesses with verified names
      `;
    }
    
    const regenerationPrompt = `
Based on this original trip request: "${originalPrompt}"

The following location failed verification and needs to be replaced:
"${failedStop.name}" at "${failedStop.location}"
Failure reason: ${failureReason || 'Failed verification'}

Context: ${context}

${avoidanceInstructions}

Please provide a single REAL, VERIFIED replacement location that:
1. Is a real, existing business/attraction (use well-known chains or landmarks if unsure)
2. Fits the same type: ${failedStop.type}
3. Is in the same general area/route
4. Has a SIMPLE, complete street address (no unit numbers, no complex formatting)
5. Follows the same route efficiency rules
6. Uses ESTABLISHED businesses (McDonald's, KFC, parks, well-known attractions)

EXAMPLES OF GOOD ADDRESSES:
- "McDonald's, 123 Main Street, Suburb VIC 3000, Australia"
- "Centennial Park, Oxford Street, Paddington NSW 2021, Australia"
- "Royal Botanic Gardens, Birdwood Avenue, Melbourne VIC 3004, Australia"

Return ONLY a JSON object with this exact structure:
{
  "name": "Exact real business name (prefer well-known brands/landmarks)",
  "type": "${failedStop.type}",
  "location": "Simple street address with suburb, state, postcode (NO unit numbers)",
  "description": "Description of what to do here",
  "suggestedDuration": "${failedStop.suggestedDuration}",
  "distanceFromPrevious": "${failedStop.distanceFromPrevious}",
  "travelTimeFromPrevious": "${failedStop.travelTimeFromPrevious}",
  "routeJustification": "Why this stop makes sense on the route",
  "verificationStatus": "REAL - [business name] is verified at [address]"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a location verification expert. Only suggest real, existing businesses with complete addresses.' },
          { role: 'user', content: regenerationPrompt }
        ],
        temperature: 0.1,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const newLocation = JSON.parse(data.choices[0].message.content);
      
      console.log(`Generated replacement: ${newLocation.name}`);
      return { success: true, newLocation };
    } else {
      return { success: false, error: 'Failed to generate replacement' };
    }
  } catch (error) {
    console.error('Error regenerating location:', error);
    return { success: false, error: error.message };
  }
}

// Parse and verify complete itinerary with regeneration
async function parseAndVerifyItinerary(content: string, originalPrompt: string): Promise<any> {
  let itinerary;
  
  try {
    itinerary = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response: ${error.message}`);
  }
  
  if (!itinerary.stops || !Array.isArray(itinerary.stops)) {
    throw new Error('Invalid itinerary format - missing stops array');
  }
  
  console.log(`🔍 Starting verification of ${itinerary.stops.length} stops`);
  
  const verificationResults = [];
  let hasFailures = false;
  
  // Phase 1: Pattern detection and initial verification
  for (let i = 0; i < itinerary.stops.length; i++) {
    const stop = itinerary.stops[i];
    
    // Check for suspicious patterns first
    const nameHasSuspiciousPattern = detectSuspiciousPatterns(stop.name);
    const locationHasSuspiciousPattern = detectSuspiciousPatterns(stop.location);
    
    if (nameHasSuspiciousPattern || locationHasSuspiciousPattern) {
      const patternDetails = nameHasSuspiciousPattern ? `name: "${stop.name}"` : `location: "${stop.location}"`;
      console.log(`❌ Stop ${i}: Failed pattern check - ${stop.name} (${patternDetails})`);
      verificationResults.push({ 
        index: i, 
        status: 'pattern_failure', 
        stop,
        failureReason: `suspicious pattern in ${patternDetails}` 
      });
      hasFailures = true;
      continue;
    }
    
    // Real-time Google Places verification
    const verification = await verifyLocationWithGooglePlaces(`${stop.name} ${stop.location}`);
    
    if (verification.isReal) {
      console.log(`✅ Stop ${i}: Verified - ${stop.name}`);
      
      // Update with verified information
      if (verification.verifiedName) stop.verifiedName = verification.verifiedName;
      if (verification.verifiedAddress) stop.verifiedAddress = verification.verifiedAddress;
      if (verification.coordinates) stop.coordinates = verification.coordinates;
      
      verificationResults.push({ index: i, status: 'verified', stop });
    } else {
      console.log(`❌ Stop ${i}: Failed verification - ${stop.name}`);
      verificationResults.push({ 
        index: i, 
        status: 'verification_failure', 
        stop, 
        error: verification.error,
        failureReason: `Google Places verification failed: ${verification.error}` 
      });
      hasFailures = true;
    }
  }
  
  // Phase 2: Regeneration loop for failed locations
  if (hasFailures) {
    console.log('🔄 Starting regeneration for failed locations');
    
    for (const result of verificationResults) {
      if (result.status === 'pattern_failure' || result.status === 'verification_failure') {
        const context = `Stop ${result.index + 1} of ${itinerary.stops.length} in ${itinerary.title}`;
        
        // Attempt regeneration up to 3 times
        let regenerationSuccess = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          console.log(`Regeneration attempt ${attempt} for stop ${result.index}`);
          
          const regeneration = await regenerateFailedLocation(
            originalPrompt,
            itinerary,
            result.index,
            context,
            result.failureReason
          );
          
          if (regeneration.success && regeneration.newLocation) {
            // First, check if regenerated location has suspicious patterns
            const regeneratedNamePattern = detectSuspiciousPatterns(regeneration.newLocation.name);
            const regeneratedLocationPattern = detectSuspiciousPatterns(regeneration.newLocation.location);
            
            if (regeneratedNamePattern || regeneratedLocationPattern) {
              const patternType = regeneratedNamePattern ? 'name' : 'location';
              console.log(`❌ Regenerated location has suspicious pattern in ${patternType} (attempt ${attempt})`);
              continue; // Try next attempt
            }
            
            // Verify the regenerated location with Google Places
            const reVerification = await verifyLocationWithGooglePlaces(
              `${regeneration.newLocation.name} ${regeneration.newLocation.location}`
            );
            
            if (reVerification.isReal) {
              console.log(`✅ Successfully regenerated stop ${result.index}: ${regeneration.newLocation.name}`);
              
              // Update with verified regenerated location
              itinerary.stops[result.index] = regeneration.newLocation;
              if (reVerification.verifiedName) itinerary.stops[result.index].verifiedName = reVerification.verifiedName;
              if (reVerification.verifiedAddress) itinerary.stops[result.index].verifiedAddress = reVerification.verifiedAddress;
              if (reVerification.coordinates) itinerary.stops[result.index].coordinates = reVerification.coordinates;
              
              regenerationSuccess = true;
              break;
            } else {
              console.log(`❌ Regenerated location failed Google Places verification (attempt ${attempt})`);
            }
          } else {
            console.log(`❌ Failed to generate replacement location (attempt ${attempt})`);
          }
        }
        
        // If all regeneration attempts failed, remove the stop
        if (!regenerationSuccess) {
          console.log(`❌ Removing failed stop ${result.index}: ${result.stop.name}`);
          itinerary.stops[result.index] = null; // Mark for removal
        }
      }
    }
    
    // Remove null stops (failed regenerations)
    itinerary.stops = itinerary.stops.filter(stop => stop !== null);
    
    // Add verification metadata
    itinerary.verificationInfo = {
      originalStopsCount: verificationResults.length,
      finalStopsCount: itinerary.stops.length,
      verificationsPerformed: verificationResults.length,
      regenerationsAttempted: verificationResults.filter(r => r.status !== 'verified').length,
      timestamp: new Date().toISOString()
    };
  }
  
  return itinerary;
}

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
    
    // Validate Google Maps API key
    if (!googleMapsApiKey) {
      console.error('Google Maps API key is not set in environment variables');
      throw new Error('Google Maps API key is not configured. Please set the GOOGLE_MAPS_API_KEY secret in your Supabase project.');
    }
    
    if (googleMapsApiKey.length < 20) {
      console.error('Google Maps API key appears to be in invalid format');
      throw new Error('Google Maps API key appears to be invalid. Please check the GOOGLE_MAPS_API_KEY secret in your Supabase project.');
    }
    
    console.log('Using valid OpenAI API key format, first 4 chars:', openAIApiKey.substring(0, 4));
    console.log('Using Google Maps API key, length:', googleMapsApiKey.length);

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
      
      // CRITICAL: Real-time verification BEFORE any other processing
      console.log('🔥 Starting REAL-TIME VERIFICATION of all locations');
      itinerary = await parseAndVerifyItinerary(content, prompt);
      
      console.log(`✅ Verification complete: ${itinerary.stops.length} verified stops`);
      if (itinerary.verificationInfo) {
        console.log(`Verification summary: ${itinerary.verificationInfo.verificationsPerformed} checks, ${itinerary.verificationInfo.regenerationsAttempted} regenerations`);
      }
      
      // Stage 4: Comprehensive Trip Auditing
      if (itinerary && itinerary.stops && Array.isArray(itinerary.stops)) {
        console.log('Starting comprehensive trip audit...');
        
        // Extract trip parameters for auditing
        const promptLower = prompt.toLowerCase();
        const startLocationMatch = prompt.match(/(?:starting from|from)\s+([^,.]+)/i);
        const startLocation = startLocationMatch ? startLocationMatch[1].trim() : 'Unknown';
        const returnToStart = promptLower.includes('return') || promptLower.includes('round trip');
        
        // Extract intended furthest point from prompt
        let intendedFurthestPoint = null;
        
        // Look for specific destination mentions with improved patterns
        const destinationPatterns = [
          /(?:furthest point|end point).*?should be\s+([^.]+)/i,
          /journey.*?to\s+([A-Za-z\s,]+)(?:\s+\d+\s*(?:miles|km))?/i,
          /approximately\s+\d+\s*miles from.*?to\s+([^.]+)/i,
          /starting from\s+([^,]+).*?to\s+([^.]+)/i, // Match "from X to Y" patterns
          /from\s+([^,]+).*?returning to/i // Match return trips
        ];
        
        for (const pattern of destinationPatterns) {
          const match = prompt.match(pattern);
          if (match) {
            // For "from X to Y" pattern, use the destination (second capture group)
            if (pattern.source.includes('starting from') && match[2]) {
              intendedFurthestPoint = match[2].trim();
              console.log('Extracted intended furthest point (from-to pattern):', intendedFurthestPoint);
              break;
            } else if (match[1]) {
              intendedFurthestPoint = match[1].trim();
              console.log('Extracted intended furthest point:', intendedFurthestPoint);
              break;
            }
          }
        }
        
        // If no specific destination found, try to extract distance-based specification
        if (!intendedFurthestPoint) {
          const distanceMatch = prompt.match(/approximately\s+(\d+)\s*miles.*?from\s+([^.]+)/i);
          if (distanceMatch) {
            const distance = parseInt(distanceMatch[1]);
            const fromLocation = distanceMatch[2].trim();
            intendedFurthestPoint = `${distance} miles from ${fromLocation}`;
            console.log('Extracted distance-based furthest point:', intendedFurthestPoint);
          }
        }
        
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
              returnToStart,
              intendedFurthestPoint
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
