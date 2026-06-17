// Composant AllergyTooltip - Icône info avec tooltip d'allergies
import { useState, useRef, useEffect } from 'react';
import { Info, AlertTriangle } from 'lucide-react';

const AllergyTooltip = ({ alergy, position = 'top' }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  const show = () => {
    setVisible(true);
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.top, left: rect.left });
    }
  };

  const hide = () => setVisible(false);

  // Fermer sur clic extérieur
  useEffect(() => {
    if (!visible) return;
    const handle = (e) => {
      if (!triggerRef.current?.contains(e.target) && !tooltipRef.current?.contains(e.target)) {
        hide();
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [visible]);

  if (!alergy) {
    return (
      <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
        <Info className="h-3.5 w-3.5" />
        <span>Aucune allergie</span>
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors focus:outline-none group"
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={() => setVisible((v) => !v)}
        aria-label="Voir les informations d'allergies"
        aria-expanded={visible}
      >
        <Info className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
        <span>Allergènes</span>
      </button>

      {visible && (
        <div
          ref={tooltipRef}
          className={`
            absolute z-50 min-w-[200px] max-w-[280px] 
            bg-white border border-amber-200 rounded-xl shadow-2xl
            p-3.5 text-left
            ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
            left-0
            animate-in fade-in slide-in-from-bottom-2 duration-150
          `}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {/* Flèche */}
          <div className={`absolute w-3 h-3 bg-white border-amber-200 rotate-45 left-3
            ${position === 'top' ? '-bottom-1.5 border-b border-r' : '-top-1.5 border-t border-l'}`} 
          />

          <div className="flex items-start gap-2.5">
            <div className="flex-shrink-0 mt-0.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-800 mb-1.5 uppercase tracking-wide">
                Allergènes présents
              </p>
              <p className="text-xs text-gray-700 leading-relaxed">{alergy}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllergyTooltip;
