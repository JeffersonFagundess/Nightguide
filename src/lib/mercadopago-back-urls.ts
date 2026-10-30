const defaultSiteOrigin = "https://nightguide-modern.vercel.app";

export function getCheckoutSiteOrigin(configuredSiteUrl?: string): string {
  try {
    const url = new URL(configuredSiteUrl?.trim() || defaultSiteOrigin);
    if (url.protocol === "https:" && url.hostname.includes(".") && !url.username && !url.password) {
      return url.origin;
    }
  } catch {
    // A origem publica padrao continua valida quando a variavel esta malformada.
  }
  return defaultSiteOrigin;
}

export function getCheckoutBackUrls(siteOrigin: string, eventId: string) {
  const eventPath = encodeURIComponent(eventId);
  const base = `${siteOrigin}/pagamento/retorno`;
  return {
    success: `${base}/aprovado/${eventPath}`,
    failure: `${base}/recusado/${eventPath}`,
    pending: `${base}/pendente/${eventPath}`,
  };
}
