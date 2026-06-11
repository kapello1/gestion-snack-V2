import { useEffect, useRef, useState } from 'react';
import { X, Mic, Volume2, VolumeX, PhoneOff } from 'lucide-react';
import { sendChatMessage } from '../utils/groqApi';
import { useLanguage } from '../context/LanguageContext';

// ── États de la machine d'état ──────────────────────────────────────────────
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

// Détection iOS / Safari pour gérer les particularités de ces plateformes
const IS_IOS    = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
// Sur iOS/Safari, continuous = true est instable → on préfère continuous = false + redémarrage via onend
const USE_CONTINUOUS = !(IS_IOS || IS_SAFARI);

// ── Composant principal ──────────────────────────────────────────────────────
const LiveVoiceChat = ({ onClose, onMessagePair, products = [], chatHistory = [] }) => {
  const { language } = useLanguage();

  // `started` : false = écran de démarrage, true = session active
  // L'écran de démarrage garantit que getUserMedia est déclenché par un geste utilisateur
  // ce qui est obligatoire sur iOS Safari et certains navigateurs mobiles.
  const [started,    setStarted]    = useState(false);
  const [state,      setState]      = useState(S.IDLE);
  const [isMuted,    setIsMuted]    = useState(false);
  const [transcript, setTranscript] = useState('');
  const [botSnippet, setBotSnippet] = useState('');
  const [errorMsg,   setErrorMsg]   = useState('');

  // ── Refs pour les contextes async/RAF (évite les captures de stale state) ──
  const mountedRef        = useRef(true);
  const stateRef          = useRef(S.IDLE);
  const isMutedRef        = useRef(false);
  const errorCountRef     = useRef(0);
  const fullTranscriptRef = useRef('');
  const historyRef        = useRef(chatHistory);
  const productsRef       = useRef(products);
  const onMessagePairRef  = useRef(onMessagePair);
  const languageRef       = useRef(language);

  const recognitionRef  = useRef(null);
  const silenceTimerRef = useRef(null);
  const restartTimerRef = useRef(null);
  const keepAliveRef    = useRef(null);
  const streamRef       = useRef(null);
  const audioCtxRef     = useRef(null);
  const analyserRef     = useRef(null);
  const animFrameRef    = useRef(null);
  const orbRef          = useRef(null);
  const ring1Ref        = useRef(null);
  const ring2Ref        = useRef(null);
  const ring3Ref        = useRef(null);

  // Synchronisation des props → refs
  useEffect(() => { historyRef.current       = chatHistory;   }, [chatHistory]);
  useEffect(() => { productsRef.current      = products;      }, [products]);
  useEffect(() => { onMessagePairRef.current = onMessagePair; }, [onMessagePair]);
  useEffect(() => { languageRef.current      = language;      }, [language]);
  useEffect(() => { isMutedRef.current       = isMuted;       }, [isMuted]);

  // Setter d'état sécurisé (no-op après démontage)
  const safeSetState = (s) => {
    if (!mountedRef.current) return;
    stateRef.current = s;
    setState(s);
  };

  // ── Animation de l'orbe (RAF direct DOM, zéro re-render React) ─────────────
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

  // ── Synthèse vocale (TTS) ───────────────────────────────────────────────────
  const speak = (text, onEnd) => {
    const synth = window.speechSynthesis;
    if (!synth) { onEnd?.(); return; }
    clearInterval(keepAliveRef.current);
    synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang  = LANG_MAP[languageRef.current] || 'fr-FR';
    utter.rate  = 1.05;

    let called = false;
    const done = () => {
      clearInterval(keepAliveRef.current);
      if (!called) { called = true; onEnd?.(); }
    };
    utter.onend   = done;
    // 'interrupted' = annulation manuelle → traiter comme fin normale
    utter.onerror = (e) => { if (e.error !== 'interrupted') console.warn('TTS:', e.error); done(); };

    // Contournement bug Chrome : SpeechSynthesis s'arrête silencieusement après ~15 s
    // Solution : pause/resume toutes les 10 s pour garder le moteur actif
    keepAliveRef.current = setInterval(() => {
      if (!mountedRef.current || !synth.speaking) { clearInterval(keepAliveRef.current); return; }
      synth.pause();
      synth.resume();
    }, 10000);

    synth.speak(utter);
  };

  // ── Démarrage de la reconnaissance ──────────────────────────────────────────
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

  // ── Envoi du transcript au bot ───────────────────────────────────────────────
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
        id: Date.now() + 1,
        text: botText,
        sender: 'bot',
        timestamp: new Date(),
      });

      if (!isMutedRef.current) {
        safeSetState(S.SPEAKING);
        // Ne PAS démarrer la reconnaissance pendant le discours :
        // le micro capte l'audio TTS et annule la réponse du bot.
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

  // ── Configuration de SpeechRecognition ────────────────────────────────────
  const setupRecognition = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return false;

    const rec = new SR();
    // iOS/Safari : continuous=true est instable → on utilise false + redémarrage onend
    rec.continuous      = USE_CONTINUOUS;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;
    rec.lang            = LANG_MAP[languageRef.current] || 'fr-FR';

    rec.onresult = (event) => {
      if (!mountedRef.current) return;
      errorCountRef.current = 0; // succès → réinitialiser le compteur d'erreurs

      // Si l'utilisateur parle pendant que le bot parle → interrompre le TTS
      if (stateRef.current === S.SPEAKING) {
        clearInterval(keepAliveRef.current);
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
      // 'no-speech' et 'aborted' sont normaux → ignorer
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      errorCountRef.current++;
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        if (mountedRef.current) setErrorMsg('Microphone refusé. Autorisez l\'accès dans les paramètres du navigateur.');
        safeSetState(S.IDLE);
      } else if (e.error === 'network' || e.error === 'service-not-allowed') {
        if (mountedRef.current) setErrorMsg('Connexion réseau nécessaire pour la reconnaissance vocale en ligne.');
        safeSetState(S.IDLE);
      }
      // Autres erreurs : on laisse onend gérer le redémarrage
    };

    // Redémarrage automatique après fin de session (comportement continu sur iOS/Safari)
    rec.onend = () => {
      if (!mountedRef.current) return;
      const s = stateRef.current;
      if (s === S.LISTENING || s === S.SPEAKING) {
        restartTimerRef.current = setTimeout(() => {
          if (mountedRef.current && (stateRef.current === S.LISTENING || stateRef.current === S.SPEAKING)) {
            startRecognition();
          }
        }, 300);
      }
    };

    recognitionRef.current = rec;
    return true;
  };

  // Synchronisation langue pendant la session
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = LANG_MAP[language] || 'fr-FR';
    }
  }, [language]);

  // ── Initialisation — déclenchée par `started` (geste utilisateur garanti) ──
  useEffect(() => {
    if (!started) return;
    mountedRef.current = true;

    const init = async () => {
      safeSetState(S.STARTING);

      // ① Vérification du contexte sécurisé (HTTPS requis sur mobile)
      if (!window.isSecureContext) {
        setErrorMsg('Connexion HTTPS requise pour accéder au microphone sur mobile.');
        safeSetState(S.IDLE);
        return;
      }

      // ② Vérification de la disponibilité de l'API MediaDevices
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMsg('Microphone non accessible sur ce navigateur. Vérifiez les permissions.');
        safeSetState(S.IDLE);
        return;
      }

      // ③ Accès microphone + analyse audio
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        // AudioContext — utiliser le préfixe webkit pour les vieux navigateurs
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();

        // iOS Safari crée l'AudioContext en état "suspended" — il faut le reprendre explicitement
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        ctx.createMediaStreamSource(stream).connect(analyser);
        startAudioLoop();
      } catch (err) {
        if (!mountedRef.current) return;
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMsg('Accès au microphone refusé. Autorisez le micro dans les paramètres de votre navigateur.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setErrorMsg('Aucun microphone détecté sur cet appareil.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setErrorMsg('Le microphone est déjà utilisé par une autre application.');
        } else {
          setErrorMsg(`Impossible d'accéder au microphone (${err.name || err.message}).`);
        }
        safeSetState(S.IDLE);
        return;
      }

      // ④ Vérification du support SpeechRecognition
      if (!setupRecognition()) {
        if (!mountedRef.current) return;
        setErrorMsg('Reconnaissance vocale non supportée. Utilisez Chrome, Edge ou Safari.');
        safeSetState(S.IDLE);
        return;
      }

      // ⑤ Message de bienvenue puis écoute
      safeSetState(S.SPEAKING);
      speak(WELCOME[languageRef.current] || WELCOME.fr, () => {
        if (!mountedRef.current) return;
        safeSetState(S.LISTENING);
        startRecognition();
      });
    };

    init();

    return () => {
      mountedRef.current = false;
      clearTimeout(silenceTimerRef.current);
      clearTimeout(restartTimerRef.current);
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
      window.speechSynthesis?.cancel();
      if (mountedRef.current) setBotSnippet('');
      safeSetState(S.LISTENING);
      startRecognition();
    }
  };

  // Couleurs de l'orbe selon l'état
  const orbGradient = {
    [S.IDLE]:       'from-gray-500 to-gray-700',
    [S.STARTING]:   'from-blue-400 to-blue-600',
    [S.LISTENING]:  'from-violet-500 to-blue-600',
    [S.PROCESSING]: 'from-amber-400 to-orange-500',
    [S.SPEAKING]:   'from-emerald-400 to-green-600',
  }[state] ?? 'from-gray-500 to-gray-700';

  const statusLabel = {
    [S.IDLE]:       '',
    [S.STARTING]:   'Démarrage du microphone...',
    [S.LISTENING]:  'Je vous écoute...',
    [S.PROCESSING]: 'Réflexion en cours...',
    [S.SPEAKING]:   'Réponse vocale...',
  }[state] ?? '';

  // ── Écran de démarrage ─────────────────────────────────────────────────────
  // Affiché avant l'init pour s'assurer que getUserMedia est appelé
  // depuis un geste utilisateur direct (requis sur iOS Safari et mobile).
  if (!started) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/98 backdrop-blur-xl">
        <div className="relative flex flex-col items-center gap-8 w-full max-w-sm px-6 text-center select-none">

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

          {/* Orbe statique de prévisualisation */}
          <div className="w-36 h-36 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 shadow-2xl flex items-center justify-center">
            <Mic className="h-14 w-14 text-white drop-shadow-lg" />
          </div>

          <div className="space-y-2">
            <p className="text-gray-300 text-sm leading-relaxed max-w-xs">
              L'assistant utilisera votre microphone pour converser en temps réel.
              Appuyez sur <strong className="text-white">Démarrer</strong> pour autoriser l'accès.
            </p>
            <p className="text-gray-600 text-xs">Chrome · Edge · Safari requis</p>
          </div>

          <button
            onClick={() => setStarted(true)}
            className="w-full max-w-xs py-4 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-black text-lg rounded-2xl transition-all shadow-xl hover:shadow-violet-500/30"
          >
            🎤 Démarrer
          </button>
        </div>
      </div>
    );
  }

  // ── Interface principale ────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/98 backdrop-blur-xl">
      <div className="relative flex flex-col items-center justify-center gap-10 w-full max-w-sm px-6 select-none">

        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="absolute -top-6 right-0 p-2 text-gray-500 hover:text-white transition-colors"
          aria-label="Fermer"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Titre */}
        <div className="text-center">
          <h2 className="text-white font-black text-xl">Chat Vocal Live</h2>
          <p className="text-gray-400 text-sm mt-1">IA · Snack Tiegni Bernard</p>
        </div>

        {/* Orbe avec anneaux animés */}
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

        {/* Statuts et transcriptions */}
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
            className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
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
