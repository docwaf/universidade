/**
 * Service Worker - Tutorial
 * Suporte completo a Progressive Web App (PWA), atualizações automáticas e funcionamento offline
 */

const CACHE_NAME = 'tutorial-app-v125';
const STATIC_ASSETS = [
  './',
  './index.html',
  './ead-treinamento.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './unifort_hotsales_banner.png',
  './favicon.ico',
  './favicon.png',
  './assets/modo_aviao_status.png',
  './assets/sinal_fraco_status.png',
  './assets/transportador_nao_encontrado.png',
  './assets/nenhuma_empresa_filial.png',
  './assets/icons/icon-32x32.png',
  './assets/icons/icon-64x64.png',
  './assets/icons/icon-96x96.png',
  './assets/icons/icon-144x144.png',
  './assets/icons/icon-180x180.png',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png',
  './assets/icons/icon-maskable-192x192.png',
  './assets/icons/icon-maskable-512x512.png',
  './assets/icons/apple-touch-icon.png'
];

// Listener para forçar ativação imediata sob demanda (skipWaiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Instalação do Service Worker e pré-armazenamento em cache dos arquivos estáticos
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Adiciona cada recurso com tolerância a falhas para garantir instalação sempre bem-sucedida
      await Promise.allSettled(
        STATIC_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn('[SW] Aviso ao pré-carregar recurso:', asset, err);
          })
        )
      );
    })
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia de requisição:
// - Para documentos e scripts: Network-First com fallback de Cache (garante versão atualizada, mas funciona offline)
// - Para imagens/ícones: Cache-First com fallback de Network
self.addEventListener('fetch', (event) => {
  // Ignora requisições de esquemas não suportados (ex: chrome-extension)
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // Não intercepta chamadas diretas externas do sistema HotSales
  if (url.hostname.includes('hotsales.com.br')) {
    return;
  }

  // Se for imagem ou fonte estática: Cache-First
  if (
    event.request.destination === 'image' ||
    event.request.destination === 'font' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Para páginas, css e js: Network-First com fallback offline para o Cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
