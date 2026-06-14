import { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, Volume2, VolumeX, PhoneOff } from 'lucide-react';
import { sendChatMessage } from '../utils/groqApi';
import { useLanguage } from '../context/LanguageContext';

// ── États ────────────────────────────────────────────────────────────────────
const S = {
  LISTENING:  'listening',
  PROCESSING: 'processing',
  SPEAKING:   'speaking',
};

const LANG_MAP = { fr: 'fr-FR', nl: 'nl-NL', de: 'de-DE' };

// Détection plateforme (évaluée une seule fois au chargement)
const IS_IOS    = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// iOS/Safari : continuous=true instable → false + redémarrage via onend
const USE_CONTINUOUS = !(IS_IOS || IS_SAFARI);

const WELCOME = {
  fr: 'Bonjour et bienvenue au Snack Tiegni Bernard ! Je suis votre assistant vocal. En quoi puis-je vous aider ?',
  nl: 'Hallo en welkom bij Snack Tiegni Bernard! Ik ben uw spraakassistent. Hoe kan ik u helpen?',
  de: 'Hallo und willkommen beim Snack Tiegni Bernard! Ich bin Ihr Sprachassistent. Wie kann ich Ihnen helfen?',
};

// ── Composant ────────────────────────────────────────────────────────────────
const LiveVoiceChat = ({ onClose, onMessagePair, products = [], chatHistory = [] }) => {
  const { language } = useLanguage();

  const [started,    setStarted]    = useState(false);
  const [state,      setState]      = useState(S.LISTENING);
  const [isMuted,    setIsMuted]    = useState(false);
  const [transcript, setTranscript] = useState('');
  const [botSnippet, setBotSnippet] = useState('');
  const [errorMsg,   setErrorMsg]   = useState('');

  const mountedRef        = useRef(false);
  const stateRef          = useRef(S.LISTENING);
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
  const fallbackTimerRef = useRef(null);
  const animFrameRef     = useRef(null);
  const orbRef           = useRef(null);
  const ring1Ref         = useRef(null);
  const ring2Ref         = useRef(null);
  const ring3Ref         = useRef(null);

  // Synchronisation props → refs (évite les captures périmées dans les callbacks)
  useEffect(() => { historyRef.current       = chatHistory;   }, [chatHistory]);
  useEffect(() => { productsRef.current      = products;      }, [products]);
  useEffect(() => { onMessagePairRef.current = onMessagePair; }, [onMessagePair]);
  useEffect(() => { languageRef.current      = language;      }, [language]);
  useEffect(() => { isMutedRef.current       = isMuted;       }, [isMuted]);

  const safeSetState = (s) => {
    if (!mountedRef.current) return;
    stateRef.current = s;
    setState(s);
  };

  // ── Animation orbe (RAF sans AudioContext — pas de conflit micro) ─────────
  const startOrbAnimation = () => {
    let t = 0;
    const loop = () => {
      if (!mountedRef.current) return;
      animFrameRef.current = requestAnimationFrame(loop);
      t += 0.016;
      if (!orbRef.current) return;
      const s = stateRef.current;
      if (s === S.LISTENING) {
        orbRef.current.style.transform = `scale(${1 + Math.sin(t * 1.5) * 0.04})`;
        if (ring1Ref.current) ring1Ref.current.style.opacity = (0.18 + Math.sin(t * 1.5) * 0.06).toFixed(2);
        if (ring2Ref.current) ring2Ref.current.style.opacity = (0.10 + Math.sin(t * 1.2) * 0.04).toFixed(2);
        if (ring3Ref.current) ring3Ref.current.style.opacity = (0.05 + Math.sin(t * 0.9) * 0.02).toFixed(2);
      } else if (s === S.SPEAKING) {
        orbRef.current.style.transform = `scale(${1.05 + Math.sin(t * 2.5) * 0.08})`;
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
    if (!synth || isMutedRef.current) { onEnd?.(); return; }

    clearInterval(keepAliveRef.current);
    clearTimeout(fallbackTimerRef.current);
    synth.cancel(); // annule aussi le préchauffage silencieux iOS

    const utter  = new SpeechSynthesisUtterance(text);
    utter.lang   = LANG_MAP[languageRef.current] || 'fr-FR';
    utter.rate   = 1.0;
    utter.pitch  = 1;
    utter.volume = 1;

    let called = false;
    const done = () => {
      clearInterval(keepAliveRef.current);
      clearTimeout(fallbackTimerRef.current);
      if (!called) { called = true; onEnd?.(); }
    };

    utter.onend   = done;
    utter.onerror = (e) => { if (e.error !== 'interrupted') console.warn('TTS:', e.error); done(); };

    // Android Chrome : onend ne se déclenche parfois pas → timer de sécurité
    const wordCount   = text.split(/\s+/).length;
    const estimatedMs = Math.max(4000, wordCount * 500 + 2000);
    fallbackTimerRef.current = setTimeout(() => {
      if (!called) { console.warn('TTS fallback fired'); done(); }
    }, estimatedMs);

    // Chrome desktop : pause/resume pour éviter l'arrêt silencieux après ~15 s
    keepAliveRef.current = setInterval(() => {
      if (!mountedRef.current || !synth.speaking) { clearInterval(keepAliveRef.current); return; }
      synth.pause();
      synth.resume();
    }, 10000);

    synth.speak(utter);
  };

  // ── Démarrer la reconnaissance ────────────────────────────────────────────
  const startRecognition = () => {
    if (!mountedRef.current || !recognitionRef.current) return;
    if (errorCountRef.current >= 5) {
      if (mountedRef.current) setErrorMsg('Trop d\'erreurs consécutives. Fermez et réouvrez le chat vocal.');
      return;
    }
    clearTimeout(restartTimerRef.current);
    try {
      recognitionRef.current.start();
    } catch (e) {
      // InvalidStateError = déjà démarré → ignorer
      if (e.name !== 'InvalidStateError') console.warn('Recognition start:', e.name, e.message);
    }
  };

  // ── Envoyer la transcription au bot ──────────────────────────────────────
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
      const botText = await sendChatMessage([...historyRef.current, userMsg], productsRef.current, true);
      if (!mountedRef.current) return;

      setBotSnippet(botText.slice(0, 120) + (botText.length > 120 ? '…' : ''));
      onMessagePairRef.current?.(userMsg, {
        id: Date.now() + 1, text: botText, sender: 'bot', timestamp: new Date(),
      });

      if (!isMutedRef.current) {
        safeSetState(S.SPEAKING);
        speak(botText, () => {
          if (!mountedRef.current) return;
          setBotSnippet('');
          safeSetState(S.LISTENING);
          startRecognition();
        });
      } else {
        setBotSnippet('');
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

  // ── Configurer SpeechRecognition ──────────────────────────────────────────
  const setupRecognition = (SR) => {
    const rec = new SR();
    rec.continuous      = USE_CONTINUOUS;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;
    rec.lang            = LANG_MAP[languageRef.current] || 'fr-FR';

    rec.onstart = () => { errorCountRef.current = 0; };

    rec.onresult = (event) => {
      if (!mountedRef.current) return;
      errorCountRef.current = 0;

      // Si la reconnaissance tourne encore pendant SPEAKING ou PROCESSING,
      // on ignore le résultat pour ne pas s'interrompre soi-même.
      if (stateRef.current !== S.LISTENING) return;

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
      // Erreurs normales et non critiques → ignorer
      // no-speech, aborted : normaux — ignorer
      // network : erreur transitoire du service vocal (Google/Apple), onend relancera automatiquement
      if (e.error === 'no-speech' || e.error === 'aborted' || e.error === 'network') return;
      errorCountRef.current++;

      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        mountedRef.current = false;
        setErrorMsg('Microphone refusé. Autorisez-le dans les paramètres de votre navigateur puis réessayez.');
        setStarted(false);
      } else if (e.error === 'audio-capture') {
        mountedRef.current = false;
        setErrorMsg('Microphone indisponible. Vérifiez qu\'aucune autre application ne l\'utilise.');
        setStarted(false);
      } else if (e.error === 'service-not-allowed') {
        mountedRef.current = false;
        setErrorMsg('Service vocal non autorisé. Utilisez Chrome ou Safari sur HTTPS.');
        setStarted(false);
      }
      // Autres erreurs : onend gère le redémarrage
    };

    rec.onend = () => {
      if (!mountedRef.current) return;
      // Redémarrer UNIQUEMENT en LISTENING — jamais en SPEAKING (le bot parle)
      // ni en PROCESSING (l'API répond).
      // Si on redémarre pendant SPEAKING, le micro capte la voix du bot,
      // ce qui déclenche une fausse interruption.
      if (stateRef.current === S.LISTENING) {
        restartTimerRef.current = setTimeout(() => {
          if (mountedRef.current && stateRef.current === S.LISTENING) {
            startRecognition();
          }
        }, 500);
      }
    };

    recognitionRef.current = rec;
  };

  // Synchronisation langue pendant la session
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = LANG_MAP[language] || 'fr-FR';
    }
  }, [language]);

  // ── handleStart — SYNCHRONE, appelé directement depuis onClick ────────────
  //
  // CORRECTIF DÉFINITIF — 3 causes racines éliminées :
  //
  // ① Plus de getUserMedia / AudioContext :
  //    Deux captures audio simultanées (getUserMedia + SpeechRecognition)
  //    bloquent l'une d'elles silencieusement sur iOS et certains Android.
  //
  // ② handleStart est SYNCHRONE (pas d'async/await) :
  //    Sur iOS Safari, l'activation utilisateur expire dès le premier await.
  //    En restant synchrone, tout le code s'exécute dans la fenêtre du geste.
  //
  // ③ TTS préchauffé + reconnaissance démarrée dans le geste clic :
  //    iOS Safari bloque speechSynthesis.speak() et recognition.start()
  //    appelés hors d'un geste utilisateur (ex: depuis useEffect).
  //
  const handleStart = () => {
    if (!window.isSecureContext) {
      setErrorMsg('HTTPS requis pour utiliser le microphone sur mobile.');
      return;
    }
    if (!navigator.onLine) {
      setErrorMsg('Connexion internet requise pour la reconnaissance vocale.');
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg('Reconnaissance vocale non supportée. Utilisez Chrome, Edge ou Safari récent.');
      return;
    }

    setErrorMsg('');
    mountedRef.current = true;
    stateRef.current   = S.LISTENING;

    // ① Préchauffage TTS dans le geste clic (iOS Safari l'exige pour les appels ultérieurs)
    if (window.speechSynthesis) {
      try {
        const warmup  = new SpeechSynthesisUtterance(' ');
        warmup.volume = 0;   // silencieux
        warmup.rate   = 10;  // instantané
        window.speechSynthesis.speak(warmup);
        // Sera annulé automatiquement par synth.cancel() dans speak()
      } catch {}
    }

    // ② Configurer SpeechRecognition
    setupRecognition(SR);

    // ③ Démarrer la reconnaissance DANS le geste clic
    //    → déclenche la dialog de permission microphone sur iOS/Android
    try {
      recognitionRef.current.start();
    } catch (e) {
      if (e.name === 'InvalidStateError') {
        // Déjà démarré → continuer normalement
      } else {
        mountedRef.current = false;
        if (e.name === 'SecurityError' || e.name === 'NotAllowedError') {
          setErrorMsg('Accès au microphone bloqué. Autorisez-le dans les paramètres du navigateur.');
        } else {
          setErrorMsg(`Impossible de démarrer (${e.name}). Réessayez.`);
        }
        recognitionRef.current = null;
        return;
      }
    }

    // ④ Afficher l'interface principale (reconnue comme démarrée)
    setStarted(true);
  };

  // ── Initialisation après démarrage ───────────────────────────────────────
  useEffect(() => {
    if (!started) return;

    startOrbAnimation();

    // Stopper la reconnaissance démarrée dans handleStart (elle servait uniquement
    // à déclencher la dialog de permission iOS). Elle redémarrera après le salut.
    // Important : le faire AVANT speak() pour que le micro ne capte pas le TTS.
    try { recognitionRef.current?.stop(); } catch {}

    // Salut vocal du bot (TTS préchauffé dans handleStart → fonctionne sur iOS)
    const welcomeText = WELCOME[languageRef.current] || WELCOME.fr;
    safeSetState(S.SPEAKING);
    setBotSnippet(welcomeText);

    speak(welcomeText, () => {
      if (!mountedRef.current) return;
      setBotSnippet('');
      safeSetState(S.LISTENING);
      startRecognition(); // commence réellement à écouter l'utilisateur
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
    };
  }, [started]); // eslint-disable-line react-hooks/exhaustive-deps

  // Interrompre le TTS en touchant l'orbe
  const interrupt = () => {
    if (stateRef.current !== S.SPEAKING) return;
    clearInterval(keepAliveRef.current);
    clearTimeout(fallbackTimerRef.current);
    window.speechSynthesis?.cancel();
    if (mountedRef.current) setBotSnippet('');
    safeSetState(S.LISTENING);
    startRecognition();
  };

  const orbGradient = {
    [S.LISTENING]:  'from-violet-500 to-blue-600',
    [S.PROCESSING]: 'from-amber-400 to-orange-500',
    [S.SPEAKING]:   'from-emerald-400 to-green-600',
  }[state] ?? 'from-violet-500 to-blue-600';

  const statusLabel = {
    [S.LISTENING]:  'Je vous écoute...',
    [S.PROCESSING]: 'Réflexion...',
    [S.SPEAKING]:   'Réponse en cours...',
  }[state] ?? '';

  // ── Écran de démarrage ────────────────────────────────────────────────────
  if (!started) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isSupported = !!SR && window.isSecureContext;

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

          <div className={`w-36 h-36 rounded-full bg-gradient-to-br shadow-2xl flex items-center justify-center
            ${isSupported ? 'from-violet-500 to-blue-600' : 'from-gray-600 to-gray-800'}`}>
            {isSupported
              ? <Mic className="h-14 w-14 text-white drop-shadow-lg" />
              : <MicOff className="h-14 w-14 text-white/60 drop-shadow-lg" />
            }
          </div>

          {isSupported ? (
            <p className="text-gray-300 text-sm leading-relaxed max-w-xs">
              Appuyez sur <strong className="text-white">Démarrer</strong>. Le navigateur
              demandera la permission d'utiliser votre microphone.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-amber-300 text-sm leading-relaxed max-w-xs">
                Votre navigateur ne supporte pas la reconnaissance vocale.
              </p>
              <p className="text-gray-400 text-sm">
                Utilisez <strong className="text-white">Chrome</strong> ou{' '}
                <strong className="text-white">Safari</strong> sur ce téléphone.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="w-full bg-red-900/40 border border-red-700/50 rounded-xl px-4 py-3">
              <p className="text-red-300 text-sm leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {isSupported ? (
            <button
              onClick={handleStart}
              className="w-full max-w-xs py-4 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-black text-lg rounded-2xl transition-all shadow-xl hover:shadow-violet-500/30"
            >
              {errorMsg ? 'Réessayer' : 'Démarrer'}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full max-w-xs py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-2xl transition-all"
            >
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

        {/* Orbe + anneaux réactifs */}
        <div className="relative flex items-center justify-center w-64 h-64" onClick={interrupt}>
          <div ref={ring1Ref} className="absolute w-48 h-48 rounded-full border border-violet-400/30" style={{ opacity: 0, transition: 'opacity 0.2s' }} />
          <div ref={ring2Ref} className="absolute w-56 h-56 rounded-full border border-blue-400/20"   style={{ opacity: 0, transition: 'opacity 0.2s' }} />
          <div ref={ring3Ref} className="absolute w-64 h-64 rounded-full border border-blue-300/10"   style={{ opacity: 0, transition: 'opacity 0.2s' }} />

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

        {/* Statut + transcript */}
        <div className="text-center min-h-[80px] px-4">
          <p className="text-white font-bold text-base">{statusLabel}</p>
          {transcript && (
            <p className="text-violet-300 text-sm mt-1.5 italic leading-relaxed max-w-xs">
              «{transcript.slice(-100)}»
            </p>
          )}
          {botSnippet && (
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
