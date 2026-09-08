import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI, Type } from '@google/genai';
import { handleOperationsRequest } from './routes/operationsRouter.ts';

interface IncidentAnalysisPayload {
  typed_description?: string;
  description?: string;
  hazard_category?: string;
  type?: string;
  reported_severity?: string;
  severity?: string;
  voice_transcript?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  location_name?: string;
  timestamp?: string;
  vehicle_id?: string;
  vehicle_type?: string;
  cargo_category?: string;
  cargo_sensitivity?: string;
  priority?: string;
  photo?: {
    data: string; // base64
    mimeType: string;
  } | null;
}

const RUNTIME_MODEL = 'gemini-3.6-flash';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    detected_language: {
      type: Type.STRING,
      description: 'Detected language of the report (e.g., English, Assamese, Manipuri, Bengali, Hindi)',
    },
    english_summary: {
      type: Type.STRING,
      description: 'Concise, objective operational summary in English synthesized from current driver input',
    },
    hazard_category: {
      type: Type.STRING,
      enum: [
        'landslide',
        'flood',
        'rockfall',
        'road_washout',
        'bridge_damage',
        'tree_fall',
        'vehicle_accident',
        'severe_weather',
        'road_closure',
        'pothole_surface',
        'fire_smoke',
        'other',
      ],
      description: 'Authoritative classification of the hazard type based strictly on current report evidence',
    },
    road_impact: {
      type: Type.STRING,
      enum: ['partially_blocked', 'fully_blocked', 'single_lane', 'caution', 'bridge_impassable'],
      description: 'Impact on road transit capacity',
    },
    estimated_severity: {
      type: Type.STRING,
      enum: ['low', 'moderate', 'high', 'critical'],
      description: 'Severity level derived from physical transit disruption extent',
    },
    extracted_entities: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Geographic and corridor entities extracted from text (e.g. NH-2, Mao Gate, km 312, boulders)',
    },
    recommended_action: {
      type: Type.STRING,
      description: 'Action recommendation for SDMA triage and approaching freight transports',
    },
    verification_priority: {
      type: Type.STRING,
      enum: ['critical', 'high', 'medium', 'low'],
      description: 'Recommended priority for human SDMA officer review',
    },
    confidence_score: {
      type: Type.NUMBER,
      description: 'Confidence score from 0.0 to 1.0 based on factual detail and evidence completeness',
    },
  },
  required: [
    'detected_language',
    'english_summary',
    'hazard_category',
    'road_impact',
    'estimated_severity',
    'extracted_entities',
    'recommended_action',
    'verification_priority',
    'confidence_score',
  ],
};

const SYSTEM_INSTRUCTION = `You are the authoritative AI Incident Intelligence Analyst for the NER-LOGIX Smart Logistics Platform in Northeast India (MDoNER).
Your mission is to analyze real-time field reports submitted by freight drivers encountering mountain corridor impediments (landslides, flash floods, washouts, rockfalls, fallen trees, bridge structural faults, vehicle breakdowns/accidents) across key corridors such as NH-2, NH-29, NH-102, and NH-37.

CRITICAL OPERATIONAL RULES:
1. STRICT CURRENT INPUT FIDELITY:
   Analyze the CURRENT report evidence provided in the prompt.
   Never assume, hallucinate, or substitute demo incident text.
2. NEGATION & FALSE ALARM HANDLING:
   If the report explicitly states that a hazard is NOT present (e.g. "There is no tree fall or landslide in this report", "no flood", "no accident", "road is clear"), or if it contains unrelated/test statements (such as naming celebrities or arbitrary test sentences), YOU MUST NOT classify it as that hazard.
   Instead, classify non-hazard test reports or benign messages as hazard_category="other", estimated_severity="low", road_impact="caution", verification_priority="low".
3. MULTI-LINGUAL SUPPORT:
   Accurately detect Northeast Indian regional languages (Assamese, Manipuri/Meitei, Bengali, Hindi, English). Synthesize a clean, professional English operational summary regardless of the input language.
4. CORRIDOR & ENTITY EXTRACTION:
   Extract all mentioned highway corridors (e.g. NH-2), landmarks (e.g. Mao Gate, Kohima), mileposts, and physical descriptors (e.g. heavy shale, scree, mud slurry).
5. HUMAN-IN-THE-LOOP ADVISORY:
   Your classification is an ADVISORY RECOMMENDATION for the State Disaster Management Authority (SDMA). Human officers make the final binding verification.
6. HONEST CONFIDENCE:
   Provide an honest confidence_score between 0.0 and 1.0 reflecting how clear, specific, and grounded the provided evidence is.`;

