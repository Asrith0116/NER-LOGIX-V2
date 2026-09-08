import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI, Type } from '@google/genai';
import Groq from 'groq-sdk';
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
const GROQ_MODEL = 'qwen/qwen3.6-27b';
const GROQ_FALLBACK_MODEL = 'openai/gpt-oss-20b';

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

function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Groq({ apiKey });
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
      enum: ['partially_blocked', 'fully_blocked', 'single_lane', 'caution', 'bridge_impassable', 'none'],
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

async function generateWithRetry(ai: GoogleGenAI, params: any, maxRetries = 1): Promise<any> {
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
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }
      throw err;
    }
  }
}

async function generateWithGroq(client: Groq, payload: IncidentAnalysisPayload): Promise<any> {
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

  const promptText = `ANALYZE THIS CURRENT FIELD INCIDENT REPORT:
- Driver Typed Description: "${description || '(No text typed by driver)'}"
- Driver Selected Hazard Category: "${hazardCategory}"
- Driver Reported Severity: "${reportedSeverity}"
- Driver Voice Audio Transcript: "${voiceTranscript || 'None provided (audio memo only or no speech transcript)'}"
- GPS Telemetry: Lat ${lat ?? 25.32}, Lng ${lng ?? 93.55} (Location: "${locationName}", Accuracy: ${accuracy ?? 10}m)
- Vehicle & Cargo Context: Vehicle ${vehicleId} (${vehicleType}), Cargo: ${cargo}, Sensitivity: ${sensitivity}, Priority: ${priority}
- Timestamp: "${payload.timestamp || new Date().toISOString()}"
${photo?.data ? '- Real Visual Evidence: Photo attached in message' : '- Visual Evidence: No photo attached'}

YOU MUST OUTPUT ONLY VALID JSON WITH THE FOLLOWING EXACT KEYS:
{
  "detected_language": "Detected language (e.g., English, Assamese, Manipuri, Bengali, Hindi)",
  "english_summary": "Concise operational summary in English synthesized from current input",
  "hazard_category": "One of: landslide, flood, rockfall, road_washout, bridge_damage, tree_fall, vehicle_accident, severe_weather, road_closure, pothole_surface, fire_smoke, other",
  "road_impact": "One of: partially_blocked, fully_blocked, single_lane, caution, bridge_impassable",
  "estimated_severity": "One of: low, moderate, high, critical",
  "extracted_entities": ["array of corridor/location entities extracted"],
  "recommended_action": "Operational recommendation for SDMA triage",
  "verification_priority": "One of: critical, high, medium, low",
  "confidence_score": 0.90
}`;

  let selectedModel = GROQ_MODEL;
  let completion: any;

  const messages: any[] = [
    {
      role: 'system',
      content: SYSTEM_INSTRUCTION + '\nYou MUST respond ONLY with a raw valid JSON object. Do not include markdown formatting or backticks.',
    },
  ];

  if (photo && photo.data && photo.mimeType) {
    const base64Clean = photo.data.replace(/^data:[^;]+;base64,/, '');
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: promptText },
        {
          type: 'image_url',
          image_url: {
            url: `data:${photo.mimeType};base64,${base64Clean}`,
          },
        },
      ],
    });
  } else {
    messages.push({
      role: 'user',
      content: promptText,
    });
  }

  try {
    completion = await client.chat.completions.create({
      model: selectedModel,
      messages,
      temperature: 0.1,
      max_tokens: 600,
    });
  } catch (err: any) {
    console.warn(`[Groq AI Provider]: Model ${selectedModel} failed (${err?.message || err}). Retrying with ${GROQ_FALLBACK_MODEL}...`);
    selectedModel = GROQ_FALLBACK_MODEL;
    completion = await client.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: SYSTEM_INSTRUCTION + '\nYou MUST respond ONLY with a raw valid JSON object. Do not wrap in markdown or backticks.',
        },
        {
          role: 'user',
          content: promptText,
        },
      ],
      temperature: 0.1,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });
  }

  const rawContent = completion.choices[0]?.message?.content || '{}';
  const cleanContent = rawContent
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```json/gi, '')
    .replace(/```/gi, '')
    .trim();

  const jsonStart = cleanContent.indexOf('{');
  const jsonEnd = cleanContent.lastIndexOf('}');
  const cleanJsonStr = jsonStart !== -1 && jsonEnd !== -1 ? cleanContent.substring(jsonStart, jsonEnd + 1) : cleanContent;

  let parsed: any = {};
  try {
    parsed = JSON.parse(cleanJsonStr);
  } catch (err: any) {
    console.warn('[Groq AI Provider]: Failed to parse JSON response:', err?.message || err);
    parsed = {};
  }

  const parsedHazardCategory = parsed.hazard_category || hazardCategory;
  let parsedRoadImpact = parsed.road_impact || 'partially_blocked';
  if (parsedHazardCategory === 'other' || parsedRoadImpact === 'none') {
    parsedRoadImpact = 'none';
  }

  let extractedEntitiesArr: string[] = [];
  if (Array.isArray(parsed.extracted_entities)) {
    extractedEntitiesArr = parsed.extracted_entities.map((e: any) =>
      typeof e === 'string' ? e : JSON.stringify(e)
    );
  } else if (parsed.extracted_entities && typeof parsed.extracted_entities === 'object') {
    extractedEntitiesArr = Object.values(parsed.extracted_entities).flatMap((val: any) =>
      Array.isArray(val) ? val : [String(val)]
    );
  }

  return {
    ok: true,
    provider: 'Groq AI',
    model: selectedModel,
    status_label: 'Groq · Live',
    timestamp: new Date().toISOString(),
    data: {
      detected_language: parsed.detected_language || 'English',
      original_text: description || voiceTranscript,
      english_summary: parsed.english_summary || description || 'Corridor report analyzed by Groq AI.',
      hazard_category: parsedHazardCategory,
      estimated_severity: parsedHazardCategory === 'other' ? 'low' : (parsed.estimated_severity || reportedSeverity),
      road_impact: parsedRoadImpact,
      extracted_entities: extractedEntitiesArr,
      recommended_action: parsed.recommended_action || (parsedHazardCategory === 'other' ? 'Driver advisory logged. No emergency diversion required.' : 'SDMA verification required'),
      verification_priority: parsedHazardCategory === 'other' ? 'low' : (parsed.verification_priority || 'high'),
      confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 0.90,
      provider: 'Groq AI',
      model: selectedModel,
      timestamp: new Date().toISOString(),
    },
  };
}

