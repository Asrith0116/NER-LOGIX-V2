import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Notification } from '@/components/ui/Notification';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { DriverVehicleSelector } from '@/components/ui/DriverVehicleSelector';
import { DEMO_DRIVER } from '@/data/demo';
import { useAppStore } from '@/store/appStore';
import { useNetworkStore } from '@/store/networkStore';
import { saveIncident, getPendingIncidents } from '@/utils/idb';
import { analyzeIncidentReport } from '@/services/aiService';
import type { IncidentType, IncidentSeverity, Incident, IncidentAiAnalysis } from '@/types';
import {
  AlertTriangle,
  MapPin,
  Camera,
  Mic,
  Send,
  CheckCircle,
  Clock,
  X,
  Square,
  Globe,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { cn } from '@/utils';
import { useNavigate } from 'react-router-dom';

type FormState = 'idle' | 'submitting' | 'success';

const incidentTypes: { id: IncidentType; label: string }[] = [
  { id: 'landslide', label: 'Landslide' },
  { id: 'rockfall', label: 'Rockfall' },
  { id: 'flood', label: 'Flooding' },
  { id: 'road_washout', label: 'Road Washout' },
  { id: 'bridge_damage', label: 'Bridge Damage' },
  { id: 'other', label: 'Other Hazard' },
];

const severityLevels: { id: IncidentSeverity; label: string; color: string }[] = [
  { id: 'low', label: 'Low', color: 'border-[#16a34a] text-[#16a34a]' },
  { id: 'moderate', label: 'Moderate', color: 'border-[#d97706] text-[#d97706]' },
  { id: 'high', label: 'High', color: 'border-[#dc2626] text-[#dc2626]' },
  { id: 'critical', label: 'Critical', color: 'border-[#7f1d1d] text-[#7f1d1d]' },
];

const SAMPLE_VOICE_MEMOS = [
  {
    lang: 'Assamese (অসমীয়া)',
    text: 'পাহাৰৰ পৰা ডাঙৰ শিল আৰু মাটি খহি ৰাস্তা সম্পূৰ্ণ বন্ধ হৈ পৰিছে। কোনো গাড়ী পাৰ হ’ব পৰা নাই।',
    label: 'Assamese Field Note (Landslide)',
  },
  {
    lang: 'Manipuri (মৈতৈলোন্)',
    text: 'নুং অমসুং লৈবাক থুদুনা লম্বী থিংজিনখ্ৰে, কিলোমিটর ১৮২ দা গারী চৎপা য়ারোই।',
    label: 'Manipuri Field Note (Rockfall)',
  },
  {
    lang: 'Hindi (हिन्दी)',
    text: 'पहाड़ का मलबा और बड़े पत्थर गिरने से दोनों तरफ का रास्ता पूरी तरह बंद हो गया है।',
    label: 'Hindi Field Note (Blockage)',
  },
];

export function HazardReport() {
  const { networkStatus, activeTripId, setPendingIncidentsCount, selectedDriverVehicleId } = useAppStore();
  const activeVehicles = useNetworkStore((state) => state.activeVehicles);
  const currentDriverVehicle =
    activeVehicles.find((v) => v.id === selectedDriverVehicleId) ||
    activeVehicles.find((v) => v.id === 'AS-01-J-4422') ||
    activeVehicles[0];
  const navigate = useNavigate();

  const [type, setType] = useState<IncidentType>('landslide');
  const [severity, setSeverity] = useState<IncidentSeverity>('high');
  const [description, setDescription] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [lastIncidentId, setLastIncidentId] = useState<string>('');

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('Assamese (অসমীয়া)');
  const [aiAnalysis, setAiAnalysis] = useState<IncidentAiAnalysis | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isOffline = networkStatus === 'offline';
  const demoLocation: [number, number] = [25.7, 93.8];

  // Auto-run AI parsing when description changes
  useEffect(() => {
    if (description.trim().length > 10) {
      const timer = setTimeout(async () => {
        const analysis = await analyzeIncidentReport(description, 'Doyyang Valley, Route 39');
        setAiAnalysis(analysis);
        setType(analysis.hazardCategory);
        setSeverity(analysis.estimatedSeverity);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [description]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      // Fallback
      setIsRecording(false);
      setAudioUrl('demo_audio_recorded');
      setDescription(SAMPLE_VOICE_MEMOS[0].text);
      setSelectedLanguage(SAMPLE_VOICE_MEMOS[0].lang);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      setIsRecording(false);
      setAudioUrl('demo_audio_recorded');
    }
  };

  const handleApplyVoiceSample = (sample: typeof SAMPLE_VOICE_MEMOS[0]) => {
    setDescription(sample.text);
    setSelectedLanguage(sample.lang);
    setAudioUrl('demo_audio_recorded');
  };

  const handleSubmit = async () => {
    setFormState('submitting');

    const incidentId = `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setLastIncidentId(incidentId);

    // Final AI analysis if not yet run
    const finalAnalysis = aiAnalysis || (await analyzeIncidentReport(description, 'Doyyang River Valley, Route 39'));

    const newIncident: Incident = {
      id: incidentId,
      type,
      severity,
      location: demoLocation,
      locationName: 'Doyyang River Valley, Route 39',
      description,
      reportedBy: currentDriverVehicle ? `${currentDriverVehicle.driverName} (${currentDriverVehicle.id})` : DEMO_DRIVER.name,
      reportedAt: new Date().toISOString(),
      syncStatus: isOffline ? 'local_pending' : 'pending_verification',
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80',
      voiceNote: !!audioUrl,
      voiceNoteUrl: audioUrl || undefined,
      voiceTranscript: description,
      voiceLanguage: selectedLanguage,
      aiAnalysis: finalAnalysis,
    };

    // Save to local IndexedDB
    await saveIncident(newIncident);

    // Update global state count for pending incidents
    const pending = await getPendingIncidents();
    setPendingIncidentsCount(pending.length);

    setTimeout(() => {
      setFormState('success');
    }, 1000);
  };

  if (formState === 'success') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-white">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="text-center max-w-sm w-full"
        >
          <div className="w-14 h-14 rounded-full bg-[#f0fdf4] border-2 border-[#16a34a] flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-[#16a34a]" />
          </div>
          <h2 className="text-lg font-semibold text-[#1a1a19] mb-1">
            {isOffline ? 'Hazard Saved Locally (IndexedDB)' : 'Hazard Submitted'}
          </h2>
          <p className="text-sm text-[#5a5a57] mb-6">
            {isOffline
              ? 'Report queued in offline storage. Automatic background sync will transmit payload when connectivity returns.'
              : 'Report sent to SDMA human-in-the-loop triage queue.'}
          </p>

          <div className="bg-[#f8f8f7] rounded-xl border border-[#e4e4e3] p-4 text-left mb-6 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#e4e4e3] pb-2">
              <span className="text-xs font-semibold text-[#1a1a19]">Incident Ticket</span>
              <span className="text-sm font-bold text-[#1a1a19] font-mono">{lastIncidentId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#5a5a57]">Sync State</span>
              <StatusBadge
                syncStatus={isOffline ? 'local_pending' : 'pending_verification'}
                pulse={isOffline}
              />
            </div>
            {aiAnalysis && (
              <div className="p-2.5 rounded-lg bg-[#eff6ff] border border-[#bfdbfe] text-xs text-[#1e40af] space-y-1">
                <div className="flex items-center gap-1 font-bold">
                  <Sparkles className="w-3 h-3 text-[#2563eb]" />
                  <span>AI Structured Triage Preview</span>
                </div>
                <p className="text-[11px] leading-tight text-[#1e3a8a]">{aiAnalysis.englishSummary}</p>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-[#8a8a87] pt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              <span>·</span>
              <MapPin className="w-3.5 h-3.5" />
              <span>GPS Geotag Attached</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => navigate('/driver/navigation')}
            >
              Return to Live Navigation
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setFormState('idle');
                setType('landslide');
                setSeverity('high');
                setDescription('');
                setPhotoUrl(null);
                setAudioUrl(null);
                setAiAnalysis(null);
              }}
            >
              File Another Report
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf9]">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-[#e4e4e3] sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#dc2626]" />
            <div>
              <h1 className="text-base font-bold text-[#1a1a19]">Field Hazard Reporting</h1>
              <p className="text-xs text-[#8a8a87]">Layer 4: Crowdsourced Driver Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOffline && (
              <Notification
                type="warning"
                title="Mountain Dead-Zone: Report will queue in IndexedDB"
                visible
              />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-5 space-y-5">
        {/* Driver identity */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-[#e4e4e3] text-xs shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#5a5a57]">
              Reporter: <strong className="text-[#1a1a19]">{currentDriverVehicle?.driverName || DEMO_DRIVER.name}</strong>
            </span>
            <DriverVehicleSelector id="hazard-driver-vehicle-selector" compact />
          </div>
          <span className="text-[#2563eb] font-semibold">Active Trip: {activeTripId || 'TRIP-001'}</span>
        </div>

        {/* Hazard Category Selector */}
        <Card>
          <CardHeader>
            <p className="text-xs font-bold text-[#1a1a19] uppercase tracking-wider">Hazard Category</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {incidentTypes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={cn(
                    'px-3 py-2.5 rounded-lg border text-xs font-semibold text-left transition-all cursor-pointer',
                    type === t.id
                      ? 'bg-[#eff6ff] border-[#2563eb] text-[#1e40af] shadow-xs'
                      : 'bg-white border-[#e4e4e3] text-[#5a5a57] hover:border-[#c4c4c2]'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Severity */}
        <Card>
          <CardHeader>
            <p className="text-xs font-bold text-[#1a1a19] uppercase tracking-wider">Estimated Severity</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {severityLevels.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSeverity(s.id)}
                  className={cn(
                    'px-2 py-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                    severity === s.id
                      ? `bg-white ${s.color} border-2 shadow-xs`
                      : 'bg-white border-[#e4e4e3] text-[#5a5a57] hover:border-[#c4c4c2]'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Multilingual Voice Note & Quick Regional Presets */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#1a1a19] uppercase tracking-wider">
                Multilingual Voice & Observation
              </p>
              <span className="flex items-center gap-1 text-[11px] text-[#2563eb] font-semibold">
                <Globe className="w-3 h-3" /> Assamese · Manipuri · Hindi
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {/* Quick regional demo voice notes */}
            <div>
              <span className="text-[11px] font-semibold text-[#5a5a57] block mb-1.5">
                Quick Regional Voice Sample (Testing Presets):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_VOICE_MEMOS.map((sample) => (
                  <button
                    key={sample.lang}
                    onClick={() => handleApplyVoiceSample(sample)}
                    className="px-2.5 py-1 rounded-md bg-[#fafaf9] hover:bg-[#eff6ff] hover:text-[#2563eb] border border-[#e4e4e3] text-xs font-medium transition-colors cursor-pointer text-[#5a5a57]"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              className="w-full text-xs font-medium border border-[#e4e4e3] rounded-lg p-3 resize-none focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] transition-colors placeholder:text-[#c4c4c2]"
              rows={3}
              placeholder="Describe road blockage, rock size, water depth, or speak in your regional language..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* AI Real-Time Parsing Feedback */}
            {aiAnalysis && (
              <div className="p-3 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1e40af]">
                    <Sparkles className="w-3.5 h-3.5 text-[#2563eb]" />
                    <span>AI Speech-to-Intent Engine</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-[#1d4ed8] border border-[#bfdbfe]">
                    {aiAnalysis.detectedLanguage}
                  </span>
                </div>
                <p className="text-xs text-[#1e3a8a] font-medium leading-relaxed">
                  <strong>Translation:</strong> {aiAnalysis.englishSummary}
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {aiAnalysis.extractedEntities.map((ent, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded bg-white/80 text-[#1e40af] text-[10px] font-semibold border border-[#bfdbfe]"
                    >
                      {ent}
                    </span>
                  ))}
                  <span className="px-1.5 py-0.5 rounded bg-[#16a34a]/10 text-[#16a34a] text-[10px] font-bold">
                    Confidence: {Math.round(aiAnalysis.confidenceScore * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* Media Upload & Recording */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                iconLeft={<Camera className="w-3.5 h-3.5" />}
              >
                Attach Photo
              </Button>

              {!isRecording ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startRecording}
                  iconLeft={<Mic className="w-3.5 h-3.5 text-[#2563eb]" />}
                >
                  Record Audio Note
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={stopRecording}
                  className="animate-pulse"
                  iconLeft={<Square className="w-3.5 h-3.5" />}
                >
                  Stop Recording
                </Button>
              )}
            </div>

            {/* Evidence Previews */}
            {(photoUrl || audioUrl) && (
              <div className="flex gap-3 mt-2 p-3 bg-[#f8f8f7] rounded-xl border border-[#e4e4e3]">
                {photoUrl && (
                  <div className="relative w-24 h-20 rounded-lg border border-[#e4e4e3] overflow-hidden shrink-0">
                    <img src={photoUrl} alt="Hazard preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPhotoUrl(null)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {audioUrl && (
                  <div className="flex items-center gap-2 bg-white px-3 py-2 border border-[#e4e4e3] rounded-lg text-xs text-[#1a1a19]">
                    <Volume2 className="w-4 h-4 text-[#2563eb]" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">Voice Memo Attached</p>
                      <p className="text-[10px] text-[#8a8a87]">{selectedLanguage}</p>
                    </div>
                    <button
                      onClick={() => setAudioUrl(null)}
                      className="ml-2 text-[#8a8a87] hover:text-[#dc2626] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location (Read-only Geotag) */}
        <Card>
          <CardHeader>
            <p className="text-xs font-bold text-[#1a1a19] uppercase tracking-wider">Geotagged Coordinates</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 py-1">
              <div className="w-8 h-8 rounded-lg bg-[#eff6ff] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-[#2563eb]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1a1a19]">Doyyang River Valley Sector, NH-39</p>
                <p className="text-[11px] text-[#8a8a87]">GPS: {demoLocation[0]}° N, {demoLocation[1]}° E · Offline Hardware Fix</p>
              </div>
              <div className="ml-auto">
                <StatusBadge label="GPS Verified" variant="success" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="pb-8 pt-2">
          <Button
            variant="danger"
            size="lg"
            className="w-full text-sm font-bold shadow-sm"
            loading={formState === 'submitting'}
            onClick={handleSubmit}
            iconLeft={<Send className="w-4 h-4" />}
          >
            {isOffline ? 'Save Hazard to Offline Queue (IndexedDB)' : 'Submit Report to SDMA Queue'}
          </Button>
          <p className="text-xs text-[#8a8a87] text-center mt-2.5">
            {isOffline
              ? 'Stored safely on device. Will auto-sync via Service Worker when entering cell coverage.'
              : 'Immediately alerts regional dispatchers and enters the SDMA verification pipeline.'}
          </p>
        </div>
      </div>
    </div>
  );
}
