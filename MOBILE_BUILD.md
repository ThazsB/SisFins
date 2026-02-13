# Fins - Guia de Build Mobile

Este guia explica como transformar o Fins em um aplicativo mobile nativo para Android e iOS usando Capacitor.

## 📱 Pré-requisitos

### Para Android

- [Android Studio](https://developer.android.com/studio) instalado
- Java JDK 17 ou superior
- Android SDK configurado
- Variável de ambiente `ANDROID_HOME` configurada

### Para iOS (apenas macOS)

- [Xcode](https://developer.apple.com/xcode/) instalado
- CocoaPods instalado (`sudo gem install cocoapods`)
- Conta de desenvolvedor Apple (para publicação)

## 🚀 Build Rápido

### 1. Gerar Ícones

```bash
npm run icons
```

### 2. Build Web

```bash
npm run build
```

### 3. Adicionar Plataformas

```bash
# Android
npm run cap:add:android

# iOS (apenas macOS)
npm run cap:add:ios
```

### 4. Sincronizar

```bash
# Android
npm run build:android

# iOS
npm run build:ios
```

### 5. Abrir no IDE

```bash
# Android Studio
npm run cap:open:android

# Xcode
npm run cap:open:ios
```

## 📦 Scripts Disponíveis

| Script                     | Descrição                                    |
| -------------------------- | -------------------------------------------- |
| `npm run icons`            | Gera ícones em todos os tamanhos necessários |
| `npm run cap:init`         | Inicializa o Capacitor                       |
| `npm run cap:add:android`  | Adiciona plataforma Android                  |
| `npm run cap:add:ios`      | Adiciona plataforma iOS                      |
| `npm run cap:sync`         | Sincroniza arquivos web com nativo           |
| `npm run cap:open:android` | Abre no Android Studio                       |
| `npm run cap:open:ios`     | Abre no Xcode                                |
| `npm run build:android`    | Build completo para Android                  |
| `npm run build:ios`        | Build completo para iOS                      |
| `npm run run:android`      | Executa em dispositivo/emulador Android      |
| `npm run run:ios`          | Executa em simulador iOS                     |

## 🔧 Configuração

### capacitor.config.ts

O arquivo de configuração está em `capacitor.config.ts`:

```typescript
{
  appId: 'com.fins.app',      // ID do app na loja
  appName: 'Fins',            // Nome do app
  webDir: 'dist',             // Diretório do build web
  // ... outras configurações
}
```

### Permissões Android

As permissões são configuradas automaticamente pelo Capacitor. Para adicionar permissões extras, edite `android/app/src/main/AndroidManifest.xml`.

### Permissões iOS

Configure em `ios/App/App/Info.plist`.

## 🎨 Ícones e Splash Screen

Os ícones são gerados automaticamente a partir de `public/icons/icon.svg`.

### Tamanhos Gerados:

- **Ícones**: 16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512px
- **Splash Screens iOS**: 750x1334, 1125x2436, 1242x2208, 1536x2048, 1668x2388, 2048x2732

Para regenerar os ícones:

```bash
npm run icons
```

## 📲 Testando

### Android

1. Conecte um dispositivo Android com depuração USB ativada
2. Execute: `npm run run:android`
3. Ou abra no Android Studio: `npm run cap:open:android`

### iOS

1. Conecte um iPhone ou inicie um simulador
2. Execute: `npm run run:ios`
3. Ou abra no Xcode: `npm run cap:open:ios`

## 🚀 Publicação

### Google Play Store

1. Gere um APK assinado no Android Studio
2. Crie uma conta no [Google Play Console](https://play.google.com/console)
3. Siga o processo de upload e revisão

### Apple App Store

1. Configure certificados e perfis no Xcode
2. Archive o app no Xcode
3. Upload para o [App Store Connect](https://appstoreconnect.apple.com)
4. Submeta para revisão

## 🔍 Debugging

### Android

```bash
# Ver logs
npx cap run android --livereload --external

# Chrome DevTools
chrome://inspect/#devices
```

### iOS

```bash
# Safari Web Inspector
Safari > Desenvolver > [Seu Dispositivo]
```

## 📝 Notas Importantes

1. **Sempre execute `npm run build` antes de sincronizar**
2. **Não edite arquivos em `android/` ou `ios/` diretamente sem necessidade**
3. **Use os hooks do Capacitor para funcionalidades nativas**
4. **Teste em dispositivos reais antes de publicar**

## 🆘 Problemas Comuns

### Build falha no Android

- Verifique se o Android Studio está atualizado
- Limpe o projeto: `cd android && ./gradlew clean`
- Verifique variáveis de ambiente

### Build falha no iOS

- Execute `pod install` em `ios/App`
- Verifique certificados no Xcode
- Limpe o build no Xcode: Product > Clean Build Folder

### Ícones não aparecem

- Execute `npm run icons`
- Sincronize: `npx cap sync`
- Limpe o cache do app no dispositivo
