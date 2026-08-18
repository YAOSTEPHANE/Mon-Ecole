import { useState, useCallback, useEffect, Children, isValidElement } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface CarouselProps {
  children: React.ReactNode;
  /** Nombre de slides visibles (responsive via classe ou 1 par défaut) */
  slidesToShow?: number;
  /** Auto-rotation en ms, 0 = désactivé */
  autoPlay?: number;
  /** Id pour aria */
  ariaLabel?: string;
  className?: string;
}

export default function Carousel({
  children,
  slidesToShow = 1,
  autoPlay = 0,
  ariaLabel = 'Carrousel',
  className = '',
}: CarouselProps) {
  const items = Children.toArray(children).filter((child) => isValidElement(child));
  const count = items.length;
  const [index, setIndex] = useState(0);

  const goTo = useCallback(
    (next: number) => {
      setIndex((i) => {
        if (count <= 0) return 0;
        const n = next % count;
        return n < 0 ? n + count : n;
      });
    },
    [count]
  );

  const goPrev = () => goTo(index - 1);
  const goNext = () => goTo(index + 1);

  useEffect(() => {
    if (autoPlay <= 0 || count <= 0) return;
    const t = setInterval(() => goTo(index + 1), autoPlay);
    return () => clearInterval(t);
  }, [autoPlay, index, goTo, count]);

  if (count === 0) return null;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      role="region"
      aria-label={ariaLabel}
            aria-roledescription="carrousel"
    >
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{
          transform: `translate3d(-${index * (100 / count)}%, 0, 0)`,
          width: `${(count * 100) / slidesToShow}%`,
        }}
      >
        {items.map((child, i) => (
          <div
            key={i}
            className="flex-shrink-0 px-2"
            style={{ width: `${100 / count}%` }}
            role="group"
            aria-roledescription="slide"
            aria-label={`Diapositive ${i + 1} sur ${count}`}
          >
            {child}
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-md transition-colors hover:bg-gray-50 hover:text-indigo-600"
            aria-label="Diapositive précédente"
          >
            <FiChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-md transition-colors hover:bg-gray-50 hover:text-indigo-600"
            aria-label="Diapositive suivante"
          >
            <FiChevronRight className="h-5 w-5" />
          </button>

          <div className="mt-4 flex justify-center gap-2" aria-label="Position des diapositives">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Aller à la diapositive ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'w-6 bg-indigo-600' : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
