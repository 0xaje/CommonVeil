import { useEffect, useState } from 'react';
import { parseRoleQuery, type RoleType } from './role-workspace-state';
import { RoleWorkspace } from './RoleWorkspace';
import { LegacyDemo } from './LegacyDemo';

export default function App() {
  const [currentRole, setCurrentRole] = useState<RoleType | null>(() => {
    if (typeof window !== 'undefined') {
      return parseRoleQuery(window.location.search);
    }
    return null;
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRole(parseRoleQuery(window.location.search));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToOverview = () => {
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.pushState({}, '', window.location.pathname);
    }
    setCurrentRole(null);
  };

  if (currentRole) {
    return (
      <RoleWorkspace
        key={currentRole}
        role={currentRole}
        onNavigateOverview={navigateToOverview}
      />
    );
  }

  return <LegacyDemo />;
}
