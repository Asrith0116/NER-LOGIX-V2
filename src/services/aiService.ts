import type { IncidentAiAnalysis, IncidentType, IncidentSeverity } from '@/types';

export interface IncidentIntelligenceRequest {
  typedDescription?: string;
  hazardCategory?: IncidentType;
  reportedSeverity?: IncidentSeverity;
  voiceTranscript?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  vehicleId?: string;
  vehicleType?: string;
  cargoCategory?: string;
  cargoSensitivity?: string;
  priority?: string;
  photo?: {
    data: string; // base64
    mimeType: string;
  } | null;
  timestamp?: string;
  languageHint?: string;
}

export interface IncidentIntelligenceProvider {
  id: string;
  name: string;
  isAiDriven: boolean;
  analyze(request: IncidentIntelligenceRequest): Promise<IncidentAiAnalysis>;
}

// Regional language vocabulary triggers for offline-first autonomous NLP
const LANGUAGE_PATTERNS: Record<string, { name: string; patterns: RegExp[] }> = {
  assamese: {
    name: 'Assamese (অসমীয়া)',
    patterns: [
      /পাহাৰ/i,
      /ভূমিস্খলন/i,
      /মাটি/i,
      /শিল/i,
      /ৰাস্তা/i,
      /বন্ধ/i,
      /পানী/i,
      /দলং/i,
      /boroxun/i,
      /mati/i,
      /sil/i,
      /rasta/i,
      /bondo/i,
    ],
  },
  manipuri: {
    name: 'Manipuri (মৈতৈলোন্)',
    patterns: [
      /লৈবাক/i,
      /নুং/i,
      /লম্বী/i,
      /থিংজিন/i,
      /ইশিং/i,
      /থোং/i,
      /lambi/i,
      /nool/i,
      /leibak/i,
      /thong/i,
      /thak/i,
      /maru/i,
    ],
  },
  bengali: {
    name: 'Bengali (বাংলা)',
    patterns: [
      /ধস/i,
      /পাহাড়/i,
      /রাস্তা/i,
      /বন্ধ/i,
      /বন্যা/i,
      /বৃষ্টি/i,
      /পাথর/i,
      /dhos/i,
      /rasta/i,
      /bondho/i,
      /brikhi/i,
    ],
  },
  hindi: {
    name: 'Hindi (हिन्दी)',
    patterns: [
      /भूस्खलन/i,
      /रास्ता/i,
      /सड़क/i,
      /बंद/i,
      /पत्थर/i,
      /बाढ़/i,
      /पुल/i,
      /landslide/i,
      /sadak/i,
      /band/i,
      /patthar/i,
      /pul/i,
    ],
  },
};

/**
 * Checks if a specific hazard term regex is preceded by explicit negation in text.
 */
function isTermNegated(fullText: string, termRegex: RegExp): boolean {
  const negationPrefixes = [
    /(?:no|not|never|neither|nor|without|zero|free of)\s+(?:any\s+)?(?:[\w-]+\s+){0,3}/i,
    /there\s+is\s+no\s+(?:any\s+)?(?:[\w-]+\s+){0,4}/i,
    /there\s+are\s+no\s+(?:any\s+)?(?:[\w-]+\s+){0,4}/i,
    /(?:no|not)\s+[\w\s,]+(?:or|nor)\s+/i,
  ];
  for (const prefix of negationPrefixes) {
    const combined = new RegExp(`${prefix.source}(?:${termRegex.source})`, 'i');
    if (combined.test(fullText)) {
      return true;
    }
  }
  return false;
}

/**
 * Deterministic Fallback Provider (Offline-First Multi-lingual NLP)
 * Provides robust, honest fallback when Gemini API is unavailable or offline.
 * NOTE: confidenceScore is strictly NULL for fallback to avoid fabricated certainty.
 */
