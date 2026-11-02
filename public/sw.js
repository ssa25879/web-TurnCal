// 오프라인 실행용 서비스 워커. 화면(HTML)은 네트워크 우선, 해시가 붙은 정적 파일은 캐시 우선이다.
const CACHE = "turncal-v1";
const SHELL = new URL("./", self.location.href).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const response = await fetch(SHELL, { cache: "no-cache" });
      const html = await response.clone().text();
      // 빌드 파일 이름을 알 수 없으므로 화면이 참조하는 파일을 읽어 미리 받아 둔다.
      const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|svg|png|webmanifest))"/g)].map(
        (match) => new URL(match[1], SHELL).href,
      );
      await cache.put(SHELL, response);
      await cache.addAll(assets);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const response = await fetch(request);
          if (response.ok && request.url.split(/[?#]/)[0] === SHELL) await cache.put(SHELL, response.clone());
          return response;
        } catch {
          return (await cache.match(request)) ?? (await cache.match(SHELL)) ?? Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })(),
  );
});
