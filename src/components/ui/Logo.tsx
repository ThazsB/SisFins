import { TrendingUp } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { icon: 24, text: 'text-lg' },
  md: { icon: 32, text: 'text-xl' },
  lg: { icon: 40, text: 'text-2xl' },
  xl: { icon: 48, text: 'text-3xl' },
};

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const { icon, text } = sizeConfig[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Logo Icon - stylized "F" with leaf element */}
      <div className="relative">
        <div 
          className="rounded-lg flex items-center justify-center"
          style={{ width: icon + 8, height: icon + 8 }}
        >
          <TrendingUp 
            className="text-primary" 
            style={{ width: icon, height: icon }} 
          />
        </div>
        {/* Decorative dot representing financial goal */}
        <div 
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full"
        />
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
