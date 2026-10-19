// 電波がない場所でも起動できるように、画面ファイルを端末に保存する。
// 画面を更新したら CACHE の番号を上げる。
const CACHE = "futari-v1";
const CORE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png"
];
const LIBRARY =
  "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  // 読み取りライブラリは版が固定なので、一度取得したら端末の保存分を使う。
  if (request.url === LIBRARY) {
    event.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
        return res;
      }))
    );
    return;
  }

  if (new URL(request.url).origin !== location.origin) return;

  // 画面ファイルは最新版を優先し、通信できないときだけ保存分を使う。
  event.respondWith(
    fetch(request).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
      }
      return res;
    }).catch(() =>
      caches.match(request, {ignoreSearch: true}).then(hit =>
        hit || (request.mode === "navigate"
          ? caches.match("index.html")
          : Response.error())
      )
    )
  );
});
