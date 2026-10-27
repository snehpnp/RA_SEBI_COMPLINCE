import React, { Suspense } from 'react';
import { useNavigate, useLocation, useParams as useRRParams, useSearchParams as useRRSearchParams, Link as RRLink } from 'react-router-dom';

export function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useRRParams();
  
  return {
    push: (url) => navigate(url),
    replace: (url) => navigate(url, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => window.location.reload(),
    pathname: location.pathname,
    query: Object.fromEntries(new URLSearchParams(location.search)),
    params,
  };
}

export function usePathname() {
  const location = useLocation();
  return location.pathname;
}

export function useSearchParams() {
  const [searchParams] = useRRSearchParams();
  return searchParams;
}

export function useParams() {
  return useRRParams();
}

export function dynamic(importFunc, options = {}) {
  const LazyComponent = React.lazy(importFunc);
  return function DynamicWrapper(props) {
    return (
      <Suspense fallback={options?.loading ? <options.loading /> : null}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

export const Link = ({ href, to, children, ...props }) => {
  return <RRLink to={to || href || '#'} {...props}>{children}</RRLink>;
};

export const Image = ({ src, alt = '', className = '', ...props }) => {
  return <img src={src} alt={alt} className={className} {...props} />;
};

export default {
  useRouter,
  usePathname,
  useSearchParams,
  useParams,
  dynamic,
  Link,
  Image,
};
