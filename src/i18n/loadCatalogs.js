/** Fetch every configured catalog: { he: {meta, strings}, en: {...} }. */
export async function loadCatalogs(baseUrl, locales) {
  const entries = await Promise.all(locales.map(async code => {
    const res = await fetch(`${baseUrl}/${code}.json`, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load locale ${code}`);
    return [code, await res.json()];
  }));
  return Object.fromEntries(entries);
}
