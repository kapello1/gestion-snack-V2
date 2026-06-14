import { useEffect, useRef, useState } from 'react';
import { X, Mic, Volume2, VolumeX, PhoneOff } from 'lucide-react';
import { sendChatMessage } from '../utils/groqApi';
import { useLanguage } from '../context/LanguageContext';

// ── États ────────────────────────────────────────────────────────────────────
const S = {
  IDLE:       'idle',
  STARTING:   'starting',
  LISTENING:  'listening',
  PROCESSING: 'processing',
  SPEAKING:   'speaking',
};

const LANG_MAP = { fr: 'fr-FR', nl: 'nl-NL', de: 'de-DE' };

const WELCOME = {
  fr: 'Bonjour ! Je suis votre assistant vocal du Snack Tiegni Bernard. Vous pouvez commencer à parler.',
  nl: 'Hallo! Ik ben uw spraakassistent van Snack Tiegni Bernard. U kunt beginnen met spreken.',
  de: 'Hallo! Ich bin Ihr Sprachassistent vom Snack Tiegni Bernard. Sie können jetzt sprechen.',
};

// ── Détections navigateur ─────────────────────────────────────────────────────
// iOS classique (iPhone/iPod/iPad pré-13)
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
// iPadOS 13+ se présente comme MacIntel mais est tactile
const IS_IPAD_OS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
// Safari (toutes versions) — exclu Android
const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
// Android natif
const IS_ANDROID = /android/i.test(navigator.userAgent);

// Sur iOS, iPadOS et Safari : continuous=true est instable → false + redémarrage via onend
const USE_CONTINUOUS = !(IS_IOS || IS_IPAD_OS || IS_SAFARI);

