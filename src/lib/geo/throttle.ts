// Shared throttle to obey Nominatim's strict 1 request per second usage policy
let lastNominatimRequestTime = 0;
let requestQueue = Promise.resolve();

export async function throttleNominatim(): Promise<void> {
  const currentQueue = requestQueue;
  let release: () => void;
  requestQueue = new Promise((resolve) => {
    release = resolve;
  });

  await currentQueue;

  const now = Date.now();
  const timeSinceLast = now - lastNominatimRequestTime;
  const waitMs = Math.max(0, 1100 - timeSinceLast);

  if (waitMs > 0) {
    await new Promise((res) => setTimeout(res, waitMs));
  }

  lastNominatimRequestTime = Date.now();
  release!();
}
