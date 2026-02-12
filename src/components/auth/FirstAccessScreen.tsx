import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { AVAILABLE_AVATARS, AVAILABLE_COLORS } from '@/types';
import { getSettingsKey } from '@/config/storage';
import {
  ArrowLeft,
  UserPlus,
  Check,
  Camera,
  Upload,
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Lock,
  Sparkles,
  Eye,
  EyeOff,
  AlertCircle,
  Smile,
} from 'lucide-react';

interface FirstAccessScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

interface CroppedImage {
  dataUrl: string;
  width: number;
  height: number;
}

interface FormErrors {
  name?: string;
  password?: string;
  confirmPassword?: string;
}

function ImageCropModal({
  imageSrc,
  onConfirm,
  onCancel,
}: {
  imageSrc: string;
  onConfirm: (cropped: CroppedImage) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    imageRef.current = e.currentTarget;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    const size = 200;

    canvas.width = size;
    canvas.height = size;

    if (ctx) {
      ctx.clearRect(0, 0, size, size);
      ctx.save();

      // Calcular crop quadrado no centro da imagem (sem transformações)
      const imgAspect = img.width / img.height;
      let srcX = 0;
      let srcY = 0;
      let srcWidth = img.width;
      let srcHeight = img.height;

      // Fazer crop quadrado no centro
      if (imgAspect > 1) {
        // Imagem mais larga - crop horizontal
        srcWidth = img.height;
        srcX = (img.width - srcWidth) / 2;
      } else {
        // Imagem mais alta - crop vertical
        srcHeight = img.width;
        srcY = (img.height - srcHeight) / 2;
      }

      // Aplicar clip circular
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Desenhar o crop quadrado no canvas
      ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, size, size);
      ctx.restore();
    }

    onConfirm({
      dataUrl: canvas.toDataURL('image/png'),
      width: size,
      height: size,
    });
  };

  const resetAdjustments = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-base text-foreground">Ajustar Foto</h3>
          <button
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          ref={containerRef as React.RefObject<HTMLDivElement>}
          className="relative bg-background aspect-square flex items-center justify-center overflow-hidden cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            ref={imageRef as React.RefObject<HTMLImageElement>}
            src={imageSrc}
            alt="Preview"
            className="max-w-full max-h-full object-contain select-none"
            onLoad={handleImageLoad}
            draggable={false}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center',
              marginLeft: position.x,
              marginTop: position.y,
            }}
          />
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[180px] h-[180px] rounded-full border-2 border-white/30" />
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-3">
            <RotateCw className="w-4 h-4 text-muted-foreground" />
            <input
              type="range"
              min="-180"
              max="180"
              step="5"
              value={rotation}
              onChange={(e) => setRotation(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetAdjustments}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Redefinir
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Confirmar
            </button>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </motion.div>
  );
}

