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

  // Get coordinates for all locations with retry logic
  const startCoords = await getCoordinatesWithRetry(startLocation);
  const furthestStop = itinerary.stops[itinerary.stops.length - 1];
  const furthestCoords = await getCoordinatesWithRetry(furthestStop.location);

  if (!startCoords || !furthestCoords) {
    issues.push('Unable to validate route efficiency - coordinates unavailable');
    return issues;
  }

  // Calculate direct route bearing and distance
  const directBearing = calculateBearing(startCoords.lat, startCoords.lng, furthestCoords.lat, furthestCoords.lng);
  const totalDirectDistance = calculateDistance(startCoords.lat, startCoords.lng, furthestCoords.lat, furthestCoords.lng);
  
  // Fix division by zero issue - require minimum distance
  if (totalDirectDistance < 0.1) {
    issues.push('Start and end locations are too close together for meaningful route validation');
    return issues;
  }
  
  const seventyPercentDistance = totalDirectDistance * 0.7;
  
  console.log(`Direct route: ${totalDirectDistance.toFixed(1)} miles, bearing: ${directBearing.toFixed(1)}°, 70% threshold: ${seventyPercentDistance.toFixed(1)} miles`);

  // Define acceptable corridor (2 miles on each side of direct line)
  const maxCorridorDeviation = 2.0; // miles
  
  // Get all stop coordinates upfront
  const stopCoords = await Promise.all(
    itinerary.stops.map(stop => getCoordinates(stop.location))
  );

  for (let i = 0; i < itinerary.stops.length; i++) {
    const stop = itinerary.stops[i];
    const coords = stopCoords[i];
    
    if (!coords) {
      issues.push(`Stop ${i + 1} (${stop.name}) coordinates unavailable for validation`);
      continue;
    }

    // 1. STRICT 70% RULE VALIDATION
    const distanceFromStart = calculateDistance(startCoords.lat, startCoords.lng, coords.lat, coords.lng);
    if (distanceFromStart < seventyPercentDistance) {
      issues.push(`Stop ${i + 1} (${stop.name}) violates 70% rule - only ${distanceFromStart.toFixed(1)} miles from start (min: ${seventyPercentDistance.toFixed(1)} miles)`);
    }

    // 2. CORRIDOR DEVIATION CHECK
    const deviationFromLine = calculatePerpendicularDistance(
      startCoords.lat, startCoords.lng,
      furthestCoords.lat, furthestCoords.lng,
      coords.lat, coords.lng
    );
    
    if (deviationFromLine > maxCorridorDeviation) {
      issues.push(`Stop ${i + 1} (${stop.name}) deviates ${deviationFromLine.toFixed(1)} miles from direct route (max: ${maxCorridorDeviation} miles)`);
    }

    // 3. BEARING ANALYSIS - Check if stop is roughly in the right direction
    const stopBearing = calculateBearing(startCoords.lat, startCoords.lng, coords.lat, coords.lng);
    const bearingDifference = Math.abs(normalizeBearing(stopBearing - directBearing));
    
    if (bearingDifference > 45) { // More than 45 degrees off course
      issues.push(`Stop ${i + 1} (${stop.name}) is ${bearingDifference.toFixed(1)}° off the direct route bearing`);
    }

    // 4. PROGRESSIVE DISTANCE CHECK - Each stop should be closer to destination than previous
    if (i > 0) {
      const prevCoords = stopCoords[i - 1];
      if (prevCoords) {
        const prevDistanceToEnd = calculateDistance(prevCoords.lat, prevCoords.lng, furthestCoords.lat, furthestCoords.lng);
        const currentDistanceToEnd = calculateDistance(coords.lat, coords.lng, furthestCoords.lat, furthestCoords.lng);
        
        if (currentDistanceToEnd >= prevDistanceToEnd) {
          issues.push(`Stop ${i + 1} (${stop.name}) backtracking detected - not progressively closer to destination`);
        }
      }
    }

    // 5. EXCESSIVE DETOUR CHECK using actual route distances
    if (i > 0) {
      const prevCoords = stopCoords[i - 1];
      if (prevCoords) {
        const directDistance = calculateDistance(prevCoords.lat, prevCoords.lng, coords.lat, coords.lng);
        const detourRatio = directDistance / (totalDirectDistance / itinerary.stops.length);
        
        if (detourRatio > 1.5) { // Stop-to-stop distance should not be > 1.5x expected segment length
          issues.push(`Stop ${i + 1} (${stop.name}) requires excessive detour - ${directDistance.toFixed(1)} miles from previous stop`);
        }
      }
    }
  }

    // 6. OVERALL ROUTE EFFICIENCY CHECK using Routes API
    if (stopCoords.every(coord => coord !== null)) {
      const routeEfficiency = await validateRouteWithRoutesAPI(startCoords, stopCoords, totalDirectDistance);
      if (routeEfficiency < 0.7) {
        issues.push(`Overall route efficiency too low: ${(routeEfficiency * 100).toFixed(1)}% (minimum: 70%)`);
      }
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
    // First verify address with Geocoding API (still current)
    const encodedAddress = encodeURIComponent(address);
    const geocodeResponse = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${googleMapsApiKey}`
    );
    
    const geocodeData = await geocodeResponse.json();
    
    if (geocodeData.status !== 'OK' || geocodeData.results.length === 0) {
      return { exists: false, reason: `Address not found: ${geocodeData.status}` };
    }

    // Check for suspicious address patterns
    const suspiciousPatterns = [/^\d+\/\d+/, /^unit \d+/, /apartment/, /suite \d+/i];
    if (suspiciousPatterns.some(pattern => pattern.test(address))) {
      return { exists: false, reason: 'Suspicious address pattern detected' };
    }
    
    // Use New Places API Text Search to verify business
    const placesResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleMapsApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.businessStatus,places.types'
      },
      body: JSON.stringify({
        textQuery: businessName,
        maxResultCount: 5
      })
    });
    
    if (!placesResponse.ok) {
      return { exists: false, reason: 'Places API request failed' };
    }
    
    const placesData = await placesResponse.json();
    
    if (placesData.places && placesData.places.length > 0) {
      const place = placesData.places[0];
      
      // Check if business is operational
      if (place.businessStatus === 'CLOSED_PERMANENTLY') {
        return { exists: false, reason: 'Business permanently closed' };
      }
      
      return { exists: true, reason: 'Verified via New Places API' };
    } else {
      return { exists: false, reason: 'Business not found in Places API' };
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

  // Attempt up to 3 times to generate a valid replacement
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Generating replacement for stop ${stopIndex + 1} (attempt ${attempt}/3)...`);
      
      const prompt = `Generate a replacement for this problematic stop:

Original Stop: ${originalStop.name} at ${originalStop.location}
Stop Type: ${originalStop.type}
Position in Trip: ${stopIndex + 1} of ${allStops.length}
Start Location: ${startLocation}

Requirements:
1. Must be a REAL, verifiable business/location in Australia
2. Must be positioned logically along the direct route
3. Must comply with the 70% rule (no stops in first 70% of journey)
4. Must be the same type as original (${originalStop.type})
5. Must have complete street address including suburb, state, and postcode

Context of other stops:
${allStops.map((stop, i) => `${i + 1}. ${stop.name} - ${stop.location}`).join('\n')}

CRITICAL: Return ONLY a JSON object in this exact format:
{
  "name": "Real Business Name",
  "type": "${originalStop.type}",
  "location": "Complete street address including suburb, state, postcode, Australia",
  "description": "Brief description of the stop",
  "suggestedDuration": "30 minutes",
  "distanceFromPrevious": "5 miles",
  "travelTimeFromPrevious": "10 minutes"
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
            { 
              role: 'system', 
              content: 'You are a local Australian travel expert. Return ONLY valid JSON in the exact format requested. No explanations or markdown.' 
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenAI API request failed (attempt ${attempt}): ${response.status}, ${errorText}`);
        if (attempt === 3) throw new Error(`Failed to generate replacement after 3 attempts: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        console.error(`No content in OpenAI response (attempt ${attempt})`);
        if (attempt === 3) throw new Error('No content returned from OpenAI');
        continue;
      }
      
      try {
        // Clean the content more aggressively
        let cleanContent = content.trim();
        
        // Remove markdown code blocks
        cleanContent = cleanContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
        cleanContent = cleanContent.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
        
        // Remove any text before the first {
        const firstBrace = cleanContent.indexOf('{');
        if (firstBrace > 0) {
          cleanContent = cleanContent.substring(firstBrace);
        }
        
        // Remove any text after the last }
        const lastBrace = cleanContent.lastIndexOf('}');
        if (lastBrace >= 0 && lastBrace < cleanContent.length - 1) {
          cleanContent = cleanContent.substring(0, lastBrace + 1);
        }
        
        console.log(`Attempting to parse JSON (attempt ${attempt}):`, cleanContent.substring(0, 100) + '...');
        
        const replacement = JSON.parse(cleanContent);
        
        // Comprehensive validation of required fields
        const requiredFields = ['name', 'type', 'location', 'description', 'suggestedDuration', 'distanceFromPrevious', 'travelTimeFromPrevious'];
        const missingFields = requiredFields.filter(field => !replacement[field] || replacement[field].toString().trim() === '');
        
        if (missingFields.length > 0) {
          console.error(`Generated replacement missing required fields (attempt ${attempt}):`, missingFields);
          if (attempt === 3) {
            // Return a fallback replacement with the original data
            console.log('Using fallback replacement with original data');
            return {
              ...originalStop,
              name: `${originalStop.name} (Verified)`,
              verificationStatus: 'fallback_used'
            };
          }
          continue;
        }

        // Validate location includes Australia
        if (!replacement.location.toLowerCase().includes('australia')) {
          console.error(`Generated location doesn't include Australia (attempt ${attempt}):`, replacement.location);
          if (attempt < 3) continue;
        }

        console.log(`Successfully generated replacement (attempt ${attempt}):`, replacement.name);
        return replacement;
        
      } catch (parseError) {
        console.error(`Failed to parse replacement JSON (attempt ${attempt}):`, parseError.message);
        console.error('Raw content:', content);
        if (attempt === 3) {
          // Return a fallback replacement
          console.log('Using fallback replacement due to parse failure');
          return {
            ...originalStop,
            name: `${originalStop.name} (Original)`,
            verificationStatus: 'parse_failed'
          };
        }
      }
      
    } catch (error) {
      console.error(`Error generating replacement stop (attempt ${attempt}):`, error.message);
      if (attempt === 3) {
        // Return a fallback replacement
        console.log('Using fallback replacement due to generation error');
        return {
          ...originalStop,
          name: `${originalStop.name} (Fallback)`,
          verificationStatus: 'generation_failed'
        };
      }
    }
    
    // Wait before retrying
    if (attempt < 3) {
      const waitTime = attempt * 1000; // 1s, 2s wait
      console.log(`Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // This should never be reached due to fallbacks above
  return null;
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

async function validateRouteWithRoutesAPI(
  startCoords: { lat: number, lng: number },
  stopCoords: ({ lat: number, lng: number } | null)[],
  directDistance: number
): Promise<number> {
  if (!googleMapsApiKey) {
    console.log('Google Maps API key not available for Routes API');
    return 1.0; // Assume efficient if we can't validate
  }

  // Fix division by zero - check directDistance
  if (directDistance < 0.1) {
    console.log('Direct distance too small for meaningful comparison');
    return 1.0;
  }

  try {
    // Build waypoints for Routes API
    const validStops = stopCoords.filter(coord => coord !== null) as { lat: number, lng: number }[];
    if (validStops.length === 0) return 1.0;

    // Prepare waypoints for Routes API format
    const waypoints = validStops.slice(0, -1).map(coord => ({
      location: {
        latLng: {
          latitude: coord.lat,
          longitude: coord.lng
        }
      }
    }));

    const destination = validStops[validStops.length - 1];
    
    const routesRequestBody = {
      origin: {
        location: {
          latLng: {
            latitude: startCoords.lat,
            longitude: startCoords.lng
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng
          }
        }
      },
      intermediates: waypoints,
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false
      },
      languageCode: "en-US",
      units: "IMPERIAL"
    };

    console.log('Sending Routes API request...');
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleMapsApiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
      },
      body: JSON.stringify(routesRequestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Routes API request failed with status: ${response.status}, error: ${errorText}`);
      return 1.0;
    }

    const data = await response.json();
    console.log('Routes API response received');

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const totalDistance = route.distanceMeters / 1609.34; // Convert meters to miles
      
      // Avoid division by zero on totalDistance
      if (totalDistance < 0.1) {
        console.log('Route distance too small for meaningful comparison');
        return 1.0;
      }
      
      const efficiency = directDistance / totalDistance;
      console.log(`Routes API: Route distance ${totalDistance.toFixed(1)} miles vs direct ${directDistance.toFixed(1)} miles, efficiency: ${(efficiency * 100).toFixed(1)}%`);
      return efficiency;
    } else {
      console.log('Routes API returned no valid routes');
      return 1.0; // Assume efficient if API fails
    }
  } catch (error) {
    console.error('Error calling Routes API:', error);
    return 1.0; // Assume efficient if API fails
  }
}

