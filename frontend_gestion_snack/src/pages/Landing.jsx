import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  ShoppingCart,
  CalendarCheck,
  Mic,
  Clock,
  MapPin,
  Phone,
  Calendar,
  ChevronRight,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const Landing = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/products`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setProducts(Array.isArray(data) ? data.slice(0, 6) : []))
      .catch(() => setProducts([]));
  }, []);

  const goLogin = () => navigate('/login');

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0820', color: '#e2e8f0' }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 py-3"
           style={{ backgroundColor: 'rgba(10,8,32,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
            <UtensilsCrossed className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Gestion Snack</span>
        </div>

        {/* Liens desktop */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#menu" className="text-slate-300 hover:text-white text-sm transition-colors">Menu</a>
          <a href="#reservation" className="text-slate-300 hover:text-white text-sm transition-colors">Réservation</a>
          <a href="#contact" className="text-slate-300 hover:text-white text-sm transition-colors">Contact</a>
          <button
            onClick={goLogin}
            className="px-4 py-2 rounded-lg font-semibold text-sm text-gray-900 transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#f59e0b' }}
          >
            Se connecter
          </button>
        </div>

        {/* Mobile : juste le bouton */}
        <button
          onClick={goLogin}
          className="md:hidden px-4 py-2 rounded-lg font-semibold text-sm text-gray-900 transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#f59e0b' }}
        >
          Se connecter
        </button>
      </nav>

      {/* ── HÉRO ───────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24 grid md:grid-cols-2 gap-12 items-center">
        {/* Colonne texte */}
        <div className="space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
               style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#a78bfa', border: '1px solid rgba(99,102,241,0.3)' }}>
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            Snack Tiegni Bernard · Bruxelles
          </div>

          {/* Titre */}
          <h1 className="text-4xl sm:text-5xl font-black leading-tight text-white">
            Commandez, réservez,<br />
            <span style={{ color: '#a78bfa' }}>parlez à notre IA.</span>
          </h1>

          {/* Description */}
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            Découvrez notre snack en ligne : commandez vos plats, réservez votre table,
            ou posez vos questions à notre assistant vocal intelligent. Simple, rapide,
            disponible à tout moment.
          </p>

          {/* Boutons CTA */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={goLogin}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-gray-900 transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#f59e0b' }}
            >
              <UtensilsCrossed className="h-5 w-5" />
              Voir le menu
            </button>
            <button
              onClick={goLogin}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-colors hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <Calendar className="h-5 w-5" />
              Réserver
            </button>
          </div>
        </div>

        {/* Colonne image */}
        <div className="relative h-64 sm:h-80 md:h-[420px] rounded-3xl overflow-hidden shadow-2xl"
             style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
          {/* Déposez votre photo ici : public/images/hero.jpg */}
          <img
            src="/images/hero.jpg"
            alt="Snack Tiegni Bernard"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          {/* Overlay texte de secours visible si l'image est absente */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 pointer-events-none select-none">
            <UtensilsCrossed className="h-16 w-16 mb-4 opacity-40" />
            <p className="text-sm opacity-40">Déposez hero.jpg dans public/images/</p>
          </div>
        </div>
      </section>

      {/* ── ATOUTS ─────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pb-20">
        <div className="grid sm:grid-cols-3 gap-6">

          {/* Commande en ligne */}
          <div className="p-6 rounded-2xl space-y-3"
               style={{ backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ backgroundColor: 'rgba(99,102,241,0.2)' }}>
              <ShoppingCart className="h-6 w-6 text-indigo-400" />
            </div>
            <h3 className="font-bold text-white text-lg">Commande en ligne</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Parcourez notre carte, personnalisez vos plats et payez en quelques clics,
              sur place ou à emporter.
            </p>
          </div>

          {/* Réservation de table */}
          <div id="reservation" className="p-6 rounded-2xl space-y-3"
               style={{ backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ backgroundColor: 'rgba(99,102,241,0.2)' }}>
              <CalendarCheck className="h-6 w-6 text-indigo-400" />
            </div>
            <h3 className="font-bold text-white text-lg">Réservation de table</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Choisissez une date, un créneau et le nombre de convives. Votre table vous
              attend sans attente.
            </p>
          </div>

          {/* Assistant vocal IA — MISE EN AVANT */}
          <div className="relative p-6 rounded-2xl space-y-3"
               style={{ backgroundColor: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.4)' }}>
            {/* Badge NOUVEAU */}
            <span className="absolute top-4 right-4 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
              NOUVEAU
            </span>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ backgroundColor: 'rgba(245,158,11,0.2)' }}>
              <Mic className="h-6 w-6" style={{ color: '#f59e0b' }} />
            </div>
            <h3 className="font-bold text-white text-lg">Assistant vocal IA</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Parlez, l'IA vous guide et répond. Posez vos questions sur notre menu, les
              horaires ou vos réservations en mode vocal.
            </p>
          </div>
        </div>
      </section>

      {/* ── MENU APERÇU ────────────────────────────────────────────────────── */}
      <section id="menu" className="max-w-6xl mx-auto px-4 sm:px-8 pb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Nos incontournables</h2>
          <button
            onClick={goLogin}
            className="flex items-center gap-1 text-sm font-semibold transition-colors hover:text-white"
            style={{ color: '#f59e0b' }}
          >
            Tout le menu <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {products.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">Menu bientôt disponible</p>
        ) : (
          <div className="grid sm:grid-cols-3 gap-6">
            {products.map((p) => (
              <div
                key={p.productId ?? p.id ?? p.productName}
                className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                {/* Image produit */}
                <div className="relative h-44"
                     style={{ background: 'linear-gradient(135deg, #312e81 0%, #4c1d95 100%)' }}>
                  {p.imageUrl && (
                    <img
                      src={p.imageUrl}
                      alt={p.productName}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                </div>
                {/* Infos */}
                <div className="p-4 flex items-center justify-between">
                  <span className="font-semibold text-white">{p.productName}</span>
                  <span className="font-medium" style={{ color: '#f59e0b' }}>{p.unitPrice} €</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── PIED DE PAGE ───────────────────────────────────────────────────── */}
      <footer id="contact" style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(99,102,241,0.15)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row flex-wrap gap-6 items-center justify-center sm:justify-between text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>Lun–Sam 10:00–22:00 · Dim 12:00–21:00</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>Rue du Marché aux Herbes 42, Bruxelles</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>+32 2 123 45 67</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Landing;
