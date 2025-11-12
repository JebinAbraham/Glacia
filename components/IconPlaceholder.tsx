import Logo from '../Logo.png';
import { cn } from './ui/utils';

interface IconPlaceholderProps {
  /**
   * Used as the accessible label/alt text for the image.
   */
  label?: string;
  className?: string;
}

/**
 * Renders the shared Logo asset anywhere we previously showed an icon.
 * The wrapper enforces max dimensions so the image never stretches layouts.
 */
export function IconPlaceholder({ label = 'Glacia icon', className }: IconPlaceholderProps) {
  return (
    <span
      className={cn(
        'inline-flex size-6 items-center justify-center overflow-hidden rounded-md border border-dashed border-blue-200 bg-white/80 p-0.5',
        className,
      )}
      aria-label={label}
    >
      <img
        src={Logo}
        alt={label}
        className="max-h-full max-w-full object-contain"
        loading="lazy"
        draggable={false}
      />
    </span>
  );
}
