import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Get environment variables
const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TripStop {
  name: string;
  type: string;
  location: string;
  description: string;
  suggestedDuration: string;
  distanceFromPrevious: string;
  travelTimeFromPrevious: string;
  routeJustification?: string;
  verificationStatus?: string;
}

interface TripItinerary {
  title: string;
  summary: string;
  stops: TripStop[];
}

interface AuditRequest {
  itinerary: TripItinerary;
  startLocation: string;
  returnToStart: boolean;
}

interface AuditResult {
  success: boolean;
  issues: string[];
  replacements: { [key: number]: TripStop };
  auditedItinerary: TripItinerary;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { itinerary, startLocation, returnToStart }: AuditRequest = await req.json();
    
    console.log('Starting trip audit for itinerary with', itinerary.stops.length, 'stops');
    
    const auditResult: AuditResult = {
      success: true,
      issues: [],
      replacements: {},
      auditedItinerary: { ...itinerary }
    };

    // Stage 1: Route Efficiency Validation
    console.log('Stage 1: Validating route efficiency...');
    const routeIssues = await validateRouteEfficiency(itinerary, startLocation, returnToStart);
    auditResult.issues.push(...routeIssues);

    // Stage 2: Location Verification
    console.log('Stage 2: Verifying locations...');
    const locationIssues = await verifyLocations(itinerary);
    auditResult.issues.push(...locationIssues);

    // Stage 3: Replace Errant Stops
    if (auditResult.issues.length > 0) {
      console.log('Stage 3: Replacing errant stops...');
      const replacementResult = await replaceErrantStops(itinerary, startLocation, auditResult.issues);
      auditResult.replacements = replacementResult.replacements;
      auditResult.auditedItinerary = replacementResult.updatedItinerary;
    }

    console.log('Audit completed with', auditResult.issues.length, 'issues found');
    
