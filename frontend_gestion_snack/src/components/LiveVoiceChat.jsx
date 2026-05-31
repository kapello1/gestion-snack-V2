import { useEffect, useRef, useState } from 'react';
import { X, Mic, Volume2, VolumeX, PhoneOff } from 'lucide-react';
import { sendChatMessage } from '../utils/groqApi';
import { useLanguage } from '../context/LanguageContext';

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

const LiveVoiceChat = ({ onClose, onMessagePair, products = [], chatHistory = [] }) => {
  const { language } = useLanguage();

  const [state,      setState]      = useState(S.STARTING);
  const [isMuted,    setIsMuted]    = useState(false);
  const [transcript, setTranscript] = useState('');
  const [botSnippet, setBotSnippet] = useState('');
  const [errorMsg,   setErrorMsg]   = useState('');

  // ── Refs for all mutable state accessed in async/RAF contexts ──
  const mountedRef        = useRef(true);
  const stateRef          = useRef(S.STARTING);
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

  // Keep prop refs current
  useEffect(() => { historyRef.current       = chatHistory;   }, [chatHistory]);
  useEffect(() => { productsRef.current      = products;      }, [products]);
  useEffect(() => { onMessagePairRef.current = onMessagePair; }, [onMessagePair]);
  useEffect(() => { languageRef.current      = language;      }, [language]);
  useEffect(() => { isMutedRef.current       = isMuted;       }, [isMuted]);

  // Safe state setter — no-ops after unmount
  const safeSetState = (s) => {
    if (!mountedRef.current) return;
    stateRef.current = s;
    setState(s);
  };

  // ── RAF-driven orb animation — direct DOM, zero React re-renders ──
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

  // ── Safe TTS helper ──
  const speak = (text, onEnd) => {
    const synth = window.speechSynthesis;
    if (!synth) { onEnd?.(); return; }
    clearInterval(keepAliveRef.current);
    synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = LANG_MAP[languageRef.current] || 'fr-FR';
    utter.rate = 1.05;

    let called = false;
    const done = () => {
      clearInterval(keepAliveRef.current);
      if (!called) { called = true; onEnd?.(); }
    };
    utter.onend = done;
    // 'interrupted' fires when we cancel manually — treat it like a normal end
    utter.onerror = (e) => { if (e.error !== 'interrupted') console.warn('TTS error:', e.error); done(); };

    // Chrome bug: speechSynthesis silently stops after ~15 s on long texts.
    // Workaround: pause+resume every 10 s to keep the engine alive.
    keepAliveRef.current = setInterval(() => {
      if (!mountedRef.current || !synth.speaking) { clearInterval(keepAliveRef.current); return; }
      synth.pause();
      synth.resume();
    }, 10000);

    synth.speak(utter);
  };

  // ── Start recognition — guarded by mountedRef and errorCount ──
  const startRecognition = () => {
    if (!mountedRef.current || !recognitionRef.current) return;
    if (errorCountRef.current >= 5) {
      if (mountedRef.current) setErrorMsg('Trop d\'erreurs de reconnaissance. Réessayez plus tard.');
      safeSetState(S.IDLE);
      return;
    }
    clearTimeout(restartTimerRef.current);
    try { recognitionRef.current.start(); } catch {}
  };

  // ── Send transcript to bot ──
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
        // Do NOT start recognition during speech — mic picks up TTS audio
        // causing the recognition to immediately cancel the bot's response.
        speak(botText, () => {
          if (!mountedRef.current) return;
          setBotSnippet('');
          if (stateRef.current === S.SPEAKING) {
            safeSetState(S.LISTENING);
            startRecognition(); // listen only AFTER bot finishes speaking
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

  // ── Setup SpeechRecognition ──
  const setupRecognition = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return false;

    const rec = new SR();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.lang           = LANG_MAP[languageRef.current] || 'fr-FR';

    rec.onresult = (event) => {
      if (!mountedRef.current) return;
      errorCountRef.current = 0; // successful result resets error streak

      // Interrupt TTS if recognition fires during SPEAKING (edge case: user taps orb then speaks)
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
      // 'no-speech' and 'aborted' are normal — don't count them
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      errorCountRef.current++;
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        if (mountedRef.current) setErrorMsg('Microphone refusé. Vérifiez les permissions du navigateur.');
        safeSetState(S.IDLE);
      } else if (e.error === 'network' || e.error === 'service-not-allowed') {
        if (mountedRef.current) setErrorMsg('Connexion réseau nécessaire pour la reconnaissance vocale.');
        safeSetState(S.IDLE);
      }
    };

    rec.onend = () => {
      if (!mountedRef.current) return;
      const s = stateRef.current;
      if (s === S.LISTENING || s === S.SPEAKING) {
        // Cooldown before restart — prevents infinite tight loop on failure
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

  // Sync recognition language mid-session
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = LANG_MAP[language] || 'fr-FR';
    }
  }, [language]);

  // ── One-shot init ──
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      safeSetState(S.STARTING);

      // Mic permission + audio analysis
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        ctx.createMediaStreamSource(stream).connect(analyser);
        startAudioLoop();
      } catch {
        if (!mountedRef.current) return;
        setErrorMsg('Impossible d\'accéder au microphone.');
        safeSetState(S.IDLE);
        return;
      }

      // Speech recognition support check
      if (!setupRecognition()) {
        if (!mountedRef.current) return;
        setErrorMsg('Reconnaissance vocale non supportée par ce navigateur. Utilisez Chrome, Edge ou Safari.');
        safeSetState(S.IDLE);
        return;
      }

      // Play welcome message then start listening
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const interrupt = () => {
    if (stateRef.current === S.SPEAKING) {
      clearInterval(keepAliveRef.current);
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
    [S.IDLE]:       'Initialisation...',
    [S.STARTING]:   'Démarrage du microphone...',
    [S.LISTENING]:  'Je vous écoute...',
    [S.PROCESSING]: 'Réflexion en cours...',
    [S.SPEAKING]:   'Réponse vocale...',
  }[state] ?? '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/98 backdrop-blur-xl">
      <div className="relative flex flex-col items-center justify-center gap-10 w-full max-w-sm px-6 select-none">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-6 right-0 p-2 text-gray-500 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Title */}
        <div className="text-center">
          <h2 className="text-white font-black text-xl">Chat Vocal Live</h2>
          <p className="text-gray-400 text-sm mt-1">IA · Snack Tiegni Bernard</p>
        </div>

        {/* Orb */}
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

        {/* Status */}
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
            <p className="text-red-400 text-xs mt-2 max-w-xs leading-relaxed">{errorMsg}</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => setIsMuted(m => !m)}
            className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
            title={isMuted ? 'Activer le son' : 'Désactiver le son'}
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
