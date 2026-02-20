import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, MapPin, Mic, Navigation, Upload, Volume2 } from "lucide-react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import complaintService from "@/services/complaintService";
import { useLanguage } from "@/contexts/LanguageContext";

type Lang = "hi" | "en" | "ur";
type Step = 1 | 2 | 3;
type Status = "inactive" | "recording" | "processing";
type Img = { id: string; name: string; dataUrl: string };
type Pending = { id: string; payload: { language: Lang; category: string; description: string; address: string; latitude?: string; longitude?: string; voiceConfidence?: number | null; voiceTranscript?: string; attachments: Array<{ name: string; dataUrl: string }> } };

const QUEUE_KEY = "voice_complaint_queue_v2";
const MAX_SECONDS = 120;
const SILENCE_MS = 12000;
const langs = [{ code: "hi" as const, label: "Hindi", flag: "\uD83C\uDDEE\uD83C\uDDF3" }, { code: "en" as const, label: "English", flag: "\uD83C\uDDEC\uD83C\uDDE7" }, { code: "ur" as const, label: "Urdu", flag: "\uD83C\uDDF5\uD83C\uDDF0" }];
const yes = ["yes", "haan", "ji", "correct", "sahi"];
const no = ["no", "nahi", "wrong", "galat"];
const done = ["done", "finish", "stop", "ho gaya", "bas"];
const help = {
  hi: { tips: ["Saaf aur dheere boliye", "Location details zarur batayein", "Problem ko poori tarah samjhaiye"], ex: ["Meri gali mein bada gadda hai.", "Teen din se paani nahi aa raha.", "Street light raat ko band rehti hai."] },
  en: { tips: ["Speak clearly and slowly", "Mention location details", "Describe the problem fully"], ex: ["There is a large pothole on my street.", "Water supply has been unavailable for three days.", "Street lights are not working."] },
  ur: { tips: ["Aahista aur wazeh boliye", "Maqam ki tafseel batayein", "Masla mukammal taur par bayan karein"], ex: ["Meri gali mein bara gadda hai.", "Teen din se pani band hai.", "Street light kaam nahi kar rahi."] },
};
const mapCat: Record<string, string> = { "Roads & Transportation": "Roads & Infrastructure", "Water Supply": "Water Supply", Electricity: "Electricity", "Sanitation & Garbage": "Sanitation & Garbage" };
const catRules = [
  {
    c: "Roads & Transportation",
    t: [
      "road", "roads", "street", "transport", "traffic", "pothole", "gadda", "sadak",
      "सड़क", "सड़क", "गड्ढा", "गड्डा", "रास्ता",
      "سڑک", "گڑھا", "راستہ",
    ],
  },
  {
    c: "Water Supply",
    t: [
      "water", "paani", "jal", "pipeline", "tap", "leak", "seepage",
      "पानी", "जल", "नल", "पाइप", "लीकेज",
      "پانی", "نال", "پائپ", "لیک",
    ],
  },
  {
    c: "Electricity",
    t: [
      "electricity", "bijli", "power", "light", "voltage", "current",
      "बिजली", "लाइट", "करंट", "बत्ती",
      "بجلی", "لائٹ", "کرنٹ",
    ],
  },
  {
    c: "Sanitation & Garbage",
    t: [
      "safai", "garbage", "waste", "kooda", "cleaning", "drain", "sewage",
      "सफाई", "कचरा", "गंदगी", "नाली", "सीवर",
      "صفائی", "کچرا", "گندگی", "نالی", "سیوریج",
    ],
  },
];

