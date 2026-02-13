import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512];

// iOS splash screen sizes
const splashSizes = [
  { width: 750, height: 1334, name: 'apple-splash-750-1334' },
  { width: 1125, height: 2436, name: 'apple-splash-1125-2436' },
  { width: 1242, height: 2208, name: 'apple-splash-1242-2208' },
  { width: 1536, height: 2048, name: 'apple-splash-1536-2048' },
  { width: 1668, height: 2388, name: 'apple-splash-1668-2388' },
  { width: 2048, height: 2732, name: 'apple-splash-2048-2732' },
];

const iconsDir = join(__dirname, '..', 'public', 'icons');

// Criar diretório se não existir
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Função para gerar ícones
async function generateIcons() {
  const svgPath = join(iconsDir, 'icon.svg');
  
  console.log('🎨 Gerando ícones do app...\n');
  
  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}.png`);
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✅ Gerado: icon-${size}.png`);
  }
  
  // Gerar apple-touch-icon
  await sharp(svgPath)
    .resize(180, 180)
    .png()
    .toFile(join(iconsDir, 'apple-touch-icon.png'));
  console.log('✅ Gerado: apple-touch-icon.png');
  
  console.log('\n🎨 Gerando splash screens para iOS...\n');
  
  // Gerar splash screens
  for (const splash of splashSizes) {
    const outputPath = join(iconsDir, `${splash.name}.png`);
    
    // Criar splash screen com fundo e ícone centralizado
    const background = sharp({
      create: {
        width: splash.width,
        height: splash.height,
        channels: 4,
        background: { r: 26, g: 26, b: 46, alpha: 1 } // #1a1a2e
      }
    });
    
    const iconSize = Math.min(splash.width, splash.height) * 0.4;
    const icon = await sharp(svgPath)
      .resize(Math.round(iconSize), Math.round(iconSize))
      .toBuffer();
    
    await background
      .composite([{
        input: icon,
        gravity: 'center'
      }])
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Gerado: ${splash.name}.png`);
  }
  
  console.log('\n✨ Todos os ícones foram gerados com sucesso!');
}

generateIcons().catch(console.error);
