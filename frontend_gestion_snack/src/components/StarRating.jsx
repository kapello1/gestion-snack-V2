// Composant StarRating — Étoiles interactives ou lecture seule
import { useState } from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ value = 0, max = 5, readOnly = false, size = 'md', onChange }) => {
  const [hovered, setHovered] = useState(null);

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
    xl: 'h-6 w-6',
  };

  const iconSize = sizeClasses[size] || sizeClasses.md;
  const display = hovered !== null ? hovered : value;

  return (
    <div className="flex items-center gap-0.5" role={readOnly ? 'img' : 'group'} aria-label={`${value} étoiles sur ${max}`}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < display;
        const half = !filled && i < display + 0.5;

        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            className={`transition-transform duration-100 ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
            onClick={() => !readOnly && onChange?.(i + 1)}
            onMouseEnter={() => !readOnly && setHovered(i + 1)}
            onMouseLeave={() => !readOnly && setHovered(null)}
            aria-label={`${i + 1} étoile${i > 0 ? 's' : ''}`}
          >
            <Star
              className={`${iconSize} transition-colors duration-150 ${
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-gray-300'
              }`}
            />
          </button>
        );
      })}
      {!readOnly && (
        <span className="ml-1.5 text-xs text-gray-500 font-medium">
          {(hovered ?? value) > 0 ? `${hovered ?? value}/${max}` : ''}
        </span>
      )}
    </div>
  );
};

export default StarRating;
