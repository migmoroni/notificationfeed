# Plataformas — Requisitos

## Visão geral

O Notfeed roda a mesma base de código SvelteKit (SPA) em todas as plataformas. Diferenças de comportamento são isoladas na camada `$lib/platform/`.

## Web / PWA

**Artefato**: Estáticos (HTML/CSS/JS) + Service Worker  
**Deploy**: Qualquer CDN ou host estático  

### Funcionalidades
- [x] Service Worker com precache do app shell e fallback de navegação SPA
- [x] Runtime cache cache-first para imagens vistas, com expiração por 30 dias sem uso
- [x] Background Sync / Periodic Background Sync acionando a ingestão quando suportado
- [ ] Web App Manifest para instalação (A2HS)
- [ ] Interceptação do prompt de instalação
- [ ] Web Push notifications (permissão + exibição)
- [ ] Funciona offline com dados já ingeridos

## Android (TWA + Tauri)

**Artefatos**: APK / AAB  
**Build (TWA)**: Bubblewrap (wrapping da PWA hospedada)  
**Build (Tauri)**: `tauri android build`  

### Funcionalidades
- [ ] TWA: Carrega a PWA em Custom Tab (sem barra de endereço)
- [ ] Tauri: Build nativo Android via Tauri mobile
- [ ] Status bar com theme-color configurável
- [ ] Deep links (ex: `notfeed://profile/123`)
- [ ] Digital Asset Links para validação de domínio
- [ ] Publicação na Google Play (TWA ou Tauri)

### Pré-requisitos
- PWA publicada em domínio HTTPS com manifest válido (para TWA)
- Android SDK + NDK (para Tauri mobile)
- Conta Google Play para publicação

## Windows Desktop (Tauri)

**Artefato**: `.msi` (instalador MSI)  
**Build**: `tauri build --bundles msi`  

### Funcionalidades
- [ ] Ícone de system tray com menu de contexto
- [ ] Minimizar para tray ao fechar janela
- [ ] Auto-update via Tauri updater plugin
- [ ] Persistência via SQLite (futuro — IndexedDB no MVP)

## Linux Desktop (Tauri)

**Artefatos**: `.AppImage`, `.deb`, Flatpak  
**Build**: `tauri build --bundles appimage,deb` + Flatpak manifest  

### Funcionalidades
- [ ] Ícone de system tray com menu de contexto
- [ ] Minimizar para tray ao fechar janela
- [ ] Auto-update via Tauri updater plugin
- [ ] Persistência via SQLite (futuro — IndexedDB no MVP)

## Detecção de plataforma

O módulo `capabilities.ts` detecta em runtime qual plataforma está ativa:

| Plataforma | Detecção |
|---|---|
| Tauri (desktop) | `'__TAURI_INTERNALS__' in window` |
| Tauri (mobile) | `'__TAURI_INTERNALS__' in window` + user agent Android |
| Android (TWA) | `display-mode: standalone` + user agent Android |
| Web | Fallback padrão |

Feature flags expostas: `hasTray`, `hasPush`, `hasFileSystem`, `hasAutoUpdate`, `hasServiceWorker`, `hasInstallPrompt`.
