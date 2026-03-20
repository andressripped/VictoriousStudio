import { Loader2 } from 'lucide-react';

interface PrimaryButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'outline' | 'danger';
  className?: string;
  ariaLabel?: string;
}

export default function PrimaryButton({
  children,
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  variant = 'primary',
  className = '',
  ariaLabel
}: PrimaryButtonProps) {
  const base = 'relative inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

  const variants = {
    primary: 'bg-accent-primary hover:bg-accent-primary-hover text-bg-primary shadow-lg hover:shadow-xl hover:shadow-accent-primary/20',
    outline: 'border-2 border-accent-primary text-accent-primary hover:bg-accent-primary hover:text-bg-primary',
    danger: 'bg-accent-error hover:bg-red-600 text-white shadow-lg',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-busy={loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 size={18} className="animate-spin" />}
      <span className={loading ? 'opacity-80' : ''}>{children}</span>
    </button>
  );
}
