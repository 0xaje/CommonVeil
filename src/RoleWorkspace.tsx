import { useEffect, useRef, useState } from 'react';
import type { ConnectedWallet } from './providers';
import { connectProviders } from './providers';
import {
  queryCommonVeilContract,
  attachCommonVeilContract,
  verifyRegistrarSecret,
  type CommonVeilPublicState,
} from './contract-session';
import {
  bytesToHex,
  encryptToEnvelope,
  decryptAndValidateEnvelope,
  type EncryptedEnvelope,
} from './role-packages';
import {
  ROLE_DESCRIPTORS,
  type RoleType,
  type WorkspaceContractState,
  INITIAL_WORKSPACE_CONTRACT_STATE,
  handleAddressInputChange,
  isResponseCurrent,
  mapWorkspaceError,
  mapWalletError,
  shortenAddress,
  formatDust,
  parseRegistrarSecretHex,
  generateRegistrarSecret,
  buildRegistrarBackupPackage,
  validateRegistrarBackupPackage,
  zeroizeBytes,
  type RegistrarVerificationStatus,
} from './role-workspace-state';
import './role-workspace.css';

interface RoleWorkspaceProps {
  readonly role: RoleType;
  readonly onNavigateOverview: () => void;
}

export function RoleWorkspace({ role, onNavigateOverview }: RoleWorkspaceProps) {
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [contractState, setContractState] = useState<WorkspaceContractState>(
    INITIAL_WORKSPACE_CONTRACT_STATE,
  );

  // Registrar local secret state (in-memory only)
  const [hasRegistrarSecret, setHasRegistrarSecret] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<RegistrarVerificationStatus>('unverified');
  const [activeSecretHex, setActiveSecretHex] = useState<string | null>(null); // Only shown during creation/import
  const [secretCopied, setSecretCopied] = useState(false);

  // Registrar input states
  const [importHexInput, setImportHexInput] = useState('');
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [registrarError, setRegistrarError] = useState<string | null>(null);
  const [registrarNotice, setRegistrarNotice] = useState<string | null>(null);
  const [backupFileContent, setBackupFileContent] = useState<string | null>(null);

  // Plaintext secret in component memory only
  const plaintextSecretRef = useRef<Uint8Array | null>(null);

  // Guards against stale async operations when requests race or unmount occurs
  const requestCounter = useRef(0);
  const isMounted = useRef(true);

  // Zeroize and clean up secret on unmount or role change
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      zeroizeBytes(plaintextSecretRef.current);
      plaintextSecretRef.current = null;
    };
  }, []);

  const descriptor = ROLE_DESCRIPTORS[role];
  const otherRoles: RoleType[] = (['registrar', 'certifier', 'member'] as const).filter(
    (r) => r !== role,
  );

  const isBusy =
    contractState.inspectionState === 'inspecting' ||
    contractState.inspectionState === 'attaching';

  // Helper to clear registrar secret in memory
  const clearRegistrarSecret = () => {
    zeroizeBytes(plaintextSecretRef.current);
    plaintextSecretRef.current = null;
    setHasRegistrarSecret(false);
    setIsLocked(false);
    setActiveSecretHex(null);
    setVerificationStatus('unverified');
    setImportHexInput('');
    setExportPassphrase('');
    setImportPassphrase('');
    setBackupFileContent(null);
    setRegistrarError(null);
  };

  const handleConnectWallet = async () => {
    setWalletConnecting(true);
    setWalletError(null);
    try {
      const connected = await connectProviders(() => {});
      if (isMounted.current) {
        setWallet(connected);
      }
    } catch (err: unknown) {
      if (isMounted.current) {
        setWalletError(mapWalletError(err));
      }
    } finally {
      if (isMounted.current) {
        setWalletConnecting(false);
      }
    }
  };

  const handleDisconnectWallet = () => {
    setWallet(null);
    setWalletError(null);
    clearRegistrarSecret();
    setContractState(INITIAL_WORKSPACE_CONTRACT_STATE);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = handleAddressInputChange(contractState, e.target.value);
    setContractState(next);
    // Address changed: invalidate verification status
    if (verificationStatus !== 'unverified') {
      setVerificationStatus('unverified');
    }
  };

  const handleInspect = async () => {
    if (!wallet || isBusy) return;
    const address = contractState.addressInput.trim();
    if (!address) return;

    const currentRequestId = ++requestCounter.current;
    setContractState((prev) => ({
      ...prev,
      activeRequestId: currentRequestId,
      inspectionState: 'inspecting',
      errorMessage: null,
      copyStatus: 'idle',
    }));

    try {
      const session = await queryCommonVeilContract(wallet.providers, address);
      if (!isMounted.current) return;
      setContractState((prev) => {
        if (!isResponseCurrent(prev, currentRequestId, address)) {
          return prev;
        }
        return {
          ...prev,
          inspectionState: 'inspected',
          inspectedState: session.publicState,
          errorMessage: null,
        };
      });
    } catch (err: unknown) {
      if (!isMounted.current) return;
      setContractState((prev) => {
        if (!isResponseCurrent(prev, currentRequestId, address)) {
          return prev;
        }
        return {
          ...prev,
          inspectionState: 'none',
          errorMessage: mapWorkspaceError(err),
        };
      });
    }
  };

  const handleAttach = async () => {
    if (!wallet || isBusy) return;
    const address = contractState.addressInput.trim();
    if (!address) return;

    const currentRequestId = ++requestCounter.current;
    setContractState((prev) => ({
      ...prev,
      activeRequestId: currentRequestId,
      inspectionState: 'attaching',
      errorMessage: null,
      copyStatus: 'idle',
    }));

    try {
      const session = await attachCommonVeilContract(wallet.providers, address);
      if (!isMounted.current) return;
      setContractState((prev) => {
        if (!isResponseCurrent(prev, currentRequestId, address)) {
          return prev;
        }
        return {
          ...prev,
          inspectionState: 'attached',
          inspectedState: session.publicState,
          attachedAddress: session.publicState.contractAddress,
          errorMessage: null,
        };
      });

      // If we already have a secret in memory, verify it against the newly attached public state
      if (plaintextSecretRef.current && session.publicState) {
        const matches = verifyRegistrarSecret(session.publicState, plaintextSecretRef.current);
        setVerificationStatus(matches ? 'verified' : 'failed');
      }
    } catch (err: unknown) {
      if (!isMounted.current) return;
      setContractState((prev) => {
        if (!isResponseCurrent(prev, currentRequestId, address)) {
          return prev;
        }
        return {
          ...prev,
          inspectionState: 'none',
          attachedAddress: null,
          errorMessage: mapWorkspaceError(err),
        };
      });
    }
  };

  const handleCopyAttached = () => {
    if (!contractState.attachedAddress) return;
    navigator.clipboard
      .writeText(contractState.attachedAddress)
      .then(() => {
        if (isMounted.current) {
          setContractState((prev) => ({ ...prev, copyStatus: 'copied' }));
          setTimeout(() => {
            if (isMounted.current) {
              setContractState((prev) =>
                prev.copyStatus === 'copied' ? { ...prev, copyStatus: 'idle' } : prev,
              );
            }
          }, 2500);
        }
      })
      .catch(() => {
        if (isMounted.current) {
          setContractState((prev) => ({ ...prev, copyStatus: 'failed' }));
        }
      });
  };

  // --- Registrar Secret Handlers ---

  const handleGenerateSecret = () => {
    clearRegistrarSecret();
    const secretBytes = generateRegistrarSecret();
    plaintextSecretRef.current = secretBytes;
    const hex = bytesToHex(secretBytes);
    setActiveSecretHex(hex);
    setHasRegistrarSecret(true);
    setIsLocked(false);
    setRegistrarNotice('New 32-byte registrar secret generated in session memory.');
    setRegistrarError(null);

    // Verify immediately if attached
    if (contractState.attachedAddress && contractState.inspectedState) {
      const matches = verifyRegistrarSecret(contractState.inspectedState, secretBytes);
      setVerificationStatus(matches ? 'verified' : 'failed');
    }
  };

  const handleImportSecretHex = () => {
    setRegistrarError(null);
    setRegistrarNotice(null);
    try {
      const secretBytes = parseRegistrarSecretHex(importHexInput);
      clearRegistrarSecret();
      plaintextSecretRef.current = secretBytes;
      const hex = bytesToHex(secretBytes);
      setActiveSecretHex(hex);
      setHasRegistrarSecret(true);
      setIsLocked(false);
      setImportHexInput('');
      setRegistrarNotice('Registrar secret imported successfully into session memory.');

      if (contractState.attachedAddress && contractState.inspectedState) {
        const matches = verifyRegistrarSecret(contractState.inspectedState, secretBytes);
        setVerificationStatus(matches ? 'verified' : 'failed');
      }
    } catch (err: unknown) {
      setRegistrarError(err instanceof Error ? err.message : 'Invalid hex secret format.');
    }
  };

  const handleVerifySecret = () => {
    if (!contractState.attachedAddress || !contractState.inspectedState) {
      setRegistrarError('Attach to a verified CommonVeil contract before verifying registrar identity.');
      return;
    }
    if (!plaintextSecretRef.current) {
      setRegistrarError('No registrar secret in session memory to verify.');
      return;
    }
    const matches = verifyRegistrarSecret(contractState.inspectedState, plaintextSecretRef.current);
    setVerificationStatus(matches ? 'verified' : 'failed');
    setRegistrarError(null);
  };

  const handleLockSession = () => {
    clearRegistrarSecret();
    setIsLocked(true);
    setRegistrarNotice('Session locked. Plaintext secret zeroized and removed from memory.');
  };

  const handleDismissRevealedSecret = () => {
    setActiveSecretHex(null);
  };

  const handleCopySecret = () => {
    if (!activeSecretHex) return;
    navigator.clipboard
      .writeText(activeSecretHex)
      .then(() => {
        if (isMounted.current) {
          setSecretCopied(true);
          setTimeout(() => {
            if (isMounted.current) setSecretCopied(false);
          }, 2500);
        }
      })
      .catch(() => {
        if (isMounted.current) {
          setRegistrarError('Copy failed. Select the secret manually.');
        }
      });
  };

  const handleExportBackup = async () => {
    setRegistrarError(null);
    setRegistrarNotice(null);
    if (!plaintextSecretRef.current) {
      setRegistrarError('No registrar secret available to backup.');
      return;
    }
    if (exportPassphrase.length < 12) {
      setRegistrarError('Passphrase must be at least 12 characters.');
      return;
    }

    try {
      const backupPackage = buildRegistrarBackupPackage(plaintextSecretRef.current);
      const envelope: EncryptedEnvelope = await encryptToEnvelope(backupPackage, exportPassphrase);

      const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `commonveil-registrar-backup-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);

      setExportPassphrase('');
      setRegistrarNotice('Encrypted backup exported. Store the backup file and passphrase securely.');
    } catch (err: unknown) {
      setRegistrarError(err instanceof Error ? err.message : 'Encryption failed.');
    }
  };

  const handleBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegistrarError(null);
    setRegistrarNotice(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setBackupFileContent(content);
        setRegistrarNotice('Backup file loaded. Enter passphrase to decrypt and restore.');
      }
    };
    reader.onerror = () => {
      setRegistrarError('Failed to read the selected backup file.');
    };
    reader.readAsText(file);
  };

  const handleImportBackup = async () => {
    setRegistrarError(null);
    setRegistrarNotice(null);
    if (!backupFileContent) {
      setRegistrarError('Select a backup JSON file first.');
      return;
    }
    if (importPassphrase.length < 12) {
      setRegistrarError('Passphrase must be at least 12 characters.');
      return;
    }

    try {
      let parsedEnvelope: unknown;
      try {
        parsedEnvelope = JSON.parse(backupFileContent);
      } catch {
        throw new Error('Backup file does not contain valid JSON.');
      }

      const restored = await decryptAndValidateEnvelope(
        parsedEnvelope as EncryptedEnvelope,
        importPassphrase,
        validateRegistrarBackupPackage,
      );

      const secretBytes = parseRegistrarSecretHex(restored.registrarSecret);
      clearRegistrarSecret();
      plaintextSecretRef.current = secretBytes;
      setHasRegistrarSecret(true);
      setIsLocked(false);
      setImportPassphrase('');
      setBackupFileContent(null);
      setRegistrarNotice('Registrar secret restored from encrypted backup into session memory.');

      if (contractState.attachedAddress && contractState.inspectedState) {
        const matches = verifyRegistrarSecret(contractState.inspectedState, secretBytes);
        setVerificationStatus(matches ? 'verified' : 'failed');
      }
    } catch (err: unknown) {
      setRegistrarError(
        err instanceof Error ? err.message : 'Decryption failed. Incorrect passphrase or corrupt file.',
      );
    }
  };

  const publicState: CommonVeilPublicState | null = contractState.inspectedState;

  return (
    <main className="role-workspace-main" aria-busy={walletConnecting || isBusy}>
      <nav className="role-workspace-nav">
        <button
          type="button"
          className="brand-button"
          onClick={onNavigateOverview}
          aria-label="Return to CommonVeil product overview"
        >
          <span>CV</span>
          <strong>CommonVeil</strong>
        </button>
        <div className="nav-links">
          <button
            type="button"
            className="secondary-nav-btn"
            onClick={onNavigateOverview}
            aria-label="Navigate to Product Overview"
          >
            ← Product Overview
          </button>
          <div className="role-nav-switch" role="navigation" aria-label="Open other role workspaces">
            {otherRoles.map((r) => (
              <a
                key={r}
                href={`/?role=${r}`}
                target="_blank"
                rel="noreferrer"
                className="role-tab-link"
                title={`Open ${ROLE_DESCRIPTORS[r].label} Workspace in new tab`}
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
        <div className="session-notice-box" role="note">
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

            <div aria-live="polite">
              {wallet ? (
                <div>
                  <dl className="property-list">
                    <dt>Status</dt>
                    <dd>
                      <span className="status-indicator active" aria-label="Wallet connected">
                        Connected
                      </span>
                    </dd>
                    <dt>Wallet Name</dt>
                    <dd>{wallet.name}</dd>
                    <dt>Network</dt>
                    <dd>Preprod</dd>
                    <dt>Address</dt>
                    <dd title={wallet.address}>
                      <code>{shortenAddress(wallet.address)}</code>
                    </dd>
                    <dt>DUST Balance</dt>
                    <dd>{formatDust(wallet.dustBalance)} DUST</dd>
                    <dt>Proving Mode</dt>
                    <dd>
                      {wallet.proofMode === 'wallet' ? 'In-wallet prover' : 'Local proof server'}
                    </dd>
                  </dl>
                  <button
                    type="button"
                    onClick={handleDisconnectWallet}
                    className="action-button secondary disconnect-btn"
                    aria-label="Disconnect 1AM wallet"
                  >
                    Disconnect Wallet
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    id="connect-wallet-btn"
                    onClick={handleConnectWallet}
                    disabled={walletConnecting}
                    className="action-button primary"
                    aria-label="Connect 1AM Midnight Wallet"
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
                        aria-label="Retry connecting 1AM wallet"
                      >
                        Retry connection
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
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
                disabled={isBusy}
                placeholder="Paste deployed CommonVeil contract address"
                autoComplete="off"
                spellCheck="false"
                aria-describedby="contract-status-region"
              />

              <div className="button-row">
                <button
                  type="button"
                  id="inspect-contract-btn"
                  onClick={handleInspect}
                  disabled={
                    !wallet ||
                    !contractState.addressInput.trim() ||
                    isBusy
                  }
                  className="action-button secondary"
                  aria-label="Inspect contract state without attaching"
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
                    isBusy
                  }
                  className="action-button primary"
                  aria-label="Attach to verified CommonVeil contract"
                >
                  {contractState.inspectionState === 'attaching'
                    ? 'Attaching…'
                    : 'Attach to Contract'}
                </button>
              </div>
            </form>

            <div id="contract-status-region" aria-live="polite">
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
                      aria-label="Copy attached contract address to clipboard"
                    >
                      {contractState.copyStatus === 'copied'
                        ? 'Copied'
                        : contractState.copyStatus === 'failed'
                          ? 'Retry copy'
                          : 'Copy'}
                    </button>
                  </div>
                  {contractState.copyStatus === 'failed' && (
                    <p className="copy-fallback-notice" role="alert">
                      Copy failed — select the address manually.
                    </p>
                  )}
                </div>
              )}
            </div>
          </article>
        </div>

        {/* Right Column: Role Identity & Secret Lifecycle (Registrar) */}
        <div className="workspace-column">
          {role === 'registrar' && (
            <article className="workspace-card registrar-identity-card">
              <div className="card-header">
                <span className="card-step">03</span>
                <h2>Registrar Role Identity & Secrets</h2>
              </div>
              <p className="card-caption">
                Manage the local 32-byte registrar secret in memory. Secrets are never transmitted, logged, or saved in storage.
              </p>

              {/* Status Header */}
              <div className="registrar-status-row" aria-live="polite">
                <div>
                  <span className="field-caption">Secret in Memory</span>
                  <strong>{hasRegistrarSecret ? 'Loaded in session memory' : 'None (Locked)'}</strong>
                </div>
                <div>
                  <span className="field-caption">On-chain Verification</span>
                  <strong className={`verification-badge ${verificationStatus}`}>
                    {verificationStatus === 'verified'
                      ? 'Verified'
                      : verificationStatus === 'failed'
                        ? 'Not verified'
                        : 'Unverified'}
                  </strong>
                </div>
              </div>

              {registrarNotice && (
                <div className="safe-notice-banner" role="status">
                  <p>{registrarNotice}</p>
                </div>
              )}

              {registrarError && (
                <div className="safe-error-banner" role="alert">
                  <strong>Registrar Operation Error</strong>
                  <p>{registrarError}</p>
                </div>
              )}

              {/* One-time creation confirmation banner */}
              {activeSecretHex && (
                <div className="secret-reveal-box" role="alert">
                  <div className="secret-reveal-header">
                    <strong>New Secret Created / Imported</strong>
                    <button
                      type="button"
                      className="dismiss-secret-btn"
                      onClick={handleDismissRevealedSecret}
                      aria-label="Dismiss revealed secret display"
                    >
                      Hide & Dismiss
                    </button>
                  </div>
                  <p className="secret-warning-text">
                    Warning: Plaintext secrets are never stored. Export an encrypted backup immediately. Losing this secret makes the registrar role permanently unrecoverable.
                  </p>
                  <div className="revealed-secret-row">
                    <code>{activeSecretHex}</code>
                    <button
                      type="button"
                      className="copy-button"
                      onClick={handleCopySecret}
                      aria-label="Copy registrar secret to clipboard"
                    >
                      {secretCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Tabs / Buttons */}
              {!hasRegistrarSecret ? (
                <div className="secret-setup-section">
                  <button
                    type="button"
                    onClick={handleGenerateSecret}
                    className="action-button primary"
                    aria-label="Generate fresh random 32-byte registrar secret"
                  >
                    Generate New Registrar Secret
                  </button>

                  <div className="divider-row"><span>or import existing 32-byte hex</span></div>

                  <form onSubmit={(e) => { e.preventDefault(); handleImportSecretHex(); }}>
                    <label htmlFor="import-hex-input">32-Byte Secret Hex (64 hex characters)</label>
                    <input
                      id="import-hex-input"
                      type="password"
                      value={importHexInput}
                      onChange={(e) => setImportHexInput(e.target.value)}
                      placeholder="Paste 64-character hex secret"
                      autoComplete="off"
                      spellCheck="false"
                    />
                    <button
                      type="submit"
                      disabled={!importHexInput.trim()}
                      className="action-button secondary"
                      aria-label="Import plaintext registrar secret hex"
                    >
                      Import Hex Secret
                    </button>
                  </form>

                  <div className="divider-row"><span>or restore encrypted backup</span></div>

                  <div className="backup-import-box">
                    <label htmlFor="backup-file-input">Encrypted Backup JSON File</label>
                    <input
                      id="backup-file-input"
                      type="file"
                      accept=".json,application/json"
                      onChange={handleBackupFileSelect}
                    />

                    {backupFileContent && (
                      <form onSubmit={(e) => { e.preventDefault(); handleImportBackup(); }}>
                        <label htmlFor="import-passphrase-input">Backup Passphrase (min 12 chars)</label>
                        <input
                          id="import-passphrase-input"
                          type="password"
                          value={importPassphrase}
                          onChange={(e) => setImportPassphrase(e.target.value)}
                          placeholder="Enter passphrase"
                          autoComplete="off"
                        />
                        <button
                          type="submit"
                          disabled={importPassphrase.length < 12}
                          className="action-button primary"
                          aria-label="Decrypt and restore registrar backup"
                        >
                          Decrypt and Restore Secret
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ) : (
                <div className="secret-active-controls">
                  <div className="button-row">
                    <button
                      type="button"
                      onClick={handleVerifySecret}
                      disabled={!contractState.attachedAddress}
                      className="action-button primary"
                      aria-label="Verify registrar secret against attached contract"
                    >
                      Verify On-Chain Authority
                    </button>

                    <button
                      type="button"
                      onClick={handleLockSession}
                      className="action-button secondary"
                      aria-label="Lock session and zeroize secret"
                    >
                      Lock Session
                    </button>
                  </div>

                  {!contractState.attachedAddress && (
                    <p className="form-hint-text">
                      Attach a contract in Step 02 to run on-chain registrar verification.
                    </p>
                  )}

                  {/* Export Backup Form */}
                  <div className="export-backup-section">
                    <h3>Encrypted Backup Export</h3>
                    <p className="card-caption">
                      Encrypts the secret with AES-256-GCM (600,000 PBKDF2 iterations) and downloads a JSON envelope.
                    </p>
                    <form onSubmit={(e) => { e.preventDefault(); handleExportBackup(); }}>
                      <label htmlFor="export-passphrase-input">Export Passphrase (min 12 chars)</label>
                      <input
                        id="export-passphrase-input"
                        type="password"
                        value={exportPassphrase}
                        onChange={(e) => setExportPassphrase(e.target.value)}
                        placeholder="Enter 12+ character passphrase"
                        autoComplete="off"
                      />
                      <button
                        type="submit"
                        disabled={exportPassphrase.length < 12}
                        className="action-button secondary"
                        aria-label="Export encrypted registrar backup"
                      >
                        Download Encrypted Backup
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </article>
          )}

          {/* Public State Panel */}
          <article className="workspace-card public-state-card">
            <div className="card-header">
              <span className="card-step">{role === 'registrar' ? '04' : '03'}</span>
              <h2>Public Contract State</h2>
            </div>
            <p className="privacy-guarantee-notice">
              Public state does not reveal member identity or inventory values.
            </p>

            <div aria-live="polite">
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
            </div>
          </article>
        </div>
      </div>

      <footer className="role-workspace-footer">
        <span>CommonVeil · Preprod Role Workspace Shell</span>
        <span>Workspace selection grants no authority. Compact circuits enforce authorized transactions.</span>
      </footer>
    </main>
  );
}
