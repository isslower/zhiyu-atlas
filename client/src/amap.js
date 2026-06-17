let loadingPromise = null;
let runtimeConfigPromise = null;

async function loadRuntimeConfig() {
  if (runtimeConfigPromise) return runtimeConfigPromise;

  runtimeConfigPromise = fetch('/config.json', { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : {}))
    .catch(() => ({}));

  return runtimeConfigPromise;
}

export function loadAmap() {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (loadingPromise) return loadingPromise;

  loadingPromise = loadRuntimeConfig().then((config) => new Promise((resolve, reject) => {
    const amapKey = config.amapKey || import.meta.env.VITE_AMAP_KEY || '';
    const securityJsCode = config.amapSecurityCode || import.meta.env.VITE_AMAP_SECURITY_CODE || '';

    if (!amapKey || !securityJsCode) {
      reject(new Error('未配置高德地图 Key，请参考 config.example.json'));
      return;
    }

    window._AMapSecurityConfig = {
      securityJsCode
    };

    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}&plugin=AMap.DistrictSearch,AMap.Geocoder`;
    script.async = true;
    script.onload = () => resolve(window.AMap);
    script.onerror = () => reject(new Error('高德地图 JS API 加载失败'));
    document.head.appendChild(script);
  }));

  return loadingPromise;
}