function generateDeterministicFallback(payload: IncidentAnalysisPayload): any {
  const description = (payload.typed_description || payload.description || '').trim();
  const voiceTranscript = (payload.voice_transcript || '').trim();
  const combinedText = description || voiceTranscript || '';
  const lower = combinedText.toLowerCase();

  let detectedLanguage = 'English';
  if (/[\u0980-\u09FF]/.test(combinedText)) {
    if (/ৰ|ৱ/.test(combinedText)) detectedLanguage = 'Assamese (অসমীয়া)';
    else if (/মৈতৈ/.test(combinedText)) detectedLanguage = 'Manipuri (মৈতৈলোন্)';
    else detectedLanguage = 'Bengali (বাংলা)';
  } else if (/[\u0900-\u097F]/.test(combinedText)) {
    detectedLanguage = 'Hindi (हिन्दी)';
  }

  const candidateHazards = [
    { type: 'road_washout', re: /washout|washed|erosion|sinkhole/i },
    { type: 'flood', re: /flood|waterlog|river\s+overflow|overflow|ইশিং|পানী|बाढ़/i },
    { type: 'bridge_damage', re: /bridge|cracked\s+pier|abutment|থোং|দলং|पুল/i },
    { type: 'rockfall', re: /rockfall|boulder|falling\s+rocks|scree|rocks?|shale|নুং|শিল|पत्थर/i },
    { type: 'tree_fall', re: /tree\s*fall|fallen\s+tree|tree|branch|powerline|electric\s+pole/i },
    { type: 'vehicle_accident', re: /accident|collision|overturn|truck\s+breakdown/i },
    { type: 'fire_smoke', re: /forest\s+fire|smoke|blaze|fire/i },
    { type: 'road_closure', re: /curfew|strike|blockade|checkpoint|bandh|road\s*block/i },
    { type: 'pothole_surface', re: /pothole|crater|surface\s+damage/i },
    { type: 'severe_weather', re: /dense\s+fog|cloudburst|cyclone|storm/i },
    { type: 'landslide', re: /landslide|mudslip|slope\s+failure|rock\s*slide|পাহাৰ|লৈবাক|भूस्खलन|ধল/i },
  ];

  let classifiedCategory = 'other';
  let matchedPositively = false;

  for (const h of candidateHazards) {
    if (h.re.test(combinedText)) {
      const isNegated = new RegExp(`(?:no|not|never|without|free of|zero)\\s+(?:any\\s+)?(?:[\\w-]+\\s+){0,3}${h.re.source}`, 'i').test(combinedText);
      if (!isNegated) {
        classifiedCategory = h.type;
        matchedPositively = true;
        break;
      }
    }
  }

  if (!matchedPositively && payload.hazard_category && payload.hazard_category !== 'other') {
    if (combinedText.length === 0) {
      classifiedCategory = payload.hazard_category;
    }
  }

  let severity = 'low';
  let roadImpact = 'none';

  const isCompleteBlock =
    lower.includes('completely blocked') ||
    lower.includes('fully blocked') ||
    lower.includes('impassable') ||
    lower.includes('washed out') ||
    lower.includes('closed') ||
    lower.includes('road block') ||
    lower.includes('roadblock') ||
    lower.includes('blocked') ||
    lower.includes('बंद') ||
    lower.includes('বন্ধ');
  const isSingleLane =
    lower.includes('single lane') ||
    lower.includes('one lane') ||
    lower.includes('partial') ||
    lower.includes('slow');

  if (classifiedCategory === 'other') {
    severity = 'low';
    roadImpact = 'none';
  } else if (isCompleteBlock || classifiedCategory === 'bridge_damage' || classifiedCategory === 'road_washout') {
    severity = 'critical';
    roadImpact = classifiedCategory === 'bridge_damage' ? 'bridge_impassable' : 'fully_blocked';
  } else if (isSingleLane) {
    severity = 'moderate';
    roadImpact = 'single_lane';
  } else {
    severity = payload.reported_severity || 'high';
    roadImpact = severity === 'critical' ? 'fully_blocked' : 'partially_blocked';
  }

  const entities: string[] = [];
  const nhMatch = combinedText.match(/(?:NH|Route)[\s-]?\d+[A-Z]?/i);
  if (nhMatch) entities.push(nhMatch[0].toUpperCase());
  if (lower.includes('mao gate')) entities.push('Mao Gate');
  if (payload.location_name && classifiedCategory !== 'other') entities.push(payload.location_name);

  const summary = combinedText
    ? classifiedCategory === 'other'
      ? `Driver report note: ${combinedText} (Non-hazard / unclassified submission).`
      : combinedText
    : `Field observation reported near ${payload.location_name || 'transit corridor'}.`;

  return {
    ok: true,
    provider: 'Local NLP · Deterministic Fallback',
    model: 'local-deterministic-nlp',
    status_label: 'NER-LOGIX Heuristic · Offline',
    timestamp: new Date().toISOString(),
    data: {
      detected_language: detectedLanguage,
      original_text: combinedText,
      english_summary: summary,
      hazard_category: classifiedCategory,
      estimated_severity: severity,
      road_impact: roadImpact,
      extracted_entities: entities,
      recommended_action: classifiedCategory === 'other' ? 'Driver advisory logged. No emergency diversion required.' : 'SDMA officer verification required.',
      verification_priority: classifiedCategory === 'other' ? 'low' : severity === 'critical' ? 'critical' : 'high',
      confidence_score: null,
      provider: 'Local NLP · Deterministic Fallback',
      model: 'local-deterministic-nlp',
      timestamp: new Date().toISOString(),
    },
  };
}

