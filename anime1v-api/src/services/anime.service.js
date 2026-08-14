const { URL } = require("node:url");
const { ApiError } = require("../utils/api-error");
const animeav1Service = require("./animeav1.service");

const DEFAULT_ANIME_DOMAIN = process.env.DEFAULT_ANIME_DOMAIN || "animeav1.com";

const PROVIDERS = [
  {
    id: "animeav1",
    label: "AnimeAV1",
    domains: [DEFAULT_ANIME_DOMAIN, "animeav1.com", "www.animeav1.com"],
    service: animeav1Service,
  },
];

function normalizeDomain(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  try {
    if (trimmed.includes("://")) {
      return new URL(trimmed).hostname.toLowerCase();
    }
    return new URL(`https://${trimmed}`).hostname.toLowerCase();
  } catch (_error) {
    return trimmed.split("/")[0];
  }
}

function domainMatches(domain, candidate) {
  if (!domain || !candidate) {
    return false;
  }

  if (domain === candidate) {
    return true;
  }

  return domain.endsWith(`.${candidate}`);
}

function findProviderByDomain(domainCandidate) {
  const domain = normalizeDomain(domainCandidate);
  if (!domain) {
    return null;
  }

  return (
    PROVIDERS.find((provider) => provider.domains.some((candidate) => domainMatches(domain, candidate))) || null
  );
}

function findProviderForUrl(urlCandidate) {
  if (!urlCandidate || typeof urlCandidate !== "string") {
    return null;
  }

  try {
    const host = new URL(urlCandidate).hostname;
    return findProviderByDomain(host);
  } catch (_error) {
    return null;
  }
}

async function searchAnime(query) {
  const provider = PROVIDERS[0];
  const result = await provider.service.searchAnime(query, provider.domains[0]);
  if (result && result.data && Array.isArray(result.data.results)) {
    result.data.results.forEach(item => {
      item.provider = provider.label;
      if (item.url) item.slug = item.url;
    });
  }
  return { ...result, source: result?.source || provider.id };
}

async function getAnimeInfo(urlCandidate) {
  const provider = findProviderForUrl(urlCandidate);
  if (!provider) {
    throw new ApiError(400, "Solo se permiten fichas de AnimeAV1");
  }

  const result = await provider.service.getAnimeInfo(urlCandidate);
  if (result && result.data) {
    result.data.slug = urlCandidate;
    result.data.url = urlCandidate;
  }
  return {
    ...result,
    source: result?.source || provider.id,
  };
}

async function getEpisodeLinks(urlCandidate, includeMega, excludeServers) {
  const provider = findProviderForUrl(urlCandidate);
  if (!provider) {
    throw new ApiError(400, "Solo se permiten episodios de AnimeAV1");
  }

  const result = await provider.service.getEpisodeLinks(urlCandidate, includeMega, excludeServers);
  return {
    ...result,
    source: result?.source || provider.id,
  };
}

module.exports = {
  searchAnime,
  getAnimeInfo,
  getEpisodeLinks,
};