// ── Composant ────────────────────────────────────────────────────────────────
const LiveVoiceChat = ({ onClose, onMessagePair, products = [], chatHistory = [] }) => {
  const { language } = useLanguage();

  const [started,    setStarted]    = useState(false);
  const [state,      setState]      = useState(S.IDLE);
  const [isMuted,    setIsMuted]    = useState(false);
  const [transcript, setTranscript] = useState('');
  const [botSnippet, setBotSnippet] = useState('');
  const [errorMsg,   setErrorMsg]   = useState('');

  // Refs stables (évitent les captures de state périmé)
  const mountedRef        = useRef(false);
  const stateRef          = useRef(S.IDLE);
  const isMutedRef        = useRef(false);
  const errorCountRef     = useRef(0);
  const fullTranscriptRef = useRef('');
  const historyRef        = useRef(chatHistory);
  const productsRef       = useRef(products);
  const onMessagePairRef  = useRef(onMessagePair);
  const languageRef       = useRef(language);

  const recognitionRef   = useRef(null);
  const silenceTimerRef  = useRef(null);
  const restartTimerRef  = useRef(null);
  const keepAliveRef     = useRef(null);
  const fallbackTimerRef = useRef(null); // fallback Android onend TTS
  const streamRef        = useRef(null);
  const audioCtxRef      = useRef(null);
  const analyserRef      = useRef(null);
  const animFrameRef     = useRef(null);
  const orbRef           = useRef(null);
  const ring1Ref         = useRef(null);
  const ring2Ref         = useRef(null);
  const ring3Ref         = useRef(null);

  // Synchronisation props → refs
  useEffect(() => { historyRef.current       = chatHistory;   }, [chatHistory]);
  useEffect(() => { productsRef.current      = products;      }, [products]);
  useEffect(() => { onMessagePairRef.current = onMessagePair; }, [onMessagePair]);
  useEffect(() => { languageRef.current      = language;      }, [language]);
  useEffect(() => { isMutedRef.current       = isMuted;       }, [isMuted]);

  // Setter sécurisé (no-op après démontage)
  const safeSetState = (s) => {
    if (!mountedRef.current) return;
    stateRef.current = s;
    setState(s);
  };

  // ── Animation orbe (RAF direct DOM, aucun re-render) ─────────────────────
  const startAudioLoop = () => {
    const loop = () => {
      if (!mountedRef.current) return;
      animFrameRef.current = requestAnimationFrame(loop);
      if (!analyserRef.current || !orbRef.current) return;

      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const level = data.reduce((a, b) => a + b, 0) / data.length / 128;

      const s = stateRef.current;
      if (s === S.LISTENING) {
        orbRef.current.style.transform = `scale(${1 + level * 0.55})`;
        const a = 0.1 + level * 0.3;
        if (ring1Ref.current) ring1Ref.current.style.opacity = a;
        if (ring2Ref.current) ring2Ref.current.style.opacity = a * 0.6;
        if (ring3Ref.current) ring3Ref.current.style.opacity = a * 0.35;
      } else if (s === S.SPEAKING) {
        const scale = 1.05 + Math.sin(Date.now() / 700) * 0.08;
        orbRef.current.style.transform = `scale(${scale})`;
        if (ring1Ref.current) ring1Ref.current.style.opacity = '0.12';
        if (ring2Ref.current) ring2Ref.current.style.opacity = '0.07';
        if (ring3Ref.current) ring3Ref.current.style.opacity = '0.04';
      } else {
        orbRef.current.style.transform = 'scale(1)';
        if (ring1Ref.current) ring1Ref.current.style.opacity = '0';
        if (ring2Ref.current) ring2Ref.current.style.opacity = '0';
        if (ring3Ref.current) ring3Ref.current.style.opacity = '0';
      }
    };
    loop();
  };

  // ── TTS avec fallback onend (bug Android Chrome) ─────────────────────────
  const speak = (text, onEnd) => {
    const synth = window.speechSynthesis;
    if (!synth) { onEnd?.(); return; }

    clearInterval(keepAliveRef.current);
    clearTimeout(fallbackTimerRef.current);
    synth.cancel();

    const utter       = new SpeechSynthesisUtterance(text);
    utter.lang        = LANG_MAP[languageRef.current] || 'fr-FR';
    utter.rate        = 1.0;
    utter.pitch       = 1;
    utter.volume      = 1;

    let called = false;
    const done = () => {
      clearInterval(keepAliveRef.current);
      clearTimeout(fallbackTimerRef.current);
      if (!called) { called = true; onEnd?.(); }
    };

    utter.onend   = done;
    utter.onerror = (e) => { if (e.error !== 'interrupted') console.warn('TTS:', e.error); done(); };

    // Android Chrome : onend ne se déclenche parfois jamais.
    // On estime la durée (~80 ms/caractère à rate 1.0) + 3 s de marge.
    const estimatedMs = Math.max(5000, text.length * 80 + 3000);
    fallbackTimerRef.current = setTimeout(() => {
      if (!called) {
        console.warn('TTS: fallback onend déclenché (Android)');
        done();
      }
    }, estimatedMs);

    // Chrome desktop : keep-alive toutes les 10 s (bug d'arrêt silencieux)
    keepAliveRef.current = setInterval(() => {
      if (!mountedRef.current || !synth.speaking) { clearInterval(keepAliveRef.current); return; }
      synth.pause();
      synth.resume();
    }, 10000);

    synth.speak(utter);
  };

  // ── Démarrage reconnaissance ──────────────────────────────────────────────
  const startRecognition = () => {
    if (!mountedRef.current || !recognitionRef.current) return;
    if (errorCountRef.current >= 5) {
      if (mountedRef.current) setErrorMsg('Trop d\'erreurs consécutives. Fermez et réessayez.');
      safeSetState(S.IDLE);
      return;
    }
    clearTimeout(restartTimerRef.current);
    try { recognitionRef.current.start(); } catch { /* InvalidStateError : déjà démarré */ }
  };

  // ── Envoi au bot ──────────────────────────────────────────────────────────
  const sendToBot = async () => {
    const text = fullTranscriptRef.current.trim();
    if (!text || !mountedRef.current) return;

    fullTranscriptRef.current = '';
    if (mountedRef.current) setTranscript('');
    clearTimeout(silenceTimerRef.current);

    safeSetState(S.PROCESSING);
    try { recognitionRef.current?.stop(); } catch {}

    const userMsg = { id: Date.now(), text, sender: 'user', timestamp: new Date() };

    try {
      const botText = await sendChatMessage([...historyRef.current, userMsg], productsRef.current);
      if (!mountedRef.current) return;

      setBotSnippet(botText.slice(0, 100) + (botText.length > 100 ? '…' : ''));
      onMessagePairRef.current?.(userMsg, {
        id: Date.now() + 1, text: botText, sender: 'bot', timestamp: new Date(),
      });

      if (!isMutedRef.current) {
        safeSetState(S.SPEAKING);
        speak(botText, () => {
          if (!mountedRef.current) return;
          setBotSnippet('');
          if (stateRef.current === S.SPEAKING) {
            safeSetState(S.LISTENING);
            startRecognition();
          }
        });
      } else {
        if (mountedRef.current) setBotSnippet('');
        safeSetState(S.LISTENING);
        startRecognition();
      }
    } catch {
      if (!mountedRef.current) return;
      setBotSnippet('');
      safeSetState(S.LISTENING);
      startRecognition();
    }
  };

  const sendToBotRef = useRef(sendToBot);
  useEffect(() => { sendToBotRef.current = sendToBot; });

  // ── Setup SpeechRecognition ───────────────────────────────────────────────
  const setupRecognition = (SR) => {
    if (!SR) return false;

    const rec = new SR();
    rec.continuous      = USE_CONTINUOUS;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;
    rec.lang            = LANG_MAP[languageRef.current] || 'fr-FR';

    rec.onresult = (event) => {
      if (!mountedRef.current) return;
      errorCountRef.current = 0;

      // L'utilisateur parle pendant le TTS → interrompre
      if (stateRef.current === S.SPEAKING) {
        clearInterval(keepAliveRef.current);
        clearTimeout(fallbackTimerRef.current);
        window.speechSynthesis?.cancel();
        if (mountedRef.current) setBotSnippet('');
        safeSetState(S.LISTENING);
      }

      clearTimeout(silenceTimerRef.current);
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          fullTranscriptRef.current += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (mountedRef.current) setTranscript((fullTranscriptRef.current + interim).trim());

      // Envoyer après 2 s de silence
      if (fullTranscriptRef.current.trim()) {
        silenceTimerRef.current = setTimeout(() => {
          if (mountedRef.current && stateRef.current === S.LISTENING) {
            sendToBotRef.current();
          }
        }, 2000);
      }
    };

    rec.onerror = (e) => {
      if (!mountedRef.current) return;
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      errorCountRef.current++;

      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        setErrorMsg('Microphone refusé. Autorisez l\'accès dans les paramètres du navigateur.');
        safeSetState(S.IDLE);
      } else if (e.error === 'audio-capture') {
        setErrorMsg('Microphone indisponible. Vérifiez qu\'aucune autre app ne l\'utilise.');
        safeSetState(S.IDLE);
      } else if (e.error === 'network') {
        setErrorMsg('Connexion perdue. Vérifiez votre réseau et réessayez.');
        safeSetState(S.IDLE);
      } else if (e.error === 'service-not-allowed') {
        setErrorMsg('Service vocal non autorisé sur ce navigateur ou ce contexte.');
        safeSetState(S.IDLE);
      } else if (e.error === 'language-not-supported') {
        setErrorMsg('Langue non supportée par votre navigateur.');
        safeSetState(S.IDLE);
      }
      // Autres : onend se chargera du redémarrage
    };

    // Redémarrage automatique (iOS/Safari et Android : onend toujours déclenché)
    rec.onend = () => {
      if (!mountedRef.current) return;
      const s = stateRef.current;
      if (s === S.LISTENING || s === S.SPEAKING) {
        // 500 ms : délai augmenté pour les appareils Android lents
        restartTimerRef.current = setTimeout(() => {
          if (mountedRef.current && (stateRef.current === S.LISTENING || stateRef.current === S.SPEAKING)) {
            startRecognition();
          }
        }, 500);
      }
    };

    recognitionRef.current = rec;
    return true;
  };

  // Synchronisation langue en cours de session
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = LANG_MAP[language] || 'fr-FR';
    }
  }, [language]);

  // ── handleStart — appelé DIRECTEMENT depuis onClick ───────────────────────
  // CRITIQUE : getUserMedia() et AudioContext() doivent impérativement être
  // dans la chaîne synchrone du geste utilisateur pour iOS Safari et Android.
  // Appeler ces APIs depuis useEffect() (asynchrone après le rendu) fait échouer
  // la demande de permission sur iOS 14+ et certains Android.
  const handleStart = async () => {
    mountedRef.current = true;
    safeSetState(S.STARTING);
    setErrorMsg('');

    // 1 — Contexte sécurisé (HTTPS obligatoire sur mobile)
    if (!window.isSecureContext) {
      setErrorMsg('HTTPS requis pour accéder au microphone sur mobile.');
      safeSetState(S.IDLE);
      return;
    }

    // 2 — API MediaDevices disponible
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg('Microphone non accessible. Essayez Chrome ou Safari sur HTTPS.');
      safeSetState(S.IDLE);
      return;
    }

    // 3 — Réseau disponible (SpeechRecognition requiert internet)
    if (!navigator.onLine) {
      setErrorMsg('Connexion internet requise pour la reconnaissance vocale.');
      safeSetState(S.IDLE);
      return;
    }

    // 4 — SpeechRecognition supporté
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg('Reconnaissance vocale non supportée. Utilisez Chrome, Edge ou Safari.');
      safeSetState(S.IDLE);
      return;
    }

    // 5 — getUserMedia (DOIT être dans la chaîne du geste utilisateur)
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl:  true,
          channelCount: 1,
        },
        video: false,
      });
    } catch (firstErr) {
      if (firstErr.name === 'OverconstrainedError' || firstErr.name === 'ConstraintNotSatisfiedError') {
        // Certains Android refusent les contraintes avancées → fallback basique
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (fallbackErr) {
          firstErr = fallbackErr;
        }
      }

      if (!stream) {
        if (!mountedRef.current) return;
        const n = firstErr.name;
        if (n === 'NotAllowedError' || n === 'PermissionDeniedError') {
          setErrorMsg('Accès micro refusé. Autorisez-le dans les paramètres de votre navigateur.');
        } else if (n === 'NotFoundError' || n === 'DevicesNotFoundError') {
          setErrorMsg('Aucun microphone détecté sur cet appareil.');
        } else if (n === 'NotReadableError' || n === 'TrackStartError') {
          setErrorMsg('Microphone occupé par une autre application. Fermez-la et réessayez.');
        } else if (n === 'SecurityError') {
          setErrorMsg('Accès micro bloqué par la politique de sécurité. Vérifiez les permissions du site.');
        } else {
          setErrorMsg(`Impossible d'accéder au microphone (${n || firstErr.message || 'erreur inconnue'}).`);
        }
        safeSetState(S.IDLE);
        return;
      }
    }

    if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
    streamRef.current = stream;

    // 6 — AudioContext (aussi dans la chaîne du geste → iOS Safari)
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (AudioCtxClass) {
      try {
        const ctx = new AudioCtxClass();
        // iOS Safari crée systématiquement le contexte en état "suspended"
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        ctx.createMediaStreamSource(stream).connect(analyser);
      } catch (e) {
        // Non bloquant : la reconnaissance vocale fonctionnera sans visualisation
        console.warn('AudioContext non disponible :', e.message);
      }
    }

    // 7 — Setup SpeechRecognition
    if (!setupRecognition(SR)) {
      if (!mountedRef.current) return;
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close().catch(() => {});
      setErrorMsg('Reconnaissance vocale non supportée sur ce navigateur.');
      safeSetState(S.IDLE);
      return;
    }

    // 8 — Tout est prêt : basculer vers l'interface principale
    if (mountedRef.current) setStarted(true);
  };

  // ── Démarrage session (après setStarted) ─────────────────────────────────
  // getUserMedia + AudioContext sont déjà initialisés dans handleStart.
  // useEffect gère uniquement l'animation, le message de bienvenue et l'écoute.
  useEffect(() => {
    if (!started) return;

    startAudioLoop();

    safeSetState(S.SPEAKING);
    speak(WELCOME[languageRef.current] || WELCOME.fr, () => {
      if (!mountedRef.current) return;
      safeSetState(S.LISTENING);
      startRecognition();
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(silenceTimerRef.current);
      clearTimeout(restartTimerRef.current);
      clearTimeout(fallbackTimerRef.current);
      clearInterval(keepAliveRef.current);
      cancelAnimationFrame(animFrameRef.current);
      window.speechSynthesis?.cancel();
      try { recognitionRef.current?.abort(); } catch {}
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close().catch?.(() => {});
    };
  }, [started]); // eslint-disable-line react-hooks/exhaustive-deps

  // Interrompre le TTS en touchant l'orbe
  const interrupt = () => {
    if (stateRef.current === S.SPEAKING) {
      clearInterval(keepAliveRef.current);
      clearTimeout(fallbackTimerRef.current);
      window.speechSynthesis?.cancel();
      if (mountedRef.current) setBotSnippet('');
      safeSetState(S.LISTENING);
      startRecognition();
    }
  };

  const orbGradient = {
    [S.IDLE]:       'from-gray-500 to-gray-700',
    [S.STARTING]:   'from-blue-400 to-blue-600',
    [S.LISTENING]:  'from-violet-500 to-blue-600',
    [S.PROCESSING]: 'from-amber-400 to-orange-500',
    [S.SPEAKING]:   'from-emerald-400 to-green-600',
  }[state] ?? 'from-gray-500 to-gray-700';

  const statusLabel = {
    [S.IDLE]:       '',
    [S.STARTING]:   'Initialisation...',
    [S.LISTENING]:  'Je vous écoute...',
    [S.PROCESSING]: 'Réflexion en cours...',
    [S.SPEAKING]:   'Réponse vocale...',
  }[state] ?? '';

  // ── Écran de démarrage ────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/98 backdrop-blur-xl">
        <div className="relative flex flex-col items-center gap-7 w-full max-w-sm px-6 text-center select-none">

          <button
            onClick={onClose}
            className="absolute -top-4 right-0 p-2 text-gray-500 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            <X className="h-6 w-6" />
          </button>

          <div>
            <h2 className="text-white font-black text-2xl">Chat Vocal Live</h2>
            <p className="text-gray-400 text-sm mt-1">IA · Snack Tiegni Bernard</p>
          </div>

          <div className="w-36 h-36 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 shadow-2xl flex items-center justify-center">
            <Mic className="h-14 w-14 text-white drop-shadow-lg" />
          </div>

          <div className="space-y-2">
            <p className="text-gray-300 text-sm leading-relaxed max-w-xs">
              L'assistant utilisera votre microphone pour converser en temps réel.
              Appuyez sur <strong className="text-white">Démarrer</strong> pour autoriser l'accès.
            </p>
            <p className="text-gray-500 text-xs">Chrome · Edge · Safari requis</p>
          </div>

          {/* Erreur affichée sur l'écran de démarrage */}
          {errorMsg && (
            <div className="w-full bg-red-900/40 border border-red-700/50 rounded-xl px-4 py-3">
              <p className="text-red-300 text-sm leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {state === S.STARTING ? (
            <div className="w-full max-w-xs py-4 bg-violet-800/80 rounded-2xl flex items-center justify-center gap-3 text-white font-bold">
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Initialisation...
            </div>
          ) : (
            <button
              onClick={handleStart}
              className="w-full max-w-xs py-4 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-black text-lg rounded-2xl transition-all shadow-xl hover:shadow-violet-500/30"
            >
              {errorMsg ? 'Réessayer' : 'Démarrer'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Interface principale ──────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/98 backdrop-blur-xl">
      <div className="relative flex flex-col items-center justify-center gap-10 w-full max-w-sm px-6 select-none">

        <button
          onClick={onClose}
          className="absolute -top-6 right-0 p-2 text-gray-500 hover:text-white transition-colors"
          aria-label="Fermer"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="text-center">
          <h2 className="text-white font-black text-xl">Chat Vocal Live</h2>
          <p className="text-gray-400 text-sm mt-1">IA · Snack Tiegni Bernard</p>
        </div>

        {/* Orbe + anneaux */}
        <div className="relative flex items-center justify-center w-64 h-64" onClick={interrupt}>
          <div ref={ring1Ref} className="absolute w-48 h-48 rounded-full border border-violet-400/30" style={{ opacity: 0, transition: 'opacity 0.2s' }} />
          <div ref={ring2Ref} className="absolute w-56 h-56 rounded-full border border-blue-400/20"   style={{ opacity: 0, transition: 'opacity 0.2s' }} />
          <div ref={ring3Ref} className="absolute w-64 h-64 rounded-full border border-blue-300/10"   style={{ opacity: 0, transition: 'opacity 0.2s' }} />

          {state === S.STARTING && (
            <div className="absolute w-44 h-44 rounded-full bg-blue-500/15 animate-pulse" />
          )}

          <div
            ref={orbRef}
            className={`w-36 h-36 rounded-full bg-gradient-to-br ${orbGradient} shadow-2xl flex items-center justify-center cursor-pointer transition-colors duration-500`}
            style={{ willChange: 'transform' }}
          >
            {state === S.PROCESSING ? (
              <div className="flex gap-2">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            ) : state === S.SPEAKING ? (
              <Volume2 className="h-14 w-14 text-white drop-shadow-lg" />
            ) : (
              <Mic className="h-14 w-14 text-white drop-shadow-lg" />
            )}
          </div>
        </div>

        {/* Statuts */}
        <div className="text-center min-h-[72px]">
          <p className="text-white font-bold text-base">{statusLabel}</p>
          {transcript && (
            <p className="text-violet-300 text-sm mt-1.5 italic leading-relaxed max-w-xs">
              «{transcript.slice(-80)}»
            </p>
          )}
          {botSnippet && state === S.SPEAKING && (
            <p className="text-emerald-400 text-sm mt-1.5 leading-relaxed max-w-xs">{botSnippet}</p>
          )}
          {state === S.SPEAKING && !botSnippet && (
            <p className="text-gray-500 text-xs mt-1">Touchez l'orbe pour interrompre</p>
          )}
          {errorMsg && (
            <p className="text-red-400 text-sm mt-2 max-w-xs leading-relaxed">{errorMsg}</p>
          )}
        </div>

        {/* Contrôles */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => setIsMuted(m => !m)}
            className={`p-4 rounded-full transition-all ${
              isMuted
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
            title={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
          </button>

          <button
            onClick={onClose}
            className="p-5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all shadow-xl hover:scale-105 active:scale-95"
            title="Terminer l'appel"
          >
            <PhoneOff className="h-7 w-7" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveVoiceChat;
