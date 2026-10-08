import { useState } from 'react';
import type { ConnectedWallet } from './providers';
import { connectProviders } from './providers';
import {
  queryCommonVeilContract,
  attachCommonVeilContract,
  type CommonVeilPublicState,
} from './contract-session';
import {
  ROLE_DESCRIPTORS,
  type RoleType,
  type WorkspaceContractState,
  INITIAL_WORKSPACE_CONTRACT_STATE,
  handleAddressInputChange,
  mapWorkspaceError,
  shortenAddress,
  formatDust,
} from './role-workspace-state';
import './role-workspace.css';

interface RoleWorkspaceProps {
  readonly role: RoleType;
  readonly onNavigateOverview: () => void;
  readonly onSelectRole: (role: RoleType) => void;
}

export function RoleWorkspace({ role, onNavigateOverview, onSelectRole }: RoleWorkspaceProps) {
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [contractState, setContractState] = useState<WorkspaceContractState>(
    INITIAL_WORKSPACE_CONTRACT_STATE,
  );
  const [copied, setCopied] = useState(false);

  const descriptor = ROLE_DESCRIPTORS[role];
  const otherRoles: RoleType[] = (['registrar', 'certifier', 'member'] as const).filter(
    (r) => r !== role,
  );

  const handleConnectWallet = async () => {
    setWalletConnecting(true);
    setWalletError(null);
    try {
      const connected = await connectProviders(() => {});
      setWallet(connected);
    } catch (err: unknown) {
      console.error('Wallet connection failed:', err);
      const msg = err instanceof Error ? err.message : 'Could not connect Midnight wallet.';
      setWalletError(msg);
    } finally {
      setWalletConnecting(false);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContractState((prev) => handleAddressInputChange(prev, e.target.value));
  };

  const handleInspect = async () => {
    if (!wallet) return;
    const address = contractState.addressInput.trim();
    if (!address) return;

    setContractState((prev) => ({
      ...prev,
      inspectionState: 'inspecting',
      errorMessage: null,
    }));

    try {
      const session = await queryCommonVeilContract(wallet.providers, address);
      setContractState((prev) => ({
        ...prev,
        inspectionState: 'inspected',
        inspectedState: session.publicState,
        errorMessage: null,
      }));
    } catch (err: unknown) {
      setContractState((prev) => ({
        ...prev,
        inspectionState: 'none',
        errorMessage: mapWorkspaceError(err),
      }));
    }
  };

  const handleAttach = async () => {
    if (!wallet) return;
    const address = contractState.addressInput.trim();
    if (!address) return;

    setContractState((prev) => ({
      ...prev,
      inspectionState: 'attaching',
      errorMessage: null,
    }));

    try {
      const session = await attachCommonVeilContract(wallet.providers, address);
      setContractState((prev) => ({
        ...prev,
        inspectionState: 'attached',
        inspectedState: session.publicState,
        attachedAddress: session.publicState.contractAddress,
        errorMessage: null,
      }));
    } catch (err: unknown) {
      setContractState((prev) => ({
        ...prev,
        inspectionState: 'none',
        attachedAddress: null,
        errorMessage: mapWorkspaceError(err),
      }));
    }
  };

  const handleCopyAttached = () => {
    if (!contractState.attachedAddress) return;
    navigator.clipboard.writeText(contractState.attachedAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const publicState: CommonVeilPublicState | null = contractState.inspectedState;

  return (
    <main className="role-workspace-main">
      <nav className="role-workspace-nav">
        <div className="brand" onClick={onNavigateOverview} style={{ cursor: 'pointer' }}>
          <span>CV</span>
          <strong>CommonVeil</strong>
        </div>
        <div className="nav-links">
          <button
            type="button"
            className="secondary-nav-btn"
            onClick={onNavigateOverview}
          >
            ← Product Overview
          </button>
          <div className="role-nav-switch">
            {otherRoles.map((r) => (
              <a
                key={r}
                href={`/?role=${r}`}
                target="_blank"
                rel="noreferrer"
                className="role-tab-link"
              >
                Open {ROLE_DESCRIPTORS[r].label} tab ↗
              </a>
            ))}
          </div>
        </div>
      </nav>

      <section className="role-header-section">
        <div className="role-badge-row">
          <span className="network-badge">Preprod Network</span>
          <span className="role-active-badge">{descriptor.label} Workspace</span>
        </div>
        <h1>{descriptor.label} Operational Workspace</h1>
        <p className="role-description-lead">{descriptor.description}</p>
        <div className="session-notice-box">
          <strong>Session Separation Notice</strong>
          <p>
            Role separation requires different participants to use separate browser profiles or
            devices and keep their own encrypted role material.
          </p>
          <p className="authorization-disclaimer">
            Selecting this workspace changes UI context only. Credential verification and Compact
            circuit authorization determine on-chain permissions.
          </p>
        </div>
      </section>

      <div className="workspace-grid">
        {/* Left Column: Wallet Connection & Contract Attachment Controls */}
        <div className="workspace-column">
          <article className="workspace-card">
            <div className="card-header">
              <span className="card-step">01</span>
              <h2>Midnight Wallet</h2>
            </div>
            <p className="card-caption">
              Connect an independent 1AM Midnight wallet for this role session.
            </p>

            {wallet ? (
              <dl className="property-list">
                <dt>Status</dt>
                <dd><span className="status-indicator active">Connected</span></dd>
                <dt>Wallet Name</dt>
                <dd>{wallet.name}</dd>
                <dt>Network</dt>
                <dd>Preprod</dd>
                <dt>Address</dt>
                <dd title={wallet.address}><code>{shortenAddress(wallet.address)}</code></dd>
                <dt>DUST Balance</dt>
                <dd>{formatDust(wallet.dustBalance)} DUST</dd>
                <dt>Proving Mode</dt>
                <dd>{wallet.proofMode === 'wallet' ? 'In-wallet prover' : 'Local proof server'}</dd>
              </dl>
            ) : (
              <div>
                <button
                  type="button"
                  id="connect-wallet-btn"
                  onClick={handleConnectWallet}
                  disabled={walletConnecting}
                  className="action-button primary"
                >
                  {walletConnecting ? 'Connecting 1AM Wallet…' : 'Connect 1AM Wallet'}
                </button>
                {walletError && (
                  <div className="safe-error-banner" role="alert">
                    <p>{walletError}</p>
                    <button
                      type="button"
                      className="retry-btn"
                      onClick={handleConnectWallet}
                    >
                      Retry connection
                    </button>
                  </div>
                )}
              </div>
            )}
          </article>

          <article className="workspace-card">
            <div className="card-header">
              <span className="card-step">02</span>
              <h2>Contract Attachment</h2>
            </div>
            <p className="card-caption">
              Inspect or attach to a deployed CommonVeil contract address on Midnight Preprod.
            </p>

            <form onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="contract-address-input">Preprod Contract Address</label>
              <input
                id="contract-address-input"
                type="text"
                value={contractState.addressInput}
                onChange={handleAddressChange}
                placeholder="Enter 64-character hex contract address"
                autoComplete="off"
                spellCheck="false"
              />

              <div className="button-row">
                <button
                  type="button"
                  id="inspect-contract-btn"
                  onClick={handleInspect}
                  disabled={
                    !wallet ||
                    !contractState.addressInput.trim() ||
                    contractState.inspectionState === 'inspecting' ||
                    contractState.inspectionState === 'attaching'
                  }
                  className="action-button secondary"
                >
                  {contractState.inspectionState === 'inspecting'
                    ? 'Inspecting…'
                    : 'Inspect Contract'}
                </button>

                <button
                  type="button"
                  id="attach-contract-btn"
                  onClick={handleAttach}
                  disabled={
                    !wallet ||
                    !contractState.addressInput.trim() ||
                    contractState.inspectionState === 'inspecting' ||
                    contractState.inspectionState === 'attaching'
                  }
                  className="action-button primary"
                >
                  {contractState.inspectionState === 'attaching'
                    ? 'Attaching…'
                    : 'Attach to Contract'}
                </button>
              </div>
            </form>

            {contractState.errorMessage && (
              <div className="safe-error-banner" role="alert">
                <strong>Attachment Error</strong>
                <p>{contractState.errorMessage}</p>
              </div>
            )}

            {contractState.inspectionState === 'inspected' && (
              <div className="status-callout inspect-callout">
                <span className="status-indicator notice">Inspected — not attached</span>
                <p>Public state decoded successfully. Provider is not yet scoped to this contract.</p>
              </div>
            )}

            {contractState.inspectionState === 'attached' && contractState.attachedAddress && (
              <div className="status-callout attach-callout">
                <span className="status-indicator success">Attached</span>
                <p>Private-state provider is scoped to this verified CommonVeil contract.</p>
                <div className="attached-address-row">
                  <code>{contractState.attachedAddress}</code>
                  <button
                    type="button"
                    className="copy-button"
                    onClick={handleCopyAttached}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </article>
        </div>

        {/* Right Column: Public State Panel */}
        <div className="workspace-column">
          <article className="workspace-card public-state-card">
            <div className="card-header">
              <span className="card-step">03</span>
              <h2>Public Contract State</h2>
            </div>
            <p className="privacy-guarantee-notice">
              Public state does not reveal member identity or inventory values.
            </p>

            {publicState ? (
              <div className="public-state-content">
                <div className="metric-row">
                  <div className="metric-box">
                    <span className="metric-label">Policy Status</span>
                    <strong className="metric-value">
                      {publicState.policyActive ? 'Policy active' : 'Open for certification'}
                    </strong>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">Admitted Members</span>
                    <strong className="metric-value">{publicState.members.toString()}</strong>
                  </div>
                </div>

                <div className="metric-row">
                  <div className="metric-box">
                    <span className="metric-label">Certified Commitments</span>
                    <strong className="metric-value">
                      {publicState.inventoryCommitments.toString()}
                    </strong>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">Affected Releases</span>
                    <strong className="metric-value">
                      {publicState.affectedReleases.toString()}
                    </strong>
                  </div>
                </div>

                <div className="metric-row">
                  <div className="metric-box">
                    <span className="metric-label">Accepted Reports</span>
                    <strong className="metric-value">{publicState.accepted.toString()}</strong>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">Used Nullifiers</span>
                    <strong className="metric-value">
                      {publicState.usedNullifiers.toString()}
                    </strong>
                  </div>
                </div>

                <dl className="property-list public-keys-list">
                  <dt>Registrar Public Key</dt>
                  <dd title={publicState.registrarKey}>
                    <code>{shortenAddress(publicState.registrarKey)}</code>
                  </dd>
                  <dt>Certifier Public Key</dt>
                  <dd title={publicState.certifierKey}>
                    <code>{shortenAddress(publicState.certifierKey)}</code>
                  </dd>
                </dl>
              </div>
            ) : (
              <div className="empty-state-notice">
                <p>No contract state loaded yet.</p>
                <p className="empty-state-hint">
                  Enter a deployed contract address and click <em>Inspect</em> or <em>Attach</em>.
                </p>
              </div>
            )}
          </article>
        </div>
      </div>

      <footer className="role-workspace-footer">
        <span>CommonVeil · Preprod Role Workspace Shell</span>
        <span>Credential verification and circuit execution enforced locally</span>
      </footer>
    </main>
  );
}