function EmojiPickerModal({
  onSelect,
  onCancel,
}: {
  onSelect: (emoji: string) => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-base text-foreground">Escolha um emoji</h3>
          <button
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-6 gap-2">
            {AVAILABLE_AVATARS.map((avatar) => (
              <button
                key={avatar}
                type="button"
                onClick={() => onSelect(avatar)}
                className="aspect-square rounded-lg flex items-center justify-center text-2xl transition-all bg-secondary hover:bg-primary hover:text-primary-foreground"
              >
                {avatar}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const getStrength = () => {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    // Tamanho mínimo reduzido para 6 caracteres
    if (password.length >= 6) score++;
    // Letra maiúscula
    if (/[A-Z]/.test(password)) score++;
    // Número
    if (/[0-9]/.test(password)) score++;
    // Caractere especial
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
      { score: 0, label: '', color: '' },
      { score: 1, label: 'Fraca', color: 'bg-red-500' },
      { score: 2, label: 'Regular', color: 'bg-yellow-500' },
      { score: 3, label: 'Boa', color: 'bg-blue-500' },
      { score: 4, label: 'Forte', color: 'bg-primary' },
    ];

    return levels[score];
  };

  const strength = getStrength();

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= strength.score ? strength.color : 'bg-secondary'
            }`}
          />
        ))}
      </div>
      {password && (
        <p
          className={`text-xs font-medium ${
            strength.score >= 3
              ? 'text-primary'
              : strength.score >= 2
                ? 'text-yellow-400'
                : 'text-red-400'
          }`}
        >
          {strength.label}
        </p>
      )}
    </div>
  );
}

export function FirstAccessScreen({ onBack, onSuccess }: FirstAccessScreenProps) {
  const { createProfile, loading } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
    avatar: '',
    color: AVAILABLE_COLORS[0].value,
    customPhoto: null as string | null,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const profile = await createProfile(
      formData.name.trim(),
      formData.password,
      formData.customPhoto || formData.avatar,
      formData.color
    );

    if (profile) {
      const additionalData = {};
      localStorage.setItem(getSettingsKey(profile.id), JSON.stringify(additionalData));
      onSuccess();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Redimensionar para o tamanho do avatar (200x200)
          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 200;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Calcular crop quadrado no centro
            const imgAspect = img.width / img.height;
            let srcX = 0,
              srcY = 0,
              srcWidth = img.width,
              srcHeight = img.height;

            if (imgAspect > 1) {
              srcWidth = img.height;
              srcX = (img.width - srcWidth) / 2;
            } else {
              srcHeight = img.width;
              srcY = (img.height - srcHeight) / 2;
            }

            // Aplicar clip circular
            ctx.beginPath();
            ctx.arc(100, 100, 100, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            // Desenhar imagem redimensionada
            ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, 200, 200);

            setFormData({ ...formData, customPhoto: canvas.toDataURL('image/png'), avatar: '' });
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCameraCapture = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert('Câmera não disponível neste dispositivo');
        return;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      setStream(mediaStream);
      setShowCamera(true);
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      alert('Não foi possível acessar a câmera');
    }
  };

  const handleCameraSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;

    // Redimensionar para o tamanho do avatar (200x200)
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Inverter horizontalmente para selfie
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);

      // Calcular crop quadrado no centro
      const videoAspect = video.videoWidth / video.videoHeight;
      let srcX = 0,
        srcY = 0,
        srcWidth = video.videoWidth,
        srcHeight = video.videoHeight;

      if (videoAspect > 1) {
        srcWidth = video.videoHeight;
        srcX = (video.videoWidth - srcWidth) / 2;
      } else {
        srcHeight = video.videoWidth;
        srcY = (video.videoHeight - srcHeight) / 2;
      }

      // Aplicar clip circular
      ctx.beginPath();
      ctx.arc(100, 100, 100, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Desenhar vídeo redimensionado
      ctx.drawImage(video, srcX, srcY, srcWidth, srcHeight, 0, 0, 200, 200);

      setFormData({ ...formData, customPhoto: canvas.toDataURL('image/png'), avatar: '' });
      handleCameraClose();
    }
  };

  const handleCameraClose = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const handleRemovePhoto = () => {
    setFormData({ ...formData, customPhoto: null, avatar: '' });
  };

  const startCamera = () => {
    const mediaDevices = navigator.mediaDevices;
    if (mediaDevices) {
      handleCameraCapture();
    } else {
      alert('Câmera não disponível');
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col lg:flex-row overflow-hidden">
      {/* Lado esquerdo - oculto em mobile, visível em lg */}
      <div className="hidden lg:flex lg:w-1/2 bg-background flex-col items-center justify-center p-6 xl:p-12 relative overflow-hidden">
        {/* Gradiente mais claro com blur */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-slate/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-slate/10 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative z-10 space-y-4 xl:space-y-6 text-center"
        >
          <div className="space-y-2">
            <h2 className="text-2xl xl:text-4xl font-bold text-foreground leading-tight">
              Comece sua jornada
              <br />
              <span className="text-primary">financeira inteligente</span>
            </h2>
            <p className="text-muted-foreground text-sm xl:text-lg max-w-md mx-auto">
              Controle suas finanças, alcance seus objetivos e construa um futuro financeiro sólido.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 xl:gap-3 justify-center">
            {['Controle Total', 'Metas Claras', 'Análise Smart', 'Segurança'].map((feature) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex items-center gap-2 px-3 py-1.5 xl:px-4 xl:py-2 bg-secondary/50 backdrop-blur-sm rounded-full border border-border/50"
              >
                <Check className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-primary" />
                <span className="text-xs xl:text-sm text-foreground">{feature}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
          className="relative z-10 text-xs xl:text-sm text-muted-foreground mt-6"
        >
          Sua educação financeira em primeiro lugar.
        </motion.div>
      </div>

      {/* Lado direito - formulário */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center h-full bg-background p-6 xl:p-12 relative overflow-hidden">
        {/* Gradiente mais claro com blur - visível apenas em desktop */}
        <div className="hidden lg:block absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-slate/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-slate/10 rounded-full blur-3xl" />
        </div>
        {/* Overlay suave - visível apenas em desktop */}
        <div className="hidden lg:block absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-background/30" />
        <div className="hidden lg:block absolute inset-0 bg-gradient-to-l from-secondary/20 via-transparent to-background/10" />

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-5 lg:p-6 w-full max-w-lg overflow-hidden">
          <div className="w-full flex flex-col items-center">
            <div className="mb-4 text-center">
              <h1 className="text-2xl font-bold text-foreground mb-1">Crie sua conta</h1>
              <p className="text-muted-foreground text-base">
                Preencha os dados abaixo para começar
              </p>
            </div>

            <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-5 space-y-4 overflow-hidden w-full">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="relative flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {formData.customPhoto ? (
                      <img
                        src={formData.customPhoto}
                        alt="Foto de perfil"
                        className="w-full h-full object-cover object-center"
                      />
                    ) : formData.avatar ? (
                      <span className="text-3xl">{formData.avatar}</span>
                    ) : (
                      <UserPlus className="w-8 h-8 text-primary/50" />
                    )}
                  </div>

                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1 transform">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors shadow-lg"
                      title="Upload"
                    >
                      <Upload className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={startCamera}
                      className="p-1.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors shadow-lg"
                      title="Câmera"
                    >
                      <Camera className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowEmojiPicker(true)}
                      className="p-1.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors shadow-lg"
                      title="Emoji"
                    >
                      <Smile className="w-4 h-4" />
                    </motion.button>
                    {(formData.customPhoto || formData.avatar) && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleRemovePhoto}
                        className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                        title="Remover"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 text-center">
                  <h3 className="text-foreground font-medium text-base mb-1">Foto de perfil</h3>
                </div>
              </div>

              <AnimatePresence>
                {!formData.customPhoto && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Ou escolha um avatar
                    </label>
                    <div className="grid grid-cols-8 gap-2">
                      {AVAILABLE_AVATARS.slice(0, 16).map((avatar) => (
                        <button
                          key={avatar}
                          type="button"
                          onClick={() => setFormData({ ...formData, avatar })}
                          className={`aspect-square rounded-lg flex items-center justify-center text-xl transition-all ${
                            formData.avatar === avatar
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary hover:bg-secondary/80'
                          }`}
                        >
                          {avatar}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    Nome completo
                  </label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full pl-10 pr-4 py-2.5 bg-secondary/50 rounded-lg outline-none transition-all text-base text-foreground placeholder:text-muted-foreground ${errors.name ? 'border border-red-500' : 'focus:border-primary/50'}`}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full pl-10 pr-10 py-2.5 bg-secondary/50 rounded-lg outline-none transition-all text-base text-foreground placeholder:text-muted-foreground ${errors.password ? 'border border-red-500' : 'focus:border-primary/50'}`}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <PasswordStrength password={formData.password} />
                  {errors.password && (
                    <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    Confirmar senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                      className={`w-full pl-10 pr-4 py-2.5 bg-neutral-800/50 rounded-lg outline-none transition-all text-base text-white placeholder:text-neutral-500 ${errors.confirmPassword ? 'border border-red-500' : 'focus:border-primary/50'}`}
                      placeholder="Digite a senha novamente"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onBack}
                    className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
                  >
                    <ArrowLeft className="w-4 h-4 inline mr-2" />
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Criar Conta
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Ao criar sua conta, você concorda com nossos termos de uso
            </p>
          </div>
        </div>

        <AnimatePresence>
          {showCamera && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4"
            >
              <video ref={videoRef} autoPlay playsInline className="rounded-lg max-w-sm" />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCameraClose}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCameraSnapshot}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  Capturar
                </button>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </motion.div>
          )}
          {showEmojiPicker && (
            <EmojiPickerModal
              onSelect={(emoji) => {
                setFormData({ ...formData, avatar: emoji, customPhoto: null });
                setShowEmojiPicker(false);
              }}
              onCancel={() => setShowEmojiPicker(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