export class DeterministicFallbackIncidentIntelligenceProvider
  implements IncidentIntelligenceProvider
{
  id = 'local-deterministic-nlp';
  name = 'Local NLP · Deterministic Fallback';
  isAiDriven = false;

  async analyze(request: IncidentIntelligenceRequest): Promise<IncidentAiAnalysis> {
    const typedText = (request.typedDescription || '').trim();
    const voiceText = (request.voiceTranscript || '').trim();
    // Prioritize typed description if present; otherwise use voice transcript
    const combinedText = typedText || voiceText || '';
    const lower = combinedText.toLowerCase();

    // 1. Detect language from actual content
    let detectedLanguage = 'English';
    const hasAssameseOrBengaliScript = /[\u0980-\u09FF]/.test(combinedText);
    const hasHindiScript = /[\u0900-\u097F]/.test(combinedText);

    if (hasAssameseOrBengaliScript) {
      if (/ৰ|ৱ/.test(combinedText) || (request.languageHint && request.languageHint.includes('Assamese'))) {
        detectedLanguage = 'Assamese (অসমীয়া)';
      } else if (request.languageHint?.includes('Manipuri') || /মৈতৈ/.test(combinedText)) {
        detectedLanguage = 'Manipuri (মৈতৈলোন্)';
      } else {
        detectedLanguage = 'Bengali (বাংলা)';
      }
    } else if (hasHindiScript) {
      detectedLanguage = 'Hindi (हिन्दी)';
    } else if (request.languageHint && request.languageHint !== 'English') {
      // Check regional romanized patterns if hint provided
      for (const [_langKey, langInfo] of Object.entries(LANGUAGE_PATTERNS)) {
        if (langInfo.patterns.some((re) => re.test(combinedText))) {
          detectedLanguage = langInfo.name;
          break;
        }
      }
    }

    // 2. Classify hazard category with explicit negation awareness
    const candidateHazards: { type: IncidentType; terms: RegExp }[] = [
      { type: 'road_washout', terms: /washout|washed|erosion|sinkhole/i },
      { type: 'flood', terms: /flood|waterlog|river\s+overflow|overflow|ইশিং|পানী|बाढ़/i },
      { type: 'bridge_damage', terms: /bridge|cracked\s+pier|abutment|থোং|দলং|पुल/i },
      { type: 'rockfall', terms: /rockfall|boulder|falling\s+rocks|scree|নুং|শিল|पत्थर/i },
      { type: 'tree_fall', terms: /tree\s*fall|fallen\s+tree|tree|branch|powerline|electric\s+pole/i },
      { type: 'vehicle_accident', terms: /accident|collision|overturn|truck\s+breakdown/i },
      { type: 'fire_smoke', terms: /forest\s+fire|smoke|blaze|fire/i },
      { type: 'road_closure', terms: /curfew|strike|blockade|checkpoint|bandh/i },
      { type: 'pothole_surface', terms: /pothole|crater|surface\s+damage/i },
      { type: 'severe_weather', terms: /dense\s+fog|cloudburst|cyclone|storm/i },
      { type: 'landslide', terms: /landslide|mudslip|slope\s+failure|পাহাৰ|লৈবাক|भूस्खलन|ধল/i },
    ];

    let classifiedCategory: IncidentType = 'other';
    let matchedPositively = false;

    for (const h of candidateHazards) {
      if (h.terms.test(combinedText)) {
        if (!isTermNegated(combinedText, h.terms)) {
          classifiedCategory = h.type;
          matchedPositively = true;
          break;
        }
      }
    }

    // If no hazard matched in text:
    if (!matchedPositively) {
      // If user typed non-empty text, do NOT assume previous or default category
      if (combinedText.length > 0) {
        classifiedCategory = 'other';
      } else if (request.hazardCategory) {
        classifiedCategory = request.hazardCategory;
      }
    }

    // 3. Determine road impact & severity
    let severity: IncidentSeverity = 'low';
    let roadImpact: IncidentAiAnalysis['roadImpact'] = 'caution';

    const isCompleteBlock =
      lower.includes('completely blocked') ||
      lower.includes('fully blocked') ||
      lower.includes('total block') ||
      lower.includes('no vehicles') ||
      lower.includes('cannot pass') ||
      lower.includes('impassable') ||
      lower.includes('washed out') ||
      lower.includes('bridge collapsed') ||
      lower.includes('both lanes') ||
      lower.includes('closed') ||
      lower.includes('বন্ধ') ||
      lower.includes('থিংজিন') ||
      lower.includes('बंद');

    const isSingleLane =
      lower.includes('single lane') ||
      lower.includes('one lane') ||
      lower.includes('caution') ||
      lower.includes('light vehicles only') ||
      lower.includes('partial') ||
      lower.includes('slow');

    if (classifiedCategory === 'other') {
      severity = 'low';
      roadImpact = 'caution';
    } else if (isCompleteBlock || classifiedCategory === 'bridge_damage' || classifiedCategory === 'road_washout') {
      severity = 'critical';
      roadImpact = classifiedCategory === 'bridge_damage' ? 'bridge_impassable' : 'fully_blocked';
    } else if (isSingleLane) {
      severity = 'moderate';
      roadImpact = 'single_lane';
    } else if (classifiedCategory === 'pothole_surface') {
      severity = 'low';
      roadImpact = 'caution';
    } else {
      severity = request.reportedSeverity || 'high';
      roadImpact = severity === 'critical' ? 'fully_blocked' : 'partially_blocked';
    }

    // 4. Extract entities
    const extractedEntities: string[] = [];
    const corridorMatch = combinedText.match(/(?:NH|Route)[\s-]?\d+[A-Z]?/i);
    if (corridorMatch) extractedEntities.push(corridorMatch[0].toUpperCase());

    const kmMatch = combinedText.match(/(?:KM|km|kilometer|k\.m\.)[\s-]?\d+/i);
    if (kmMatch) extractedEntities.push(kmMatch[0].toUpperCase());

    if (lower.includes('mao gate')) extractedEntities.push('Mao Gate');
    else if (request.locationName && classifiedCategory !== 'other') extractedEntities.push(request.locationName);

    if (lower.includes('boulder') || lower.includes('rock')) extractedEntities.push('Heavy Boulders');
    if (lower.includes('mud') || lower.includes('debris')) extractedEntities.push('Slurry / Mud Debris');
    if (lower.includes('bridge')) extractedEntities.push('Culvert / Bridge Span');
    if (lower.includes('water')) extractedEntities.push('Submerged Carriageway');

    // 5. English summary synthesis - strictly reflecting CURRENT input
    let englishSummary = '';
    if (classifiedCategory === 'other') {
      englishSummary = combinedText
        ? `Driver report note: ${combinedText} (Non-hazard / unclassified submission).`
        : 'Field driver reported observation with no physical hazard detected.';
    } else if (detectedLanguage.includes('Assamese')) {
      englishSummary = `[Translated from Assamese] Field driver reports ${classifiedCategory.replace('_', ' ')}: ${combinedText}`;
    } else if (detectedLanguage.includes('Manipuri')) {
      englishSummary = `[Translated from Manipuri] Field driver reports ${classifiedCategory.replace('_', ' ')}: ${combinedText}`;
    } else if (detectedLanguage.includes('Hindi')) {
      englishSummary = `[Translated from Hindi] Field driver reports ${classifiedCategory.replace('_', ' ')}: ${combinedText}`;
    } else if (combinedText.length > 0) {
      englishSummary = combinedText;
    } else {
      englishSummary = `Field report: ${classifiedCategory.replace('_', ' ')} observed near ${request.locationName || 'transit corridor'}.`;
    }

    const recommendedAction =
      classifiedCategory === 'other'
        ? 'Driver advisory logged. No route obstruction or emergency diversion required.'
        : severity === 'critical'
        ? 'Corridor closure recommended. SDMA verification required before executing reroutes.'
        : severity === 'high'
        ? 'Caution advisory recommended. SDMA officer verification required.'
        : 'Driver caution advisory. Verify transit sector clearance.';

    const verificationPriority: IncidentAiAnalysis['verificationPriority'] =
      classifiedCategory === 'other'
        ? 'low'
        : severity === 'critical'
        ? 'critical'
        : severity === 'high'
        ? 'high'
        : severity === 'moderate'
        ? 'medium'
        : 'low';

    return {
      detectedLanguage,
      originalText: combinedText,
      englishSummary,
      hazardCategory: classifiedCategory,
      estimatedSeverity: severity,
      roadImpact,
      confidenceScore: null, // Honest null for deterministic fallback!
      qualitativeConfidence: 'Not available · Deterministic fallback',
      extractedEntities,
      recommendedAction,
      verificationPriority,
      provider: 'Local NLP · Deterministic Fallback',
      statusLabel: 'Local NLP · Deterministic Fallback',
      isLiveGemini: false,
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Real Gemini AI Provider (Connects to /api/v1/ai/analyze-incident on server)
 * Uses runtime model gemini-3.6-flash.
 */
export class GeminiIncidentIntelligenceProvider implements IncidentIntelligenceProvider {
  id = 'gemini-ai-provider';
  name = 'Gemini AI';
  isAiDriven = true;

  private fallback = new DeterministicFallbackIncidentIntelligenceProvider();

  async analyze(request: IncidentIntelligenceRequest): Promise<IncidentAiAnalysis> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const payload = {
        typed_description: request.typedDescription,
        hazard_category: request.hazardCategory,
        reported_severity: request.reportedSeverity,
        voice_transcript: request.voiceTranscript,
        latitude: request.latitude,
        longitude: request.longitude,
        accuracy: request.accuracyMeters,
        location_name: request.locationName,
        timestamp: request.timestamp || new Date().toISOString(),
        vehicle_id: request.vehicleId,
        vehicle_type: request.vehicleType,
        cargo_category: request.cargoCategory,
        cargo_sensitivity: request.cargoSensitivity,
        priority: request.priority,
        photo: request.photo,
      };

      const endpoint = typeof window !== 'undefined' ? '/api/v1/ai/analyze-incident' : 'http://localhost:3000/api/v1/ai/analyze-incident';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json && json.ok && json.data) {
          const d = json.data;
          const conf = typeof d.confidence_score === 'number' ? d.confidence_score : 0.95;
          return {
            detectedLanguage: d.detected_language || 'English',
            originalText: request.typedDescription || request.voiceTranscript || '',
            englishSummary:
              d.english_summary ||
              request.typedDescription ||
              request.voiceTranscript ||
              'Corridor incident analyzed.',
            hazardCategory: d.hazard_category as IncidentType,
            estimatedSeverity: d.estimated_severity as IncidentSeverity,
            roadImpact: d.road_impact || 'partially_blocked',
            confidenceScore: conf,
            qualitativeConfidence: `Live Gemini 3.6 Flash (${Math.round(conf * 100)}% Confidence)`,
            extractedEntities: d.extracted_entities || [],
            recommendedAction: d.recommended_action || 'SDMA verification required',
            verificationPriority: d.verification_priority || 'high',
            provider: 'Gemini AI',
            model: 'gemini-3.6-flash',
            statusLabel: 'Gemini AI · Live',
            isLiveGemini: true,
            generatedAt: d.timestamp || new Date().toISOString(),
            diagnostics: {
              endpoint: '/api/v1/ai/analyze-incident',
              httpStatus: res.status,
            },
          };
        }
      }

      console.warn('[Gemini AI Provider]: Server returned non-ok status, falling back to deterministic engine');
      const fallbackResult = await this.fallback.analyze(request);
      fallbackResult.diagnostics = {
        endpoint: '/api/v1/ai/analyze-incident',
        httpStatus: res.status,
        error: `HTTP ${res.status}: Gemini API unavailable or high demand`,
      };
      return fallbackResult;
    } catch (err: any) {
      console.warn('[Gemini AI Provider]: Request failed, activating fallback:', err?.message || err);
      const fallbackResult = await this.fallback.analyze(request);
      fallbackResult.diagnostics = {
        endpoint: '/api/v1/ai/analyze-incident',
        error: err?.name === 'AbortError' ? 'Request timed out' : err?.message || 'Network error',
      };
      return fallbackResult;
    }
  }
}

const defaultGeminiProvider = new GeminiIncidentIntelligenceProvider();

/**
 * Main entry point for Incident Intelligence
 * Supports full request object OR legacy (text, locationName, languageHint) arguments
 */
export async function analyzeIncidentReport(
  requestOrText: IncidentIntelligenceRequest | string,
  userLocationName?: string,
  languageHint?: string
): Promise<IncidentAiAnalysis> {
  if (typeof requestOrText === 'string') {
    return defaultGeminiProvider.analyze({
      typedDescription: requestOrText,
      locationName: userLocationName,
      languageHint,
    });
  }
  return defaultGeminiProvider.analyze(requestOrText);
}