async function readRequestBody(req: IncomingMessage): Promise<string> {
  if ((req as any).body) {
    const b = (req as any).body;
    return typeof b === 'string' ? b : JSON.stringify(b);
  }
  if (req.readableEnded) {
    return '';
  }
  const contentLengthHeader = req.headers['content-length'];
  const expectedLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;

  return new Promise((resolve, reject) => {
    let body = '';
    let resolved = false;

    const doResolve = (content: string) => {
      if (!resolved) {
        resolved = true;
        resolve(content);
      }
    };

    const timer = setTimeout(() => {
      doResolve(body);
    }, 4000);

    req.on('data', (chunk) => {
      body += chunk;
      if (expectedLength !== null && body.length >= expectedLength) {
        clearTimeout(timer);
        doResolve(body);
      }
      if (body.length > 15 * 1024 * 1024) {
        clearTimeout(timer);
        req.destroy();
        reject(new Error('Request payload too large'));
      }
    });
    req.on('end', () => {
      clearTimeout(timer);
      doResolve(body);
    });
    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function sendJsonResponse(res: ServerResponse, statusCode: number, data: unknown) {
  const jsonStr = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
  });
  res.end(jsonStr);
}

async function generateWithRetry(ai: GoogleGenAI, params: any, maxRetries = 2): Promise<any> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isTransient =
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('high demand') ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED');

      if (isTransient && attempt < maxRetries) {
        attempt++;
        await new Promise((r) => setTimeout(r, 600 * attempt));
        continue;
      }
      throw err;
    }
  }
}

