import { useEffect } from 'react';
import { useLocation } from 'wouter';

import routeMetadata from '@/seo-routes.json';

type MetadataName = 'description' | 'robots' | 'twitter:title' | 'twitter:description';
type MetadataProperty = 'og:title' | 'og:description' | 'og:url';

function normalizePath(path: string) {
  if (path === '/') return path;
  return path.replace(/\/+$/, '');
}

function setNamedMeta(name: MetadataName, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}

function setPropertyMeta(property: MetadataProperty, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('property', property);
    document.head.appendChild(element);
  }
  element.content = content;
}

function setCanonical(href?: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!href) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = href;
}

export default function RouteMetadata() {
  const [location] = useLocation();

  useEffect(() => {
    const metadata = routeMetadata.find((route) => route.path === normalizePath(location));

    if (!metadata) {
      document.title = 'Page Not Found | Stonegate Intelligence Group';
      setNamedMeta('description', 'The requested page could not be found.');
      setNamedMeta('robots', 'noindex, follow');
      setNamedMeta('twitter:title', 'Page Not Found | Stonegate Intelligence Group');
      setNamedMeta('twitter:description', 'The requested page could not be found.');
      setPropertyMeta('og:title', 'Page Not Found | Stonegate Intelligence Group');
      setPropertyMeta('og:description', 'The requested page could not be found.');
      setPropertyMeta('og:url', window.location.href);
      setCanonical();
      return;
    }

    document.title = metadata.title;
    setNamedMeta('description', metadata.description);
    setNamedMeta('robots', metadata.robots);
    setNamedMeta('twitter:title', metadata.title);
    setNamedMeta('twitter:description', metadata.description);
    setPropertyMeta('og:title', metadata.title);
    setPropertyMeta('og:description', metadata.description);
    setPropertyMeta('og:url', metadata.canonical);
    setCanonical(metadata.canonical);
  }, [location]);

  return null;
}
