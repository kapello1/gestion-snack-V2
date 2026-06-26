import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  UtensilsCrossed, ShoppingCart, CalendarCheck, Mic, Clock, MapPin, Phone,
  Calendar, ChevronRight, Star, Wifi, Shield, CreditCard, Truck,
  ChefHat, Bot, Users, Award, Heart, MessageSquare, ArrowRight,
  CheckCircle, Zap, Globe, Mail, Instagram, Facebook, Twitter,
  Menu as MenuIcon, X as XIcon,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

/* ── Petit hook pour animation au scroll ── */
const useInView = (threshold = 0.15) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
};

const FadeIn = ({ children, delay = 0, className = '' }) => {
  const [ref, visible] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
      }}
    >
      {children}
    </div>
  );
};

/* ── Compteur animé ── */
const Counter = ({ target, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const [ref, visible] = useInView();
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const id = setInterval(() => {
      start = Math.min(start + step, target);
      setCount(start);
      if (start >= target) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [visible, target, duration]);
  return <span ref={ref}>{count}{suffix}</span>;
};

const DASHBOARD_PATHS = {
  ADMIN:    '/admin/dashboard',
  CUSTOMER: '/customer/menu',
  CASHIER:  '/cashier/payments',
  WAITER:   '/waiter/orders',
  COOK:     '/cook/orders',
  PROVIDER: '/provider/orders',
};

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Si déjà connecté, rediriger vers le tableau de bord
  useEffect(() => {
    if (user) {
      navigate(DASHBOARD_PATHS[user.roleName] || '/customer/menu', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    fetch(`${API_BASE}/products`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setProducts(Array.isArray(data) ? data.slice(0, 6) : []))
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goLogin = () => navigate('/login');

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  const navLinks = [
    { label: 'Menu', id: 'menu' },
    { label: 'Services', id: 'services' },
    { label: 'Comment ça marche', id: 'how' },
    { label: 'Avis', id: 'reviews' },
    { label: 'Contact', id: 'contact' },
  ];

  const features = [
    {
      icon: ShoppingCart, color: 'from-indigo-500 to-blue-600', bg: 'bg-indigo-50',
      title: 'Commande en ligne', badge: null,
      desc: 'Parcourez notre carte, personnalisez vos plats (sauces, viandes, desserts) et payez en quelques clics — sur place ou à emporter.',
      bullets: ['Menu complet avec filtres', 'Personnalisation des plats', 'Paiement sécurisé par carte'],
    },
    {
      icon: CalendarCheck, color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50',
      title: 'Réservation de table', badge: null,
      desc: 'Choisissez votre date, créneau horaire et nombre de convives. Votre table est confirmée en temps réel, sans attente.',
      bullets: ['Disponibilités en direct', 'Confirmation par e-mail', 'Modification ou annulation'],
    },
    {
      icon: Bot, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50',
      title: 'Assistant IA vocal', badge: 'NOUVEAU',
      desc: "Notre chatbot intelligent répond à vos questions sur le menu, les horaires et vos réservations — par texte ou par voix, en français, néerlandais et allemand.",
      bullets: ['Reconnaissance vocale', 'Réservation via l\'IA', 'Multilingue FR/NL/DE'],
    },
    {
      icon: Zap, color: 'from-green-500 to-teal-500', bg: 'bg-green-50',
      title: 'Temps réel', badge: null,
      desc: 'Suivez l\'état de votre commande en direct, de la préparation au service. Les notifications vous tiennent informé à chaque étape.',
      bullets: ['Suivi de commande live', 'Notifications push', 'Mise à jour instantanée'],
    },
  ];

  const steps = [
    { num: '01', icon: Globe, title: 'Créez votre compte', desc: 'Inscription rapide avec vérification e-mail et sécurité 2FA.' },
    { num: '02', icon: UtensilsCrossed, title: 'Explorez le menu', desc: 'Découvrez nos plats, filtrez par catégorie, consultez allergènes et prix.' },
    { num: '03', icon: ShoppingCart, title: 'Commandez ou réservez', desc: 'Ajoutez vos plats au panier ou choisissez un créneau de réservation.' },
    { num: '04', icon: CheckCircle, title: 'Profitez !', desc: 'Récupérez votre commande ou prenez place à votre table réservée.' },
  ];

  const testimonials = [
    { name: 'Marie D.', rating: 5, text: 'Super appli ! J\'ai réservé ma table en 30 secondes. Le chatbot m\'a même aidé à choisir mon menu !', avatar: 'M' },
    { name: 'Thomas K.', rating: 5, text: 'La commande en ligne est ultra fluide. Mes plats sont toujours prêts à l\'heure indiquée.', avatar: 'T' },
    { name: 'Isabelle R.', rating: 4, text: 'J\'adore pouvoir suivre l\'état de ma commande en temps réel. Fini le stress d\'attendre !', avatar: 'I' },
    { name: 'Patrick N.', rating: 5, text: 'Le système de réservation est parfait. Confirmation immédiate et rappel par e-mail, c\'est pro.', avatar: 'P' },
  ];

  const stats = [
    { value: 500, suffix: '+', label: 'Clients satisfaits' },
    { value: 50, suffix: '+', label: 'Plats au menu' },
    { value: 98, suffix: '%', label: 'Avis positifs' },
    { value: 3, suffix: ' min', label: 'Commande rapide' },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#070518', color: '#e2e8f0' }}>

      {/* ══ NAVBAR ══════════════════════════════════════════════════════════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? 'rgba(7,5,24,0.97)' : 'rgba(7,5,24,0.6)',
          backdropFilter: 'blur(16px)',
          borderBottom: scrolled ? '1px solid rgba(139,92,246,0.2)' : '1px solid transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-white font-black text-lg tracking-tight">Snack Tiegni</span>
              <span className="hidden sm:block text-[10px] text-violet-400 font-medium tracking-widest uppercase">Bruxelles</span>
            </div>
          </div>

          {/* Nav desktop */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)}
                className="text-slate-300 hover:text-white text-sm font-medium transition-colors duration-200">
                {l.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={goLogin}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-gray-900 transition-all hover:scale-105 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
            >
              Se connecter <ArrowRight className="h-4 w-4" />
            </button>
            <button className="lg:hidden p-2 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(o => !o)}>
              {mobileOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-white/10 bg-[#070518]/98 px-4 py-4 space-y-1">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)}
                className="w-full text-left px-4 py-3 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">
                {l.label}
              </button>
            ))}
            <button onClick={goLogin}
              className="w-full mt-2 py-3 rounded-xl font-bold text-sm text-gray-900"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
              Se connecter
            </button>
          </div>
        )}
      </nav>

      {/* ══ HERO ════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Fond animé */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-15"
            style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-5"
            style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
          {/* Grille subtile */}
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: 'linear-gradient(rgba(139,92,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 py-20 grid lg:grid-cols-2 gap-16 items-center">
          {/* Texte */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
              style={{ backgroundColor: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              Ouvert Lun–Sam 10:00–22:00
            </div>

            <h1 className="text-[2rem] sm:text-5xl xl:text-7xl font-black leading-tight text-white">
              La meilleure{' '}
              <span style={{ display: 'inline-block', backgroundImage: 'linear-gradient(135deg, #a78bfa, #f59e0b)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>
                expérience snack
              </span>{' '}
              à Bruxelles
            </h1>

            <p className="text-slate-400 text-lg leading-relaxed max-w-lg">
              Commandez en ligne, réservez votre table ou discutez avec notre assistant IA.
              Simple, rapide et disponible 24h/24 — parce que vous méritez le meilleur.
            </p>

            <div className="flex flex-wrap gap-4">
              <button onClick={goLogin}
                className="flex items-center gap-2 px-7 py-4 rounded-2xl font-bold text-gray-900 text-base transition-all hover:scale-105 hover:shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 32px rgba(245,158,11,0.35)' }}>
                <UtensilsCrossed className="h-5 w-5" />
                Voir le menu
              </button>
              <button onClick={() => scrollTo('reservation')}
                className="flex items-center gap-2 px-7 py-4 rounded-2xl font-bold text-white text-base transition-all hover:bg-white/10"
                style={{ border: '1px solid rgba(139,92,246,0.5)' }}>
                <CalendarCheck className="h-5 w-5 text-violet-400" />
                Réserver une table
              </button>
            </div>

            {/* Mini-badges de confiance */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {[
                { icon: Shield, text: 'Paiement sécurisé' },
                { icon: CheckCircle, text: 'Confirmation immédiate' },
                { icon: Mic, text: 'Assistant vocal IA' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Icon className="h-3.5 w-3.5 text-violet-400" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Image / visuel hero */}
          <div className="relative hidden lg:block">
            <div className="relative h-[520px] rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)' }}>
              <img
                src="/images/hero.jpg"
                alt="Snack Tiegni Bernard"
                className="absolute inset-0 w-full h-full object-cover"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,5,24,0.8) 0%, transparent 60%)' }} />
              {/* Placeholder si pas d'image */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 pointer-events-none select-none">
                <UtensilsCrossed className="h-20 w-20 mb-4 opacity-20" />
                <p className="text-sm opacity-20">Ajoutez hero.jpg dans public/images/</p>
              </div>
              {/* Cartes flottantes */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="rounded-2xl p-4 backdrop-blur-md flex items-center gap-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="p-2 rounded-xl bg-amber-500/20">
                    <Star className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Note client 4.9/5</p>
                    <p className="text-slate-400 text-xs">Basé sur 200+ avis vérifiés</p>
                  </div>
                  <div className="ml-auto flex -space-x-1">
                    {['M','T','I','P'].map(l => (
                      <div key={l} className="w-7 h-7 rounded-full border-2 border-[#070518] bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">{l}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Badge réservation */}
            <div className="absolute -top-4 -right-4 rounded-2xl p-4 shadow-xl"
              style={{ backgroundColor: '#0f0d2a', border: '1px solid rgba(139,92,246,0.3)' }}>
              <div className="text-center">
                <p className="text-2xl font-black text-white">500+</p>
                <p className="text-xs text-violet-400 font-medium">tables réservées</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-violet-400/50 flex items-center justify-center">
            <div className="w-1.5 h-3 rounded-full bg-violet-400 animate-pulse" />
          </div>
        </div>
      </section>

      {/* ══ STATISTIQUES ════════════════════════════════════════════════════════ */}
      <section className="py-16 border-y" style={{ borderColor: 'rgba(139,92,246,0.15)', backgroundColor: 'rgba(139,92,246,0.04)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map(({ value, suffix, label }) => (
              <div key={label} className="text-center">
                <p className="text-4xl sm:text-5xl font-black text-white mb-1">
                  <Counter target={value} suffix={suffix} />
                </p>
                <p className="text-slate-400 text-sm font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SERVICES ════════════════════════════════════════════════════════════ */}
      <section id="services" className="py-24 max-w-7xl mx-auto px-4 sm:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-violet-400 mb-3 block">Ce que nous offrons</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Une expérience complète,<br />du digital à l'assiette</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">Technologie de pointe au service de votre plaisir culinaire</p>
          </div>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, color, bg, title, badge, desc, bullets }, i) => (
            <FadeIn key={title} delay={i * 100}>
              <div className="relative p-6 rounded-2xl h-full flex flex-col gap-4 group hover:scale-[1.02] transition-transform duration-300"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)' }}>
                {badge && (
                  <span className="absolute top-4 right-4 text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>{badge}</span>
                )}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${color} shadow-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
                <ul className="mt-auto space-y-1.5">
                  {bullets.map(b => (
                    <li key={b} className="flex items-center gap-2 text-xs text-slate-400">
                      <CheckCircle className="h-3.5 w-3.5 text-violet-400 flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ══ MENU APERÇU ═════════════════════════════════════════════════════════ */}
      <section id="menu" className="py-24" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <FadeIn>
            <div className="flex items-end justify-between mb-12">
              <div>
                <span className="text-xs font-bold tracking-widest uppercase text-amber-400 mb-2 block">Notre carte</span>
                <h2 className="text-3xl sm:text-4xl font-black text-white">Nos incontournables</h2>
              </div>
              <button onClick={goLogin}
                className="flex items-center gap-1.5 text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors">
                Tout le menu <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </FadeIn>

          {products.length === 0 ? (
            <p className="text-slate-500 text-center py-16 text-sm">Menu bientôt disponible en ligne</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p, i) => (
                <FadeIn key={p.productId ?? p.id ?? p.productName} delay={i * 80}>
                  <div className="rounded-2xl overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.15)' }}
                    onClick={goLogin}>
                    <div className="relative h-48 overflow-hidden"
                      style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)' }}>
                      {p.imageUrl && (
                        <img src={p.imageUrl} alt={p.productName}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={e => { e.currentTarget.style.display = 'none'; }} />
                      )}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                        <span className="text-white font-bold text-sm flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4" /> Commander
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white">{p.productName}</span>
                        {p.productType && (
                          <span className="block text-xs text-slate-500 mt-0.5">
                            {p.productType === 'FOOD' ? '🍽 Plat' : '🥤 Boisson'}
                          </span>
                        )}
                      </div>
                      <span className="font-black text-lg" style={{ color: '#f59e0b' }}>{p.unitPrice} €</span>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          )}

          <FadeIn delay={200}>
            <div className="text-center mt-12">
              <button onClick={goLogin}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-gray-900 transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.3)' }}>
                <UtensilsCrossed className="h-5 w-5" />
                Découvrir tout le menu
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ COMMENT ÇA MARCHE ════════════════════════════════════════════════════ */}
      <section id="how" className="py-24 max-w-7xl mx-auto px-4 sm:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-violet-400 mb-3 block">Simple et rapide</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Comment ça marche ?</h2>
            <p className="text-slate-400 text-lg max-w-md mx-auto">En 4 étapes seulement, profitez de tout ce que nous offrons</p>
          </div>
        </FadeIn>
        <div className="relative">
          {/* Ligne de connexion desktop */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)' }} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map(({ num, icon: Icon, title, desc }, i) => (
              <FadeIn key={num} delay={i * 120}>
                <div className="text-center group">
                  <div className="relative inline-block mb-6">
                    <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.1))', border: '1px solid rgba(139,92,246,0.3)' }}>
                      <Icon className="h-8 w-8 text-violet-400" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-black flex items-center justify-center">
                      {num}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SECTION RÉSERVATION CTA ════════════════════════════════════════════ */}
      <section id="reservation" className="py-20"
        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(99,102,241,0.08) 100%)', borderTop: '1px solid rgba(139,92,246,0.15)', borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 text-center">
          <FadeIn>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}>
              <CalendarCheck className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Réservez votre table dès maintenant</h2>
            <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
              Choisissez votre créneau, le nombre de personnes et votre table vous attend.
              Confirmation instantanée par e-mail.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={goLogin}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-base transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 8px 24px rgba(124,58,237,0.4)' }}>
                <CalendarCheck className="h-5 w-5" /> Réserver une table
              </button>
              <button onClick={goLogin}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-base transition-all hover:bg-white/10"
                style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
                <Bot className="h-5 w-5 text-amber-400" /> Réserver via l'IA
              </button>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-6 max-w-lg mx-auto">
              {[
                { icon: Clock, text: 'Lun–Sam : 10:00–22:00' },
                { icon: Users, text: 'Tables 2 à 8 personnes' },
                { icon: CheckCircle, text: 'Annulation gratuite' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="text-center">
                  <Icon className="h-5 w-5 mx-auto mb-1 text-violet-400" />
                  <p className="text-xs text-slate-400">{text}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ ASSISTANT IA ════════════════════════════════════════════════════════ */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-8">
        <div className="rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0f0a2e 0%, #1a0a3e 100%)', border: '1px solid rgba(139,92,246,0.25)' }}>
          <div className="grid lg:grid-cols-2 gap-0">
            {/* Texte */}
            <FadeIn className="p-10 lg:p-14 flex flex-col justify-center">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6 self-start"
                style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                <Zap className="h-3 w-3" /> Intelligence Artificielle
              </span>
              <h2 className="text-3xl font-black text-white mb-4">Votre assistant snack,<br />disponible 24h/24</h2>
              <p className="text-slate-400 leading-relaxed mb-8">
                Notre chatbot IA comprend le français, le néerlandais et l'allemand.
                Posez vos questions sur le menu, les allergènes, les horaires — ou
                laissez-le vous faire une réservation directement dans la conversation.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Questions sur le menu et les allergènes',
                  'Réservation de table par conversation',
                  'Mode vocal : parlez, l\'IA écoute',
                  'Multilingue FR / NL / DE',
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={goLogin}
                className="self-start flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-gray-900 transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                <Bot className="h-5 w-5" /> Essayer l'assistant
              </button>
            </FadeIn>

            {/* Fenêtre chat démo */}
            <FadeIn delay={200} className="p-8 lg:p-12 flex items-center justify-center">
              <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
                style={{ backgroundColor: '#0f0d2a', border: '1px solid rgba(139,92,246,0.25)' }}>
                {/* Header */}
                <div className="px-4 py-3 flex items-center gap-3"
                  style={{ background: 'linear-gradient(90deg, #2563eb, #1d4ed8)' }}>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Assistant Snack</p>
                    <p className="text-blue-200 text-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> En ligne
                    </p>
                  </div>
                </div>
                {/* Messages démo */}
                <div className="p-4 space-y-3 bg-gray-50">
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 text-xs text-gray-700 shadow-sm max-w-[85%]">
                      Bonjour ! Comment puis-je vous aider aujourd'hui ?
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <div className="bg-blue-600 rounded-2xl rounded-br-sm px-3 py-2 text-xs text-white max-w-[85%]">
                      Je voudrais réserver pour 4 personnes ce soir.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 text-xs text-gray-700 shadow-sm max-w-[85%]">
                      Parfait ! J'ai une table disponible à 19h00 pour 4 personnes. Je confirme la réservation ?
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <div className="bg-blue-600 rounded-2xl rounded-br-sm px-3 py-2 text-xs text-white max-w-[85%]">
                      Oui, parfait !
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 text-xs text-gray-700 shadow-sm max-w-[85%]">
                      Réservation confirmée ! Vous recevrez un e-mail de confirmation. A ce soir !
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ══ AVIS CLIENTS ════════════════════════════════════════════════════════ */}
      <section id="reviews" className="py-24" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <FadeIn>
            <div className="text-center mb-12">
              <span className="text-xs font-bold tracking-widest uppercase text-amber-400 mb-3 block">Témoignages</span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Ce que disent nos clients</h2>
              <div className="flex justify-center items-center gap-1 mt-2">
                {[1,2,3,4,5].map(i => <Star key={i} className="h-5 w-5 text-amber-400 fill-current" />)}
                <span className="ml-2 text-slate-400 text-sm">4.9/5 sur 200+ avis</span>
              </div>
            </div>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map(({ name, rating, text, avatar }, i) => (
              <FadeIn key={name} delay={i * 100}>
                <div className="p-6 rounded-2xl flex flex-col gap-4 hover:scale-[1.02] transition-transform duration-300"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.15)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                      {avatar}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{name}</p>
                      <div className="flex gap-0.5">
                        {Array.from({ length: rating }).map((_, j) => (
                          <Star key={j} className="h-3 w-3 text-amber-400 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">"{text}"</p>
                  <MessageSquare className="h-4 w-4 text-violet-400/40 mt-auto" />
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══ AVANTAGES / POURQUOI NOUS ═══════════════════════════════════════════ */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-violet-400 mb-3 block">Nos engagements</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Pourquoi choisir Snack Tiegni ?</h2>
          </div>
        </FadeIn>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Heart, title: 'Qualité maison', desc: 'Chaque plat préparé avec soin, des ingrédients frais sélectionnés chaque jour.' },
            { icon: Zap, title: 'Service ultra-rapide', desc: 'Commandez et recevez votre plat en moins de 15 minutes. Promis.' },
            { icon: Shield, title: 'Paiement sécurisé', desc: 'Stripe, 3D Secure, et données chiffrées. Votre sécurité est notre priorité.' },
            { icon: Globe, title: 'Accessible partout', desc: 'Application web responsive, compatible avec tous vos appareils.' },
            { icon: Award, title: 'Fidélité récompensée', desc: 'Clients réguliers, offres spéciales et notifications personnalisées.' },
            { icon: Truck, title: 'Suivi de commande', desc: 'Statut en temps réel, de la préparation jusqu\'au service à votre table.' },
          ].map(({ icon: Icon, title, desc }, i) => (
            <FadeIn key={title} delay={i * 80}>
              <div className="p-6 rounded-2xl flex gap-4 items-start hover:scale-[1.01] transition-transform duration-300"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.12)' }}>
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex-shrink-0">
                  <Icon className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ══ CTA FINAL ═══════════════════════════════════════════════════════════ */}
      <section className="py-20"
        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(99,102,241,0.1) 100%)', borderTop: '1px solid rgba(139,92,246,0.2)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-8 text-center">
          <FadeIn>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-6">
              Prêt à commander<br />
              <span style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ou réserver ?
              </span>
            </h2>
            <p className="text-slate-400 text-lg mb-10">Créez votre compte gratuitement et profitez de toutes nos fonctionnalités dès aujourd'hui.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={goLogin}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-gray-900 text-base transition-all hover:scale-105 hover:shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 32px rgba(245,158,11,0.4)' }}>
                Créer mon compte gratuitement <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════════ */}
      <footer id="contact" style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderTop: '1px solid rgba(139,92,246,0.15)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Identité */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
                  <UtensilsCrossed className="h-5 w-5 text-white" />
                </div>
                <span className="text-white font-black text-lg">Snack Tiegni</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Votre snack de référence à Bruxelles. Qualité, rapidité et service digital de pointe.
              </p>
              <div className="flex gap-3">
                {[Facebook, Instagram, Twitter].map((Icon, i) => (
                  <div key={i} className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <Icon className="h-4 w-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div>
              <h4 className="text-white font-bold mb-4">Navigation</h4>
              <ul className="space-y-2.5">
                {['Menu', 'Réservation', 'À propos', 'Contact'].map(l => (
                  <li key={l}>
                    <button onClick={goLogin} className="text-slate-400 hover:text-white text-sm transition-colors">{l}</button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-white font-bold mb-4">Services</h4>
              <ul className="space-y-2.5">
                {['Commande en ligne', 'Réservation de table', 'Assistant IA', 'Suivi de commande'].map(l => (
                  <li key={l} className="text-slate-400 text-sm">{l}</li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-bold mb-4">Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5 text-sm text-slate-400">
                  <MapPin className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
                  <span>Rue du Marché aux Herbes 42,<br />1000 Bruxelles</span>
                </li>
                <li className="flex items-center gap-2.5 text-sm text-slate-400">
                  <Phone className="h-4 w-4 text-violet-400 flex-shrink-0" />
                  <span>+32 2 123 45 67</span>
                </li>
                <li className="flex items-center gap-2.5 text-sm text-slate-400">
                  <Mail className="h-4 w-4 text-violet-400 flex-shrink-0" />
                  <span>contact@snack-tiegni.be</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-400">
                  <Clock className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p>Lun–Sam : 10:00 – 22:00</p>
                    <p>Dimanche : 12:00 – 21:00</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Barre du bas */}
          <div className="pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4"
            style={{ borderColor: 'rgba(139,92,246,0.15)' }}>
            <p className="text-slate-500 text-xs">© 2025 Snack Tiegni Bernard · Bruxelles · Tous droits réservés</p>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-slate-500" />
              <span className="text-slate-500 text-xs">Paiement sécurisé par Stripe</span>
              <Shield className="h-4 w-4 text-slate-500 ml-2" />
              <span className="text-slate-500 text-xs">SSL/HTTPS</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Landing;