async function handleIncidentAnalysisRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const rawBody = await readRequestBody(req);
    let payload: IncidentAnalysisPayload = {};
    if (rawBody.trim()) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        payload = {};
      }
    }

    const description = (payload.typed_description || payload.description || '').trim();
    const hazardCategory = payload.hazard_category || payload.type || 'other';
    const reportedSeverity = payload.reported_severity || payload.severity || 'high';
    const voiceTranscript = (payload.voice_transcript || '').trim();
    const lat = payload.latitude;
    const lng = payload.longitude;
    const accuracy = payload.accuracy;
    const locationName = payload.location_name || 'Mountain Corridor';
    const vehicleId = payload.vehicle_id || 'AS-01-J-4422';
    const vehicleType = payload.vehicle_type || 'Heavy Multi-Axle';
    const cargo = payload.cargo_category || 'General Freight';
    const sensitivity = payload.cargo_sensitivity || 'Standard';
    const priority = payload.priority || 'Standard';
    const photo = payload.photo;

    const ai = getGeminiClient();
    if (!ai) {
      sendJsonResponse(res, 503, {
        ok: false,
        provider: 'Gemini AI',
        model: RUNTIME_MODEL,
        error: 'GEMINI_API_KEY is not configured on server',
        fallback_recommended: true,
      });
      return;
    }

    // Construct contents
    const promptText = `ANALYZE THIS CURRENT FIELD INCIDENT REPORT:
- Driver Typed Description: "${description || '(No text typed by driver)'}"
- Driver Selected Hazard Category: "${hazardCategory}"
- Driver Reported Severity: "${reportedSeverity}"
- Driver Voice Audio Transcript: "${voiceTranscript || 'None provided (audio memo only or no speech transcript)'}"
- GPS Telemetry: Lat ${lat ?? 25.32}, Lng ${lng ?? 93.55} (Location: "${locationName}", Accuracy: ${accuracy ?? 10}m)
- Vehicle & Cargo Context: Vehicle ${vehicleId} (${vehicleType}), Cargo: ${cargo}, Sensitivity: ${sensitivity}, Priority: ${priority}
- Timestamp: "${payload.timestamp || new Date().toISOString()}"
${photo?.data ? '- Real Visual Evidence: Photo attached (see inline image part)' : '- Visual Evidence: No photo attached'}`;

    const parts: any[] = [];

    // If real photo attached, add inlineData
    if (photo && photo.data && photo.mimeType) {
      const base64Clean = photo.data.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: photo.mimeType,
          data: base64Clean,
        },
      });
    }

    parts.push({ text: promptText });

    const response = await generateWithRetry(ai, {
      model: RUNTIME_MODEL,
      contents: parts.length === 1 ? parts[0].text : { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const textOutput = response.text || '{}';
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(textOutput);
    } catch (parseErr) {
      console.error('[Gemini AI Parse Error]: Invalid JSON from model', parseErr);
      sendJsonResponse(res, 502, {
        ok: false,
        provider: 'Gemini AI',
        model: RUNTIME_MODEL,
        error: 'Invalid JSON response from Gemini model',
        fallback_recommended: true,
      });
      return;
    }

    const result = {
      ok: true,
      provider: 'Gemini AI',
      model: RUNTIME_MODEL,
      status_label: 'Gemini AI · Live',
      timestamp: new Date().toISOString(),
      data: {
        detected_language: parsedData.detected_language || 'English',
        original_text: description || voiceTranscript,
        english_summary: parsedData.english_summary || description,
        hazard_category: parsedData.hazard_category || hazardCategory,
        estimated_severity: parsedData.estimated_severity || reportedSeverity,
        road_impact: parsedData.road_impact || 'partially_blocked',
        extracted_entities: parsedData.extracted_entities || [],
        recommended_action: parsedData.recommended_action || 'SDMA verification required',
        verification_priority: parsedData.verification_priority || 'high',
        confidence_score:
          typeof parsedData.confidence_score === 'number'
            ? parsedData.confidence_score
            : 0.95,
        provider: 'Gemini AI',
        model: RUNTIME_MODEL,
        timestamp: new Date().toISOString(),
      },
    };

    sendJsonResponse(res, 200, result);
  } catch (error: any) {
    console.error('[Gemini AI Server Exception]:', error?.message || error);
    sendJsonResponse(res, 500, {
      ok: false,
      provider: 'Gemini AI',
      model: RUNTIME_MODEL,
      error: error?.message || 'Server error communicating with Gemini API',
      fallback_recommended: true,
    });
  }
}

export function geminiAiServerPlugin(): Plugin {
  return {
    name: 'ner-logix-gemini-ai-endpoint',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] || '';

        // CORS preflight
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, PATCH, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, X-Requested-With',
          });
          res.end();
          return;
        }

        // 1. Shared Operational Backend Routes
        const isHandled = await handleOperationsRequest(req, res);
        if (isHandled) {
          return;
        }

        // 2. Gemini AI Health endpoint
        if (req.method === 'GET' && url === '/api/v1/ai/health') {
          const hasKey = Boolean(process.env.GEMINI_API_KEY);
          sendJsonResponse(res, 200, {
            status: 'ok',
            service: 'ner-logix-gemini-server',
            model: RUNTIME_MODEL,
            apiKeyConfigured: hasKey,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // 3. Incident Analysis endpoint (Step 7 Live Gemini)
        if (
          req.method === 'POST' &&
          (url === '/api/v1/ai/analyze-incident' || url === '/api/analyze-incident')
        ) {
          await handleIncidentAnalysisRequest(req, res);
          return;
        }

        next();
      });
    },

    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] || '';
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, PATCH, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, X-Requested-With',
          });
          res.end();
          return;
        }

        const isHandled = await handleOperationsRequest(req, res);
        if (isHandled) {
          return;
        }

        if (req.method === 'GET' && url === '/api/v1/ai/health') {
          sendJsonResponse(res, 200, {
            status: 'ok',
            service: 'ner-logix-gemini-server',
            model: RUNTIME_MODEL,
            apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (
          req.method === 'POST' &&
          (url === '/api/v1/ai/analyze-incident' || url === '/api/analyze-incident')
        ) {
          await handleIncidentAnalysisRequest(req, res);
          return;
        }
        next();
      });
    },
  };
}