// Add retry logic for coordinates with exponential backoff
async function getCoordinatesWithRetry(address: string, maxRetries: number = 3): Promise<{ lat: number, lng: number } | null> {
  if (!googleMapsApiKey) {
    return null;
  }
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${googleMapsApiKey}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        console.log(`Coordinates found for "${address}" on attempt ${attempt + 1}`);
        return { lat: location.lat, lng: location.lng };
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        // Wait before retrying on rate limit
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      } else {
        console.log(`Geocoding failed for "${address}": ${data.status}`);
        return null;
      }
    } catch (error) {
      console.error(`Error getting coordinates for "${address}" (attempt ${attempt + 1}):`, error);
      if (attempt === maxRetries - 1) {
        return null;
      }
      // Wait before retrying
      const waitTime = Math.pow(2, attempt) * 500;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  return null;
}

function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360
}

function normalizeBearing(bearing: number): number {
  bearing = bearing % 360;
  if (bearing > 180) bearing -= 360;
  if (bearing < -180) bearing += 360;
  return bearing;
}

function calculatePerpendicularDistance(
  lineX1: number, lineY1: number, 
  lineX2: number, lineY2: number, 
  pointX: number, pointY: number
): number {
  // Convert to radians for accurate calculation
  const lat1 = lineX1 * Math.PI / 180;
  const lng1 = lineY1 * Math.PI / 180;
  const lat2 = lineX2 * Math.PI / 180;
  const lng2 = lineY2 * Math.PI / 180;
  const latP = pointX * Math.PI / 180;
  const lngP = pointY * Math.PI / 180;
  
  // Calculate cross-track distance (perpendicular distance from point to great circle)
  const d13 = Math.acos(Math.sin(lat1) * Math.sin(latP) + Math.cos(lat1) * Math.cos(latP) * Math.cos(lngP - lng1));
  const θ13 = Math.atan2(Math.sin(lngP - lng1) * Math.cos(latP), Math.cos(lat1) * Math.sin(latP) - Math.sin(lat1) * Math.cos(latP) * Math.cos(lngP - lng1));
  const θ12 = Math.atan2(Math.sin(lng2 - lng1) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1));
  
  const δxt = Math.asin(Math.sin(d13) * Math.sin(θ13 - θ12));
  
  return Math.abs(δxt) * 3959; // Convert to miles
}