    return new Response(JSON.stringify(auditResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in audit-trip-itinerary function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function validateRouteEfficiency(itinerary: TripItinerary, startLocation: string, returnToStart: boolean): Promise<string[]> {
  const issues: string[] = [];
  
  if (!itinerary.stops || itinerary.stops.length === 0) {
    return issues;
  }

  // Get coordinates for start location and furthest point
  const startCoords = await getCoordinates(startLocation);
  const furthestStop = itinerary.stops[itinerary.stops.length - 1];
  const furthestCoords = await getCoordinates(furthestStop.location);

  if (!startCoords || !furthestCoords) {
    issues.push('Unable to validate route efficiency - coordinates unavailable');
    return issues;
  }

  const totalDistance = calculateDistance(startCoords.lat, startCoords.lng, furthestCoords.lat, furthestCoords.lng);
  const seventyPercentDistance = totalDistance * 0.7;

  console.log(`Total distance: ${totalDistance} miles, 70% threshold: ${seventyPercentDistance} miles`);

  // Check 70% rule for each stop
  let cumulativeDistance = 0;
  for (let i = 0; i < itinerary.stops.length; i++) {
    const stop = itinerary.stops[i];
    const stopCoords = await getCoordinates(stop.location);
    
    if (stopCoords && startCoords) {
      const distanceFromStart = calculateDistance(startCoords.lat, startCoords.lng, stopCoords.lat, stopCoords.lng);
      
      if (distanceFromStart < seventyPercentDistance) {
        issues.push(`Stop ${i + 1} (${stop.name}) violates 70% rule - only ${distanceFromStart.toFixed(1)} miles from start (threshold: ${seventyPercentDistance.toFixed(1)} miles)`);
      }

      // Check for zig-zagging by comparing distances
      if (i > 0) {
        const prevStop = itinerary.stops[i - 1];
        const prevCoords = await getCoordinates(prevStop.location);
        
        if (prevCoords) {
          const directRouteDistance = calculateDistance(prevCoords.lat, prevCoords.lng, furthestCoords.lat, furthestCoords.lng);
          const viaStopDistance = calculateDistance(prevCoords.lat, prevCoords.lng, stopCoords.lat, stopCoords.lng) + 
                                  calculateDistance(stopCoords.lat, stopCoords.lng, furthestCoords.lat, furthestCoords.lng);
          
          const deviation = viaStopDistance - directRouteDistance;
          if (deviation > 10) { // More than 10 mile deviation
            issues.push(`Stop ${i + 1} (${stop.name}) causes ${deviation.toFixed(1)} mile deviation from direct route`);
          }
        }
      }
    }
    
    cumulativeDistance += parseFloat(stop.distanceFromPrevious) || 0;
  }

  return issues;
}

async function verifyLocations(itinerary: TripItinerary): Promise<string[]> {
  const issues: string[] = [];
  
  if (!googleMapsApiKey) {
    issues.push('Google Maps API key not available for location verification');
    return issues;
  }

  for (let i = 0; i < itinerary.stops.length; i++) {
    const stop = itinerary.stops[i];
    
    // Check for generic names
    const genericKeywords = ['cafe', 'restaurant', 'park', 'lookout', 'beach', 'winery', 'tours'];
    const isGeneric = genericKeywords.some(keyword => 
      stop.name.toLowerCase().includes(keyword) && 
      !stop.name.includes(' ') // Single word names are more likely to be generic
    );
    
    if (isGeneric) {
      issues.push(`Stop ${i + 1} (${stop.name}) appears to have a generic name`);
    }

    // Verify location exists using Google Places API
    const verificationResult = await verifyLocationExists(stop.location, stop.name);
    if (!verificationResult.exists) {
      issues.push(`Stop ${i + 1} (${stop.name}) could not be verified: ${verificationResult.reason}`);
    }

    // Check address completeness
    const addressParts = stop.location.split(',').map(part => part.trim());
    if (addressParts.length < 4 || !stop.location.includes('Australia')) {
      issues.push(`Stop ${i + 1} (${stop.name}) has incomplete address: ${stop.location}`);
    }
  }

  return issues;
}

async function verifyLocationExists(address: string, businessName: string): Promise<{ exists: boolean, reason: string }> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${googleMapsApiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      // Additional check for business name if available
      const placesResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(businessName)}&inputtype=textquery&key=${googleMapsApiKey}`
      );
      
      const placesData = await placesResponse.json();
      
      if (placesData.status === 'OK' && placesData.candidates.length > 0) {
        return { exists: true, reason: 'Verified via Google Places' };
      } else {
        return { exists: false, reason: 'Business name not found in Google Places' };
      }
    } else {
      return { exists: false, reason: `Geocoding failed: ${data.status}` };
    }
  } catch (error) {
    return { exists: false, reason: `Verification error: ${error.message}` };
  }
}

async function replaceErrantStops(
  itinerary: TripItinerary, 
  startLocation: string, 
  issues: string[]
): Promise<{ replacements: { [key: number]: TripStop }, updatedItinerary: TripItinerary }> {
  
  const replacements: { [key: number]: TripStop } = {};
  const updatedItinerary: TripItinerary = { ...itinerary, stops: [...itinerary.stops] };
  
  // Identify which stops need replacement based on issues
  const stopsToReplace: number[] = [];
  issues.forEach(issue => {
    const match = issue.match(/Stop (\d+)/);
    if (match) {
      const stopIndex = parseInt(match[1]) - 1;
      if (!stopsToReplace.includes(stopIndex)) {
        stopsToReplace.push(stopIndex);
      }
    }
  });

  console.log('Replacing stops:', stopsToReplace);

  // For each problematic stop, generate a replacement
  for (const stopIndex of stopsToReplace) {
    if (stopIndex >= 0 && stopIndex < updatedItinerary.stops.length) {
      const originalStop = updatedItinerary.stops[stopIndex];
      
      // Generate replacement stop using AI
      const replacement = await generateReplacementStop(
        originalStop, 
        startLocation, 
        updatedItinerary.stops,
        stopIndex
      );
      
      if (replacement) {
        replacements[stopIndex] = replacement;
        updatedItinerary.stops[stopIndex] = replacement;
        console.log(`Replaced stop ${stopIndex + 1}: ${originalStop.name} → ${replacement.name}`);
      }
    }
  }

  return { replacements, updatedItinerary };
}

async function generateReplacementStop(
  originalStop: TripStop,
  startLocation: string,
  allStops: TripStop[],
  stopIndex: number
): Promise<TripStop | null> {
  
  if (!openAIApiKey) {
    console.error('OpenAI API key not available for generating replacement');
    return null;
  }

  try {
    const prompt = `Generate a replacement for this problematic stop:

Original Stop: ${originalStop.name} at ${originalStop.location}
Stop Type: ${originalStop.type}
Position in Trip: ${stopIndex + 1} of ${allStops.length}
Start Location: ${startLocation}

Requirements:
1. Must be a REAL, verifiable business/location
2. Must be positioned logically along the direct route
3. Must comply with the 70% rule (no stops in first 70% of journey)
4. Must be the same type as original (${originalStop.type})
5. Must have complete street address

Context of other stops:
${allStops.map((stop, i) => `${i + 1}. ${stop.name} - ${stop.location}`).join('\n')}

Return ONLY a JSON object with the same structure as the original stop, ensuring all fields are filled with REAL, verified information.`;

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
            content: 'You are a local travel expert that only suggests REAL, verified locations with complete addresses. Return only valid JSON.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate replacement');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const replacement = JSON.parse(content);
      
      // Validate replacement has required fields
      if (replacement.name && replacement.location && replacement.type) {
        return replacement;
      } else {
        console.error('Generated replacement missing required fields');
        return null;
      }
    } catch (parseError) {
      console.error('Failed to parse replacement JSON:', parseError);
      return null;
    }
    
  } catch (error) {
    console.error('Error generating replacement stop:', error);
    return null;
  }
}

async function getCoordinates(address: string): Promise<{ lat: number, lng: number } | null> {
  if (!googleMapsApiKey) {
    return null;
  }
  
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${googleMapsApiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting coordinates:', error);
    return null;
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}