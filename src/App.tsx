import { useEffect, useState } from 'react';
import { PublicSite, type PublicRoute } from './PublicSite';
import { connectProviders, type ConnectedWallet } from './providers';
import { mapWalletError, parseRoleQuery, type RoleType } from './role-workspace-state';
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
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

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

  const connectWallet = async () => {
    if (wallet || walletConnecting) return;
    setWalletConnecting(true);
    setWalletError(null);
    try {
      setWallet(await connectProviders(() => {}));
    } catch (reason: unknown) {
      setWalletError(mapWalletError(reason));
    } finally {
      setWalletConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWallet(null);
    setWalletError(null);
  };

  if (location.role) {
    return <RoleWorkspace key={location.role} role={location.role} wallet={wallet} walletConnecting={walletConnecting} walletError={walletError} onConnectWallet={connectWallet} onDisconnectWallet={disconnectWallet} onNavigateOverview={() => navigate('/app')} onNavigateRole={(role) => navigate(`/?role=${role}`)} />;
  }

  return <PublicSite route={location.route} onNavigate={navigate} wallet={wallet} walletConnecting={walletConnecting} walletError={walletError} onConnectWallet={connectWallet} onDisconnectWallet={disconnectWallet} />;
}