async function handleIncidentAnalysisRequest(req: IncomingMessage, res: ServerResponse) {
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

  // 1. Try Primary: Gemini AI
  const geminiAi = getGeminiClient();
  if (geminiAi) {
    try {
      console.log('[AI Gateway]: Requesting PRIMARY AI provider (Gemini)...');
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

      const response = await generateWithRetry(geminiAi, {
        model: RUNTIME_MODEL,
        contents: parts.length === 1 ? parts[0].text : { parts },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      });

      const textOutput = response.text || '{}';
      const parsedData = JSON.parse(textOutput);

      console.log('[AI Gateway]: SUCCESS from PRIMARY AI provider (Gemini)');
      sendJsonResponse(res, 200, {
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
            typeof parsedData.confidence_score === 'number' ? parsedData.confidence_score : 0.95,
          provider: 'Gemini AI',
          model: RUNTIME_MODEL,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    } catch (geminiErr: any) {
      console.warn(`[AI Gateway]: PRIMARY provider (Gemini) failed: ${geminiErr?.message || geminiErr}. Attempting SECONDARY provider (Groq)...`);
    }
  } else {
    console.log('[AI Gateway]: GEMINI_API_KEY not configured. Checking SECONDARY provider (Groq)...');
  }

  // 2. Try Secondary: Groq AI
  const groqClient = getGroqClient();
  if (groqClient) {
    try {
      console.log('[AI Gateway]: Requesting SECONDARY AI provider (Groq)...');
      const groqResult = await generateWithGroq(groqClient, payload);
      if (groqResult && groqResult.ok) {
        console.log(`[AI Gateway]: SUCCESS from SECONDARY AI provider (Groq - ${groqResult.model})`);
        sendJsonResponse(res, 200, groqResult);
        return;
      }
      console.warn('[AI Gateway]: SECONDARY provider (Groq) returned invalid response. Falling back to deterministic NLP...');
    } catch (groqErr: any) {
      console.warn(`[AI Gateway]: SECONDARY provider (Groq) failed: ${groqErr?.message || groqErr}. Falling back to deterministic NLP...`);
    }
  } else {
    console.log('[AI Gateway]: GROQ_API_KEY not configured. Falling back to deterministic NLP...');
  }

  // 3. Final Fallback: Deterministic Engine
  console.log('[AI Gateway]: Activating Deterministic Heuristic Fallback (NER-LOGIX Heuristic · Offline)');
  const fallbackResult = generateDeterministicFallback(payload);
  sendJsonResponse(res, 200, fallbackResult);
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

        // 2. AI Health endpoint
        if (req.method === 'GET' && url === '/api/v1/ai/health') {
          const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
          const hasGroqKey = Boolean(process.env.GROQ_API_KEY);

          sendJsonResponse(res, 200, {
            status: 'ok',
            service: 'ner-logix-ai-gateway',
            timestamp: new Date().toISOString(),
            providers: {
              gemini: {
                configured: hasGeminiKey,
                available: hasGeminiKey,
                model: RUNTIME_MODEL,
              },
              groq: {
                configured: hasGroqKey,
                available: hasGroqKey,
                model: GROQ_MODEL,
              },
              fallback: {
                configured: true,
                available: true,
                model: 'local-deterministic-nlp',
              },
            },
            model: RUNTIME_MODEL,
            apiKeyConfigured: hasGeminiKey || hasGroqKey,
          });
          return;
        }

        // 3. Incident Analysis endpoint
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
          const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
          const hasGroqKey = Boolean(process.env.GROQ_API_KEY);

          sendJsonResponse(res, 200, {
            status: 'ok',
            service: 'ner-logix-ai-gateway',
            timestamp: new Date().toISOString(),
            providers: {
              gemini: {
                configured: hasGeminiKey,
                available: hasGeminiKey,
                model: RUNTIME_MODEL,
              },
              groq: {
                configured: hasGroqKey,
                available: hasGroqKey,
                model: GROQ_MODEL,
              },
              fallback: {
                configured: true,
                available: true,
                model: 'local-deterministic-nlp',
              },
            },
            model: RUNTIME_MODEL,
            apiKeyConfigured: hasGeminiKey || hasGroqKey,
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
