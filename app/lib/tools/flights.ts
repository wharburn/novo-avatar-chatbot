/**
 * Flight Information Tools
 * Uses AviationStack free tier (100 requests/month)
 * https://aviationstack.com/
 */

export interface FlightInfo {
  flightNumber: string;
  airline: string;
  status: string;
  departure: {
    airport: string;
    iata: string;
    scheduled: string;
    estimated?: string;
    actual?: string;
    terminal?: string;
    gate?: string;
  };
  arrival: {
    airport: string;
    iata: string;
    scheduled: string;
    estimated?: string;
    actual?: string;
    terminal?: string;
    gate?: string;
  };
}

export interface FlightResult {
  success: boolean;
  data?: {
    flights: FlightInfo[];
    totalResults: number;
    fetchedAt: string;
  };
  error?: string;
}

/**
 * Get flight status by flight number
 * Requires AVIATIONSTACK_KEY environment variable
 * Free tier: 100 requests/month
 */
export async function getFlightStatus(flightNumber: string): Promise<FlightResult> {
  const apiKey = process.env.AVIATIONSTACK_KEY;
  
  if (!apiKey) {
    return {
      success: false,
      error: 'Flight API not configured. Add AVIATIONSTACK_KEY to environment variables. Get a free API key at https://aviationstack.com/',
    };
  }

  try {
    // Clean up flight number (remove spaces, uppercase)
    const cleanFlightNumber = flightNumber.replace(/\s+/g, '').toUpperCase();
    
    const url = new URL('http://api.aviationstack.com/v1/flights');
    url.searchParams.set('access_key', apiKey);
    url.searchParams.set('flight_iata', cleanFlightNumber);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        error: data.error.message || 'Failed to fetch flight information',
      };
    }

    if (!data.data || data.data.length === 0) {
      return {
        success: true,
        data: {
          flights: [],
          totalResults: 0,
          fetchedAt: new Date().toISOString(),
        },
      };
    }

    const flights: FlightInfo[] = data.data.map((flight: any) => ({
      flightNumber: flight.flight?.iata || cleanFlightNumber,
      airline: flight.airline?.name || 'Unknown Airline',
      status: flight.flight_status || 'unknown',
      departure: {
        airport: flight.departure?.airport || 'Unknown',
        iata: flight.departure?.iata || '',
        scheduled: flight.departure?.scheduled || '',
        estimated: flight.departure?.estimated,
        actual: flight.departure?.actual,
        terminal: flight.departure?.terminal,
        gate: flight.departure?.gate,
      },
      arrival: {
        airport: flight.arrival?.airport || 'Unknown',
        iata: flight.arrival?.iata || '',
        scheduled: flight.arrival?.scheduled || '',
        estimated: flight.arrival?.estimated,
        actual: flight.arrival?.actual,
        terminal: flight.arrival?.terminal,
        gate: flight.arrival?.gate,
      },
    }));

    return {
      success: true,
      data: {
        flights,
        totalResults: flights.length,
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch flight: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get flights by route (departure and arrival airports)
 */
export async function getFlightsByRoute(
  departureAirport: string,
  arrivalAirport: string
): Promise<FlightResult> {
  const apiKey = process.env.AVIATIONSTACK_KEY;
  
  if (!apiKey) {
    return {
      success: false,
      error: 'Flight API not configured. Add AVIATIONSTACK_KEY to environment variables.',
    };
  }

  try {
    const url = new URL('http://api.aviationstack.com/v1/flights');
    url.searchParams.set('access_key', apiKey);
    url.searchParams.set('dep_iata', departureAirport.toUpperCase());
    url.searchParams.set('arr_iata', arrivalAirport.toUpperCase());
    url.searchParams.set('limit', '10');

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        error: data.error.message || 'Failed to fetch flights',
      };
    }

    if (!data.data || data.data.length === 0) {
      return {
        success: true,
        data: {
          flights: [],
          totalResults: 0,
          fetchedAt: new Date().toISOString(),
        },
      };
    }

    const flights: FlightInfo[] = data.data.map((flight: any) => ({
      flightNumber: flight.flight?.iata || 'Unknown',
      airline: flight.airline?.name || 'Unknown Airline',
      status: flight.flight_status || 'unknown',
      departure: {
        airport: flight.departure?.airport || 'Unknown',
        iata: flight.departure?.iata || '',
        scheduled: flight.departure?.scheduled || '',
        estimated: flight.departure?.estimated,
        actual: flight.departure?.actual,
        terminal: flight.departure?.terminal,
        gate: flight.departure?.gate,
      },
      arrival: {
        airport: flight.arrival?.airport || 'Unknown',
        iata: flight.arrival?.iata || '',
        scheduled: flight.arrival?.scheduled || '',
        estimated: flight.arrival?.estimated,
        actual: flight.arrival?.actual,
        terminal: flight.arrival?.terminal,
        gate: flight.arrival?.gate,
      },
    }));

    return {
      success: true,
      data: {
        flights,
        totalResults: flights.length,
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch flights: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Format flight info for voice output
 */
export function formatFlightForVoice(flight: FlightInfo): string {
  const status = formatFlightStatus(flight.status);
  const depTime = formatFlightTime(flight.departure.scheduled);
  const arrTime = formatFlightTime(flight.arrival.scheduled);
  
  let response = `Flight ${flight.flightNumber} operated by ${flight.airline} is ${status}. `;
  response += `It departs from ${flight.departure.airport} at ${depTime}`;
  
  if (flight.departure.gate) {
    response += ` from gate ${flight.departure.gate}`;
  }
  
  response += ` and arrives at ${flight.arrival.airport} at ${arrTime}`;
  
  if (flight.arrival.gate) {
    response += ` at gate ${flight.arrival.gate}`;
  }
  
  response += '.';
  
  return response;
}

/**
 * Format flight status for natural speech
 */
function formatFlightStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'scheduled': 'scheduled and on time',
    'active': 'currently in the air',
    'landed': 'landed',
    'cancelled': 'cancelled',
    'incident': 'experiencing an incident',
    'diverted': 'diverted',
    'delayed': 'delayed',
  };
  return statusMap[status.toLowerCase()] || status;
}

/**
 * Format flight time for voice
 */
function formatFlightTime(isoTime: string): string {
  if (!isoTime) return 'time unknown';
  
  try {
    const date = new Date(isoTime);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'time unknown';
  }
}