const ns = (v: string) => v.replace(/\s+/g, " ").trim();
const join = (a: string, b: string) => [ns(a), ns(b)].filter(Boolean).join(" ");
const fmt = (v: string) => { const t = ns(v); if (!t) return ""; const c = t[0].toUpperCase() + t.slice(1); return /[.!?]$/.test(c) ? c : `${c}.`; };
const locale = (l: Lang) => (l === "hi" ? "hi-IN" : l === "ur" ? "ur-PK" : "en-GB");
const has = (t: string, words: string[]) => words.some((w) => t.toLowerCase().includes(w));
const detect = (t: string) => {
  const low = t.normalize("NFKC").toLowerCase();
  return catRules.find((r) => r.t.some((x) => low.includes(x.toLowerCase())))?.c || "";
};
const rq = () => { try { const p = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); return Array.isArray(p) ? p : []; } catch { return []; } };
const wq = (q: Pending[]) => localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
const defaultLeafletIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
type LocationPickerMapProps = {
  coords: { lat: number; lng: number };
  onChange: (next: { lat: number; lng: number }) => void;
  draggable?: boolean;
  clickToSet?: boolean;
};
const LocationPickerMap = ({
  coords,
  onChange,
  draggable = true,
  clickToSet = true,
}: LocationPickerMapProps) => {
  const MapClickHandler = () => {
    useMapEvents({
      click: (event) => {
        if (!clickToSet) return;
        onChange({
          lat: Number(event.latlng.lat.toFixed(6)),
          lng: Number(event.latlng.lng.toFixed(6)),
        });
      },
    });
    return null;
  };

  return (
    <MapContainer center={[coords.lat, coords.lng]} zoom={17} className="h-56 w-full rounded-lg border">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler />
      <Marker
        position={[coords.lat, coords.lng]}
        draggable={draggable}
        icon={defaultLeafletIcon}
        eventHandlers={{
          dragend: (event) => {
            if (!draggable) return;
            const marker = event.target;
            const position = marker.getLatLng();
            onChange({
              lat: Number(position.lat.toFixed(6)),
              lng: Number(position.lng.toFixed(6)),
            });
          },
        }}
      />
    </MapContainer>
  );
};
const detectWithConfidence = (text: string) => {
  const low = text.normalize("NFKC").toLowerCase();
  let best: { category: string; score: number } = { category: "", score: 0 };
  for (const rule of catRules) {
    const matched = rule.t.filter((token) => low.includes(token.toLowerCase()));
    const score = matched.length / Math.max(1, rule.t.length);
    if (score > best.score) best = { category: rule.c, score };
  }
  return { category: best.category, confidence: Math.min(1, best.score * 2.8) };
};

