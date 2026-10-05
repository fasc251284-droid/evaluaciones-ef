/* Cache del cascarón: la app abre sin conexión y los datos quedan en localStorage */
const CACHE = "evalef-v224";
const BASICOS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

/* La librería de Supabase se descarga de esm.sh. Iba siempre a la red, así que
   en cada arranque había que esperarla: con 4G eso son varios segundos con la
   app detenida en "verificando sesión". Se guarda en una caché aparte, que no
   se borra al publicar una versión nueva, porque la librería no cambia con la
   app y volver a bajarla no aporta nada. */
const CACHE_LIB = "evalef-lib-v1";
const EXTERNOS = ["esm.sh"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) =>
    Promise.all(ks.filter((k) => k !== CACHE && k !== CACHE_LIB).map((k) => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  /* Librerías externas: primero la caché. Si ya está, se entrega al instante y
     la app arranca sin esperar a la red. Si no está, se baja y se guarda. */
  if (EXTERNOS.some((d) => url.hostname.endsWith(d))) {
    e.respondWith(
      caches.match(req).then((guardada) => guardada || fetch(req).then((r) => {
        if (r && (r.ok || r.type === "opaque")) {
          const copia = r.clone();
          caches.open(CACHE_LIB).then((c) => c.put(req, copia));
        }
        return r;
      }))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;   // el resto, siempre a la red
  e.respondWith(
    fetch(req)
      .then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); return r; })
      .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
  );
});
