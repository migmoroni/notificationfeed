# Plataformas — Requisitos

## Visão geral

O Notfeed roda a mesma base de código SvelteKit (SPA) em todas as plataformas. Diferenças de comportamento são isoladas na camada `$lib/platform/`.

## Web / PWA

**Artefato**: Estáticos (HTML/CSS/JS) + Service Worker  
**Deploy**: Qualquer CDN ou host estático  

### Funcionalidades
- [ ] Service Worker com cache stale-while-revalidate
- [ ] Web App Manifest para instalação (A2HS)
- [ ] Interceptação do prompt de instalação
- [ ] Web Push notifications (permissão + exibição)
- [ ] Funciona offline com dados já ingeridos

## Android (TWA)

**Artefato**: APK / AAB  
**Build**: Bubblewrap (wrapping da PWA hospedada)  

### Funcionalidades
- [ ] Carrega a PWA em Custom Tab (sem barra de endereço)
- [ ] Status bar com theme-color configurável
- [ ] Deep links (ex: `notfeed://profile/123`)
- [ ] Digital Asset Links para validação de domínio

### Pré-requisitos
- PWA publicada em domínio HTTPS com manifest válido
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

**Artefato**: `.AppImage`  
**Build**: `tauri build --bundles appimage`  

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
| Android (TWA) | `display-mode: standalone` + user agent Android |
| Web | Fallback padrão |

Feature flags expostas: `hasTray`, `hasPush`, `hasFileSystem`, `hasAutoUpdate`, `hasServiceWorker`, `hasInstallPrompt`.
