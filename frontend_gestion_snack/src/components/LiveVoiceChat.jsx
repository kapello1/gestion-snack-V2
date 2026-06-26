import { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, Volume2, VolumeX, PhoneOff } from 'lucide-react';
import { sendChatMessage } from '../utils/groqApi';
import { useLanguage } from '../context/LanguageContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// ── Constantes ────────────────────────────────────────────────────────────────
const S = { LISTENING: 'listening', PROCESSING: 'processing', SPEAKING: 'speaking' };
const LANG_MAP = { fr: 'fr-FR', nl: 'nl-NL', de: 'de-DE' };
const VOICE_ID    = 'pNInz6obpgDQGcFmaJgB'; // ElevenLabs - Adam
const EL_MODEL    = 'eleven_turbo_v2_5';    // modèle rapide (~2x plus vite que multilingual_v2)
const EL_LATENCY  = 4;                      // optimize_streaming_latency (0-4, 4 = minimum latency)

const IS_IOS    = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const IS_MOBILE = IS_IOS || /android/i.test(navigator.userAgent);

// iOS/Safari : continuous=true instable → false + relance via onend
const USE_CONTINUOUS = !(IS_IOS || IS_SAFARI);

// Garde anti-écho : délai avant d'ouvrir le micro après le TTS
// Desktop 1500ms : couvre écho matériel (50ms) + réverbération salle (≤800ms) + traitement STT (≤500ms)
const ECHO_GUARD_MS  = IS_MOBILE ? 900 : 1500;
// Délai post-audio : laisse le buffer hardware se vider avant de lancer l'echo guard
const POST_TTS_MS    = IS_MOBILE ? 200 : 150;
// Silence maximal toléré en écoute avant de recréer le moteur STT
// (parade à l'endormissement de la Web Speech API sur longue session)
const LISTEN_WATCHDOG_MS = 12000;

const WELCOME = {
  fr: 'Bonjour et bienvenue au Snack Tiegni Bernard ! Je suis votre assistant vocal. En quoi puis-je vous aider ?',
  nl: 'Hallo en welkom bij Snack Tiegni Bernard! Ik ben uw spraakassistent. Hoe kan ik u helpen?',
  de: 'Hallo und willkommen beim Snack Tiegni Bernard! Ich bin Ihr Sprachassistent. Wie kann ich Ihnen helfen?',
};

