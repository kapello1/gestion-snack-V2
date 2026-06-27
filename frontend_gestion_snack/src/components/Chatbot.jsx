import { AlertCircle, Bot, Loader2, MessageSquare, Mic, RefreshCcw, Send, StopCircle, Trash2, User, X, Radio } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { sendChatMessage, sendAssistantMessage } from '../utils/groqApi';
import LiveVoiceChat from './LiveVoiceChat';

const Chatbot = () => {
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();

  const welcomeMsg = () => ({ id: 'welcome', text: t('chatbot.welcome'), sender: 'bot', timestamp: new Date() });

  const [isOpen,       setIsOpen]       = useState(false);
  const [messages,     setMessages]     = useState([welcomeMsg()]);
  const [inputValue,   setInputValue]   = useState('');
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState(null);
  const [products,     setProducts]     = useState([]);
  const [showLive,     setShowLive]     = useState(false);

  // Voice
  const [isListening,  setIsListening]  = useState(false);
  const [voiceStatus,  setVoiceStatus]  = useState('idle');
  const [voiceError,   setVoiceError]   = useState(null);
  const recognitionRef    = useRef(null);
  const existingTextRef   = useRef('');

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // Évalué une seule fois à la création du composant
  const SR             = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isFirefox      = /firefox/i.test(navigator.userAgent);
  const voiceSupported = !!SR;

  // ── Reconnaissance vocale ──────────────────────────────────────────────────
  useEffect(() => {
    if (!voiceSupported) return;
    const recognition = new SR();
    recognition.continuous      = false;
    recognition.interimResults  = true;
    recognition.maxAlternatives = 1;

    recognition.onstart  = () => { setIsListening(true);  setVoiceError(null); };
    recognition.onresult = (event) => {
      let final = '', interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      const base = existingTextRef.current;
      if (final) existingTextRef.current = base + (base && !base.endsWith(' ') ? ' ' : '') + final;
      setInputValue(existingTextRef.current + (interim ? (existingTextRef.current ? ' ' : '') + interim : ''));
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      const err = event.error;
      if (err === 'no-speech' || err === 'aborted') return; // erreurs normales, ignorer
      if (err === 'not-allowed' || err === 'permission-denied') {
        setVoiceError(t('chatbot.voiceMicDenied'));
      } else if (err === 'audio-capture') {
        setVoiceError(t('chatbot.voiceMicNotFound'));
      } else if (err === 'network') {
        setVoiceError('Connexion réseau perdue. Vérifiez votre connexion.');
      } else if (err === 'service-not-allowed') {
        setVoiceError('Service vocal non autorisé sur ce navigateur.');
      } else {
        setVoiceError(t('chatbot.voiceError'));
      }
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    return () => { try { recognitionRef.current?.abort(); } catch {} };
  }, [voiceSupported]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (recognitionRef.current) {
      const langMap = { fr: 'fr-FR', nl: 'nl-NL', de: 'de-DE' };
      recognitionRef.current.lang = langMap[language] || 'fr-FR';
    }
  }, [language]);

  const toggleVoice = useCallback(async () => {
    if (!recognitionRef.current) return;
    if (isListening) { recognitionRef.current.stop(); return; }

    setVoiceError(null);
    setVoiceStatus('requesting');

    if (!window.isSecureContext) {
      setVoiceStatus('error');
      setVoiceError('HTTPS requis pour accéder au microphone sur mobile.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceStatus('error');
      setVoiceError(t('chatbot.voiceMicNotFound'));
      return;
    }
    if (!navigator.onLine) {
      setVoiceStatus('error');
      setVoiceError('Connexion internet requise pour la reconnaissance vocale.');
      return;
    }
    // Pré-demande de permission micro (doit être dans la chaîne du geste utilisateur)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach(track => track.stop());
      setVoiceStatus('idle');
    } catch (err) {
      setVoiceStatus('error');
      const n = err.name;
      if (n === 'NotAllowedError' || n === 'PermissionDeniedError') {
        setVoiceError(t('chatbot.voiceMicDenied'));
      } else if (n === 'NotFoundError' || n === 'DevicesNotFoundError') {
        setVoiceError(t('chatbot.voiceMicNotFound'));
      } else if (n === 'NotReadableError' || n === 'TrackStartError') {
        setVoiceError('Microphone utilisé par une autre app. Fermez-la et réessayez.');
      } else {
        setVoiceError(t('chatbot.voiceError'));
      }
      return;
    }

    // Recréation lazy si la reconnaissance a été détruite (ex: changement de page)
    if (!recognitionRef.current && SR) {
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      const langMap = { fr: 'fr-FR', nl: 'nl-NL', de: 'de-DE' };
      rec.lang = langMap[language] || 'fr-FR';
      rec.onstart  = () => { setIsListening(true);  setVoiceError(null); };
      rec.onresult = recognitionRef.current?.onresult;
      rec.onerror  = recognitionRef.current?.onerror;
      rec.onend    = () => setIsListening(false);
      recognitionRef.current = rec;
    }

    // Forcer la langue à jour avant de démarrer
    if (recognitionRef.current) {
      const langMap = { fr: 'fr-FR', nl: 'nl-NL', de: 'de-DE' };
      recognitionRef.current.lang = langMap[language] || 'fr-FR';
    }

    existingTextRef.current = inputValue;
    try {
      recognitionRef.current.start();
    } catch (err) {
      if (err.name !== 'InvalidStateError') setVoiceError(t('chatbot.voiceError'));
      setVoiceStatus('idle');
    }
  }, [isListening, inputValue, t, language, SR]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chargement produits + historique ──────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get(API_ENDPOINTS.PRODUCTS.BASE)
      .then(r => { if (r.data) setProducts(r.data); })
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !user?.userId) return;
    api.get(`${API_ENDPOINTS.MESSAGES.BASE}/user/${user.userId}`)
      .then(r => {
        if (r.data?.length > 0) {
          const history = r.data.map(m => ({
            id: m.idMessage,
            text: m.content,
            sender: m.senderType === 'USER' ? 'user' : 'bot',
            timestamp: new Date(m.sentAt),
          }));
          setMessages([welcomeMsg(), ...history]);
        }
      })
      .catch(() => {});
  }, [isAuthenticated, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [messages, isOpen, isLoading]);

  // ── Sauvegarde message ─────────────────────────────────────────────────────
  const saveMsg = async (text, senderType) => {
    if (isAuthenticated && user?.userId) {
      try {
        const r = await api.post(API_ENDPOINTS.MESSAGES.BASE, { userId: user.userId, content: text, senderType });
        return r.data.idMessage;
      } catch {}
    }
    return Date.now();
  };

  // ── Envoi message ──────────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e?.preventDefault();
    const text = inputValue.trim();
    if (!text || isLoading) return;

    if (isListening) recognitionRef.current?.stop();
    existingTextRef.current = '';
    setInputValue('');
    setIsLoading(true);
    setError(null);

    const userMsgId = await saveMsg(text, 'USER');
    const userMsg   = { id: userMsgId, text, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const history = [...messages, userMsg].filter(m => m.sender !== 'error' && m.id !== 'welcome');
      // Chat texte : on utilise l'assistant avec function calling (réservation réelle).
      // customerId = user.ownerId (l'id du client lié au compte connecté), ou null si non connecté.
      const botText = await sendAssistantMessage(history, user?.ownerId ?? null);
      const botMsgId = await saveMsg(botText, 'BOT');
      setMessages(prev => [...prev, { id: botMsgId, text: botText, sender: 'bot', timestamp: new Date() }]);
    } catch (err) {
      setError(err.message || 'Erreur');
      setMessages(prev => [...prev, { id: 'err-' + Date.now(), text: t('chatbot.errorMessage'), sender: 'error', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    const cleaned = messages.filter(m => m.sender !== 'error');
    setMessages(cleaned);
    setIsLoading(true);
    setError(null);
    sendChatMessage(cleaned.filter(m => m.id !== 'welcome'), products)
      .then(async text => {
        const id = await saveMsg(text, 'BOT');
        setMessages(prev => [...prev, { id, text, sender: 'bot', timestamp: new Date() }]);
      })
      .catch(err => {
        setError(err.message || 'Erreur');
        setMessages(prev => [...prev, { id: 'err-' + Date.now(), text: t('chatbot.errorMessage'), sender: 'error', timestamp: new Date() }]);
      })
      .finally(() => setIsLoading(false));
  };

  // ── Suppression message individuel ─────────────────────────────────────────
  const deleteMessage = useCallback(async (msgId) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    // Supprimer de la BD uniquement si c'est un vrai ID numérique (pas 'welcome' ni 'err-xxx')
    if (typeof msgId === 'number') {
      try { await api.delete(API_ENDPOINTS.MESSAGES.BY_ID(msgId)); } catch {}
    }
  }, []);

  // ── Effacer toute la conversation ──────────────────────────────────────────
  const deleteAllMessages = useCallback(async () => {
    const toDelete = messages.filter(m => typeof m.id === 'number');
    setMessages([welcomeMsg()]);
    if (isAuthenticated && user?.userId) {
      await Promise.allSettled(
        toDelete.map(m => api.delete(API_ENDPOINTS.MESSAGES.BY_ID(m.id)))
      );
    }
  }, [messages, isAuthenticated, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live voice pair ────────────────────────────────────────────────────────
  const handleLivePair = (userMsg, botMsg) => {
    setMessages(prev => [...prev, userMsg, botMsg]);
    if (isAuthenticated && user?.userId) {
      saveMsg(userMsg.text, 'USER').catch(() => {});
      saveMsg(botMsg.text, 'BOT').catch(() => {});
    }
  };

  const fmt = (d) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(d);

  // Nettoie le markdown pour l'affichage et le TTS (retire *, **, ***, _, __, #, etc.)
  const cleanMarkdown = (text) => {
    if (!text) return text;
    return text
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')   // **bold**, *italic*, ***both***
      .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')       // __bold__, _italic_
      .replace(/#{1,6}\s*/g, '')                    // # Headers
      .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, ''))  // `code`
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')     // [text](url)
      .replace(/^[-*+]\s/gm, '• ')                  // listes → bullet unicode
      .replace(/^\d+\.\s/gm, (m) => m)             // listes numérotées (garder)
      .trim();
  };

  const hasRealMessages = messages.some(m => m.id !== 'welcome' && !String(m.id).startsWith('err-'));

  return (
    <>
      {showLive && (
        <LiveVoiceChat
          onClose={() => setShowLive(false)}
          onMessagePair={handleLivePair}
          products={products}
          chatHistory={messages.filter(m => m.id !== 'welcome' && m.sender !== 'error')}
          customerId={user?.ownerId ?? null}
        />
      )}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Fenêtre chat */}
        <div className={`transition-all duration-300 origin-bottom-right bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col
          ${isOpen ? 'scale-100 opacity-100 mb-4 pointer-events-auto w-[350px] sm:w-[400px] h-[540px] max-h-[85vh]' : 'hidden pointer-events-none'}`}>

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-t-2xl flex items-center justify-between text-white shadow-md relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-blue-600 rounded-full" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">{t('chatbot.title')}</h3>
                <p className="text-xs text-blue-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  {t('chatbot.online')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Effacer la conversation */}
              {hasRealMessages && (
                <button
                  onClick={deleteAllMessages}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title="Effacer la conversation"
                  aria-label="Effacer la conversation"
                >
                  <Trash2 className="w-4 h-4 text-white/80 hover:text-white" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                aria-label={t('chatbot.closeChat')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Banner : pas de reconnaissance vocale */}
          {!voiceSupported && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-medium">
                {isFirefox ? t('chatbot.voiceFirefoxNotSupported') : t('chatbot.voiceNotSupported')}
              </p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-[#f8f9fa] space-y-4 scroll-smooth">
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className={`flex flex-col group ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className={`flex items-end gap-2 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.sender !== 'error' && (
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm
                      ${msg.sender === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-white border border-gray-200 text-blue-600'}`}>
                      {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                  )}

                  <div className="relative">
                    <div className={`px-4 py-3 shadow-sm
                      ${msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-[20px] rounded-br-sm'
                        : msg.sender === 'error'
                          ? 'bg-red-50 text-red-600 rounded-[20px] border border-red-100 w-full'
                          : 'bg-white text-gray-800 rounded-[20px] rounded-bl-sm border border-gray-100'
                      }`}>
                      {msg.sender === 'error' && <AlertCircle className="w-5 h-5 mb-1 text-red-500 inline-block mr-2" />}
                      <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                        {msg.sender === 'bot' ? cleanMarkdown(msg.text) : msg.text}
                      </div>
                      {msg.sender !== 'error' && (
                        <div className={`text-[10px] mt-1 text-right ${msg.sender === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                          {fmt(msg.timestamp)}
                        </div>
                      )}
                    </div>

                    {/* Bouton supprimer - visible au survol, jamais sur le message de bienvenue */}
                    {msg.id !== 'welcome' && msg.sender !== 'error' && (
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className={`absolute -top-2 ${msg.sender === 'user' ? '-left-2' : '-right-2'}
                          w-5 h-5 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center
                          opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:border-red-200`}
                        title="Supprimer ce message"
                      >
                        <X className="w-2.5 h-2.5 text-gray-400 hover:text-red-500" />
                      </button>
                    )}
                  </div>
                </div>

                {msg.sender === 'error' && index === messages.length - 1 && (
                  <button onClick={handleRetry} className="mt-2 text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 self-center">
                    <RefreshCcw className="w-3 h-3" />
                    {t('chatbot.retry')}
                  </button>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-end gap-2 max-w-[85%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-gray-200 text-blue-600 flex items-center justify-center shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white px-4 py-3 rounded-[20px] rounded-bl-sm border border-gray-100 shadow-sm flex items-center gap-1.5 h-[42px]">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Banners erreurs */}
          {error && !isLoading && (
            <div className="bg-red-50 px-4 py-2 text-xs text-red-600 font-medium border-t border-red-100 flex items-center justify-between">
              <span className="truncate mr-2 flex-1">{t('chatbot.unstableConnection')}</span>
              <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-full"><X className="w-3 h-3" /></button>
            </div>
          )}
          {voiceError && (
            <div className="bg-amber-50 px-4 py-2 text-xs text-amber-700 font-medium border-t border-amber-100 flex items-center justify-between">
              <span className="flex-1">{voiceError}</span>
              <button onClick={() => setVoiceError(null)} className="p-1 hover:bg-amber-100 rounded-full ml-2"><X className="w-3 h-3" /></button>
            </div>
          )}

          {/* Zone de saisie */}
          <div className="bg-white p-3 border-t border-gray-100 rounded-b-2xl">
            {isListening && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-xl mb-2 text-xs text-red-600 font-semibold">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                {t('chatbot.listening')}
              </div>
            )}
            {voiceStatus === 'requesting' && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl mb-2 text-xs text-blue-600 font-semibold">
                <Loader2 className="w-3 h-3 animate-spin" />
                Demande d'autorisation micro...
              </div>
            )}

            <form
              onSubmit={handleSend}
              className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-[1.5rem] p-1.5 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all shadow-inner"
            >
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={e => {
                  setInputValue(e.target.value);
                  if (!isListening) existingTextRef.current = e.target.value;
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder={isListening ? t('chatbot.listening') : t('chatbot.placeholder')}
                className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-sm font-medium text-gray-700 placeholder-gray-400"
                rows={1}
                disabled={isLoading}
              />

              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  disabled={isLoading}
                  className={`p-3 rounded-full flex-shrink-0 transition-all duration-300
                    ${isListening ? 'bg-red-500 text-white shadow-lg shadow-red-200 hover:bg-red-600 animate-pulse'
                      : voiceStatus === 'requesting' ? 'bg-blue-100 text-blue-500 cursor-wait'
                      : 'bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-700'}
                    ${isLoading ? 'opacity-40 cursor-not-allowed' : ''}`}
                  aria-label={t('chatbot.voiceInput')}
                >
                  {isListening ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowLive(true)}
                disabled={isLoading}
                className={`p-3 rounded-full flex-shrink-0 transition-all duration-300 bg-violet-100 text-violet-600 hover:bg-violet-200 hover:scale-105 ${isLoading ? 'opacity-40 cursor-not-allowed' : ''}`}
                title={t('chatbot.liveVoice')}
                aria-label={t('chatbot.liveVoice')}
              >
                <Radio className="w-4 h-4" />
              </button>

              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className={`p-3.5 rounded-full flex-shrink-0 transition-all duration-300 shadow-md
                  ${inputValue.trim() && !isLoading
                    ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 hover:shadow-lg active:scale-95'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                aria-label={t('chatbot.send')}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
              </button>
            </form>

            <div className="text-center mt-2">
              <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">
                {t('chatbot.generatedByAI')}
              </span>
            </div>
          </div>
        </div>

        {/* Bouton flottant */}
        <button
          onClick={() => setIsOpen(o => !o)}
          className="flex items-center justify-center p-4 bg-gradient-to-tr from-blue-600 to-blue-500 text-white rounded-full shadow-2xl hover:shadow-[0_10px_25px_-5px_rgba(37,99,235,0.5)] hover:scale-110 active:scale-95 transition-all duration-300 relative"
          aria-label={t('chatbot.openChat')}
        >
          {isOpen ? (
            <X className="w-7 h-7" />
          ) : (
            <>
              <MessageSquare className="w-7 h-7" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-pulse" />
            </>
          )}
        </button>
      </div>
    </>
  );
};

export default Chatbot;
