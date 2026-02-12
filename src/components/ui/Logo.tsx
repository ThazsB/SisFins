import { TrendingUp } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  showText?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { icon: 24, text: 'text-lg' },
  md: { icon: 32, text: 'text-xl' },
  lg: { icon: 40, text: 'text-2xl' },
  xl: { icon: 48, text: 'text-3xl' },
  xxl: { icon: 64, text: 'text-5xl' },
};

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const { icon, text } = sizeConfig[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Logo Icon - stylized "F" with leaf element */}
      <div className="relative">
        <div
          className="rounded-lg flex items-center justify-center"
          style={{ width: icon + 12, height: icon + 12 }}
        >
          <TrendingUp className="text-primary" style={{ width: icon, height: icon }} />
        </div>
        {/* Decorative dot representing financial goal */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
      </div>

      {/* Text */}
      {showText && (
        <span className={`font-bold tracking-tight ${text}`}>
          <span className="text-white">Fins</span>
        </span>
      )}
    </div>
  );
}
