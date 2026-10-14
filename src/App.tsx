import { useEffect, useState } from 'react';
import { PublicSite, type PublicRoute } from './PublicSite';
import { parseRoleQuery, type RoleType } from './role-workspace-state';
import { RoleWorkspace } from './RoleWorkspace';

const parsePublicRoute = (pathname: string): PublicRoute => {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/how-it-works') return 'how-it-works';
  if (normalized === '/evidence') return 'evidence';
  if (normalized === '/docs') return 'docs';
  if (normalized === '/app') return 'app';
  return 'home';
};

export default function App() {
  const readLocation = () => ({
    role: parseRoleQuery(window.location.search),
    route: parsePublicRoute(window.location.pathname),
  });
  const [location, setLocation] = useState<{ role: RoleType | null; route: PublicRoute }>(readLocation);

  useEffect(() => {
    const handlePopState = () => setLocation(readLocation());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (href: string) => {
    window.history.pushState({}, '', href);
    setLocation(readLocation());
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  if (location.role) {
    return <RoleWorkspace key={location.role} role={location.role} onNavigateOverview={() => navigate('/app')} />;
  }

  return <PublicSite route={location.route} onNavigate={navigate} />;
}