const VoiceComplaint = () => {
  const { t } = useLanguage();
  const nav = useNavigate();
  const [language, setLanguage] = useState<Lang>("hi");
  const [step, setStep] = useState<Step>(1);
  const [status, setStatus] = useState<Status>("inactive");
  const [seconds, setSeconds] = useState(0);
  const [waveTick, setWaveTick] = useState(0);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [interim, setInterim] = useState("");
  const [voiceConfidence, setVoiceConfidence] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [ts, setTs] = useState<string | null>(null);
  const [images, setImages] = useState<Img[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);
  const [complaintId, setComplaintId] = useState("");

  const recog = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraStream = useRef<MediaStream | null>(null);
  const meterRaf = useRef<number | null>(null);
  const lastSpeechAt = useRef<number>(0);
  const hasDetectedSpeech = useRef(false);
  const keepRecording = useRef(false);
  const secondsRef = useRef(0);
  const autoAdvancedStep1 = useRef(false);

  const isRec = status === "recording";
  const isProc = status === "processing";
  const step1Detection = useMemo(
    () => (step === 1 ? detectWithConfidence(interim) : { category: "", confidence: 0 }),
    [step, interim],
  );
  const activeCategory = category || step1Detection.category;
  const categoryConfidencePct = Math.round(step1Detection.confidence * 100);
  const speechSupported = typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const isRecommendedBrowser =
    typeof navigator !== "undefined" &&
    /Chrome|Chromium|Edg\//i.test(navigator.userAgent) &&
    !/OPR\//i.test(navigator.userAgent);
  const descPreview = step === 2 ? join(description, interim) : description;
  const addrPreview = step === 3 ? join(address, interim) : address;
  const timer = useMemo(() => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`, [seconds]);
  const center = status === "recording"
    ? t("voice.listening", "Listening...")
    : status === "processing"
      ? t("voice.processing", "Processing...")
      : t("voice.tapStart", "Tap to Start");
  const instruction = step === 1
    ? t("voice.instruction.step1", "Step 1. What type of problem are you facing? Sadak, Paani, Bijli, Safai.")
    : step === 2
      ? t("voice.instruction.step2", "Step 2. Describe your problem in detail.")
      : t("voice.instruction.step3", "Step 3. Where is the problem? Use current location or speak address.");

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text); u.lang = locale(language); u.rate = 0.95; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
  };
  const stopMeter = () => {
    if (meterRaf.current) cancelAnimationFrame(meterRaf.current);
    meterRaf.current = null;
    setVoiceLevel(0);
  };
  const startMeter = () => {
    stopMeter();
    const tick = () => {
      setVoiceLevel((prev) => {
        if (status !== "recording") return 0;
        const boost = interim ? 28 : 10;
        const next = boost + Math.round(Math.random() * 42);
        return Math.max(8, Math.min(90, Math.round((prev * 0.35) + (next * 0.65))));
      });
      meterRaf.current = requestAnimationFrame(tick);
    };
    meterRaf.current = requestAnimationFrame(tick);
  };

  const apply = (text: string) => {
    const p = ns(text); if (!p) return;
    if (step === 1) {
      const maybe = detect(p); if (maybe) setCategory(maybe);
      const cand = maybe || activeCategory;
      if (cand && has(p, yes)) { setCategory(cand); setStep(2); }
      if (cand && has(p, no)) setCategory("");
      return;
    }
    if (step === 2) {
      if (has(p, done)) { setStep(3); return; }
      setDescription((prev) => join(prev, fmt(p)));
      return;
    }
    setAddress((prev) => join(prev, p));
  };
  const flushInterimForStep = () => {
    const pending = ns(interim);
    if (!pending) return;
    if (step === 2) {
      setDescription((prev) => join(prev, fmt(pending)));
    } else if (step === 3) {
      setAddress((prev) => join(prev, pending));
    } else if (step === 1) {
      const maybe = detect(pending);
      if (maybe) setCategory(maybe);
    }
    setInterim("");
  };
  const stopRecord = () => {
    keepRecording.current = false;
    flushInterimForStep();
    try { recog.current?.stop?.(); } catch { /* noop */ }
    stopMeter();
    setStatus("processing");
  };
  const startRecord = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError(t("voice.error.noSpeechSupport", "Speech recognition is not supported in this browser.")); return; }
    keepRecording.current = true;
    autoAdvancedStep1.current = false;
    setError(""); setSeconds(0); setWaveTick(0); setInterim(""); setStatus("recording"); lastSpeechAt.current = Date.now(); hasDetectedSpeech.current = false; startMeter();
    const r = new SR();
    r.lang = locale(language); r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onspeechstart = () => {
      hasDetectedSpeech.current = true;
      lastSpeechAt.current = Date.now();
    };
    r.onresult = (e: any) => {
      let i = "";
      for (let x = e.resultIndex; x < e.results.length; x += 1) {
        const tr = e.results[x][0]?.transcript || "";
        const conf = Number(e.results[x][0]?.confidence);
        if (!Number.isNaN(conf) && conf > 0) setVoiceConfidence(conf);
        if (e.results[x].isFinal) apply(tr);
        else i += ` ${tr}`;
        if (ns(tr)) {
          hasDetectedSpeech.current = true;
          lastSpeechAt.current = Date.now();
        }
      }
      setInterim(ns(i));
    };
    r.onerror = (event: any) => {
      const reason = String(event?.error || "");
      if (reason === "no-speech") {
        lastSpeechAt.current = Date.now();
        setError("No speech detected. Please speak clearly.");
        return;
      }
      const msg =
        reason === "not-allowed" || reason === "service-not-allowed"
          ? "Microphone permission denied. Please allow mic access and try again."
          : reason === "audio-capture"
            ? "Microphone not detected. Check if another app is using it."
            : reason === "network"
              ? "Speech service network error. Please check internet and try again."
              : "Could not capture voice clearly. Please try again.";
      keepRecording.current = false;
      setError(msg); setStatus("inactive"); stopMeter();
    };
    r.onend = () => {
      if (keepRecording.current && secondsRef.current < MAX_SECONDS) {
        try { r.start(); } catch { /* noop */ }
        return;
      }
      flushInterimForStep();
      setStatus((p: Status) => (p === "recording" ? "inactive" : p));
      stopMeter();
    };
    recog.current = r; r.start();
  };

  const toFile = async (dataUrl: string, name: string) => { const r = await fetch(dataUrl); const b = await r.blob(); return new File([b], name, { type: b.type || "image/jpeg" }); };
  const submitOnline = async (payload: Pending["payload"]) => {
    const fd = new FormData(); const backendCategory = mapCat[payload.category] || payload.category;
    fd.append("title", `Voice Complaint: ${backendCategory}`); fd.append("category", backendCategory); fd.append("description", payload.description); fd.append("address", payload.address);
    fd.append("source", "voice"); fd.append("voiceLanguage", payload.language); fd.append("voiceLocale", locale(payload.language));
    if (payload.voiceConfidence !== undefined && payload.voiceConfidence !== null) fd.append("voiceConfidence", String(payload.voiceConfidence));
    if (payload.voiceTranscript) fd.append("voiceTranscript", payload.voiceTranscript);
    if (payload.latitude) fd.append("latitude", payload.latitude); if (payload.longitude) fd.append("longitude", payload.longitude);
    for (const a of payload.attachments) fd.append("attachments", await toFile(a.dataUrl, a.name));
    const res = await complaintService.fileComplaint(fd);
    const complaint = res?.data?.complaint;
    return {
      dbId: complaint?._id ? String(complaint._id) : "",
      complaintId: complaint?.complaintId ? String(complaint.complaintId) : "",
    };
  };
  const flushQueue = async () => {
    if (!navigator.onLine) return; const q = rq(); if (!q.length) return;
    const rem: Pending[] = []; for (const item of q) { try { await submitOnline(item.payload); } catch { rem.push(item); } }
    wq(rem); if (!rem.length) toast.success(t("voice.queueUploaded", "Queued offline complaints uploaded."));
  };
  const stopCamera = () => { cameraStream.current?.getTracks().forEach((t) => t.stop()); cameraStream.current = null; setCameraOpen(false); };
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      cameraStream.current = stream; setCameraOpen(true); setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 0);
    } catch { toast.error(t("voice.error.cameraPreview", "Camera preview not available. Use Upload from Gallery.")); }
  };
  const capture = () => {
    const v = videoRef.current; if (!v) return;
    const c = document.createElement("canvas"); c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
    const x = c.getContext("2d"); if (!x) return; x.drawImage(v, 0, 0, c.width, c.height);
    setImages((prev) => [...prev, { id: crypto.randomUUID(), dataUrl: c.toDataURL("image/jpeg", 0.9), name: `capture-${Date.now()}.jpg` }].slice(0, 5));
    toast.success(t("voice.photoCaptured", "Photo captured"));
  };
  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    const added: Img[] = [];
    for (const f of Array.from(files)) {
      const dataUrl = await new Promise<string>((resolve) => { const r = new FileReader(); r.onload = () => resolve(typeof r.result === "string" ? r.result : ""); r.readAsDataURL(f); });
      if (dataUrl) added.push({ id: crypto.randomUUID(), dataUrl, name: f.name });
    }
    setImages((prev) => [...prev, ...added].slice(0, 5));
  };
  const movePin = (latDelta: number, lngDelta: number) => {
    if (!coords) return;
    const nextLat = Number((coords.lat + latDelta).toFixed(6));
    const nextLng = Number((coords.lng + lngDelta).toFixed(6));
    setCoords({ lat: nextLat, lng: nextLng });
    setAddress(`Lat: ${nextLat}, Long: ${nextLng}`);
  };
  const submit = async () => {
    flushInterimForStep();
    const finalCategory = category || activeCategory;
    const finalDescription = ns(step === 2 ? join(description, interim) : description);
    const finalAddress = ns(step === 3 ? join(address, interim) : address);
    if (!finalCategory || !finalDescription || (!finalAddress && !coords)) { toast.error(t("voice.error.completeFields", "Please complete category, description, and location before submitting.")); return; }
    const transcript = ns([finalCategory, finalDescription, finalAddress].filter(Boolean).join(". "));
    const payload: Pending["payload"] = { language, category: finalCategory, description: finalDescription, address: finalAddress || (coords ? `${coords.lat}, ${coords.lng}` : ""), latitude: coords ? String(coords.lat) : undefined, longitude: coords ? String(coords.lng) : undefined, voiceConfidence, voiceTranscript: transcript, attachments: images.map((i) => ({ name: i.name, dataUrl: i.dataUrl })) };
    if (!navigator.onLine) {
      const q = rq(); q.push({ id: `q-${Date.now()}`, payload }); wq(q); setOk(true); setComplaintId(`QUEUED-${String(q.length).padStart(3, "0")}`); toast.success(t("voice.savedOffline", "Offline mode: complaint saved. It will auto-upload when online.")); return;
    }
    try {
      setSubmitting(true); const result = await submitOnline(payload);
      if (!result.dbId) throw new Error("Complaint ID was not returned by server");
      await complaintService.updateVoiceMetadata(result.dbId, { source: "voice", language, locale: locale(language), confidence: voiceConfidence, transcript: payload.voiceTranscript || "" });
      setOk(true); setComplaintId(result.complaintId || result.dbId); toast.success(t("voice.submitSuccess", "Complaint submitted successfully"));
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext; if (Ctx) { const c = new Ctx(); const o = c.createOscillator(); const g = c.createGain(); o.frequency.value = 1040; g.gain.value = 0.2; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.15); }
    } catch (e: any) { toast.error(e?.response?.data?.message || t("voice.submitFailed", "Failed to submit complaint")); } finally { setSubmitting(false); }
  };
  const resetAll = () => { setStep(1); setStatus("inactive"); setSeconds(0); setWaveTick(0); setVoiceLevel(0); setInterim(""); setVoiceConfidence(null); setError(""); setCategory(""); setDescription(""); setAddress(""); setCoords(null); setConfirmed(false); setTs(null); setImages([]); setOk(false); setComplaintId(""); stopCamera(); };

  useEffect(() => { if (!isRec) return; const t = setInterval(() => setSeconds((p) => (p >= MAX_SECONDS ? MAX_SECONDS : p + 1)), 1000); return () => clearInterval(t); }, [isRec]);
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  useEffect(() => { if (!isRec) return; const t = setInterval(() => setWaveTick((p) => p + 1), 140); return () => clearInterval(t); }, [isRec]);
  useEffect(() => { if (status === "recording" && seconds >= MAX_SECONDS) stopRecord(); }, [seconds, status]);
  useEffect(() => { if (!isProc) return; const t = setTimeout(() => { setStatus("inactive"); setSeconds(0); }, 1100); return () => clearTimeout(t); }, [isProc]);
  useEffect(() => {
    if (!isRec) return;
    const silenceTimer = setInterval(() => {
      if (!hasDetectedSpeech.current || !lastSpeechAt.current) return;
      if (Date.now() - lastSpeechAt.current >= SILENCE_MS) {
        stopRecord();
        toast.message(t("voice.silencePaused", "Voice activity detection: paused due to silence. Tap mic to continue."));
      }
    }, 500);
    return () => clearInterval(silenceTimer);
  }, [isRec]);
  useEffect(() => {
    if (step !== 1 || !isRec || autoAdvancedStep1.current) return;
    if (!step1Detection.category || step1Detection.confidence < 0.72) return;
    autoAdvancedStep1.current = true;
    setCategory(step1Detection.category);
    toast.success(
      `${t("voice.detectedCategory", "Detected category")}: ${step1Detection.category} (${Math.round(step1Detection.confidence * 100)}%)`,
    );
    setStep(2);
  }, [isRec, step, step1Detection, t]);
  useEffect(() => { if (confirmed && !ts) setTs(new Date().toISOString()); }, [confirmed, ts]);
  useEffect(() => {
    const q = ns(address); if (!q || coords) return;
    const t = setTimeout(async () => { try { const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`); if (!r.ok) return; const a = await r.json(); if (Array.isArray(a) && a[0]) setCoords({ lat: Number(a[0].lat), lng: Number(a[0].lon) }); } catch { /* noop */ } }, 700);
    return () => clearTimeout(t);
  }, [address, coords]);
  useEffect(() => { speak(instruction); }, [instruction]);
  useEffect(() => { flushQueue(); const on = () => flushQueue(); window.addEventListener("online", on); return () => window.removeEventListener("online", on); }, []);
  useEffect(() => () => { try { recog.current?.stop?.(); } catch { /* noop */ } stopMeter(); stopCamera(); window.speechSynthesis?.cancel?.(); }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <section className="rounded border border-border bg-white p-6 md:p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary "><Mic className="h-8 w-8" /></div>
            <h1 className="text-3xl font-bold text-slate-900">{t("voice.title", "File Complaint by Voice")}</h1>
            <p className="text-sm text-slate-600">{t("voice.subtitle", "Speak in Hindi, English, or Urdu")}</p>
            {!speechSupported ? (
              <div className="w-full rounded border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
                {t("voice.compatibility.notSupported", "Speech recognition is not supported in this browser. Please use Chrome or Microsoft Edge for voice filing.")}
              </div>
            ) : !isRecommendedBrowser ? (
              <div className="w-full rounded border border-sky-300 bg-sky-50 px-4 py-3 text-left text-sm text-sky-900">
                {t("voice.compatibility.recommended", "For best voice accuracy, use the latest Chrome or Microsoft Edge browser.")}
              </div>
            ) : null}
            <div className="flex flex-wrap justify-center gap-2">{langs.map((o) => <button key={o.code} type="button" onClick={() => setLanguage(o.code)} className={`min-h-[60px] rounded-full border px-5 py-2 text-sm font-semibold ${language === o.code ? "border-primary bg-primary/15 text-primary-foreground" : "border-slate-300 bg-white text-slate-800"}`}><span className="mr-2">{o.flag}</span>{o.label}</button>)}</div>

            <div className="mt-2 w-full rounded border bg-slate-50 p-5">
              <button type="button" onClick={() => (isRec ? stopRecord() : startRecord())} disabled={isProc} className={`relative mx-auto h-[150px] w-[150px] rounded-full text-white  ${isRec ? "bg-red-700 " : "bg-primary"}`}><div className="absolute inset-0 flex flex-col items-center justify-center"><Mic className="mb-2 h-8 w-8" /><span className="text-sm font-semibold">{center}</span></div></button>
              <div className="mt-5 flex h-12 items-end justify-center gap-1">{Array.from({ length: 30 }).map((_, i) => { const b = 8 + ((i * 9) % 18); const a = isRec ? Math.max(4, Math.round((voiceLevel / 100) * 20)) : 2; const w = isRec ? ((waveTick + i) % 6) * 2 : 1; return <span key={i} className={`w-1.5 rounded-full ${isRec ? "bg-red-600" : "bg-primary/100"}`} style={{ height: `${Math.min(38, b + a + w)}px` }} />; })}</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{timer} / 02:00</div>
              <div className="mx-auto mt-2 h-2 w-60 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-emerald-600 transition-all" style={{ width: `${voiceLevel}%` }} /></div>
              <div className="mt-4"><Button type="button" variant="outline" className="min-h-[60px]" onClick={() => speak(instruction)}><Volume2 className="mr-2 h-4 w-4" />{t("voice.repeatInstructions", "Repeat Instructions")}</Button></div>
              {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
            </div>

            <div className="w-full rounded border p-5 text-left">
              {step === 1 ? <div className="space-y-3"><h2 className="text-xl font-semibold">{t("voice.step1Title", "Step 1: Category")}</h2><p>{t("voice.step1Prompt", "What type of problem are you facing?")}</p><p className="text-sm text-slate-600">{t("voice.step1Hint", "Voice prompt: Road, Water, Electricity, Sanitation...")}</p><div className="rounded-lg bg-slate-50 p-3 text-sm">{t("voice.detectedCategory", "Detected category")}: <span className="font-semibold">{activeCategory || t("voice.listeningCategory", "Listening for category...")}</span>{activeCategory ? <span className="ml-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">{t("voice.categoryConfidence", "Confidence")}: {categoryConfidencePct}%</span> : null}</div><div><label className="mb-1 block text-sm font-medium text-slate-700">{t("voice.manualCategory", "Or select category manually")}</label><select className="min-h-[44px] w-full rounded-md border bg-white px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">{t("voice.selectCategory", "Select category")}</option><option value="Roads & Transportation">Roads & Transportation</option><option value="Water Supply">Water Supply</option><option value="Electricity">Electricity</option><option value="Sanitation & Garbage">Sanitation & Garbage</option></select></div>{activeCategory ? <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary-foreground">{activeCategory} - {t("voice.confirmCategory", "Is this correct?")}</div> : null}<div className="flex flex-wrap gap-2"><Button className="min-h-[60px]" onClick={() => { const picked = category || activeCategory; if (!picked) return; setCategory(picked); setStep(2); }} disabled={!category && !activeCategory}>{t("common.continue", "Continue")}</Button>{activeCategory ? <Button className="min-h-[60px]" variant="outline" onClick={() => setCategory("")}>{t("common.no", "No")}</Button> : null}</div></div> : null}
              {step === 2 ? <div className="space-y-3"><h2 className="text-xl font-semibold">{t("voice.step2Title", "Step 2: Description")}</h2><p>{t("voice.step2Prompt", "Describe your problem in detail")}</p><div className="rounded-lg bg-slate-50 p-3 text-sm">{t("voice.liveTranscription", "Live transcription")}: <span className="font-semibold">{interim || t("voice.speakToStart", "Speak to start transcription...")}</span></div><textarea value={descPreview} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full rounded-lg border p-3" placeholder={t("voice.descriptionPlaceholder", "Describe the issue clearly with location references.")} /><div className="flex flex-wrap gap-2"><Button className="min-h-[60px]" onClick={() => { flushInterimForStep(); setStep(3); }}>{t("voice.doneSpeaking", "Done Speaking")}</Button><Button className="min-h-[60px]" variant="outline" onClick={() => { flushInterimForStep(); setStep(1); }}>{t("common.back", "Back")}</Button></div></div> : null}
              {step === 3 ? <div className="space-y-3"><h2 className="text-xl font-semibold">{t("voice.step3Title", "Step 3: Location")}</h2><p>{t("voice.step3Prompt", "Where is the problem?")}</p><div className="flex flex-wrap gap-2"><Button className="min-h-[60px]" onClick={() => { if (!navigator.geolocation) { setError(t("voice.geoUnsupported", "Geolocation is not supported in this browser.")); return; } navigator.geolocation.getCurrentPosition((p) => setCoords({ lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)) }), () => setError(t("voice.geoDenied", "Unable to access current location.")), { enableHighAccuracy: true, timeout: 15000 }); }}><Navigation className="mr-2 h-4 w-4" />{t("voice.useCurrentLocation", "Use Current Location")}</Button><Button className="min-h-[60px]" variant="outline" onClick={startRecord}><Mic className="mr-2 h-4 w-4" />{t("voice.speakAddress", "Speak Address")}</Button></div><div className="rounded-lg bg-slate-50 p-3 text-sm">{t("voice.spokenAddress", "Spoken address")}: <span className="font-semibold">{addrPreview || t("voice.noAddressYet", "No address spoken yet.")}</span></div>{coords ? <div className="space-y-3"><div className="relative"><LocationPickerMap coords={coords} onChange={(next) => { setCoords(next); setAddress(`Lat: ${next.lat}, Long: ${next.lng}`); }} /><div className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/90 p-1 text-red-600 shadow"><MapPin className="h-4 w-4" /></div></div><div className="rounded border border-input bg-background p-3"><p className="text-xs text-muted-foreground mb-2">{t("file.movePin", "Adjust pin position")}</p><div className="flex items-center justify-center gap-2 mb-2"><Button type="button" variant="outline" size="sm" onClick={() => movePin(0.0005, 0)}><ChevronUp className="w-4 h-4" /></Button></div><div className="flex items-center justify-center gap-2 mb-2"><Button type="button" variant="outline" size="sm" onClick={() => movePin(0, -0.0005)}><ChevronLeft className="w-4 h-4" /></Button><span className="text-xs text-muted-foreground px-2">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span><Button type="button" variant="outline" size="sm" onClick={() => movePin(0, 0.0005)}><ChevronRight className="w-4 h-4" /></Button></div><div className="flex items-center justify-center gap-2"><Button type="button" variant="outline" size="sm" onClick={() => movePin(-0.0005, 0)}><ChevronDown className="w-4 h-4" /></Button></div></div></div> : null}<div className="flex flex-wrap gap-2"><Button className="min-h-[60px]" onClick={() => { flushInterimForStep(); setConfirmed(true); }} disabled={!coords && !addrPreview}>{t("voice.confirmLocation", "Confirm Location")}</Button><Button className="min-h-[60px]" variant="outline" onClick={() => { flushInterimForStep(); setStep(2); }}>{t("common.back", "Back")}</Button></div></div> : null}
            </div>

            {confirmed ? <div className="w-full rounded border bg-slate-50 p-5 text-left"><div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-semibold">{t("voice.reviewTitle", "Transcript Review")}</h3><span className="text-xs text-slate-600">{ts ? new Date(ts).toLocaleString() : new Date().toLocaleString()}</span></div><div className="space-y-3"><div className="rounded-lg border bg-white p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs uppercase text-slate-500">{t("voice.category", "Category")}</span><Button variant="outline" size="sm" onClick={() => setStep(1)}>{t("common.edit", "Edit")}</Button></div><span className="inline-flex rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">{category || t("common.notSet", "Not set")}</span></div><div className="rounded-lg border bg-white p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs uppercase text-slate-500">{t("voice.fullDescription", "Full Description")}</span><Button variant="outline" size="sm" onClick={() => setStep(2)}>{t("common.edit", "Edit")}</Button></div><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full rounded-md border p-2" /></div><div className="rounded-lg border bg-white p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs uppercase text-slate-500">{t("voice.location", "Location")}</span><Button variant="outline" size="sm" onClick={() => setStep(3)}>{t("common.edit", "Edit")}</Button></div><div className="mb-2 text-sm">{address || t("voice.currentLocationSelected", "Current location selected")}</div>{coords ? <div className="relative"><LocationPickerMap coords={coords} draggable={false} clickToSet={false} onChange={() => { /* readonly */ }} /><div className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/90 p-1 text-red-600 shadow"><MapPin className="h-4 w-4" /></div></div> : <div className="rounded-md border border-dashed p-3 text-xs text-slate-500">{t("voice.mapUnavailable", "Map preview unavailable")}</div>}</div></div><div className="mt-4 flex flex-wrap gap-2"><Button className="min-h-[60px]" variant="outline" onClick={() => toast.success(t("voice.reviewApproved", "Looks good. Continue to photo and submission."))}>{t("voice.looksGood", "Looks good")}</Button><Button className="min-h-[60px]" variant="outline" onClick={resetAll}>{t("voice.rerecord", "Re-record")}</Button></div></div> : null}

            {confirmed ? <div className="w-full rounded border bg-white p-5 text-left"><h3 className="mb-3 text-lg font-semibold">{t("voice.photoCapture", "Photo Capture")}</h3><div className="flex flex-wrap gap-2"><Button className="min-h-[60px]" onClick={cameraOpen ? capture : startCamera}><Camera className="mr-2 h-4 w-4" />{t("voice.takePhoto", "Take a Photo")}</Button><Button className="min-h-[60px]" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-2 h-4 w-4" />{t("voice.uploadGallery", "Upload from Gallery")}</Button><Button className="min-h-[60px]" variant="ghost">{t("common.skip", "Skip")}</Button></div><input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => pick(e.target.files)} />{cameraOpen ? <div className="mt-3"><video ref={videoRef} autoPlay playsInline className="h-52 w-full rounded-lg border object-cover" /><div className="mt-2 flex flex-wrap gap-2"><Button variant="outline" onClick={stopCamera}>{t("voice.closeCamera", "Close Camera")}</Button><Button onClick={capture}>{t("voice.capture", "Capture")}</Button></div></div> : null}{images.length ? <div className="mt-3"><div className="grid grid-cols-2 gap-2 md:grid-cols-4">{images.map((img) => <img key={img.id} src={img.dataUrl} alt={img.name} className="h-24 w-full rounded-md border object-cover" />)}</div><div className="mt-2 flex flex-wrap gap-2"><Button variant="outline" onClick={() => fileRef.current?.click()}>{t("voice.addMore", "Add More")}</Button><Button variant="ghost" onClick={() => setImages([])}>{t("common.clear", "Clear")}</Button></div></div> : null}</div> : null}

            {confirmed ? <div className="w-full rounded border bg-slate-50 p-5 text-left"><h3 className="mb-3 text-lg font-semibold">{t("voice.submission", "Submission")}</h3><div className="mb-3 rounded-lg border bg-white p-3 text-sm"><div><span className="font-semibold">{t("voice.category", "Category")}:</span> {category || t("common.notSet", "Not set")}</div><div><span className="font-semibold">{t("voice.language", "Language")}:</span> {langs.find((l) => l.code === language)?.label}</div><div><span className="font-semibold">{t("voice.description", "Description")}:</span> {description || t("common.notSet", "Not set")}</div><div><span className="font-semibold">{t("voice.location", "Location")}:</span> {address || (coords ? `${coords.lat}, ${coords.lng}` : t("common.notSet", "Not set"))}</div><div><span className="font-semibold">{t("voice.photos", "Photos")}:</span> {images.length}</div></div><Button className="min-h-[60px] bg-emerald-700 hover:bg-emerald-800" onClick={submit} disabled={submitting}>{submitting ? t("voice.submitting", "Submitting...") : t("voice.submitButton", "Submit Complaint")}</Button>{ok ? <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4"><div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-6 w-6 " /><span className="font-semibold">{t("common.success", "Success")}</span></div><p className="mt-2 text-sm text-emerald-800">{t("track.complaintId", "Complaint ID")}: <span className="font-semibold">{complaintId}</span></p><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" onClick={resetAll}>{t("voice.fileAnother", "File Another")}</Button><Button onClick={() => nav("/my-complaints")}>{t("voice.viewStatus", "View Status")}</Button></div></div> : null}</div> : null}

            <div className="w-full rounded border bg-white text-left"><button type="button" onClick={() => setHelpOpen((p) => !p)} className="flex min-h-[60px] w-full items-center justify-between px-4 py-3 font-semibold">{t("track.needHelp", "Need Help?")}<ChevronDown className={`h-5 w-5 transition ${helpOpen ? "rotate-180" : ""}`} /></button>{helpOpen ? <div className="border-t px-4 py-4"><div className="text-sm font-semibold">{t("voice.tips", "Tips")}</div><ul className="mt-2 space-y-1 text-sm">{help[language].tips.map((t) => <li key={t}>- {t}</li>)}</ul><div className="mt-3 text-sm font-semibold">{t("voice.examplePhrases", "Example phrases")}</div><ul className="mt-2 space-y-1 text-sm">{help[language].ex.map((x) => <li key={x}>- {x}</li>)}</ul><div className="mt-3 text-sm font-semibold">{t("nav.helpline", "Helpline: 1800-000-0000")}</div></div> : null}</div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default VoiceComplaint;

