import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Notification } from '@/components/ui/Notification';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { DEMO_DRIVER } from '@/data/demo';
import { useAppStore } from '@/store/appStore';
import { saveIncident, getPendingIncidents } from '@/utils/idb';
import type { IncidentType, IncidentSeverity, Incident } from '@/types';
import {
  AlertTriangle,
  MapPin,
  Camera,
  Mic,
  Send,
  CheckCircle,
  Clock,
  X,
  Square
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

export function HazardReport() {
  const { networkStatus, activeTripId, setPendingIncidentsCount } = useAppStore();
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isOffline = networkStatus === 'offline';

  // Demo coordinates (from Guwahati->Imphal corridor)
  const demoLocation: [number, number] = [25.7, 93.8];

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
    } catch (err) {
      console.error('Microphone access denied or unavailable', err);
      // Fallback if no mic
      setAudioUrl('demo_audio_recorded');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      // Fallback
      setIsRecording(false);
      setAudioUrl('demo_audio_recorded');
    }
  };

  const handleSubmit = async () => {
    setFormState('submitting');
    
    const incidentId = `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setLastIncidentId(incidentId);

    const newIncident: Incident = {
      id: incidentId,
      type,
      severity,
      location: demoLocation,
      locationName: 'Doyyang River Valley, Route 39',
      description,
      reportedBy: DEMO_DRIVER.name,
      reportedAt: new Date().toISOString(),
      syncStatus: isOffline ? 'local_pending' : 'pending_verification',
      photoUrl: photoUrl || undefined,
      voiceNote: !!audioUrl,
      voiceNoteUrl: audioUrl || undefined,
    };

    // Save to local IndexedDB
    await saveIncident(newIncident);
    
    // Update global state count for pending incidents
    const pending = await getPendingIncidents();
    setPendingIncidentsCount(pending.length);

    setTimeout(() => {
      setFormState('success');
    }, 1200);
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
            {isOffline ? 'Hazard Saved Locally' : 'Hazard Reported'}
          </h2>
          <p className="text-sm text-[#5a5a57] mb-6">
            {isOffline
              ? 'This report will be synchronized when connectivity returns.'
              : 'Report sent to SDMA verification queue.'}
          </p>

          <div className="bg-[#f8f8f7] rounded-lg border border-[#e4e4e3] p-4 text-left mb-6">
            <div className="flex items-center justify-between mb-3 border-b border-[#e4e4e3] pb-3">
              <span className="text-xs font-semibold text-[#1a1a19]">Incident ID</span>
              <span className="text-sm font-bold text-[#1a1a19]">{lastIncidentId}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#5a5a57]">Status</span>
              <StatusBadge
                syncStatus={isOffline ? 'local_pending' : 'pending_verification'}
                pulse={isOffline}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8a8a87]">
              <Clock className="w-3.5 h-3.5" />
              <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              <span>·</span>
              <MapPin className="w-3.5 h-3.5" />
              <span>GPS attached</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => navigate('/driver/navigation')}
            >
              Return to Navigation
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
            <h1 className="text-base font-semibold text-[#1a1a19]">Report Hazard</h1>
          </div>
          <div className="flex items-center gap-2">
            {isOffline && (
              <Notification
                type="warning"
                title="Offline — report will be queued"
                visible
              />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-5 space-y-5">
        {/* Driver info */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-[#e4e4e3] text-xs shadow-sm">
          <span className="text-[#5a5a57]">Reporting as: <span className="font-medium text-[#1a1a19]">{DEMO_DRIVER.name}</span></span>
          <span className="text-[#5a5a57]">{DEMO_DRIVER.vehicleId} {activeTripId && `· Trip ${activeTripId}`}</span>
        </div>

        {/* Hazard type */}
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold text-[#1a1a19] uppercase tracking-wide">Hazard Type</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {incidentTypes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={cn(
                    'px-3 py-2.5 rounded border text-sm text-left transition-colors',
                    type === t.id
                      ? 'bg-[#eff6ff] border-[#2563eb] text-[#1e40af] font-medium'
                      : 'bg-white border-[#e4e4e3] text-[#5a5a57] hover:border-[#c4c4c2]',
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
            <p className="text-xs font-semibold text-[#1a1a19] uppercase tracking-wide">Severity</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {severityLevels.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSeverity(s.id)}
                  className={cn(
                    'px-2 py-2.5 rounded border text-xs font-medium transition-colors',
                    severity === s.id
                      ? `bg-white ${s.color} border-2`
                      : 'bg-white border-[#e4e4e3] text-[#5a5a57] hover:border-[#c4c4c2]',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Description & Media */}
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold text-[#1a1a19] uppercase tracking-wide">Report Details</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="w-full text-sm border border-[#e4e4e3] rounded p-2.5 resize-none focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] transition-colors placeholder:text-[#c4c4c2]"
              rows={3}
              placeholder="Describe the hazard — road condition, severity, visibility, passability..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            
            <div className="flex flex-wrap items-center gap-3">
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
                Add Photo
              </Button>

              {!isRecording ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={startRecording}
                  iconLeft={<Mic className="w-3.5 h-3.5" />}
                >
                  Record Voice Note
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

            {/* Preview Area */}
            {(photoUrl || audioUrl) && (
              <div className="flex gap-3 mt-3 p-3 bg-[#f8f8f7] rounded border border-[#e4e4e3]">
                {photoUrl && (
                  <div className="relative w-20 h-20 rounded border border-[#e4e4e3] overflow-hidden shrink-0">
                    <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setPhotoUrl(null)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {audioUrl && (
                  <div className="flex items-center gap-2 bg-white px-3 py-2 border border-[#e4e4e3] rounded text-xs text-[#1a1a19]">
                    <Mic className="w-4 h-4 text-[#2563eb]" />
                    <span>Voice Note Attached</span>
                    <button onClick={() => setAudioUrl(null)} className="ml-2 text-[#8a8a87] hover:text-[#dc2626]">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location (Read-only) */}
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold text-[#1a1a19] uppercase tracking-wide">Location Info</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 py-1">
              <div className="w-8 h-8 rounded-full bg-[#eff6ff] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-[#2563eb]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1a1a19]">GPS Location Attached</p>
                <p className="text-xs text-[#8a8a87]">Lat: {demoLocation[0]} · Lng: {demoLocation[1]}</p>
              </div>
              <div className="ml-auto">
                <StatusBadge label="Auto-detected" variant="success" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Preview & Submit */}
        <div className="pb-8 pt-4">
          <div className="bg-[#f8f8f7] border border-[#e4e4e3] rounded-lg p-4 mb-4">
            <h3 className="text-xs font-semibold text-[#1a1a19] uppercase tracking-wide mb-3">Report Summary</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div className="text-[#5a5a57]">Hazard</div>
              <div className="font-medium text-[#1a1a19]">{incidentTypes.find(t => t.id === type)?.label}</div>
              <div className="text-[#5a5a57]">Severity</div>
              <div className="font-medium text-[#1a1a19]">{severityLevels.find(s => s.id === severity)?.label}</div>
              <div className="text-[#5a5a57]">Evidence</div>
              <div className="font-medium text-[#1a1a19]">
                {[photoUrl ? 'Photo' : null, audioUrl ? 'Voice' : null].filter(Boolean).join(' + ') || 'None'}
              </div>
            </div>
          </div>

          <Button
            variant="danger"
            size="lg"
            className="w-full text-base font-semibold"
            loading={formState === 'submitting'}
            onClick={handleSubmit}
            iconLeft={<Send className="w-4 h-4" />}
          >
            {isOffline ? 'Save Hazard Report' : 'Submit Hazard Report'}
          </Button>
          <p className="text-xs text-[#8a8a87] text-center mt-3">
            {isOffline
              ? 'Report will sync automatically when connectivity is restored'
              : 'Report will enter SDMA verification queue immediately'}
          </p>
        </div>
      </div>
    </div>
  );
}