// ── Composant ─────────────────────────────────────────────────────────────────
const LiveVoiceChat = ({ onClose, onMessagePair, products = [], chatHistory = [] }) => {
  const { language } = useLanguage();

  const [started,    setStarted]    = useState(false);
  const [vsState,    setVsState]    = useState(S.LISTENING); // pour le rendu
  const [isMuted,    setIsMuted]    = useState(false);
  const [transcript, setTranscript] = useState('');
  const [botSnippet, setBotSnippet] = useState('');
  const [errorMsg,   setErrorMsg]   = useState('');

  // ── Refs (accès synchrone dans les callbacks) ─────────────────────────────
  const mountedRef   = useRef(false);
  const vsRef        = useRef(S.LISTENING); // état courant (synchrone)
  const mutedRef     = useRef(false);
  const errCountRef  = useRef(0);
  const txRef        = useRef('');          // transcription accumulée
  const histRef      = useRef(chatHistory);
  const prodsRef     = useRef(products);
  const pairRef      = useRef(onMessagePair);
  const langRef      = useRef(language);

  const recRef       = useRef(null);  // SpeechRecognition
  const audioRef     = useRef(null);  // <Audio> ElevenLabs en cours
  const ttsIdRef     = useRef(0);     // session TTS - incrémenté à chaque cancel/start

  const silTimerRef  = useRef(null);  // timer silence → sendToBot
  const rstTimerRef  = useRef(null);  // timer relance reconnaissance
  const echoTimerRef = useRef(null);  // timer fin de garde anti-écho
  const echoRef      = useRef(false); // true = ignorer onresult
  const safetyRef    = useRef(null);  // timer sécurité anti-blocage
  const watchdogRef  = useRef(null);  // watchdog écoute : recycle le moteur STT s'il s'endort
  const abortCtrlRef = useRef(null);  // AbortController — annule les fetches ElevenLabs en vol
  const lastTTSRef   = useRef('');    // dernier texte TTS — filtre anti-écho dans onresult

  const orbRef  = useRef(null);
  const r1Ref   = useRef(null);
  const r2Ref   = useRef(null);
  const r3Ref   = useRef(null);
  const rafRef  = useRef(null);
  const sendRef = useRef(null); // sendToBot (mis à jour chaque render)

  // Sync refs → state/props
  useEffect(() => { histRef.current  = chatHistory;   }, [chatHistory]);
  useEffect(() => { prodsRef.current = products;      }, [products]);
  useEffect(() => { pairRef.current  = onMessagePair; }, [onMessagePair]);
  useEffect(() => { langRef.current  = language;      }, [language]);
  useEffect(() => { mutedRef.current = isMuted;       }, [isMuted]);

  // ── Setter d'état synchrone + React ──────────────────────────────────────
  const setVS = (s) => {
    if (!mountedRef.current) return;
    vsRef.current = s;
    setVsState(s);
  };

  // ── Orb animation (RAF) ───────────────────────────────────────────────────
  const startAnim = () => {
    let t = 0;
    const loop = () => {
      if (!mountedRef.current) return;
      rafRef.current = requestAnimationFrame(loop);
      t += 0.016;
      const orb = orbRef.current;
      if (!orb) return;
      const s = vsRef.current;
      if (s === S.LISTENING) {
        orb.style.transform = `scale(${1 + Math.sin(t * 1.5) * 0.04})`;
        if (r1Ref.current) r1Ref.current.style.opacity = (0.18 + Math.sin(t * 1.5) * 0.06).toFixed(2);
        if (r2Ref.current) r2Ref.current.style.opacity = (0.10 + Math.sin(t * 1.2) * 0.04).toFixed(2);
        if (r3Ref.current) r3Ref.current.style.opacity = (0.05 + Math.sin(t * 0.9) * 0.02).toFixed(2);
      } else if (s === S.SPEAKING) {
        orb.style.transform = `scale(${1.05 + Math.sin(t * 2.5) * 0.08})`;
        if (r1Ref.current) r1Ref.current.style.opacity = '0.10';
        if (r2Ref.current) r2Ref.current.style.opacity = '0.06';
        if (r3Ref.current) r3Ref.current.style.opacity = '0.03';
      } else {
        orb.style.transform = 'scale(1)';
        if (r1Ref.current) r1Ref.current.style.opacity = '0';
        if (r2Ref.current) r2Ref.current.style.opacity = '0';
        if (r3Ref.current) r3Ref.current.style.opacity = '0';
      }
    };
    loop();
  };

  // ── Garde anti-écho ───────────────────────────────────────────────────────
  const activateEcho = () => {
    echoRef.current = true;
    clearTimeout(echoTimerRef.current);
    echoTimerRef.current = setTimeout(() => { echoRef.current = false; }, ECHO_GUARD_MS);
  };

  // ── Annuler tout TTS en cours ─────────────────────────────────────────────
  const cancelTTS = () => {
    ttsIdRef.current += 1;
    abortCtrlRef.current?.abort();
    abortCtrlRef.current = null;
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      audioRef.current = null;
    }
    try { window.speechSynthesis?.cancel(); } catch {}
  };

  // ── TTS fallback : speechSynthesis découpé en phrases (anti-coupure Android)
  // Supporte Firefox (chargement asynchrone des voix) et Android Chrome (état "paused" collant).
  const speakSynth = (text, sessionId, onEnd) => {
    const synth = window.speechSynthesis;
    if (!synth) { onEnd(); return; }

    // Android Chrome peut se retrouver bloqué en état "paused" après une longue session
    try { synth.resume(); } catch {}
    synth.cancel();

    const doSpeak = (voices) => {
      if (ttsIdRef.current !== sessionId || !mountedRef.current) return;

      const chunks = text.match(/[^.!?]+[.!?]*/g)?.map(s => s.trim()).filter(Boolean) || [text];
      if (!chunks.length) { onEnd(); return; }

      const targetLang = LANG_MAP[langRef.current] || 'fr-FR';
      const langCode   = targetLang.split('-')[0];
      // Cherche une voix pour la langue cible, sinon prend n'importe quelle voix disponible
      const voice = voices.find(v => v.lang.startsWith(langCode))
                 || voices.find(v => v.lang.startsWith('fr'))
                 || voices[0]
                 || null;

      let idx = 0;
      const next = () => {
        if (ttsIdRef.current !== sessionId || !mountedRef.current) return;
        if (idx >= chunks.length) {
          setTimeout(() => {
            if (ttsIdRef.current === sessionId && mountedRef.current) onEnd();
          }, POST_TTS_MS);
          return;
        }
        const chunk = chunks[idx++];
        const u = new SpeechSynthesisUtterance(chunk);
        u.lang = targetLang;
        if (voice) u.voice = voice;
        u.rate = 1.0;
        // Resume avant chaque utterance pour déverrouiller Android Chrome
        try { synth.resume(); } catch {}
        const words = chunk.split(/\s+/).length;
        const limit = Math.max(2500, words * 380 + 800);
        const timer = setTimeout(() => {
          if (ttsIdRef.current === sessionId && mountedRef.current) next();
        }, limit);
        u.onend   = () => { clearTimeout(timer); if (ttsIdRef.current === sessionId) setTimeout(next, IS_MOBILE ? 160 : 60); };
        u.onerror = (e) => { clearTimeout(timer); if (e.error !== 'interrupted' && ttsIdRef.current === sessionId) setTimeout(next, 60); };
        synth.speak(u);
      };
      next();
    };

    // Firefox/Edge chargent les voix de façon asynchrone : attendre voiceschanged si nécessaire
    const voices = synth.getVoices();
    if (voices.length > 0) {
      doSpeak(voices);
    } else {
      let resolved = false;
      const fallbackTimer = setTimeout(() => {
        if (!resolved) { resolved = true; doSpeak(synth.getVoices()); }
      }, 1500);
      synth.addEventListener('voiceschanged', function onVoices() {
        synth.removeEventListener('voiceschanged', onVoices);
        if (!resolved) { resolved = true; clearTimeout(fallbackTimer); doSpeak(synth.getVoices()); }
      }, { once: true });
    }
  };

  // ── TTS principal : ElevenLabs streaming → Audio HTML, fallback → speechSynthesis ──
  //
  // Appeler sans await - le callback onEnd signale la fin.
  // L'état SPEAKING doit être setté AVANT d'appeler speakText.
  //
  const speakText = async (text, onEnd) => {
    if (mutedRef.current) { onEnd(); return; }

    cancelTTS();
    const myId = ttsIdRef.current; // id de session capturé après cancel
    lastTTSRef.current = text;     // mémoriser pour le filtre anti-écho

    const fallback = () => {
      if (ttsIdRef.current !== myId || !mountedRef.current) return;
      speakSynth(text, myId, onEnd);
    };

    const playBlob = async (blob) => {
      const url   = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      const done = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
        if (ttsIdRef.current !== myId || !mountedRef.current) return;
        setTimeout(() => {
          if (ttsIdRef.current === myId && mountedRef.current) onEnd();
        }, POST_TTS_MS);
      };

      audio.onended = done;
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
        if (ttsIdRef.current !== myId || !mountedRef.current) return;
        fallback();
      };

      try {
        await audio.play();
      } catch (playErr) {
        console.warn('Audio.play():', playErr.name, '→ fallback');
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
        if (ttsIdRef.current !== myId || !mountedRef.current) return;
        fallback();
      }
    };

    // AbortController : annule le fetch dès que cancelTTS() est appelé
    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;

    try {
      const res = await fetch(`${API_BASE}/ai/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: ctrl.signal,
      });

      if (ttsIdRef.current !== myId || !mountedRef.current) return;

      if (!res.ok) {
        console.warn(`ElevenLabs ${res.status} → fallback`);
        fallback();
        return;
      }

      // Lire le stream chunk par chunk (permet l'annulation immédiate en cours de transfert)
      const reader = res.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (ttsIdRef.current !== myId || !mountedRef.current) { reader.cancel(); return; }
        if (done) break;
        chunks.push(value);
      }

      await playBlob(new Blob(chunks, { type: 'audio/mpeg' }));

    } catch (err) {
      if (err.name === 'AbortError') return; // annulé intentionnellement par cancelTTS
      if (ttsIdRef.current !== myId || !mountedRef.current) return;
      console.warn('ElevenLabs fetch:', err.message, '→ fallback');
      fallback();
    }
  };

  // ── Démonter le moteur STT SANS déclencher nos handlers ───────────────────
  // Détacher les callbacks avant abort() évite la boucle onend→relance→abort.
  const killRec = () => {
    const r = recRef.current;
    if (!r) return;
    r.onresult = null;
    r.onerror  = null;
    r.onend    = null;
    r.onstart  = null;
    try { r.abort(); } catch {}
    recRef.current = null;
  };

  // ── Démarrer la reconnaissance ────────────────────────────────────────────
  const startRec = () => {
    if (!mountedRef.current) return;
    clearTimeout(rstTimerRef.current);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    // Moteur NEUF à chaque démarrage : réutiliser le même objet sur une longue
    // session fait "mourir" la reconnaissance de Chrome (plus aucun résultat émis).
    killRec();
    setupRec(SR);
    try {
      recRef.current.start();
    } catch (e) {
      if (e.name !== 'InvalidStateError') console.warn('rec.start:', e.name);
    }
  };

  // ── Watchdog d'écoute ─────────────────────────────────────────────────────
  // Si aucun résultat n'arrive pendant LISTEN_WATCHDOG_MS en état LISTENING, on
  // considère le moteur endormi et on le recycle. Réarmé à chaque onresult, donc
  // ne se déclenche que sur un silence réellement prolongé.
  const armWatchdog = () => {
    clearTimeout(watchdogRef.current);
    watchdogRef.current = setTimeout(() => {
      if (!mountedRef.current || vsRef.current !== S.LISTENING) return;
      console.warn('[STT] watchdog → recyclage du moteur');
      startRec();
      armWatchdog();
    }, LISTEN_WATCHDOG_MS);
  };

  // ── Transition propre vers LISTENING ─────────────────────────────────────
  //
  // Le micro ne démarre QU'APRÈS ECHO_GUARD_MS : la reconnaissance ne capte
  // jamais l'écho du TTS car le stream audio n'existe pas encore à ce moment.
  //
  const goListening = () => {
    clearTimeout(safetyRef.current);
    clearTimeout(silTimerRef.current);
    clearTimeout(rstTimerRef.current);   // ← annule tout timer onend stale
    clearTimeout(echoTimerRef.current);
    clearTimeout(watchdogRef.current);
    txRef.current = '';
    echoRef.current = true;
    setVS(S.LISTENING);
    echoTimerRef.current = setTimeout(() => {
      echoRef.current = false;
      // Micro réellement ouvert : le son du TTS est terminé depuis ECHO_GUARD_MS,
      // il n'y a plus d'écho acoustique possible. On désarme donc le filtre
      // anti-écho par mots (lastTTSRef) qui sinon jette la parole de l'utilisateur
      // dès qu'il réutilise des mots du menu que le bot vient de citer.
      lastTTSRef.current = '';
      if (mountedRef.current && vsRef.current === S.LISTENING) { startRec(); armWatchdog(); }
    }, ECHO_GUARD_MS);
  };

  // ── Envoyer la transcription au bot ──────────────────────────────────────
  const sendToBot = async () => {
    const text = txRef.current.trim();
    if (!text || !mountedRef.current) return;
    // Verrou anti-chevauchement : on ne traite un envoi que si l'on est
    // réellement en écoute. Un onresult résiduel survenant pendant que le bot
    // traite ou parle déjà est ignoré (sinon il relance un second cycle qui
    // casse le retour à l'écoute via un conflit de ttsId).
    if (vsRef.current !== S.LISTENING) return;

    txRef.current = '';
    lastTTSRef.current = '';  // l'utilisateur a parlé → libérer le filtre anti-écho
    setTranscript('');
    clearTimeout(silTimerRef.current);
    clearTimeout(rstTimerRef.current);  // ← annule tout restart onend stale
    clearTimeout(watchdogRef.current);  // ← on quitte l'écoute : stopper le watchdog
    setVS(S.PROCESSING);
    try { recRef.current?.stop(); } catch {}

    // Sécurité : si bloqué en PROCESSING >15 s, on reprend l'écoute
    safetyRef.current = setTimeout(() => {
      if (vsRef.current === S.PROCESSING && mountedRef.current) {
        console.warn('Safety timeout PROCESSING → LISTENING');
        setBotSnippet('');
        goListening();
      }
    }, 15000);

    const userMsg = { id: Date.now(), text, sender: 'user', timestamp: new Date() };

    // Limiter l'historique aux 6 derniers messages (3 échanges) pour rester
    // sous la limite de tokens du plan gratuit Groq (6000 TPM).
    const recentHistory = histRef.current.slice(-6);

    try {
      const botText = await sendChatMessage(
        [...recentHistory, userMsg],
        prodsRef.current,
        true // voiceMode : pas d'emoji, pas de markdown
      );
      clearTimeout(safetyRef.current);
      if (!mountedRef.current) return;

      setBotSnippet(botText.slice(0, 120) + (botText.length > 120 ? '…' : ''));
      pairRef.current?.(userMsg, {
        id: Date.now() + 1, text: botText, sender: 'bot', timestamp: new Date(),
      });

      if (mutedRef.current) {
        setBotSnippet('');
        goListening();
        return;
      }

      setVS(S.SPEAKING);

      // Sécurité : si bloqué en SPEAKING >30 s (réponse très longue), on reprend l'écoute
      safetyRef.current = setTimeout(() => {
        if (vsRef.current === S.SPEAKING && mountedRef.current) {
          console.warn('Safety timeout SPEAKING → LISTENING');
          cancelTTS();
          setBotSnippet('');
          goListening();
        }
      }, 30000);

      speakText(botText, () => {
        clearTimeout(safetyRef.current);
        if (!mountedRef.current) return;
        setBotSnippet('');
        goListening();
      });

    } catch (err) {
      clearTimeout(safetyRef.current);
      if (!mountedRef.current) return;
      console.error('sendToBot:', err);
      setBotSnippet('');
      goListening();
    }
  };

  useEffect(() => { sendRef.current = sendToBot; });

  // ── Configurer SpeechRecognition ──────────────────────────────────────────
  const setupRec = (SR) => {
    const rec = new SR();
    rec.continuous     = USE_CONTINUOUS;
    rec.interimResults = true;
    rec.lang           = LANG_MAP[langRef.current] || 'fr-FR';

    rec.onstart = () => { errCountRef.current = 0; console.log('[STT] onstart'); };

    rec.onresult = (event) => {
      if (!mountedRef.current) return;
      if (vsRef.current !== S.LISTENING) return; // ignorer pendant PROCESSING/SPEAKING
      if (echoRef.current) return;               // ignorer l'écho du TTS

      errCountRef.current = 0;
      armWatchdog();                             // activité détectée → réarmer le watchdog
      clearTimeout(silTimerRef.current);

      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) txRef.current += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      if (mountedRef.current) setTranscript((txRef.current + interim).trim());

      // Filtre anti-écho : si ≥ 60 % des mots de la transcription proviennent du dernier TTS → écho
      if (lastTTSRef.current) {
        const norm = s => s.toLowerCase().replace(/[^a-zàâéèêëîïôùûüç0-9 ]/g, ' ');
        const ttsSet  = new Set(norm(lastTTSRef.current).split(/\s+/).filter(w => w.length > 3));
        const txWords = norm((txRef.current + interim).trim()).split(/\s+/).filter(w => w.length > 3);
        if (txWords.length >= 2 && txWords.filter(w => ttsSet.has(w)).length / txWords.length >= 0.6) {
          txRef.current = '';
          if (mountedRef.current) setTranscript('');
          return;
        }
      }

      // Timer silence : 350 ms après un résultat final confirmé, 700 ms si seulement intérimaire.
      const hasFinal = !!txRef.current.trim();
      const anyText  = hasFinal || !!interim.trim();
      if (anyText) {
        const delay = hasFinal ? 350 : 700;
        silTimerRef.current = setTimeout(() => {
          if (!mountedRef.current || vsRef.current !== S.LISTENING) return;
          if (!txRef.current.trim() && interim.trim()) {
            txRef.current = interim.trim() + ' ';
          }
          sendRef.current?.();
        }, delay);
      }
    };

    rec.onerror = (e) => {
      if (!mountedRef.current) return;
      console.warn('[STT] onerror:', e.error);
      // Erreurs transitoires : laisser onend relancer automatiquement
      if (e.error === 'no-speech' || e.error === 'aborted' || e.error === 'network') return;
      errCountRef.current++;
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        mountedRef.current = false;
        setErrorMsg('Microphone refusé. Autorisez-le dans les paramètres du navigateur.');
        setStarted(false);
      } else if (e.error === 'audio-capture') {
        mountedRef.current = false;
        setErrorMsg('Microphone indisponible. Vérifiez qu\'aucune autre app ne l\'utilise.');
        setStarted(false);
      }
    };

    // Relancer UNIQUEMENT en état LISTENING et hors garde anti-écho
    rec.onend = () => {
      if (!mountedRef.current) return;
      console.log('[STT] onend - state=', vsRef.current, 'echo=', echoRef.current);
      if (vsRef.current === S.LISTENING && !echoRef.current) {
        rstTimerRef.current = setTimeout(() => {
          if (mountedRef.current && vsRef.current === S.LISTENING && !echoRef.current) startRec();
        }, 250);
      }
    };

    recRef.current = rec;
  };

  useEffect(() => {
    if (recRef.current) recRef.current.lang = LANG_MAP[language] || 'fr-FR';
  }, [language]);

  // ── handleStart - DOIT ÊTRE SYNCHRONE (iOS Safari) ───────────────────────
  //
  // iOS exige que speechSynthesis.speak() et SpeechRecognition.start() soient
  // appelés dans le même gestionnaire de clic (pas après un await).
  //
  const handleStart = () => {
    if (!window.isSecureContext) {
      setErrorMsg('HTTPS requis pour le microphone sur mobile.');
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg('Reconnaissance vocale non supportée. Utilisez Chrome ou Safari récent.');
      return;
    }

    setErrorMsg('');
    mountedRef.current = true;
    vsRef.current = S.LISTENING;

    // Préchauffage TTS dans le geste → déverrouille speechSynthesis sur iOS
    try {
      const w = new SpeechSynthesisUtterance(' ');
      w.volume = 0; w.rate = 10;
      window.speechSynthesis?.speak(w);
    } catch {}

    setupRec(SR);

    // Démarrer immédiatement → déclenche la boîte de permission micro
    try { recRef.current.start(); } catch (e) {
      if (e.name !== 'InvalidStateError') {
        mountedRef.current = false;
        setErrorMsg('Impossible de démarrer le microphone. Autorisez l\'accès et réessayez.');
        recRef.current = null;
        return;
      }
    }

    setStarted(true);
  };

  // ── useEffect : démarrage → salut + relance reconnaissance ───────────────
  useEffect(() => {
    if (!started) return;

    startAnim();

    // Arrêter la reconnaissance ouverte dans handleStart (elle servait uniquement
    // à déclencher la boîte de permission). abort() est plus fiable que stop()
    // si la reconnaissance est encore en état "starting".
    clearTimeout(rstTimerRef.current);
    killRec();

    const welcome = WELCOME[langRef.current] || WELCOME.fr;
    setVS(S.SPEAKING);
    setBotSnippet(welcome);

    speakText(welcome, () => {
      if (!mountedRef.current) return;
      setBotSnippet('');
      goListening();
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(silTimerRef.current);
      clearTimeout(rstTimerRef.current);
      clearTimeout(echoTimerRef.current);
      clearTimeout(safetyRef.current);
      clearTimeout(watchdogRef.current);
      cancelAnimationFrame(rafRef.current);
      cancelTTS();
      killRec();
    };
  }, [started]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Interrompre le TTS en touchant l'orbe ────────────────────────────────
  const interrupt = () => {
    if (vsRef.current !== S.SPEAKING) return;
    cancelTTS();
    setBotSnippet('');
    clearTimeout(safetyRef.current);
    goListening();
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  const gradient = {
    [S.LISTENING]:  'from-violet-500 to-blue-600',
    [S.PROCESSING]: 'from-amber-400 to-orange-500',
    [S.SPEAKING]:   'from-emerald-400 to-green-600',
  }[vsState] ?? 'from-violet-500 to-blue-600';

  const label = {
    [S.LISTENING]:  'Je vous écoute...',
    [S.PROCESSING]: 'Réflexion...',
    [S.SPEAKING]:   'En train de répondre...',
  }[vsState] ?? '';

  // ── Écran de démarrage ────────────────────────────────────────────────────
  if (!started) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const ok = !!SR && window.isSecureContext;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/98 backdrop-blur-xl">
        <div className="relative flex flex-col items-center gap-7 w-full max-w-sm px-6 text-center select-none">

          <button onClick={onClose} className="absolute -top-4 right-0 p-2 text-gray-500 hover:text-white transition-colors" aria-label="Fermer">
            <X className="h-6 w-6" />
          </button>

          <div>
            <h2 className="text-white font-black text-2xl">Chat Vocal Live</h2>
            <p className="text-gray-400 text-sm mt-1">IA · Snack Tiegni Bernard</p>
          </div>

          <div className={`w-36 h-36 rounded-full bg-gradient-to-br shadow-2xl flex items-center justify-center ${ok ? 'from-violet-500 to-blue-600' : 'from-gray-600 to-gray-800'}`}>
            {ok ? <Mic className="h-14 w-14 text-white drop-shadow-lg" /> : <MicOff className="h-14 w-14 text-white/60" />}
          </div>

          {ok ? (
            <p className="text-gray-300 text-sm leading-relaxed max-w-xs">
              Appuyez sur <strong className="text-white">Démarrer</strong>. Le navigateur
              demandera la permission d'utiliser votre microphone.
            </p>
          ) : (
            <p className="text-amber-300 text-sm max-w-xs">
              Utilisez <strong className="text-white">Chrome</strong> ou{' '}
              <strong className="text-white">Safari</strong> sur HTTPS.
            </p>
          )}

          {errorMsg && (
            <div className="w-full bg-red-900/40 border border-red-700/50 rounded-xl px-4 py-3">
              <p className="text-red-300 text-sm leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {ok ? (
            <button
              onClick={handleStart}
              className="w-full max-w-xs py-4 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-black text-lg rounded-2xl transition-all shadow-xl hover:shadow-violet-500/30"
            >
              {errorMsg ? 'Réessayer' : 'Démarrer'}
            </button>
          ) : (
            <button onClick={onClose} className="w-full max-w-xs py-4 bg-gray-700 text-white font-bold rounded-2xl">
              Fermer
            </button>
          )}

          <p className="text-gray-600 text-xs">Chrome · Edge · Safari · HTTPS requis</p>
        </div>
      </div>
    );
  }

  // ── Interface principale ──────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/98 backdrop-blur-xl">
      <div className="relative flex flex-col items-center justify-center gap-10 w-full max-w-sm px-6 select-none">

        <button onClick={onClose} className="absolute -top-6 right-0 p-2 text-gray-500 hover:text-white transition-colors" aria-label="Fermer">
          <X className="h-6 w-6" />
        </button>

        <div className="text-center">
          <h2 className="text-white font-black text-xl">Chat Vocal Live</h2>
          <p className="text-gray-400 text-sm mt-1">IA · Snack Tiegni Bernard</p>
        </div>

        <div className="relative flex items-center justify-center w-64 h-64" onClick={interrupt}>
          <div ref={r1Ref} className="absolute w-48 h-48 rounded-full border border-violet-400/30" style={{ opacity: 0, transition: 'opacity 0.2s' }} />
          <div ref={r2Ref} className="absolute w-56 h-56 rounded-full border border-blue-400/20"   style={{ opacity: 0, transition: 'opacity 0.2s' }} />
          <div ref={r3Ref} className="absolute w-64 h-64 rounded-full border border-blue-300/10"   style={{ opacity: 0, transition: 'opacity 0.2s' }} />

          <div
            ref={orbRef}
            className={`w-36 h-36 rounded-full bg-gradient-to-br ${gradient} shadow-2xl flex items-center justify-center cursor-pointer transition-colors duration-500`}
            style={{ willChange: 'transform' }}
          >
            {vsState === S.PROCESSING ? (
              <div className="flex gap-2">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            ) : vsState === S.SPEAKING ? (
              <Volume2 className="h-14 w-14 text-white drop-shadow-lg" />
            ) : (
              <Mic className="h-14 w-14 text-white drop-shadow-lg" />
            )}
          </div>
        </div>

        <div className="text-center min-h-[80px] px-4">
          <p className="text-white font-bold text-base">{label}</p>
          {transcript && (
            <p className="text-violet-300 text-sm mt-1.5 italic leading-relaxed max-w-xs">
              «{transcript.slice(-100)}»
            </p>
          )}
          {botSnippet && (
            <p className="text-emerald-400 text-sm mt-1.5 leading-relaxed max-w-xs">{botSnippet}</p>
          )}
          {vsState === S.SPEAKING && !botSnippet && (
            <p className="text-gray-500 text-xs mt-1">Touchez l'orbe pour interrompre</p>
          )}
          {errorMsg && (
            <p className="text-red-400 text-sm mt-2 max-w-xs leading-relaxed">{errorMsg}</p>
          )}
        </div>

        <div className="flex items-center gap-8">
          <button
            onClick={() => setIsMuted(m => !m)}
            className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
            title={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
          </button>

          <button
            onClick={onClose}
            className="p-5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all shadow-xl hover:scale-105 active:scale-95"
            title="Terminer"
          >
            <PhoneOff className="h-7 w-7" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveVoiceChat;
