import { useEffect, useRef, useState } from 'react';
import type { ConnectedWallet } from './providers';
import { connectProviders } from './providers';
import {
  queryCommonVeilContract,
  attachCommonVeilContract,
  verifyRegistrarSecret,
  ContractSessionError,
  type CommonVeilPublicState,
} from './contract-session';
import {
  encryptToEnvelope,
  decryptAndValidateEnvelope,
  type EncryptedEnvelope,
  bytesToHex,
  hexToBytes,
  validateCertifierKeyPackage,
  type CertifierKeyPackage,
  MEMBER_ADMISSION_SCHEMA,
  type MemberAdmissionPackage,
  validateMemberAdmissionPackage,
  type ValidatedLiveInventoryReport,
  validateLiveInventoryReport,
  buildCertificationRequestPackage,
  type CertificationRequestPackage,
  validateCertificationRequestPackage,
} from './role-packages';
import { deployContract, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledCommonVeilContract, CommonVeil } from './contract';
import { PRIVATE_STATE_ID } from './providers';
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
  INITIAL_REGISTRAR_SECRET_UI_STATE,
  type RegistrarSecretUiState,
  onSecretGeneratedOrImported,
  onSecretRestoredFromBackup,
  onCopyAttemptInitiated,
  onCopyAttemptResult,
  onSecretClearedOrLocked,
  mapRegistrarOperationError,
  mapCertifierOperationError,
  parseCertifierSecretHex,
  generateCertifierSecret,
  buildCertifierBackupPackage,
  validateCertifierBackupPackage,
  buildCertifierKeyPackage,
  INITIAL_CERTIFIER_SECRET_UI_STATE,
  type CertifierSecretUiState,
  INITIAL_REGISTRAR_DEPLOYMENT_UI_STATE,
  type RegistrarDeploymentUiState,
  onCertifierKeyImported,
  validateDeploymentReceipt,
  type DeploymentReceipt,
  canInitiateDeployment,
  onDeploymentConfirmOpen,
  onDeploymentConfirmCancel,
  onDeploymentWalletRequest,
  onDeploymentSubmitting,
  onDeploymentFinalizedIndexing,
  onDeploymentCompleted,
  onDeploymentCancelled,
  onDeploymentFailed,
  onDeploymentReset,
  mapDeploymentError,
  mapDeploymentInspectionError,
  DEPLOYMENT_VERIFICATION_ERROR_MESSAGES,
  INITIAL_MEMBER_SECRET_UI_STATE,
  type MemberSecretUiState,
  parseMemberSecretOrSaltHex,
  generateMemberSecretOrSalt,
  buildMemberBackupPackage,
  validateMemberBackupPackage,
  buildMemberAdmissionPackage,
  onMemberSecretGeneratedOrImported,
  onMemberSecretRestoredFromBackup,
  onMemberSecretClearedOrLocked,
  INITIAL_REGISTRAR_ADMISSION_UI_STATE,
  type RegistrarAdmissionUiState,
  validateMemberAdmissionReceipt,
  buildMemberAdmissionReceipt,
  type MemberAdmissionReceipt,
  onAdmissionPackageImported,
  onAdmissionConfirmDismissed,
  onAdmissionWalletRequest,
  onAdmissionSubmitting,
  onAdmissionFinalizedIndexing,
  onAdmissionCompleted,
  onAdmissionFailed,
  onAdmissionReset,
  mapMemberOperationError,
  mapAdmissionError,
  mapAdmissionInspectionError,
  canInitiateAdmission,
  ADMISSION_VERIFICATION_ERROR_MESSAGES,
  hasPasswordWhitespaceWarning,
  validatePasswordConfirmation,
  onBackupExported,
  onBackupRecoveryTested,
  canExportMemberAdmissionPackage,
  canExportCertifierKeyPackage,
  triggerBlobDownload,
  type MemberInventoryUiState,
  INITIAL_MEMBER_INVENTORY_UI_STATE,
  canExportCertificationRequest,
  checkCertificationRequestPrerequisites,
  onMemberInventoryImported,
  onMemberInventoryReset,
  onMemberInventoryError,
  mapInventoryReportError,
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

  // Registrar local UI state (never contains full secret string)
  const [registrarUi, setRegistrarUi] = useState<RegistrarSecretUiState>(
    INITIAL_REGISTRAR_SECRET_UI_STATE,
  );

  // Registrar contract deployment state
  const [deploymentUi, setDeploymentUi] = useState<RegistrarDeploymentUiState>(
    INITIAL_REGISTRAR_DEPLOYMENT_UI_STATE,
  );

  // Registrar input states (cleared immediately upon processing)
  const [importHexInput, setImportHexInput] = useState('');
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [exportConfirmPassphrase, setExportConfirmPassphrase] = useState('');
  const [showExportPassphrase, setShowExportPassphrase] = useState(false);
  const [ackWhitespaceRegistrar, setAckWhitespaceRegistrar] = useState(false);
  const [testBackupFileContent, setTestBackupFileContent] = useState<string | null>(null);
  const [testBackupPassphrase, setTestBackupPassphrase] = useState('');
  const [showTestPassphrase, setShowTestPassphrase] = useState(false);
  const [importPassphrase, setImportPassphrase] = useState('');
  const [registrarError, setRegistrarError] = useState<string | null>(null);
  const [registrarNotice, setRegistrarNotice] = useState<string | null>(null);
  const [backupFileContent, setBackupFileContent] = useState<string | null>(null);

  // Certifier local UI state (never contains full secret string)
  const [certifierUi, setCertifierUi] = useState<CertifierSecretUiState>(
    INITIAL_CERTIFIER_SECRET_UI_STATE,
  );

  // Certifier input states (cleared immediately upon processing)
  const [certifierImportHexInput, setCertifierImportHexInput] = useState('');
  const [certifierExportPassphrase, setCertifierExportPassphrase] = useState('');
  const [certifierExportConfirmPassphrase, setCertifierExportConfirmPassphrase] = useState('');
  const [certifierShowExportPassphrase, setCertifierShowExportPassphrase] = useState(false);
  const [ackWhitespaceCertifier, setAckWhitespaceCertifier] = useState(false);
  const [certifierTestBackupFileContent, setCertifierTestBackupFileContent] = useState<string | null>(null);
  const [certifierTestBackupPassphrase, setCertifierTestBackupPassphrase] = useState('');
  const [certifierShowTestPassphrase, setCertifierShowTestPassphrase] = useState(false);
  const [certifierImportPassphrase, setCertifierImportPassphrase] = useState('');
  const [certifierError, setCertifierError] = useState<string | null>(null);
  const [certifierNotice, setCertifierNotice] = useState<string | null>(null);
  const [certifierBackupFileContent, setCertifierBackupFileContent] = useState<string | null>(null);

  // Member local UI state (never contains full secret or salt string)
  const [memberUi, setMemberUi] = useState<MemberSecretUiState>(
    INITIAL_MEMBER_SECRET_UI_STATE,
  );

  // Member input states (cleared immediately upon processing)
  const [memberImportSecretHexInput, setMemberImportSecretHexInput] = useState('');
  const [memberImportSaltHexInput, setMemberImportSaltHexInput] = useState('');
  const [memberExportPassphrase, setMemberExportPassphrase] = useState('');
  const [memberExportConfirmPassphrase, setMemberExportConfirmPassphrase] = useState('');
  const [memberShowExportPassphrase, setMemberShowExportPassphrase] = useState(false);
  const [ackWhitespaceMember, setAckWhitespaceMember] = useState(false);
  const [memberTestBackupFileContent, setMemberTestBackupFileContent] = useState<string | null>(null);
  const [memberTestBackupPassphrase, setMemberTestBackupPassphrase] = useState('');
  const [memberShowTestPassphrase, setMemberShowTestPassphrase] = useState(false);
  const [memberImportPassphrase, setMemberImportPassphrase] = useState('');
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberNotice, setMemberNotice] = useState<string | null>(null);
  const [memberBackupFileContent, setMemberBackupFileContent] = useState<string | null>(null);

  // Member Live Inventory & Certification Request state
  const [memberInventoryUi, setMemberInventoryUi] = useState<MemberInventoryUiState>(
    INITIAL_MEMBER_INVENTORY_UI_STATE,
  );
  const memberInventoryInputRef = useRef<HTMLInputElement | null>(null);

  const resetMemberInventory = () => {
    setMemberInventoryUi((prev) => onMemberInventoryReset(prev));
    if (memberInventoryInputRef.current) {
      memberInventoryInputRef.current.value = '';
    }
  };

  // Registrar Member Admission state
  const [admissionUi, setAdmissionUi] = useState<RegistrarAdmissionUiState>(
    INITIAL_REGISTRAR_ADMISSION_UI_STATE,
  );
  const [admissionNotice, setAdmissionNotice] = useState<string | null>(null);

  // Plaintext secrets in volatile component memory only (Uint8Array, never React string state)
  const plaintextSecretRef = useRef<Uint8Array | null>(null);
  const plaintextCertifierSecretRef = useRef<Uint8Array | null>(null);
  const plaintextMemberSecretRef = useRef<Uint8Array | null>(null);
  const plaintextMemberSaltRef = useRef<Uint8Array | null>(null);

  // Guards against stale async operations when requests race or unmount occurs
  const requestCounter = useRef(0);
  const isMounted = useRef(true);

  // Monotonically increasing generation tokens to prevent stale async callbacks
  const deployGenerationRef = useRef(0);
  const activeDeployTokenRef = useRef<number | null>(null);

  const memberCopyGenerationRef = useRef(0);
  const activeMemberCopyTokenRef = useRef<number | null>(null);

  const admissionGenerationRef = useRef(0);
  const activeAdmissionTokenRef = useRef<number | null>(null);

  // Zeroize bytes and clear references on unmount or role change
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      copyGenerationRef.current++;
      activeCopyTokenRef.current = null;
      certifierCopyGenerationRef.current++;
      activeCertifierCopyTokenRef.current = null;
      memberCopyGenerationRef.current++;
      activeMemberCopyTokenRef.current = null;
      deployGenerationRef.current++;
      activeDeployTokenRef.current = null;
      admissionGenerationRef.current++;
      activeAdmissionTokenRef.current = null;
      zeroizeBytes(plaintextSecretRef.current);
      plaintextSecretRef.current = null;
      zeroizeBytes(plaintextCertifierSecretRef.current);
      plaintextCertifierSecretRef.current = null;
      zeroizeBytes(plaintextMemberSecretRef.current);
      plaintextMemberSecretRef.current = null;
      zeroizeBytes(plaintextMemberSaltRef.current);
      plaintextMemberSaltRef.current = null;
      resetMemberInventory();
    };
  }, []);

  const descriptor = ROLE_DESCRIPTORS[role];
  const otherRoles: RoleType[] = (['registrar', 'certifier', 'member'] as const).filter(
    (r) => r !== role,
  );

  const isDeploying =
    deploymentUi.stage === 'requesting-wallet' ||
    deploymentUi.stage === 'deploying' ||
    deploymentUi.stage === 'finalized-indexing';

  const isAdmitting =
    admissionUi.stage === 'requesting-wallet' ||
    admissionUi.stage === 'submitting' ||
    admissionUi.stage === 'finalized-indexing';

  const isBusy =
    contractState.inspectionState === 'inspecting' ||
    contractState.inspectionState === 'attaching' ||
    isDeploying ||
    isAdmitting;

  // Monotonically increasing copy generation tokens to prevent stale callbacks across secret lifecycles
  const copyGenerationRef = useRef(0);
  const activeCopyTokenRef = useRef<number | null>(null);

  const certifierCopyGenerationRef = useRef(0);
  const activeCertifierCopyTokenRef = useRef<number | null>(null);

  // Helper to securely clear registrar secret in memory
  const clearRegistrarSecret = (isLocked: boolean = false) => {
    // Invalidate any in-flight copy and deploy operation tokens
    copyGenerationRef.current++;
    activeCopyTokenRef.current = null;
    deployGenerationRef.current++;
    activeDeployTokenRef.current = null;
    admissionGenerationRef.current++;
    activeAdmissionTokenRef.current = null;
    zeroizeBytes(plaintextSecretRef.current);
    plaintextSecretRef.current = null;
    setRegistrarUi((prev) => onSecretClearedOrLocked(prev, isLocked));
    setDeploymentUi((prev) => onDeploymentReset(prev));
    setAdmissionUi((prev) => onAdmissionReset(prev));
    setImportHexInput('');
    setExportPassphrase('');
    setExportConfirmPassphrase('');
    setAckWhitespaceRegistrar(false);
    setTestBackupFileContent(null);
    setTestBackupPassphrase('');
    setImportPassphrase('');
    setBackupFileContent(null);
    setRegistrarError(null);
    setAdmissionNotice(null);
  };

  // Helper to securely clear certifier secret in memory
  const clearCertifierSecret = (isLocked: boolean = false) => {
    certifierCopyGenerationRef.current++;
    activeCertifierCopyTokenRef.current = null;
    zeroizeBytes(plaintextCertifierSecretRef.current);
    plaintextCertifierSecretRef.current = null;
    setCertifierUi((prev) => onSecretClearedOrLocked(prev, isLocked));
    setCertifierImportHexInput('');
    setCertifierExportPassphrase('');
    setCertifierExportConfirmPassphrase('');
    setAckWhitespaceCertifier(false);
    setCertifierTestBackupFileContent(null);
    setCertifierTestBackupPassphrase('');
    setCertifierImportPassphrase('');
    setCertifierBackupFileContent(null);
    setCertifierError(null);
  };

  // Helper to securely clear member secret and salt in memory
  const clearMemberSecret = (isLocked: boolean = false) => {
    memberCopyGenerationRef.current++;
    activeMemberCopyTokenRef.current = null;
    zeroizeBytes(plaintextMemberSecretRef.current);
    plaintextMemberSecretRef.current = null;
    zeroizeBytes(plaintextMemberSaltRef.current);
    plaintextMemberSaltRef.current = null;
    setMemberUi((prev) => onMemberSecretClearedOrLocked(prev, isLocked));
    setMemberImportSecretHexInput('');
    setMemberImportSaltHexInput('');
    setMemberExportPassphrase('');
    setMemberExportConfirmPassphrase('');
    setAckWhitespaceMember(false);
    setMemberTestBackupFileContent(null);
    setMemberTestBackupPassphrase('');
    setMemberImportPassphrase('');
    setMemberBackupFileContent(null);
    setMemberError(null);
    resetMemberInventory();
  };

  // Clear secrets when role changes
  useEffect(() => {
    clearRegistrarSecret(false);
    clearCertifierSecret(false);
    clearMemberSecret(false);
  }, [role]);

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
    clearRegistrarSecret(false);
    clearCertifierSecret(false);
    clearMemberSecret(false);
    setContractState(INITIAL_WORKSPACE_CONTRACT_STATE);
    setDeploymentUi((prev) => onDeploymentReset(prev));
    setAdmissionUi((prev) => onAdmissionReset(prev));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    copyGenerationRef.current++;
    activeCopyTokenRef.current = null;
    certifierCopyGenerationRef.current++;
    activeCertifierCopyTokenRef.current = null;
    memberCopyGenerationRef.current++;
    activeMemberCopyTokenRef.current = null;
    deployGenerationRef.current++;
    activeDeployTokenRef.current = null;
    admissionGenerationRef.current++;
    activeAdmissionTokenRef.current = null;
    clearMemberSecret(false);
    const next = handleAddressInputChange(contractState, e.target.value);
    setContractState(next);
    // Address changed: reset verification, invalidate backupRecoveryStatus, and remove any copy capability
    setRegistrarUi((prev) => ({
      ...prev,
      verificationStatus: 'unverified',
      canCopyOnce: false,
      backupRecoveryStatus: 'none',
    }));
    setCertifierUi((prev) => ({
      ...prev,
      verificationStatus: 'unverified',
      canCopyOnce: false,
      backupRecoveryStatus: 'none',
    }));
    setDeploymentUi((prev) => onDeploymentReset(prev));
    setAdmissionUi((prev) => onAdmissionReset(prev));
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
      resetMemberInventory();

      // If we already have a secret in memory, verify it against the newly attached public state
      if (plaintextSecretRef.current && session.publicState) {
        const matches = verifyRegistrarSecret(session.publicState, plaintextSecretRef.current);
        setRegistrarUi((prev) => ({
          ...prev,
          verificationStatus: matches ? 'verified' : 'failed',
        }));
      }
    } catch (err: unknown) {
      if (!isMounted.current) return;
      resetMemberInventory();
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
    clearRegistrarSecret(false);
    const secretBytes = generateRegistrarSecret();
    plaintextSecretRef.current = secretBytes;

    setRegistrarUi((prev) => onSecretGeneratedOrImported(prev));
    setRegistrarNotice(
      'New 32-byte registrar secret generated. It is kept only for this browser session and is not written to persistent storage.',
    );
    setRegistrarError(null);

    // Verify immediately if attached
    if (contractState.attachedAddress && contractState.inspectedState) {
      const matches = verifyRegistrarSecret(contractState.inspectedState, secretBytes);
      setRegistrarUi((prev) => ({
        ...prev,
        verificationStatus: matches ? 'verified' : 'failed',
      }));
    }
  };

  const handleImportSecretHex = () => {
    setRegistrarError(null);
    setRegistrarNotice(null);
    try {
      const secretBytes = parseRegistrarSecretHex(importHexInput);
      // Immediately clear the input string
      setImportHexInput('');

      clearRegistrarSecret(false);
      plaintextSecretRef.current = secretBytes;

      setRegistrarUi((prev) => onSecretGeneratedOrImported(prev));
      setRegistrarNotice(
        'Registrar secret imported. It is kept only for this browser session and is not written to persistent storage.',
      );

      if (contractState.attachedAddress && contractState.inspectedState) {
        const matches = verifyRegistrarSecret(contractState.inspectedState, secretBytes);
        setRegistrarUi((prev) => ({
          ...prev,
          verificationStatus: matches ? 'verified' : 'failed',
        }));
      }
    } catch (err: unknown) {
      setImportHexInput('');
      setRegistrarError(mapRegistrarOperationError(err));
    }
  };

  const handleVerifySecret = () => {
    if (!contractState.attachedAddress || !contractState.inspectedState) {
      setRegistrarError(
        'Attach to a verified CommonVeil contract before verifying registrar identity.',
      );
      return;
    }
    if (!plaintextSecretRef.current) {
      setRegistrarError('No registrar secret loaded in session memory.');
      return;
    }
    const matches = verifyRegistrarSecret(
      contractState.inspectedState,
      plaintextSecretRef.current,
    );
    setRegistrarUi((prev) => ({
      ...prev,
      verificationStatus: matches ? 'verified' : 'failed',
    }));
    setRegistrarError(null);
  };

  const handleLockSession = () => {
    clearRegistrarSecret(true);
    setRegistrarNotice(
      'Session locked. Secret zeroized in memory. Note that JavaScript runtime cannot guarantee absolute memory scrubbing.',
    );
  };

  // Immediate one-time copy from byte array (no persistent React string state)
  // Protected against rapid double-clicks and stale overlapping generation callbacks
  const handleOneTimeCopySecret = () => {
    if (
      !plaintextSecretRef.current ||
      !registrarUi.canCopyOnce ||
      registrarUi.copyStatus === 'pending' ||
      activeCopyTokenRef.current !== null
    ) {
      return;
    }

    // Capture unique monotonically increasing token for this exact copy attempt
    const operationToken = ++copyGenerationRef.current;
    activeCopyTokenRef.current = operationToken;
    setRegistrarUi((prev) => onCopyAttemptInitiated(prev));

    const hex = bytesToHex(plaintextSecretRef.current);
    navigator.clipboard
      .writeText(hex)
      .then(() => {
        // Stale callback check: must be mounted, token must match active token, and still pending
        if (
          !isMounted.current ||
          activeCopyTokenRef.current !== operationToken
        ) {
          return;
        }
        activeCopyTokenRef.current = null;
        // Permanently disable further copying for this secret
        setRegistrarUi((prev) => onCopyAttemptResult(prev, true));
      })
      .catch((err: unknown) => {
        // Stale callback check: must be mounted, token must match active token, and still pending
        if (
          !isMounted.current ||
          activeCopyTokenRef.current !== operationToken
        ) {
          return;
        }
        activeCopyTokenRef.current = null;
        // Restore retry eligibility on failure and show sanitized error
        setRegistrarUi((prev) => onCopyAttemptResult(prev, false));
        setRegistrarError(mapRegistrarOperationError(err ?? new Error('clipboard')));
      });
  };

  const handleExportBackup = async () => {
    setRegistrarError(null);
    setRegistrarNotice(null);
    if (!plaintextSecretRef.current) {
      setRegistrarError('No registrar secret available to backup.');
      return;
    }
    const val = validatePasswordConfirmation(exportPassphrase, exportConfirmPassphrase);
    if (!val.valid) {
      setRegistrarError(val.error);
      return;
    }
    if (hasPasswordWhitespaceWarning(exportPassphrase) && !ackWhitespaceRegistrar) {
      setRegistrarError('Please acknowledge the leading or trailing whitespace warning before exporting.');
      return;
    }

    try {
      const backupPackage = buildRegistrarBackupPackage(plaintextSecretRef.current);
      const envelope: EncryptedEnvelope = await encryptToEnvelope(
        backupPackage,
        exportPassphrase,
      );

      // Pre-download validation: immediately decrypt and validate envelope in memory
      const restored = await decryptAndValidateEnvelope(
        envelope,
        exportPassphrase,
        validateRegistrarBackupPackage,
      );
      const restoredSecretBytes = parseRegistrarSecretHex(restored.registrarSecret);
      const currentAdminKey = bytesToHex(CommonVeil.pureCircuits.deriveAdminKey(plaintextSecretRef.current));
      const restoredAdminKey = bytesToHex(CommonVeil.pureCircuits.deriveAdminKey(restoredSecretBytes));
      if (currentAdminKey.toLowerCase() !== restoredAdminKey.toLowerCase()) {
        throw new Error('Pre-download backup validation failed: derived admin key mismatch.');
      }

      triggerBlobDownload(
        JSON.stringify(envelope, null, 2),
        `commonveil-registrar-backup-${Date.now()}.json`,
      );

      setExportPassphrase('');
      setExportConfirmPassphrase('');
      setAckWhitespaceRegistrar(false);
      setRegistrarUi((prev) => onBackupExported(prev));
      setRegistrarNotice(
        'Encrypted backup created and downloaded. Test the downloaded backup below to complete recovery verification.',
      );
    } catch (err: unknown) {
      setRegistrarError(mapRegistrarOperationError(err));
    }
  };

  const handleTestBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegistrarError(null);
    setRegistrarNotice(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setTestBackupFileContent(content);
        setRegistrarNotice('Downloaded backup file loaded for recovery test. Enter passphrase to test.');
      }
    };
    reader.onerror = () => {
      setRegistrarError('Could not read the selected backup file.');
    };
    reader.readAsText(file);
  };

  const handleTestDownloadedRegistrarBackup = async () => {
    setRegistrarError(null);
    setRegistrarNotice(null);
    if (!testBackupFileContent) {
      setRegistrarError('The selected file is not a valid CommonVeil encrypted backup.');
      return;
    }
    if (!plaintextSecretRef.current) {
      setRegistrarError('No active registrar secret in memory to verify against.');
      return;
    }
    if (testBackupPassphrase.length < 12) {
      setRegistrarError('Passphrase must be at least 12 characters.');
      return;
    }

    try {
      let parsedEnvelope: unknown;
      try {
        parsedEnvelope = JSON.parse(testBackupFileContent);
      } catch {
        throw new Error('The selected file is not a valid CommonVeil encrypted backup.');
      }

      const restored = await decryptAndValidateEnvelope(
        parsedEnvelope as EncryptedEnvelope,
        testBackupPassphrase,
        validateRegistrarBackupPackage,
      );

      const restoredSecretBytes = parseRegistrarSecretHex(restored.registrarSecret);
      const activeAdminKey = bytesToHex(CommonVeil.pureCircuits.deriveAdminKey(plaintextSecretRef.current));
      const restoredAdminKey = bytesToHex(CommonVeil.pureCircuits.deriveAdminKey(restoredSecretBytes));

      if (activeAdminKey.toLowerCase() !== restoredAdminKey.toLowerCase()) {
        throw new Error('Recovery test failed: backup identity does not match active session identity.');
      }

      setRegistrarUi((prev) => onBackupRecoveryTested(prev));
      setTestBackupPassphrase('');
      setTestBackupFileContent(null);
      setRegistrarNotice('Downloaded backup successfully tested and verified! Recovery is confirmed.');
    } catch (err: unknown) {
      setRegistrarError(mapRegistrarOperationError(err));
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
      setRegistrarError('Could not read the selected backup file.');
    };
    reader.readAsText(file);
  };

  const handleImportBackup = async () => {
    setRegistrarError(null);
    setRegistrarNotice(null);
    if (!backupFileContent) {
      setRegistrarError('The selected file is not a valid CommonVeil encrypted backup.');
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
        throw new Error('The selected file is not a valid CommonVeil encrypted backup.');
      }

      const restored = await decryptAndValidateEnvelope(
        parsedEnvelope as EncryptedEnvelope,
        importPassphrase,
        validateRegistrarBackupPackage,
      );

      const secretBytes = parseRegistrarSecretHex(restored.registrarSecret);
      clearRegistrarSecret(false);
      plaintextSecretRef.current = secretBytes;

      // Restored from backup: NEVER permits plaintext copying or revealing
      setRegistrarUi((prev) => onSecretRestoredFromBackup(prev));
      setImportPassphrase('');
      setBackupFileContent(null);
      setRegistrarNotice(
        'Registrar secret restored from encrypted backup into session memory. Note: Plaintext copy is disabled for restored backups.',
      );

      if (contractState.attachedAddress && contractState.inspectedState) {
        const matches = verifyRegistrarSecret(contractState.inspectedState, secretBytes);
        setRegistrarUi((prev) => ({
          ...prev,
          verificationStatus: matches ? 'verified' : 'failed',
        }));
      }
    } catch (err: unknown) {
      setRegistrarError(mapRegistrarOperationError(err));
    }
  };

  // --- Certifier Workspace Handlers ---

  const handleGenerateCertifierSecret = () => {
    clearCertifierSecret(false);
    const secretBytes = generateCertifierSecret();
    plaintextCertifierSecretRef.current = secretBytes;

    setCertifierUi((prev) => onSecretGeneratedOrImported(prev));
    setCertifierNotice(
      'New 32-byte Certifier secret generated. It is kept only in volatile session memory.',
    );
    setCertifierError(null);

    if (contractState.attachedAddress && contractState.inspectedState) {
      const derivedKey = bytesToHex(CommonVeil.pureCircuits.deriveCertifierKey(secretBytes));
      const matches = derivedKey.toLowerCase() === contractState.inspectedState.certifierKey.toLowerCase();
      setCertifierUi((prev) => ({
        ...prev,
        verificationStatus: matches ? 'verified' : 'failed',
      }));
    }
  };

  const handleImportCertifierSecretHex = () => {
    setCertifierError(null);
    setCertifierNotice(null);
    try {
      const secretBytes = parseCertifierSecretHex(certifierImportHexInput);
      setCertifierImportHexInput('');

      clearCertifierSecret(false);
      plaintextCertifierSecretRef.current = secretBytes;

      setCertifierUi((prev) => onSecretGeneratedOrImported(prev));
      setCertifierNotice(
        'Certifier secret imported. It is kept only in volatile session memory.',
      );

      if (contractState.attachedAddress && contractState.inspectedState) {
        const derivedKey = bytesToHex(CommonVeil.pureCircuits.deriveCertifierKey(secretBytes));
        const matches = derivedKey.toLowerCase() === contractState.inspectedState.certifierKey.toLowerCase();
        setCertifierUi((prev) => ({
          ...prev,
          verificationStatus: matches ? 'verified' : 'failed',
        }));
      }
    } catch (err: unknown) {
      setCertifierImportHexInput('');
      setCertifierError(mapCertifierOperationError(err));
    }
  };

  const handleVerifyCertifierSecret = () => {
    if (!contractState.attachedAddress || !contractState.inspectedState) {
      setCertifierError(
        'Attach to a verified CommonVeil contract before verifying Certifier authority.',
      );
      return;
    }
    if (!plaintextCertifierSecretRef.current) {
      setCertifierError('No Certifier secret loaded in session memory.');
      return;
    }
    const derivedKey = bytesToHex(
      CommonVeil.pureCircuits.deriveCertifierKey(plaintextCertifierSecretRef.current),
    );
    const matches = derivedKey.toLowerCase() === contractState.inspectedState.certifierKey.toLowerCase();
    setCertifierUi((prev) => ({
      ...prev,
      verificationStatus: matches ? 'verified' : 'failed',
    }));
    setCertifierError(null);
  };

  const handleLockCertifierSession = () => {
    clearCertifierSecret(true);
    setCertifierNotice(
      'Certifier session locked. Secret zeroized in memory.',
    );
  };

  const handleOneTimeCopyCertifierSecret = () => {
    if (
      !plaintextCertifierSecretRef.current ||
      !certifierUi.canCopyOnce ||
      certifierUi.copyStatus === 'pending' ||
      activeCertifierCopyTokenRef.current !== null
    ) {
      return;
    }

    const operationToken = ++certifierCopyGenerationRef.current;
    activeCertifierCopyTokenRef.current = operationToken;
    setCertifierUi((prev) => onCopyAttemptInitiated(prev));

    const hex = bytesToHex(plaintextCertifierSecretRef.current);
    navigator.clipboard
      .writeText(hex)
      .then(() => {
        if (!isMounted.current || activeCertifierCopyTokenRef.current !== operationToken) {
          return;
        }
        activeCertifierCopyTokenRef.current = null;
        setCertifierUi((prev) => onCopyAttemptResult(prev, true));
      })
      .catch((err: unknown) => {
        if (!isMounted.current || activeCertifierCopyTokenRef.current !== operationToken) {
          return;
        }
        activeCertifierCopyTokenRef.current = null;
        setCertifierUi((prev) => onCopyAttemptResult(prev, false));
        setCertifierError(mapCertifierOperationError(err ?? new Error('clipboard')));
      });
  };

  const handleExportCertifierBackup = async () => {
    setCertifierError(null);
    setCertifierNotice(null);
    if (!plaintextCertifierSecretRef.current) {
      setCertifierError('No Certifier secret available to backup.');
      return;
    }
    const val = validatePasswordConfirmation(certifierExportPassphrase, certifierExportConfirmPassphrase);
    if (!val.valid) {
      setCertifierError(val.error);
      return;
    }
    if (hasPasswordWhitespaceWarning(certifierExportPassphrase) && !ackWhitespaceCertifier) {
      setCertifierError('Please acknowledge the leading or trailing whitespace warning before exporting.');
      return;
    }

    try {
      const backupPackage = buildCertifierBackupPackage(plaintextCertifierSecretRef.current);
      const envelope: EncryptedEnvelope = await encryptToEnvelope(
        backupPackage,
        certifierExportPassphrase,
      );

      // Pre-download validation: immediately decrypt and validate envelope in memory
      const restored = await decryptAndValidateEnvelope(
        envelope,
        certifierExportPassphrase,
        validateCertifierBackupPackage,
      );
      const restoredSecretBytes = parseCertifierSecretHex(restored.certifierSecret);
      const currentCertifierKey = bytesToHex(CommonVeil.pureCircuits.deriveCertifierKey(plaintextCertifierSecretRef.current));
      const restoredCertifierKey = bytesToHex(CommonVeil.pureCircuits.deriveCertifierKey(restoredSecretBytes));
      if (currentCertifierKey.toLowerCase() !== restoredCertifierKey.toLowerCase()) {
        throw new Error('Pre-download backup validation failed: derived certifier key mismatch.');
      }

      triggerBlobDownload(
        JSON.stringify(envelope, null, 2),
        `commonveil-certifier-backup-${Date.now()}.json`,
      );

      setCertifierExportPassphrase('');
      setCertifierExportConfirmPassphrase('');
      setAckWhitespaceCertifier(false);
      setCertifierUi((prev) => onBackupExported(prev));
      setCertifierNotice(
        'Encrypted backup created and downloaded. Test the downloaded backup below to complete recovery verification.',
      );
    } catch (err: unknown) {
      setCertifierError(mapCertifierOperationError(err));
    }
  };

  const handleCertifierTestBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCertifierError(null);
    setCertifierNotice(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setCertifierTestBackupFileContent(content);
        setCertifierNotice('Downloaded certifier backup loaded for recovery test. Enter passphrase to test.');
      }
    };
    reader.onerror = () => {
      setCertifierError('Could not read the selected backup file.');
    };
    reader.readAsText(file);
  };

  const handleTestDownloadedCertifierBackup = async () => {
    setCertifierError(null);
    setCertifierNotice(null);
    if (!certifierTestBackupFileContent) {
      setCertifierError('The selected file is not a valid CommonVeil encrypted backup.');
      return;
    }
    if (!plaintextCertifierSecretRef.current) {
      setCertifierError('No active Certifier secret in memory to verify against.');
      return;
    }
    if (certifierTestBackupPassphrase.length < 12) {
      setCertifierError('Passphrase must be at least 12 characters.');
      return;
    }

    try {
      let parsedEnvelope: unknown;
      try {
        parsedEnvelope = JSON.parse(certifierTestBackupFileContent);
      } catch {
        throw new Error('The selected file is not a valid CommonVeil encrypted backup.');
      }

      const restored = await decryptAndValidateEnvelope(
        parsedEnvelope as EncryptedEnvelope,
        certifierTestBackupPassphrase,
        validateCertifierBackupPackage,
      );

      const restoredSecretBytes = parseCertifierSecretHex(restored.certifierSecret);
      const activeCertifierKey = bytesToHex(CommonVeil.pureCircuits.deriveCertifierKey(plaintextCertifierSecretRef.current));
      const restoredCertifierKey = bytesToHex(CommonVeil.pureCircuits.deriveCertifierKey(restoredSecretBytes));

      if (activeCertifierKey.toLowerCase() !== restoredCertifierKey.toLowerCase()) {
        throw new Error('Recovery test failed: backup identity does not match active session identity.');
      }

      setCertifierUi((prev) => onBackupRecoveryTested(prev));
      setCertifierTestBackupPassphrase('');
      setCertifierTestBackupFileContent(null);
      setCertifierNotice('Downloaded Certifier backup successfully tested and verified! Recovery is confirmed.');
    } catch (err: unknown) {
      setCertifierError(mapCertifierOperationError(err));
    }
  };

  const handleCertifierBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCertifierError(null);
    setCertifierNotice(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setCertifierBackupFileContent(content);
        setCertifierNotice('Certifier backup file loaded. Enter passphrase to decrypt and restore.');
      }
    };
    reader.onerror = () => {
      setCertifierError('Could not read the selected backup file.');
    };
    reader.readAsText(file);
  };

  const handleImportCertifierBackup = async () => {
    setCertifierError(null);
    setCertifierNotice(null);
    if (!certifierBackupFileContent) {
      setCertifierError('The selected file is not a valid CommonVeil encrypted backup.');
      return;
    }
    if (certifierImportPassphrase.length < 12) {
      setCertifierError('Passphrase must be at least 12 characters.');
      return;
    }

    try {
      let parsedEnvelope: unknown;
      try {
        parsedEnvelope = JSON.parse(certifierBackupFileContent);
      } catch {
        throw new Error('The selected file is not a valid CommonVeil encrypted backup.');
      }

      const restored = await decryptAndValidateEnvelope(
        parsedEnvelope as EncryptedEnvelope,
        certifierImportPassphrase,
        validateCertifierBackupPackage,
      );

      const secretBytes = parseCertifierSecretHex(restored.certifierSecret);
      clearCertifierSecret(false);
      plaintextCertifierSecretRef.current = secretBytes;

      setCertifierUi((prev) => onSecretRestoredFromBackup(prev));
      setCertifierImportPassphrase('');
      setCertifierBackupFileContent(null);
      setCertifierNotice(
        'Certifier secret restored from encrypted backup into session memory. Note: Plaintext copy is disabled for restored backups.',
      );

      if (contractState.attachedAddress && contractState.inspectedState) {
        const derivedKey = bytesToHex(CommonVeil.pureCircuits.deriveCertifierKey(secretBytes));
        const matches = derivedKey.toLowerCase() === contractState.inspectedState.certifierKey.toLowerCase();
        setCertifierUi((prev) => ({
          ...prev,
          verificationStatus: matches ? 'verified' : 'failed',
        }));
      }
    } catch (err: unknown) {
      setCertifierError(mapCertifierOperationError(err));
    }
  };

  const handleExportCertifierKeyPackage = () => {
    setCertifierError(null);
    setCertifierNotice(null);
    if (!plaintextCertifierSecretRef.current) {
      setCertifierError('No active Certifier secret in memory to derive public key.');
      return;
    }
    if (!canExportCertifierKeyPackage({
      hasSecret: certifierUi.hasSecret,
      backupRecoveryStatus: certifierUi.backupRecoveryStatus,
    })) {
      setCertifierError('Certifier backup must be tested and verified before exporting the public key package.');
      return;
    }

    try {
      const derivedPublicKeyBytes = CommonVeil.pureCircuits.deriveCertifierKey(
        plaintextCertifierSecretRef.current,
      );
      const pkg = buildCertifierKeyPackage(derivedPublicKeyBytes);

      triggerBlobDownload(
        JSON.stringify(pkg, null, 2),
        `commonveil-certifier-key-${Date.now()}.json`,
      );

      setCertifierNotice(
        'Public Certifier Key Package exported. Share this package with the Registrar for contract deployment.',
      );
    } catch (err: unknown) {
      setCertifierError(mapCertifierOperationError(err));
    }
  };

  // --- Registrar Certifier Key Package Import ---

  const handleCertifierKeyPackageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegistrarError(null);
    setRegistrarNotice(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content !== 'string') return;
      try {
        const parsed = JSON.parse(content);
        const validated: CertifierKeyPackage = validateCertifierKeyPackage(parsed);
        if (validated.certifierKey === '00'.repeat(32)) {
          throw new Error('Certifier public key cannot be a zero key.');
        }
        setDeploymentUi((prev) => onCertifierKeyImported(prev, validated.certifierKey));
        setRegistrarNotice('Certifier public key package imported and validated successfully.');
      } catch (err: unknown) {
        setRegistrarError(mapRegistrarOperationError(err));
      }
    };
    reader.onerror = () => {
      setRegistrarError('Could not read the selected Certifier key package file.');
    };
    reader.readAsText(file);
  };

  // --- Registrar Contract Deployment Flow ---

  const handleStartDeployConfirmation = () => {
    if (!wallet || !plaintextSecretRef.current || isDeploying) return;
    setDeploymentUi((prev) => onDeploymentConfirmOpen(prev));
  };

  const handleCancelDeployConfirmation = () => {
    setDeploymentUi((prev) => onDeploymentConfirmCancel(prev));
  };

  const handleToggleBackupConfirmed = (confirmed: boolean) => {
    setDeploymentUi((prev) => ({
      ...prev,
      backupConfirmed: confirmed,
    }));
  };

  const handleDeployContract = async () => {
    if (!wallet || !plaintextSecretRef.current || isDeploying) return;
    if (!deploymentUi.backupConfirmed) return;
    if (!deploymentUi.certifierPublicKey) {
      setDeploymentUi((prev) =>
        onDeploymentFailed(prev, 'A validated Certifier public key package is required before deployment.'),
      );
      return;
    }

    // Issue unique deployment token for stale async protection
    const operationToken = ++deployGenerationRef.current;
    activeDeployTokenRef.current = operationToken;

    // 1. Enter visible waiting for wallet approval state
    setDeploymentUi((prev) => onDeploymentWalletRequest(prev));

    try {
      // 2. Derive AdminKey purely locally from session secret; certifier key from validated package
      const adminKey = CommonVeil.pureCircuits.deriveAdminKey(plaintextSecretRef.current);
      const certifierPublicKeyBytes = hexToBytes(deploymentUi.certifierPublicKey);

      // Transition to submitting/deploying state once SDK begins processing
      setDeploymentUi((prev) => onDeploymentSubmitting(prev));

      const deployed = await deployContract(wallet.providers, {
        compiledContract: CompiledCommonVeilContract,
        privateStateId: PRIVATE_STATE_ID,
        initialPrivateState: {},
        args: [adminKey, certifierPublicKeyBytes],
      });

      // Verify token freshness and component mount
      if (!isMounted.current || activeDeployTokenRef.current !== operationToken) {
        return;
      }

      // Preserve contract address.
      // Note: @midnight-ntwrk/midnight-js-contracts deployContract returns DeployedContract<C>
      // whose deployTxData.public is UnsubmittedDeployTxPublicData: { contractAddress, initialContractState }.
      // It does not explicitly expose a transaction ID, so deploymentTxId is left null.
      const deployedAddress = deployed.deployTxData.public.contractAddress;
      const deployTxId: string | null = null;

      // 3. Automatically inspect the returned contract address via public indexer
      try {
        const session = await queryCommonVeilContract(wallet.providers, deployedAddress);
        if (!isMounted.current || activeDeployTokenRef.current !== operationToken) {
          return;
        }

        // Verify that deployed ledger's admin key equals derived key
        const matches = verifyRegistrarSecret(session.publicState, plaintextSecretRef.current);
        if (!matches) {
          throw new ContractSessionError(
            'INCOMPATIBLE_CONTRACT',
            'Deployed contract registrar key does not match active secret.',
          );
        }

        // Build and validate deployment receipt
        const receipt: DeploymentReceipt = validateDeploymentReceipt({
          schema: 'commonveil.deployment-receipt/v1',
          network: 'preprod',
          contractAddress: deployedAddress,
          deploymentTxId: deployTxId,
          registrarPublicKey: bytesToHex(adminKey),
          certifierPublicKey: deploymentUi.certifierPublicKey,
          deployedAt: new Date().toISOString(),
          status: 'finalized',
        });

        // Scope private-state provider to deployed address
        wallet.providers.privateStateProvider.setContractAddress(deployedAddress);

        // Update contract and registrar verification state
        setContractState((prev) => ({
          ...prev,
          addressInput: deployedAddress,
          inspectionState: 'attached',
          inspectedState: session.publicState,
          attachedAddress: deployedAddress,
          errorMessage: null,
        }));

        setRegistrarUi((prev) => ({
          ...prev,
          verificationStatus: 'verified',
        }));

        setDeploymentUi((prev) => onDeploymentCompleted(prev, receipt));
      } catch (inspectError: unknown) {
        if (!isMounted.current || activeDeployTokenRef.current !== operationToken) {
          return;
        }

        // Differentiate indexer lag vs hard failures:
        // Only enter finalized-indexing for CONTRACT_NOT_FOUND or INDEXER_QUERY_FAILED.
        // INCOMPATIBLE_CONTRACT or key mismatch is a hard failure!
        const errorCode =
          inspectError instanceof ContractSessionError
            ? inspectError.code
            : (inspectError as any)?.code;

        if (errorCode === 'CONTRACT_NOT_FOUND' || errorCode === 'INDEXER_QUERY_FAILED') {
          setDeploymentUi((prev) =>
            onDeploymentFinalizedIndexing(prev, {
              contractAddress: deployedAddress,
              deploymentTxId: deployTxId,
            }),
          );
        } else {
          // Hard failure: sanitized fixed message, never leaking stack/endpoints/decoder/internals
          const safeErrorMsg = mapDeploymentInspectionError(inspectError);
          setDeploymentUi((prev) => onDeploymentFailed(prev, safeErrorMsg));
        }
      }
    } catch (deployError: unknown) {
      if (!isMounted.current || activeDeployTokenRef.current !== operationToken) {
        return;
      }
      activeDeployTokenRef.current = null;

      const raw = (
        deployError instanceof Error
          ? deployError.message
          : typeof deployError === 'string'
            ? deployError
            : ''
      ).toLowerCase();

      if (
        raw.includes('cancel') ||
        raw.includes('reject') ||
        raw.includes('denied') ||
        raw.includes('declined') ||
        raw.includes('user aborted')
      ) {
        setDeploymentUi((prev) => onDeploymentCancelled(prev));
      } else {
        setDeploymentUi((prev) =>
          onDeploymentFailed(prev, mapDeploymentError(deployError)),
        );
      }
    }
  };

  const handleRetryIndexerInspection = async () => {
    if (
      !wallet ||
      !plaintextSecretRef.current ||
      !deploymentUi.contractAddress ||
      !deploymentUi.certifierPublicKey ||
      deploymentUi.stage !== 'finalized-indexing'
    ) {
      return;
    }

    const contractAddress = deploymentUi.contractAddress;
    const deployTxId = deploymentUi.deploymentTxId;

    try {
      const session = await queryCommonVeilContract(wallet.providers, contractAddress);
      if (!isMounted.current) return;

      const matches = verifyRegistrarSecret(session.publicState, plaintextSecretRef.current);
      if (!matches) {
        setDeploymentUi((prev) =>
          onDeploymentFailed(prev, DEPLOYMENT_VERIFICATION_ERROR_MESSAGES.REGISTRAR_KEY_MISMATCH),
        );
        return;
      }

      const adminKey = CommonVeil.pureCircuits.deriveAdminKey(plaintextSecretRef.current);
      const receipt: DeploymentReceipt = validateDeploymentReceipt({
        schema: 'commonveil.deployment-receipt/v1',
        network: 'preprod',
        contractAddress,
        deploymentTxId: deployTxId,
        registrarPublicKey: bytesToHex(adminKey),
        certifierPublicKey: deploymentUi.certifierPublicKey,
        deployedAt: new Date().toISOString(),
        status: 'finalized',
      });

      wallet.providers.privateStateProvider.setContractAddress(contractAddress);

      setContractState((prev) => ({
        ...prev,
        addressInput: contractAddress,
        inspectionState: 'attached',
        inspectedState: session.publicState,
        attachedAddress: contractAddress,
        errorMessage: null,
      }));

      setRegistrarUi((prev) => ({
        ...prev,
        verificationStatus: 'verified',
      }));

      setDeploymentUi((prev) => onDeploymentCompleted(prev, receipt));
    } catch (inspectError: unknown) {
      const errorCode =
        inspectError instanceof ContractSessionError
          ? inspectError.code
          : (inspectError as any)?.code;

      if (errorCode === 'CONTRACT_NOT_FOUND' || errorCode === 'INDEXER_QUERY_FAILED') {
        // CONTRACT_NOT_FOUND and INDEXER_QUERY_FAILED remain retryable (stay in finalized-indexing)
        return;
      }

      // Hard failure (INCOMPATIBLE_CONTRACT, key mismatch, or unknown error): map to fixed safe error
      const safeErrorMsg = mapDeploymentInspectionError(inspectError);
      setDeploymentUi((prev) => onDeploymentFailed(prev, safeErrorMsg));
    }
  };

  const handleDownloadDeploymentReceipt = () => {
    if (!deploymentUi.receipt) return;
    try {
      const validated = validateDeploymentReceipt(deploymentUi.receipt);
      triggerBlobDownload(
        JSON.stringify(validated, null, 2),
        `commonveil-deployment-receipt-${validated.contractAddress.slice(0, 10)}.json`,
      );
    } catch (err: unknown) {
      setDeploymentUi((prev) =>
        onDeploymentFailed(prev, 'Could not create valid deployment receipt.'),
      );
    }
  };

  // ============================================================================
  // Member Identity & Encrypted Backup Handlers
  // ============================================================================

  const handleGenerateMemberIdentity = () => {
    setMemberError(null);
    setMemberNotice(null);
    try {
      const secretBytes = generateMemberSecretOrSalt();
      const saltBytes = generateMemberSecretOrSalt();
      const credentialBytes = CommonVeil.pureCircuits.deriveMemberCredential(secretBytes, saltBytes);
      const credentialHex = bytesToHex(credentialBytes);

      clearMemberSecret(false);
      plaintextMemberSecretRef.current = secretBytes;
      plaintextMemberSaltRef.current = saltBytes;

      setMemberUi((prev) => onMemberSecretGeneratedOrImported(prev, credentialHex));
      setMemberNotice(
        'Fresh Member secret and salt generated. Credential derived locally in volatile session memory.',
      );
    } catch (err: unknown) {
      setMemberError(mapMemberOperationError(err));
    }
  };

  const handleImportMemberIdentityHex = () => {
    setMemberError(null);
    setMemberNotice(null);
    try {
      const secretBytes = parseMemberSecretOrSaltHex(memberImportSecretHexInput, 'Member secret');
      const saltBytes = parseMemberSecretOrSaltHex(memberImportSaltHexInput, 'Member salt');

      // Enforce independence: secret and salt must not be identical
      if (bytesToHex(secretBytes).toLowerCase() === bytesToHex(saltBytes).toLowerCase()) {
        throw new Error('Member secret and member salt must be distinct and independent values.');
      }

      const credentialBytes = CommonVeil.pureCircuits.deriveMemberCredential(secretBytes, saltBytes);
      const credentialHex = bytesToHex(credentialBytes);

      clearMemberSecret(false);
      plaintextMemberSecretRef.current = secretBytes;
      plaintextMemberSaltRef.current = saltBytes;

      setMemberUi((prev) => onMemberSecretGeneratedOrImported(prev, credentialHex));
      setMemberImportSecretHexInput('');
      setMemberImportSaltHexInput('');
      setMemberNotice('Member secret and salt imported. Credential derived locally in session memory.');
    } catch (err: unknown) {
      setMemberImportSecretHexInput('');
      setMemberImportSaltHexInput('');
      setMemberError(mapMemberOperationError(err));
    }
  };

  const handleLockMemberSession = () => {
    clearMemberSecret(true);
    setMemberNotice('Member session locked. Secret and salt zeroized in session memory.');
  };

  const handleOneTimeCopyMemberSecret = () => {
    if (
      !plaintextMemberSecretRef.current ||
      !memberUi.canCopyOnce ||
      memberUi.copyStatus === 'pending' ||
      activeMemberCopyTokenRef.current !== null
    ) {
      return;
    }

    const operationToken = ++memberCopyGenerationRef.current;
    activeMemberCopyTokenRef.current = operationToken;
    setMemberUi((prev) => onCopyAttemptInitiated(prev as any) as any);

    const secretHex = bytesToHex(plaintextMemberSecretRef.current);
    navigator.clipboard
      .writeText(secretHex)
      .then(() => {
        if (!isMounted.current || activeMemberCopyTokenRef.current !== operationToken) {
          return;
        }
        activeMemberCopyTokenRef.current = null;
        setMemberUi((prev) => onCopyAttemptResult(prev as any, true) as any);
      })
      .catch((err: unknown) => {
        if (!isMounted.current || activeMemberCopyTokenRef.current !== operationToken) {
          return;
        }
        activeMemberCopyTokenRef.current = null;
        setMemberUi((prev) => onCopyAttemptResult(prev as any, false) as any);
        setMemberError(mapMemberOperationError(err ?? new Error('clipboard')));
      });
  };

  const handleExportMemberBackup = async () => {
    setMemberError(null);
    setMemberNotice(null);
    if (!plaintextMemberSecretRef.current || !plaintextMemberSaltRef.current) {
      setMemberError('No Member secret and salt available to backup.');
      return;
    }
    const val = validatePasswordConfirmation(memberExportPassphrase, memberExportConfirmPassphrase);
    if (!val.valid) {
      setMemberError(val.error);
      return;
    }
    if (hasPasswordWhitespaceWarning(memberExportPassphrase) && !ackWhitespaceMember) {
      setMemberError('Please acknowledge the leading or trailing whitespace warning before exporting.');
      return;
    }

    try {
      const backupPackage = buildMemberBackupPackage(
        plaintextMemberSecretRef.current,
        plaintextMemberSaltRef.current,
      );
      const envelope: EncryptedEnvelope = await encryptToEnvelope(
        backupPackage,
        memberExportPassphrase,
      );

      // Pre-download validation: immediately decrypt and validate envelope in memory
      const restored = await decryptAndValidateEnvelope(
        envelope,
        memberExportPassphrase,
        validateMemberBackupPackage,
      );
      const restoredSecretBytes = parseMemberSecretOrSaltHex(restored.memberSecret, 'Member secret');
      const restoredSaltBytes = parseMemberSecretOrSaltHex(restored.memberSalt, 'Member salt');
      const currentCred = bytesToHex(CommonVeil.pureCircuits.deriveMemberCredential(
        plaintextMemberSecretRef.current,
        plaintextMemberSaltRef.current,
      ));
      const restoredCred = bytesToHex(CommonVeil.pureCircuits.deriveMemberCredential(
        restoredSecretBytes,
        restoredSaltBytes,
      ));
      if (currentCred.toLowerCase() !== restoredCred.toLowerCase()) {
        throw new Error('Pre-download backup validation failed: derived member credential mismatch.');
      }

      triggerBlobDownload(
        JSON.stringify(envelope, null, 2),
        `commonveil-member-backup-${Date.now()}.json`,
      );

      setMemberExportPassphrase('');
      setMemberExportConfirmPassphrase('');
      setAckWhitespaceMember(false);
      setMemberUi((prev) => onBackupExported(prev));
      setMemberNotice(
        'Encrypted backup created and downloaded. Test the downloaded backup below to complete recovery verification.',
      );
    } catch (err: unknown) {
      setMemberError(mapMemberOperationError(err));
    }
  };

  const handleMemberTestBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMemberError(null);
    setMemberNotice(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setMemberTestBackupFileContent(content);
        setMemberNotice('Downloaded member backup loaded for recovery test. Enter passphrase to test.');
      }
    };
    reader.onerror = () => {
      setMemberError('Could not read the selected backup file.');
    };
    reader.readAsText(file);
  };

  const handleTestDownloadedMemberBackup = async () => {
    setMemberError(null);
    setMemberNotice(null);
    if (!memberTestBackupFileContent) {
      setMemberError('The selected file is not a valid CommonVeil encrypted backup.');
      return;
    }
    if (!plaintextMemberSecretRef.current || !plaintextMemberSaltRef.current) {
      setMemberError('No active Member secret and salt in memory to verify against.');
      return;
    }
    if (memberTestBackupPassphrase.length < 12) {
      setMemberError('Passphrase must be at least 12 characters.');
      return;
    }

    try {
      let parsedEnvelope: unknown;
      try {
        parsedEnvelope = JSON.parse(memberTestBackupFileContent);
      } catch {
        throw new Error('The selected file is not a valid CommonVeil encrypted backup.');
      }

      const restored = await decryptAndValidateEnvelope(
        parsedEnvelope as EncryptedEnvelope,
        memberTestBackupPassphrase,
        validateMemberBackupPackage,
      );

      const restoredSecretBytes = parseMemberSecretOrSaltHex(restored.memberSecret, 'Member secret');
      const restoredSaltBytes = parseMemberSecretOrSaltHex(restored.memberSalt, 'Member salt');

      const activeCred = bytesToHex(CommonVeil.pureCircuits.deriveMemberCredential(
        plaintextMemberSecretRef.current,
        plaintextMemberSaltRef.current,
      ));
      const restoredCred = bytesToHex(CommonVeil.pureCircuits.deriveMemberCredential(
        restoredSecretBytes,
        restoredSaltBytes,
      ));

      if (activeCred.toLowerCase() !== restoredCred.toLowerCase()) {
        throw new Error('Recovery test failed: backup identity does not match active session identity.');
      }

      setMemberUi((prev) => onBackupRecoveryTested(prev));
      setMemberTestBackupPassphrase('');
      setMemberTestBackupFileContent(null);
      setMemberNotice('Downloaded Member backup successfully tested and verified! Recovery is confirmed.');
    } catch (err: unknown) {
      setMemberError(mapMemberOperationError(err));
    }
  };

  const handleMemberBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMemberError(null);
    setMemberNotice(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content !== 'string') return;
      setMemberBackupFileContent(content);
    };
    reader.onerror = () => {
      setMemberError('Could not read the selected backup file.');
    };
    reader.readAsText(file);
  };

  const handleImportMemberBackup = async () => {
    setMemberError(null);
    setMemberNotice(null);
    if (!memberBackupFileContent) {
      setMemberError('The selected file is not a valid CommonVeil encrypted backup.');
      return;
    }
    if (memberImportPassphrase.length < 12) {
      setMemberError('Passphrase must be at least 12 characters.');
      return;
    }

    try {
      let parsedEnvelope: unknown;
      try {
        parsedEnvelope = JSON.parse(memberBackupFileContent);
      } catch {
        throw new Error('The selected file is not a valid CommonVeil encrypted backup.');
      }

      const restored = await decryptAndValidateEnvelope(
        parsedEnvelope as EncryptedEnvelope,
        memberImportPassphrase,
        validateMemberBackupPackage,
      );

      const secretBytes = parseMemberSecretOrSaltHex(restored.memberSecret, 'Member secret');
      const saltBytes = parseMemberSecretOrSaltHex(restored.memberSalt, 'Member salt');

      if (bytesToHex(secretBytes).toLowerCase() === bytesToHex(saltBytes).toLowerCase()) {
        throw new Error('Restored member secret and member salt must be distinct values.');
      }

      const credentialBytes = CommonVeil.pureCircuits.deriveMemberCredential(secretBytes, saltBytes);
      const credentialHex = bytesToHex(credentialBytes);

      clearMemberSecret(false);
      plaintextMemberSecretRef.current = secretBytes;
      plaintextMemberSaltRef.current = saltBytes;

      setMemberUi((prev) => onMemberSecretRestoredFromBackup(prev, credentialHex));
      setMemberImportPassphrase('');
      setMemberBackupFileContent(null);
      setMemberNotice(
        'Member secret and salt restored from encrypted backup into session memory. Note: Plaintext copy is disabled for restored backups.',
      );
    } catch (err: unknown) {
      setMemberError(mapMemberOperationError(err));
    }
  };

  const handleExportMemberAdmissionPackage = () => {
    setMemberError(null);
    setMemberNotice(null);
    if (!contractState.attachedAddress) {
      setMemberError('Attach to a verified CommonVeil contract before exporting an admission package.');
      return;
    }
    if (!plaintextMemberSecretRef.current || !plaintextMemberSaltRef.current) {
      setMemberError('No active Member identity in session memory.');
      return;
    }
    if (!canExportMemberAdmissionPackage({
      hasSecret: memberUi.hasSecret,
      attachedContractAddress: contractState.attachedAddress,
      backupRecoveryStatus: memberUi.backupRecoveryStatus,
    })) {
      setMemberError('Member backup must be tested and verified before exporting the admission package.');
      return;
    }

    try {
      const credentialBytes = CommonVeil.pureCircuits.deriveMemberCredential(
        plaintextMemberSecretRef.current,
        plaintextMemberSaltRef.current,
      );

      const admissionPkg = buildMemberAdmissionPackage(
        contractState.attachedAddress,
        credentialBytes,
      );

      triggerBlobDownload(
        JSON.stringify(admissionPkg, null, 2),
        `commonveil-member-admission-${admissionPkg.memberCredential.slice(0, 10)}.json`,
      );

      setMemberNotice(
        'Restricted Member Admission Package downloaded. Send this file to the Registrar to request admission.',
      );
    } catch (err: unknown) {
      setMemberError(mapMemberOperationError(err));
    }
  };

  // ============================================================================
  // Member Live Inventory & Certification Request Handlers
  // ============================================================================

  const handleMemberInventoryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMemberError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (!isMounted.current) return;
      try {
        const text = String(event.target?.result ?? '');
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error('The selected file is not valid JSON.');
        }

        const validatedReport = await validateLiveInventoryReport(parsed);

        // Bind with currently attached contract and member credential if available
        let certRequest: CertificationRequestPackage | null = null;
        if (contractState.attachedAddress && memberUi.memberCredentialHex) {
          certRequest = buildCertificationRequestPackage({
            inventoryReport: validatedReport,
            contractAddress: contractState.attachedAddress,
            memberCredentialHex: memberUi.memberCredentialHex,
          });
        }

        if (isMounted.current) {
          setMemberInventoryUi((prev) =>
            onMemberInventoryImported(prev, {
              fileName: file.name,
              fileSize: file.size,
              report: validatedReport,
              certificationRequest: certRequest!,
            }),
          );
        }
      } catch (err: unknown) {
        if (isMounted.current) {
          setMemberInventoryUi((prev) =>
            onMemberInventoryError(prev, mapInventoryReportError(err)),
          );
          if (memberInventoryInputRef.current) {
            memberInventoryInputRef.current.value = '';
          }
        }
      }
    };

    reader.onerror = () => {
      if (isMounted.current) {
        setMemberInventoryUi((prev) =>
          onMemberInventoryError(prev, 'Could not read the selected inventory file.'),
        );
        if (memberInventoryInputRef.current) {
          memberInventoryInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(file);
  };

  const handleExportCertificationRequest = async () => {
    if (!memberInventoryUi.importedReport) return;

    if (!canExportCertificationRequest({
      isConnected: !!wallet,
      attachedContractAddress: contractState.attachedAddress,
      hasSecret: memberUi.hasSecret,
      hasSalt: !!plaintextMemberSaltRef.current,
      memberCredentialHex: memberUi.memberCredentialHex,
      backupRecoveryStatus: memberUi.backupRecoveryStatus,
      importedInventory: memberInventoryUi.importedReport,
    })) {
      setMemberInventoryUi((prev) =>
        onMemberInventoryError(
          prev,
          'All prerequisites must be satisfied (connected 1AM wallet on Preprod, attached contract, active recovery-tested identity, and validated report) before exporting.',
        ),
      );
      return;
    }

    try {
      const certRequestPkg = buildCertificationRequestPackage({
        inventoryReport: memberInventoryUi.importedReport,
        contractAddress: contractState.attachedAddress!,
        memberCredentialHex: memberUi.memberCredentialHex!,
      });

      const validated = await validateCertificationRequestPackage(certRequestPkg);

      triggerBlobDownload(
        JSON.stringify(validated, null, 2),
        `commonveil-certification-request-${validated.memberCredential.slice(0, 10)}.json`,
      );

      setMemberInventoryUi((prev) => ({
        ...prev,
        noticeMessage:
          'Private Certification Request exported. Send this package to an independent Certifier. Zero blockchain transactions were submitted.',
        errorMessage: null,
      }));
    } catch (err: unknown) {
      setMemberInventoryUi((prev) =>
        onMemberInventoryError(prev, mapInventoryReportError(err)),
      );
    }
  };

  // ============================================================================
  // Registrar Admission Workflow Handlers
  // ============================================================================

  const handleAdmissionPackageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegistrarError(null);
    setAdmissionNotice(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !canInitiateAdmission({
        isConnected: !!wallet,
        attachedContractAddress: contractState.attachedAddress,
        hasSecret: registrarUi.hasSecret,
        verificationStatus: registrarUi.verificationStatus,
        isAdmitting,
      })
    ) {
      setAdmissionUi((prev) =>
        onAdmissionFailed(
          prev,
          'Member admission package import requires a connected wallet on Preprod, an attached contract, and an active verified Registrar secret.',
        ),
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content !== 'string') return;
      try {
        const parsed = JSON.parse(content);
        const validated = validateMemberAdmissionPackage(parsed);

        // State transition with pure contractAddress check and verified authority
        setAdmissionUi((prev) =>
          onAdmissionPackageImported(
            prev,
            validated,
            contractState.attachedAddress,
            registrarUi.verificationStatus,
          ),
        );
      } catch (err: unknown) {
        setAdmissionUi((prev) =>
          onAdmissionFailed(prev, 'The selected file is not a valid Member Admission Package.'),
        );
      }
    };
    reader.onerror = () => {
      setAdmissionUi((prev) =>
        onAdmissionFailed(prev, 'Could not read the selected admission package file.'),
      );
    };
    reader.readAsText(file);
  };

  const handleDismissAdmissionConfirmation = () => {
    setAdmissionUi((prev) => onAdmissionConfirmDismissed(prev));
  };

  const handleResetAdmission = () => {
    setAdmissionUi((prev) => onAdmissionReset(prev));
    setAdmissionNotice(null);
  };

  const handleConfirmAndAdmitMember = async () => {
    setRegistrarError(null);
    setAdmissionNotice(null);

    if (
      !wallet ||
      !contractState.attachedAddress ||
      !plaintextSecretRef.current ||
      !admissionUi.importedPackage ||
      admissionUi.stage !== 'confirming'
    ) {
      return;
    }

    if (
      !canInitiateAdmission({
        isConnected: !!wallet,
        attachedContractAddress: contractState.attachedAddress,
        hasSecret: registrarUi.hasSecret,
        verificationStatus: registrarUi.verificationStatus,
        isAdmitting,
      })
    ) {
      setAdmissionUi((prev) =>
        onAdmissionFailed(
          prev,
          'Registrar authority must be verified against the attached contract before admitting members.',
        ),
      );
      return;
    }

    const attachedAddress = contractState.attachedAddress;
    const importedPkg = admissionUi.importedPackage;
    const credentialHex = importedPkg.memberCredential;

    // Reject if address does not match attached contract
    if (importedPkg.contractAddress.trim() !== attachedAddress.trim()) {
      setAdmissionUi((prev) =>
        onAdmissionFailed(prev, 'Admission package contract address does not match the attached contract.'),
      );
      return;
    }

    // Capture unique admission generation token
    const operationToken = ++admissionGenerationRef.current;
    activeAdmissionTokenRef.current = operationToken;

    // Development diagnostic hook (no secrets, credentials, tokens, or private state)
    const logAdmissionDiagnostic = (stage: string, detail?: { errorClass?: string; errorMessage?: string }) => {
      if (typeof window !== 'undefined' && (window as unknown as { __COMMONVEIL_DEV__?: boolean }).__COMMONVEIL_DEV__) {
        console.debug(`[admission:${stage}]`, detail ?? '');
      }
    };

    logAdmissionDiagnostic('prereqs-validated');
    setAdmissionUi((prev) => onAdmissionWalletRequest(prev));

    try {
      setAdmissionUi((prev) => onAdmissionSubmitting(prev));

      const adminSecretBytes = plaintextSecretRef.current;
      const credentialBytes = hexToBytes(credentialHex);

      logAdmissionDiagnostic('circuit-invoke-start');

      // Call genuine registerMember circuit via installed Midnight SDK.
      // CommonVeil has vacant witness private state (Contract<undefined>).
      // We omit privateStateId to invoke getContractPublicStates and avoid
      // querying uninitialized private state store before proving.
      const finalized = await submitCallTx(
        wallet.providers,
        {
          compiledContract: CompiledCommonVeilContract,
          contractAddress: attachedAddress,
          circuitId: 'registerMember',
          args: [adminSecretBytes, credentialBytes],
        },
      );

      logAdmissionDiagnostic('circuit-finalized');

      if (!isMounted.current || activeAdmissionTokenRef.current !== operationToken) {
        return;
      }

      // Check captured genuine transaction ID from SDK FinalizedTxData
      const txId: string | null =
        finalized && finalized.public && typeof finalized.public.txId === 'string'
          ? finalized.public.txId
          : null;

      // Automatically inspect public ledger to verify memberCredentials contains credential
      try {
        logAdmissionDiagnostic('inspect-ledger-start');
        const session = await queryCommonVeilContract(wallet.providers, attachedAddress);
        if (!isMounted.current || activeAdmissionTokenRef.current !== operationToken) {
          return;
        }

        const isMember = session.hasMemberCredential(credentialBytes);
        if (!isMember) {
          logAdmissionDiagnostic('ledger-indexing-lag');
          // Finalized on-chain, but indexer ledger not yet reflecting it - preserve txId
          setAdmissionUi((prev) => onAdmissionFinalizedIndexing(prev, txId));
          return;
        }

        const receipt: MemberAdmissionReceipt = buildMemberAdmissionReceipt({
          contractAddress: attachedAddress,
          memberCredential: credentialHex,
          admissionTxId: txId,
        });

        activeAdmissionTokenRef.current = null;
        logAdmissionDiagnostic('admission-confirmed');
        setAdmissionUi((prev) => onAdmissionCompleted(prev, receipt));
        setAdmissionNotice(
          `Member credential ${credentialHex.slice(0, 10)}… admitted successfully on Midnight Preprod.`,
        );

        // Update public contract state display
        setContractState((prev) => ({
          ...prev,
          inspectedState: session.publicState,
        }));
      } catch (inspectError: unknown) {
        if (!isMounted.current || activeAdmissionTokenRef.current !== operationToken) {
          return;
        }

        const errorCode =
          inspectError instanceof ContractSessionError
            ? inspectError.code
            : (inspectError as { code?: string } | null)?.code;

        logAdmissionDiagnostic('inspect-ledger-error', {
          errorClass: inspectError instanceof Error ? inspectError.name : typeof inspectError,
          errorMessage: inspectError instanceof Error ? inspectError.message : String(inspectError),
        });

        if (errorCode === 'CONTRACT_NOT_FOUND' || errorCode === 'INDEXER_QUERY_FAILED') {
          // Indexer query lag after finalization: transition to finalized-indexing preserving genuine txId
          setAdmissionUi((prev) => onAdmissionFinalizedIndexing(prev, txId));
        } else {
          // Hard failure (INCOMPATIBLE_CONTRACT, key mismatch, unknown decoder/provider errors)
          activeAdmissionTokenRef.current = null;
          setAdmissionUi((prev) =>
            onAdmissionFailed(prev, mapAdmissionInspectionError(inspectError)),
          );
        }
      }
    } catch (admitError: unknown) {
      if (!isMounted.current || activeAdmissionTokenRef.current !== operationToken) {
        return;
      }
      activeAdmissionTokenRef.current = null;

      logAdmissionDiagnostic('circuit-invoke-error', {
        errorClass: admitError instanceof Error ? admitError.name : typeof admitError,
        errorMessage: admitError instanceof Error ? admitError.message : String(admitError),
      });

      const raw = (
        admitError instanceof Error
          ? admitError.message
          : typeof admitError === 'string'
            ? admitError
            : ''
      ).toLowerCase();

      if (
        raw.includes('cancel') ||
        raw.includes('reject') ||
        raw.includes('denied') ||
        raw.includes('declined') ||
        raw.includes('user aborted')
      ) {
        setAdmissionUi((prev) => onAdmissionFailed(prev, 'Member admission transaction was cancelled in 1AM.', true));
      } else {
        setAdmissionUi((prev) =>
          onAdmissionFailed(prev, mapAdmissionError(admitError)),
        );
      }
    }
  };

  const handleRetryAdmissionVerification = async () => {
    if (
      !wallet ||
      !contractState.attachedAddress ||
      !admissionUi.importedPackage ||
      admissionUi.stage !== 'finalized-indexing'
    ) {
      return;
    }

    const attachedAddress = contractState.attachedAddress;
    const credentialHex = admissionUi.importedPackage.memberCredential;
    const credentialBytes = hexToBytes(credentialHex);

    try {
      const session = await queryCommonVeilContract(wallet.providers, attachedAddress);
      if (!isMounted.current) return;

      const isMember = session.hasMemberCredential(credentialBytes);
      if (!isMember) {
        // Still not indexed; keep finalized-indexing without resubmitting transaction
        return;
      }

      // Build receipt using preserved genuine admissionTxId
      const receipt: MemberAdmissionReceipt = buildMemberAdmissionReceipt({
        contractAddress: attachedAddress,
        memberCredential: credentialHex,
        admissionTxId: admissionUi.admissionTxId,
      });

      setAdmissionUi((prev) => onAdmissionCompleted(prev, receipt));
      setAdmissionNotice(
        `Member credential ${credentialHex.slice(0, 10)}… confirmed on-chain in memberCredentials set.`,
      );

      setContractState((prev) => ({
        ...prev,
        inspectedState: session.publicState,
      }));
    } catch (inspectError: unknown) {
      if (!isMounted.current) return;
      const errorCode =
        inspectError instanceof ContractSessionError
          ? inspectError.code
          : (inspectError as { code?: string } | null)?.code;

      if (errorCode === 'CONTRACT_NOT_FOUND' || errorCode === 'INDEXER_QUERY_FAILED') {
        // Retry query failed due to lookup/lag; stay in finalized-indexing
        return;
      }

      // Hard failure (incompatible contract or unknown error)
      setAdmissionUi((prev) =>
        onAdmissionFailed(prev, mapAdmissionInspectionError(inspectError)),
      );
    }
  };

  const handleDownloadAdmissionReceipt = () => {
    if (!admissionUi.receipt) return;
    try {
      const validated = validateMemberAdmissionReceipt(admissionUi.receipt);
      triggerBlobDownload(
        JSON.stringify(validated, null, 2),
        `commonveil-member-admission-receipt-${validated.admittedMemberCredential.slice(0, 10)}.json`,
      );
    } catch (err: unknown) {
      setAdmissionUi((prev) =>
        onAdmissionFailed(prev, 'Could not create valid admission receipt.'),
      );
    }
  };

  const publicState: CommonVeilPublicState | null = contractState.inspectedState;

  const memberCertRequestPrereqs = checkCertificationRequestPrerequisites({
    isConnected: !!wallet,
    attachedContractAddress: contractState.attachedAddress,
    hasSecret: memberUi.hasSecret,
    hasSalt: !!plaintextMemberSaltRef.current,
    memberCredentialHex: memberUi.memberCredentialHex,
    backupRecoveryStatus: memberUi.backupRecoveryStatus,
    importedInventory: memberInventoryUi.importedReport,
  });

  const canExportRequest = canExportCertificationRequest({
    isConnected: !!wallet,
    attachedContractAddress: contractState.attachedAddress,
    hasSecret: memberUi.hasSecret,
    hasSalt: !!plaintextMemberSaltRef.current,
    memberCredentialHex: memberUi.memberCredentialHex,
    backupRecoveryStatus: memberUi.backupRecoveryStatus,
    importedInventory: memberInventoryUi.importedReport,
  });

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
          <div
            className="role-nav-switch"
            role="navigation"
            aria-label="Open other role workspaces"
          >
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
                      {wallet.proofMode === 'wallet' ? 'In-wallet prover (Configured)' : 'Local proof server (Configured)'}
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

        {/* Right Column: Role Identity & Secret Lifecycle (Registrar or Certifier) */}
        <div className="workspace-column">
          {role === 'certifier' && (
            <article className="workspace-card certifier-identity-card">
              <div className="card-header">
                <span className="card-step">03</span>
                <h2>Certifier Role Identity & Secrets</h2>
              </div>
              <p className="card-caption">
                The Certifier secret is kept only in volatile session memory. It derives the public Certifier key and authorizes inventory certifications.
              </p>

              {/* Status Header */}
              <div className="registrar-status-row" aria-live="polite">
                <div>
                  <span className="field-caption">Secret in Memory</span>
                  <strong>
                    {certifierUi.hasSecret ? 'Loaded in session memory' : 'None (Locked)'}
                  </strong>
                </div>
                <div>
                  <span className="field-caption">On-chain Verification</span>
                  <strong className={`verification-badge ${certifierUi.verificationStatus}`}>
                    {certifierUi.verificationStatus === 'verified'
                      ? 'Verified'
                      : certifierUi.verificationStatus === 'failed'
                        ? 'Not verified'
                        : 'Unverified'}
                  </strong>
                </div>
                <div>
                  <span className="field-caption">Backup Recovery Status</span>
                  <strong className={`recovery-badge ${certifierUi.backupRecoveryStatus}`}>
                    {certifierUi.backupRecoveryStatus === 'recovery-tested'
                      ? 'Recovery Tested ✔'
                      : certifierUi.backupRecoveryStatus === 'created-untested'
                        ? 'Created (Untested)'
                        : 'No Backup'}
                  </strong>
                </div>
              </div>

              {certifierNotice && (
                <div className="safe-notice-banner" role="status">
                  <p>{certifierNotice}</p>
                </div>
              )}

              {certifierError && (
                <div className="safe-error-banner" role="alert">
                  <strong>Certifier Error</strong>
                  <p>{certifierError}</p>
                </div>
              )}

              {/* One-time copy confirmation banner */}
              {certifierUi.hasSecret && certifierUi.canCopyOnce && (
                <div className="secret-reveal-box" role="alert">
                  <div className="secret-reveal-header">
                    <strong>One-Time Secret Copy Available</strong>
                  </div>
                  <p className="secret-warning-text">
                    The secret is kept only for this browser session and is not written to persistent storage. Export an encrypted backup immediately.
                  </p>
                  <div className="one-time-copy-row">
                    <button
                      type="button"
                      className="action-button primary"
                      onClick={handleOneTimeCopyCertifierSecret}
                      disabled={certifierUi.copyStatus === 'pending'}
                      aria-label="Copy certifier secret to clipboard (one time only)"
                    >
                      {certifierUi.copyStatus === 'pending'
                        ? 'Copying...'
                        : certifierUi.copyStatus === 'failed'
                          ? 'Retry Secret Copy'
                          : 'Copy Secret to Clipboard (One-Time)'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Tabs / Buttons */}
              {!certifierUi.hasSecret ? (
                <div className="secret-setup-section">
                  <button
                    type="button"
                    onClick={handleGenerateCertifierSecret}
                    className="action-button primary"
                    aria-label="Generate fresh random 32-byte certifier secret"
                  >
                    Generate New Certifier Secret
                  </button>

                  <div className="divider-row"><span>or import existing 32-byte hex</span></div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleImportCertifierSecretHex();
                    }}
                  >
                    <label htmlFor="import-certifier-hex-input">
                      32-Byte Secret Hex (64 hex characters)
                    </label>
                    <input
                      id="import-certifier-hex-input"
                      type="password"
                      value={certifierImportHexInput}
                      onChange={(e) => setCertifierImportHexInput(e.target.value)}
                      placeholder="Paste 64-character hex secret"
                      autoComplete="off"
                      spellCheck="false"
                    />
                    <button
                      type="submit"
                      disabled={!certifierImportHexInput.trim()}
                      className="action-button secondary"
                      aria-label="Import plaintext certifier secret hex"
                    >
                      Import Hex Secret
                    </button>
                  </form>

                  <div className="divider-row"><span>or restore encrypted backup</span></div>

                  <div className="backup-import-box">
                    <label htmlFor="certifier-backup-file-input">Encrypted Backup JSON File</label>
                    <input
                      id="certifier-backup-file-input"
                      type="file"
                      accept=".json,application/json"
                      onChange={handleCertifierBackupFileSelect}
                    />

                    {certifierBackupFileContent && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleImportCertifierBackup();
                        }}
                      >
                        <label htmlFor="import-certifier-passphrase-input">
                          Backup Passphrase (min 12 chars)
                        </label>
                        <input
                          id="import-certifier-passphrase-input"
                          type="password"
                          value={certifierImportPassphrase}
                          onChange={(e) => setCertifierImportPassphrase(e.target.value)}
                          placeholder="Enter passphrase"
                          autoComplete="off"
                        />
                        <button
                          type="submit"
                          disabled={certifierImportPassphrase.length < 12}
                          className="action-button primary"
                          aria-label="Decrypt and restore certifier backup"
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
                      onClick={handleExportCertifierKeyPackage}
                      disabled={certifierUi.backupRecoveryStatus !== 'recovery-tested'}
                      className="action-button primary"
                      aria-label="Export public certifier key package JSON"
                    >
                      Export Public Certifier Key Package (.json)
                    </button>

                    <button
                      type="button"
                      onClick={handleVerifyCertifierSecret}
                      disabled={!contractState.attachedAddress}
                      className="action-button secondary"
                      aria-label="Verify certifier secret against attached contract"
                    >
                      Verify On-Chain Authority
                    </button>

                    <button
                      type="button"
                      onClick={handleLockCertifierSession}
                      className="action-button secondary"
                      aria-label="Lock certifier session and zeroize secret"
                    >
                      Lock Session
                    </button>
                  </div>

                  {certifierUi.backupRecoveryStatus !== 'recovery-tested' && (
                    <p className="form-hint-text">
                      Exporting the public Certifier key package requires testing and verifying your encrypted backup below.
                    </p>
                  )}

                  {!contractState.attachedAddress && (
                    <p className="form-hint-text">
                      Attach a contract in Step 02 to run on-chain certifier verification.
                    </p>
                  )}

                  {/* Export Backup Form */}
                  <div className="export-backup-section">
                    <h3>Encrypted Backup Export</h3>
                    <p className="card-caption">
                      Encrypts the Certifier secret with AES-256-GCM (600,000 PBKDF2 iterations) and downloads a JSON envelope.
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleExportCertifierBackup();
                      }}
                    >
                      <label htmlFor="export-certifier-passphrase-input">
                        Export Passphrase (min 12 chars)
                      </label>
                      <div className="password-input-row">
                        <input
                          id="export-certifier-passphrase-input"
                          type={certifierShowExportPassphrase ? 'text' : 'password'}
                          value={certifierExportPassphrase}
                          onChange={(e) => setCertifierExportPassphrase(e.target.value)}
                          placeholder="Enter 12+ character passphrase"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          className="toggle-visibility-btn"
                          onClick={() => setCertifierShowExportPassphrase((prev) => !prev)}
                          aria-label={certifierShowExportPassphrase ? 'Hide password' : 'Show password'}
                        >
                          {certifierShowExportPassphrase ? 'Hide' : 'Show'}
                        </button>
                      </div>

                      <label htmlFor="export-certifier-passphrase-confirm-input" style={{ marginTop: '8px', display: 'block' }}>
                        Confirm Backup Passphrase
                      </label>
                      <input
                        id="export-certifier-passphrase-confirm-input"
                        type={certifierShowExportPassphrase ? 'text' : 'password'}
                        value={certifierExportConfirmPassphrase}
                        onChange={(e) => setCertifierExportConfirmPassphrase(e.target.value)}
                        placeholder="Re-enter passphrase exactly"
                        autoComplete="off"
                      />

                      {hasPasswordWhitespaceWarning(certifierExportPassphrase) && (
                        <div className="whitespace-warning-box">
                          <p>⚠ Passphrase contains leading or trailing whitespace.</p>
                          <label className="whitespace-ack-label">
                            <input
                              type="checkbox"
                              checked={ackWhitespaceCertifier}
                              onChange={(e) => setAckWhitespaceCertifier(e.target.checked)}
                            />
                            <span>I confirm leading or trailing spaces are intentional</span>
                          </label>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={
                          !validatePasswordConfirmation(certifierExportPassphrase, certifierExportConfirmPassphrase).valid ||
                          (hasPasswordWhitespaceWarning(certifierExportPassphrase) && !ackWhitespaceCertifier)
                        }
                        className="action-button secondary"
                        style={{ marginTop: '10px' }}
                        aria-label="Export encrypted certifier backup"
                      >
                        Download Encrypted Backup
                      </button>
                    </form>

                    {/* Independent Downloaded Backup Testing */}
                    <div className="test-backup-box">
                      <h4>Test Downloaded Backup</h4>
                      <p>
                        Verify your downloaded backup file before proceeding. Select the downloaded file and enter the passphrase to confirm recovery.
                      </p>
                      <label htmlFor="certifier-test-file-input">Select Downloaded Backup File</label>
                      <input
                        id="certifier-test-file-input"
                        type="file"
                        accept=".json,application/json"
                        onChange={handleCertifierTestBackupFileSelect}
                      />

                      {certifierTestBackupFileContent && (
                        <div style={{ marginTop: '10px' }}>
                          <label htmlFor="certifier-test-passphrase-input">Backup Passphrase</label>
                          <div className="password-input-row">
                            <input
                              id="certifier-test-passphrase-input"
                              type={certifierShowTestPassphrase ? 'text' : 'password'}
                              value={certifierTestBackupPassphrase}
                              onChange={(e) => setCertifierTestBackupPassphrase(e.target.value)}
                              placeholder="Enter passphrase used for export"
                              autoComplete="off"
                            />
                            <button
                              type="button"
                              className="toggle-visibility-btn"
                              onClick={() => setCertifierShowTestPassphrase((prev) => !prev)}
                            >
                              {certifierShowTestPassphrase ? 'Hide' : 'Show'}
                            </button>
                          </div>
                          <button
                            type="button"
                            className="action-button primary"
                            style={{ marginTop: '8px' }}
                            disabled={certifierTestBackupPassphrase.length < 12}
                            onClick={handleTestDownloadedCertifierBackup}
                            aria-label="Verify and test downloaded certifier backup"
                          >
                            Verify and Test Backup
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </article>
          )}

          {role === 'member' && (
            <article className="workspace-card member-identity-card">
              <div className="card-header">
                <span className="card-step">03</span>
                <h2>Member Role Identity & Credential</h2>
              </div>
              <p className="card-caption">
                The member secret and salt are kept only in volatile session memory. JavaScript runtime cannot guarantee absolute memory scrubbing. Secrets are never exposed to Registrar or on-chain.
              </p>

              {/* Status Header */}
              <div className="registrar-status-row" aria-live="polite">
                <div>
                  <span className="field-caption">Secret & Salt in Memory</span>
                  <strong>
                    {memberUi.hasSecret ? 'Loaded in session memory' : 'None (Locked)'}
                  </strong>
                </div>
                <div>
                  <span className="field-caption">Derived Credential</span>
                  {memberUi.memberCredentialHex ? (
                    <strong className="verification-badge verified" title={memberUi.memberCredentialHex}>
                      {shortenAddress(memberUi.memberCredentialHex)}
                    </strong>
                  ) : (
                    <strong className="verification-badge unverified">Not derived</strong>
                  )}
                </div>
                <div>
                  <span className="field-caption">Backup Recovery Status</span>
                  <strong className={`recovery-badge ${memberUi.backupRecoveryStatus}`}>
                    {memberUi.backupRecoveryStatus === 'recovery-tested'
                      ? 'Recovery Tested ✔'
                      : memberUi.backupRecoveryStatus === 'created-untested'
                        ? 'Created (Untested)'
                        : 'No Backup'}
                  </strong>
                </div>
              </div>

              {memberNotice && (
                <div className="safe-notice-banner" role="status">
                  <p>{memberNotice}</p>
                </div>
              )}

              {memberError && (
                <div className="safe-error-banner" role="alert">
                  <strong>Member Error</strong>
                  <p>{memberError}</p>
                </div>
              )}

              {/* One-time copy confirmation banner */}
              {memberUi.hasSecret && memberUi.canCopyOnce && (
                <div className="secret-reveal-box" role="alert">
                  <div className="secret-reveal-header">
                    <strong>One-Time Secret Copy Available</strong>
                  </div>
                  <p className="secret-warning-text">
                    The secret is kept only for this browser session and is not written to persistent storage. Export an encrypted backup immediately.
                  </p>
                  <div className="one-time-copy-row">
                    <button
                      type="button"
                      className="action-button primary"
                      onClick={handleOneTimeCopyMemberSecret}
                      disabled={memberUi.copyStatus === 'pending'}
                      aria-label="Copy member secret to clipboard (one time only)"
                    >
                      {memberUi.copyStatus === 'pending'
                        ? 'Copying...'
                        : memberUi.copyStatus === 'failed'
                          ? 'Retry Secret Copy'
                          : 'Copy Secret to Clipboard (One-Time)'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Tabs / Buttons */}
              {!memberUi.hasSecret ? (
                <div className="secret-setup-section">
                  <button
                    type="button"
                    onClick={handleGenerateMemberIdentity}
                    className="action-button primary"
                    aria-label="Generate fresh random 32-byte member secret and independent salt"
                  >
                    Generate New Member Identity
                  </button>

                  <div className="divider-row"><span>or import existing 32-byte hex pair</span></div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleImportMemberIdentityHex();
                    }}
                  >
                    <label htmlFor="import-member-secret-hex-input">
                      32-Byte Member Secret Hex (64 hex characters)
                    </label>
                    <input
                      id="import-member-secret-hex-input"
                      type="password"
                      value={memberImportSecretHexInput}
                      onChange={(e) => setMemberImportSecretHexInput(e.target.value)}
                      placeholder="Paste 64-character hex secret"
                      autoComplete="off"
                      spellCheck="false"
                    />

                    <label htmlFor="import-member-salt-hex-input" style={{ marginTop: '0.75rem' }}>
                      32-Byte Independent Member Salt Hex (64 hex characters)
                    </label>
                    <input
                      id="import-member-salt-hex-input"
                      type="password"
                      value={memberImportSaltHexInput}
                      onChange={(e) => setMemberImportSaltHexInput(e.target.value)}
                      placeholder="Paste 64-character independent hex salt"
                      autoComplete="off"
                      spellCheck="false"
                    />

                    <button
                      type="submit"
                      disabled={!memberImportSecretHexInput.trim() || !memberImportSaltHexInput.trim()}
                      className="action-button secondary"
                      aria-label="Import plaintext member secret and salt hex"
                    >
                      Import Hex Identity
                    </button>
                  </form>

                  <div className="divider-row"><span>or restore encrypted backup</span></div>

                  <div className="backup-import-box">
                    <label htmlFor="member-backup-file-input">Encrypted Backup JSON File</label>
                    <input
                      id="member-backup-file-input"
                      type="file"
                      accept=".json,application/json"
                      onChange={handleMemberBackupFileSelect}
                    />

                    {memberBackupFileContent && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleImportMemberBackup();
                        }}
                      >
                        <label htmlFor="import-member-passphrase-input">
                          Backup Passphrase (min 12 chars)
                        </label>
                        <input
                          id="import-member-passphrase-input"
                          type="password"
                          value={memberImportPassphrase}
                          onChange={(e) => setMemberImportPassphrase(e.target.value)}
                          placeholder="Enter passphrase"
                          autoComplete="off"
                        />
                        <button
                          type="submit"
                          disabled={memberImportPassphrase.length < 12}
                          className="action-button primary"
                          aria-label="Decrypt and restore member backup"
                        >
                          Decrypt and Restore Identity
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
                      onClick={handleExportMemberAdmissionPackage}
                      disabled={!contractState.attachedAddress || memberUi.backupRecoveryStatus !== 'recovery-tested'}
                      className="action-button primary"
                      aria-label="Export restricted member admission package JSON"
                    >
                      Export Admission Package (.json)
                    </button>

                    <button
                      type="button"
                      onClick={handleLockMemberSession}
                      className="action-button secondary"
                      aria-label="Lock member session and zeroize secret and salt"
                    >
                      Lock Session
                    </button>
                  </div>

                  {memberUi.backupRecoveryStatus !== 'recovery-tested' && (
                    <p className="form-hint-text">
                      Exporting the Member admission package requires testing and verifying your encrypted backup below.
                    </p>
                  )}

                  {!contractState.attachedAddress && (
                    <p className="form-hint-text">
                      Attach a contract in Step 02 before generating an admission request package.
                    </p>
                  )}

                  {/* Export Backup Form */}
                  <div className="export-backup-section">
                    <h3>Encrypted Backup Export</h3>
                    <p className="card-caption">
                      Encrypts the secret and salt with AES-256-GCM (600,000 PBKDF2 iterations) and downloads a JSON envelope.
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleExportMemberBackup();
                      }}
                    >
                      <label htmlFor="export-member-passphrase-input">
                        Export Passphrase (min 12 chars)
                      </label>
                      <div className="password-input-row">
                        <input
                          id="export-member-passphrase-input"
                          type={memberShowExportPassphrase ? 'text' : 'password'}
                          value={memberExportPassphrase}
                          onChange={(e) => setMemberExportPassphrase(e.target.value)}
                          placeholder="Enter 12+ character passphrase"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          className="toggle-visibility-btn"
                          onClick={() => setMemberShowExportPassphrase((prev) => !prev)}
                          aria-label={memberShowExportPassphrase ? 'Hide password' : 'Show password'}
                        >
                          {memberShowExportPassphrase ? 'Hide' : 'Show'}
                        </button>
                      </div>

                      <label htmlFor="export-member-passphrase-confirm-input" style={{ marginTop: '8px', display: 'block' }}>
                        Confirm Backup Passphrase
                      </label>
                      <input
                        id="export-member-passphrase-confirm-input"
                        type={memberShowExportPassphrase ? 'text' : 'password'}
                        value={memberExportConfirmPassphrase}
                        onChange={(e) => setMemberExportConfirmPassphrase(e.target.value)}
                        placeholder="Re-enter passphrase exactly"
                        autoComplete="off"
                      />

                      {hasPasswordWhitespaceWarning(memberExportPassphrase) && (
                        <div className="whitespace-warning-box">
                          <p>⚠ Passphrase contains leading or trailing whitespace.</p>
                          <label className="whitespace-ack-label">
                            <input
                              type="checkbox"
                              checked={ackWhitespaceMember}
                              onChange={(e) => setAckWhitespaceMember(e.target.checked)}
                            />
                            <span>I confirm leading or trailing spaces are intentional</span>
                          </label>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={
                          !validatePasswordConfirmation(memberExportPassphrase, memberExportConfirmPassphrase).valid ||
                          (hasPasswordWhitespaceWarning(memberExportPassphrase) && !ackWhitespaceMember)
                        }
                        className="action-button secondary"
                        style={{ marginTop: '10px' }}
                        aria-label="Export encrypted member backup"
                      >
                        Download Encrypted Backup
                      </button>
                    </form>

                    {/* Independent Downloaded Backup Testing */}
                    <div className="test-backup-box">
                      <h4>Test Downloaded Backup</h4>
                      <p>
                        Verify your downloaded backup file before proceeding. Select the downloaded file and enter the passphrase to confirm recovery.
                      </p>
                      <label htmlFor="member-test-file-input">Select Downloaded Backup File</label>
                      <input
                        id="member-test-file-input"
                        type="file"
                        accept=".json,application/json"
                        onChange={handleMemberTestBackupFileSelect}
                      />

                      {memberTestBackupFileContent && (
                        <div style={{ marginTop: '10px' }}>
                          <label htmlFor="member-test-passphrase-input">Backup Passphrase</label>
                          <div className="password-input-row">
                            <input
                              id="member-test-passphrase-input"
                              type={memberShowTestPassphrase ? 'text' : 'password'}
                              value={memberTestBackupPassphrase}
                              onChange={(e) => setMemberTestBackupPassphrase(e.target.value)}
                              placeholder="Enter passphrase used for export"
                              autoComplete="off"
                            />
                            <button
                              type="button"
                              className="toggle-visibility-btn"
                              onClick={() => setMemberShowTestPassphrase((prev) => !prev)}
                            >
                              {memberShowTestPassphrase ? 'Hide' : 'Show'}
                            </button>
                          </div>
                          <button
                            type="button"
                            className="action-button primary"
                            style={{ marginTop: '8px' }}
                            disabled={memberTestBackupPassphrase.length < 12}
                            onClick={handleTestDownloadedMemberBackup}
                            aria-label="Verify and test downloaded member backup"
                          >
                            Verify and Test Backup
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </article>
          )}

          {role === 'member' && (
            <article className="workspace-card member-inventory-card">
              <div className="card-header">
                <span className="card-step">04</span>
                <h2>Import Live Inventory Report</h2>
              </div>
              <p className="card-caption">
                Import a genuine host inventory scan generated via <code>npm run scan</code>. Validates report schema, provenance, version tuple, and measurement digest locally.
              </p>

              <div className="local-privacy-notice-box" role="note">
                <strong>Zero Blockchain Transactions</strong>
                <p>
                  Importing and exporting are entirely local operations performed in your browser. This step submits zero blockchain transactions to the Midnight network.
                </p>
              </div>

              {/* Status Header / Prerequisites */}
              <div className="prerequisites-warning-box" role="status">
                <span className="field-caption">Certification Request Prerequisites</span>
                <ul className="prerequisites-list">
                  <li className={memberCertRequestPrereqs.isWalletConnected ? 'met' : 'unmet'}>
                    {memberCertRequestPrereqs.isWalletConnected ? '✔' : '○'} Connected 1AM wallet on Preprod
                  </li>
                  <li className={memberCertRequestPrereqs.isContractAttached ? 'met' : 'unmet'}>
                    {memberCertRequestPrereqs.isContractAttached ? '✔' : '○'} Attached compatible CommonVeil contract
                  </li>
                  <li className={memberCertRequestPrereqs.isMemberIdentityActive ? 'met' : 'unmet'}>
                    {memberCertRequestPrereqs.isMemberIdentityActive ? '✔' : '○'} Active Member secret and salt in session memory
                  </li>
                  <li className={memberCertRequestPrereqs.isBackupRecoveryTested ? 'met' : 'unmet'}>
                    {memberCertRequestPrereqs.isBackupRecoveryTested ? '✔' : '○'} Member backup status is recovery-tested
                  </li>
                </ul>
              </div>

              {memberInventoryUi.noticeMessage && (
                <div className="safe-notice-banner" role="status">
                  <p>{memberInventoryUi.noticeMessage}</p>
                </div>
              )}

              {memberInventoryUi.errorMessage && (
                <div className="safe-error-banner" role="alert">
                  <strong>Inventory Validation Error</strong>
                  <p>{memberInventoryUi.errorMessage}</p>
                </div>
              )}

              <div className="inventory-import-controls">
                <label htmlFor="member-inventory-file-input">
                  Select Genuine Inventory JSON File (from <code>npm run scan</code>)
                </label>
                <input
                  id="member-inventory-file-input"
                  ref={memberInventoryInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleMemberInventoryFileSelect}
                  aria-label="Select genuine inventory report JSON file"
                />
              </div>

              {memberInventoryUi.importedReport && (
                <div className="imported-inventory-details">
                  <div className="inventory-meta-row">
                    <div>
                      <span className="field-caption">Selected File</span>
                      <strong>{memberInventoryUi.selectedFileName ?? 'inventory.json'}</strong>
                      {memberInventoryUi.selectedFileSize !== null && (
                        <span className="file-size-tag">({memberInventoryUi.selectedFileSize} bytes)</span>
                      )}
                    </div>
                    <div>
                      <span className="field-caption">Validated Provenance</span>
                      <strong className="provenance-badge live-host-scan">
                        {memberInventoryUi.importedReport.provenance} ✔
                      </strong>
                    </div>
                  </div>

                  <div className="inventory-summary-grid">
                    <div>
                      <span className="field-caption">Product</span>
                      <code>{memberInventoryUi.importedReport.product}</code>
                    </div>
                    <div>
                      <span className="field-caption">Detected Version (Raw)</span>
                      <code>{memberInventoryUi.importedReport.rawVersion}</code>
                    </div>
                    <div>
                      <span className="field-caption">Normalized Version Tuple</span>
                      <code>
                        {memberInventoryUi.importedReport.version.major}.
                        {memberInventoryUi.importedReport.version.minor}.
                        {memberInventoryUi.importedReport.version.patch}
                      </code>
                    </div>
                    <div>
                      <span className="field-caption">Observed Timestamp</span>
                      <small>{memberInventoryUi.importedReport.observedAt}</small>
                    </div>
                  </div>

                  <div className="inventory-digest-box">
                    <span className="field-caption">Recomputed Measurement Digest (SHA-256)</span>
                    <code title={memberInventoryUi.importedReport.measurementDigest}>
                      {memberInventoryUi.importedReport.measurementDigest}
                    </code>
                  </div>

                  {contractState.attachedAddress && memberUi.memberCredentialHex && (
                    <div className="inventory-binding-box">
                      <div>
                        <span className="field-caption">Bound Contract</span>
                        <code title={contractState.attachedAddress}>
                          {shortenAddress(contractState.attachedAddress)}
                        </code>
                      </div>
                      <div>
                        <span className="field-caption">Bound Member Credential</span>
                        <code title={memberUi.memberCredentialHex}>
                          {shortenAddress(memberUi.memberCredentialHex)}
                        </code>
                      </div>
                    </div>
                  )}

                  <div className="export-request-action-row">
                    <button
                      type="button"
                      className="action-button primary"
                      onClick={handleExportCertificationRequest}
                      disabled={!canExportRequest}
                      aria-label="Export private certification request package JSON"
                    >
                      Export Private Certification Request (.json)
                    </button>
                    {!canExportRequest && (
                      <p className="form-hint-text">
                        Ensure all prerequisites above are fulfilled before exporting the certification request.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </article>
          )}

          {role === 'registrar' && (
            <article className="workspace-card registrar-identity-card">
              <div className="card-header">
                <span className="card-step">03</span>
                <h2>Registrar Role Identity & Secrets</h2>
              </div>
              <p className="card-caption">
                The secret is kept only for this browser session and is not written to persistent storage. JavaScript runtime cannot guarantee absolute memory scrubbing.
              </p>

              {/* Status Header */}
              <div className="registrar-status-row" aria-live="polite">
                <div>
                  <span className="field-caption">Secret in Memory</span>
                  <strong>
                    {registrarUi.hasSecret ? 'Loaded in session memory' : 'None (Locked)'}
                  </strong>
                </div>
                <div>
                  <span className="field-caption">On-chain Verification</span>
                  <strong className={`verification-badge ${registrarUi.verificationStatus}`}>
                    {registrarUi.verificationStatus === 'verified'
                      ? 'Verified'
                      : registrarUi.verificationStatus === 'failed'
                        ? 'Not verified'
                        : 'Unverified'}
                  </strong>
                </div>
                <div>
                  <span className="field-caption">Backup Recovery Status</span>
                  <strong className={`recovery-badge ${registrarUi.backupRecoveryStatus}`}>
                    {registrarUi.backupRecoveryStatus === 'recovery-tested'
                      ? 'Recovery Tested ✔'
                      : registrarUi.backupRecoveryStatus === 'created-untested'
                        ? 'Created (Untested)'
                        : 'No Backup'}
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
                  <strong>Registrar Error</strong>
                  <p>{registrarError}</p>
                </div>
              )}

              {/* One-time copy confirmation banner (no visible full secret string in DOM or state) */}
              {registrarUi.hasSecret && registrarUi.canCopyOnce && (
                <div className="secret-reveal-box" role="alert">
                  <div className="secret-reveal-header">
                    <strong>One-Time Secret Copy Available</strong>
                  </div>
                  <p className="secret-warning-text">
                    The secret is kept only for this browser session and is not written to persistent storage. Export an encrypted backup immediately. Losing this secret makes the registrar role permanently unrecoverable.
                  </p>
                  <div className="one-time-copy-row">
                    <button
                      type="button"
                      className="action-button primary"
                      onClick={handleOneTimeCopySecret}
                      disabled={registrarUi.copyStatus === 'pending'}
                      aria-label="Copy registrar secret to clipboard (one time only)"
                    >
                      {registrarUi.copyStatus === 'pending'
                        ? 'Copying...'
                        : registrarUi.copyStatus === 'failed'
                          ? 'Retry Secret Copy'
                          : 'Copy Secret to Clipboard (One-Time)'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Tabs / Buttons */}
              {!registrarUi.hasSecret ? (
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

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleImportSecretHex();
                    }}
                  >
                    <label htmlFor="import-hex-input">
                      32-Byte Secret Hex (64 hex characters)
                    </label>
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
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleImportBackup();
                        }}
                      >
                        <label htmlFor="import-passphrase-input">
                          Backup Passphrase (min 12 chars)
                        </label>
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
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleExportBackup();
                      }}
                    >
                      <label htmlFor="export-passphrase-input">
                        Export Passphrase (min 12 chars)
                      </label>
                      <div className="password-input-row">
                        <input
                          id="export-passphrase-input"
                          type={showExportPassphrase ? 'text' : 'password'}
                          value={exportPassphrase}
                          onChange={(e) => setExportPassphrase(e.target.value)}
                          placeholder="Enter 12+ character passphrase"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          className="toggle-visibility-btn"
                          onClick={() => setShowExportPassphrase((prev) => !prev)}
                          aria-label={showExportPassphrase ? 'Hide password' : 'Show password'}
                        >
                          {showExportPassphrase ? 'Hide' : 'Show'}
                        </button>
                      </div>

                      <label htmlFor="export-passphrase-confirm-input" style={{ marginTop: '8px', display: 'block' }}>
                        Confirm Backup Passphrase
                      </label>
                      <input
                        id="export-passphrase-confirm-input"
                        type={showExportPassphrase ? 'text' : 'password'}
                        value={exportConfirmPassphrase}
                        onChange={(e) => setExportConfirmPassphrase(e.target.value)}
                        placeholder="Re-enter passphrase exactly"
                        autoComplete="off"
                      />

                      {hasPasswordWhitespaceWarning(exportPassphrase) && (
                        <div className="whitespace-warning-box">
                          <p>⚠ Passphrase contains leading or trailing whitespace.</p>
                          <label className="whitespace-ack-label">
                            <input
                              type="checkbox"
                              checked={ackWhitespaceRegistrar}
                              onChange={(e) => setAckWhitespaceRegistrar(e.target.checked)}
                            />
                            <span>I confirm leading or trailing spaces are intentional</span>
                          </label>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={
                          !validatePasswordConfirmation(exportPassphrase, exportConfirmPassphrase).valid ||
                          (hasPasswordWhitespaceWarning(exportPassphrase) && !ackWhitespaceRegistrar)
                        }
                        className="action-button secondary"
                        style={{ marginTop: '10px' }}
                        aria-label="Export encrypted registrar backup"
                      >
                        Download Encrypted Backup
                      </button>
                    </form>

                    {/* Independent Downloaded Backup Testing */}
                    <div className="test-backup-box">
                      <h4>Test Downloaded Backup</h4>
                      <p>
                        Verify your downloaded backup file before proceeding with deployment. Select the downloaded file and enter the passphrase to confirm recovery.
                      </p>
                      <label htmlFor="test-backup-file-input">Select Downloaded Backup File</label>
                      <input
                        id="test-backup-file-input"
                        type="file"
                        accept=".json,application/json"
                        onChange={handleTestBackupFileSelect}
                      />

                      {testBackupFileContent && (
                        <div style={{ marginTop: '10px' }}>
                          <label htmlFor="test-backup-passphrase-input">Backup Passphrase</label>
                          <div className="password-input-row">
                            <input
                              id="test-backup-passphrase-input"
                              type={showTestPassphrase ? 'text' : 'password'}
                              value={testBackupPassphrase}
                              onChange={(e) => setTestBackupPassphrase(e.target.value)}
                              placeholder="Enter passphrase used for export"
                              autoComplete="off"
                            />
                            <button
                              type="button"
                              className="toggle-visibility-btn"
                              onClick={() => setShowTestPassphrase((prev) => !prev)}
                            >
                              {showTestPassphrase ? 'Hide' : 'Show'}
                            </button>
                          </div>
                          <button
                            type="button"
                            className="action-button primary"
                            style={{ marginTop: '8px' }}
                            disabled={testBackupPassphrase.length < 12}
                            onClick={handleTestDownloadedRegistrarBackup}
                            aria-label="Verify and test downloaded registrar backup"
                          >
                            Verify and Test Backup
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </article>
          )}

          {/* Registrar Contract Deployment Section (Step 04) */}
          {role === 'registrar' && (
            <article className="workspace-card registrar-deploy-card">
              <div className="card-header">
                <span className="card-step">04</span>
                <h2>Deploy CommonVeil Contract</h2>
              </div>
              <p className="card-caption">
                Deploy a fresh CommonVeil governance contract on Midnight Preprod using the active Registrar secret.
              </p>

              {/* Deployment Pre-conditions Summary */}
              <div className="deploy-prereq-list">
                <div className={`prereq-item ${wallet ? 'met' : 'unmet'}`}>
                  <span>{wallet ? '✔' : '○'}</span>
                  <span>1AM Wallet connected on Midnight Preprod</span>
                </div>
                <div className={`prereq-item ${registrarUi.hasSecret ? 'met' : 'unmet'}`}>
                  <span>{registrarUi.hasSecret ? '✔' : '○'}</span>
                  <span>Registrar secret loaded in volatile session memory</span>
                </div>
                <div className={`prereq-item ${deploymentUi.backupConfirmed ? 'met' : 'unmet'}`}>
                  <span>{deploymentUi.backupConfirmed ? '✔' : '○'}</span>
                  <span>Encrypted backup confirmed exported</span>
                </div>
                <div className={`prereq-item ${deploymentUi.certifierPublicKey ? 'met' : 'unmet'}`}>
                  <span>{deploymentUi.certifierPublicKey ? '✔' : '○'}</span>
                  <span>
                    {deploymentUi.certifierPublicKey
                      ? `Certifier public key package imported (${shortenAddress(deploymentUi.certifierPublicKey)})`
                      : 'Certifier public key package imported & validated'}
                  </span>
                </div>
                <div className={`prereq-item ${wallet?.proofMode ? 'met' : 'unmet'}`}>
                  <span>{wallet?.proofMode ? '✔' : '○'}</span>
                  <span>ZK proof generation provider configured</span>
                </div>
              </div>

              {/* Certifier Public Key Package Import Section */}
              <div className="certifier-key-import-section">
                <h3>Certifier Public Key Requirement</h3>
                <p className="card-caption">
                  CommonVeil requires a genuine, non-zero Certifier public key at deployment. Import the <code>commonveil.certifier-key/v1</code> package exported from the Certifier workspace. The Registrar receives only the public key.
                </p>
                <div className="key-package-file-row">
                  <label htmlFor="certifier-key-pkg-input">
                    {deploymentUi.certifierPublicKey
                      ? 'Replace Certifier Public Key Package (.json)'
                      : 'Import Certifier Public Key Package (.json)'}
                  </label>
                  <input
                    id="certifier-key-pkg-input"
                    type="file"
                    accept=".json,application/json"
                    onChange={handleCertifierKeyPackageSelect}
                  />
                  {deploymentUi.certifierPublicKey && (
                    <div className="imported-key-badge">
                      <span className="field-caption">Imported Certifier Public Key</span>
                      <code>{deploymentUi.certifierPublicKey}</code>
                    </div>
                  )}
                </div>
              </div>

              {/* Status and Notifications */}
              <div aria-live="polite">
                {deploymentUi.stage === 'requesting-wallet' && (
                  <div className="status-callout waiting-wallet-callout" role="status">
                    <span className="status-indicator notice">Waiting for wallet approval</span>
                    <p>
                      Review and approve the deployment transaction in your connected 1AM wallet window.
                    </p>
                  </div>
                )}

                {deploymentUi.stage === 'deploying' && (
                  <div className="status-callout submitting-callout" role="status">
                    <span className="status-indicator notice">Submitting on-chain</span>
                    <p>
                      Generating zero-knowledge proofs and balancing transaction on Midnight Preprod.
                    </p>
                  </div>
                )}

                {deploymentUi.stage === 'cancelled' && (
                  <div className="safe-notice-banner" role="status">
                    <strong>Transaction Cancelled</strong>
                    <p>Deployment transaction was cancelled in 1AM. You may review parameters and try again.</p>
                  </div>
                )}

                {deploymentUi.errorMessage && (
                  <div className="safe-error-banner" role="alert">
                    <strong>Deployment Error</strong>
                    <p>{deploymentUi.errorMessage}</p>
                  </div>
                )}

                {deploymentUi.stage === 'finalized-indexing' && (
                  <div className="status-callout indexer-lag-callout" role="status">
                    <span className="status-indicator notice">Finalized; waiting for indexer</span>
                    <p>
                      Contract transaction finalized on Midnight Preprod, but the public indexer has not yet synchronized.
                    </p>
                    <div className="deployed-id-row">
                      <span className="field-caption">Contract Address</span>
                      <code>{deploymentUi.contractAddress}</code>
                    </div>
                    {deploymentUi.deploymentTxId && (
                      <div className="deployed-id-row">
                        <span className="field-caption">Transaction ID</span>
                        <code>{deploymentUi.deploymentTxId}</code>
                      </div>
                    )}
                    <button
                      type="button"
                      className="action-button primary"
                      onClick={handleRetryIndexerInspection}
                      aria-label="Retry indexer inspection for finalized contract"
                    >
                      Retry Indexer Inspection
                    </button>
                  </div>
                )}

                {deploymentUi.stage === 'deployed' && deploymentUi.receipt && (
                  <div className="status-callout deployed-success-callout" role="status">
                    <span className="status-indicator success">Deployment Verified</span>
                    <p>
                      Contract is active on Midnight Preprod and verified with this session’s Registrar key.
                    </p>
                    <dl className="property-list">
                      <dt>Contract Address</dt>
                      <dd>
                        <code>{deploymentUi.receipt.contractAddress}</code>
                      </dd>
                      <dt>Deployment Tx ID</dt>
                      <dd>
                        {deploymentUi.receipt.deploymentTxId ? (
                          <code>{deploymentUi.receipt.deploymentTxId}</code>
                        ) : (
                          <em>Finalized without explicit SDK txId</em>
                        )}
                      </dd>
                      <dt>Network</dt>
                      <dd>Midnight Preprod</dd>
                      <dt>Status</dt>
                      <dd>Finalized & Verified</dd>
                    </dl>
                    <div className="button-row">
                      <button
                        type="button"
                        className="action-button secondary"
                        onClick={handleDownloadDeploymentReceipt}
                        aria-label="Download public deployment receipt JSON"
                      >
                        Download Deployment Receipt (.json)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Deployment Confirmation Modal / Dialog */}
              {deploymentUi.stage === 'confirming' && (
                <div className="deployment-confirmation-box" role="dialog" aria-labelledby="deploy-confirm-heading">
                  <h3 id="deploy-confirm-heading">Confirm On-Chain Contract Deployment</h3>
                  <div className="deploy-warning-details">
                    <p><strong>Network:</strong> Midnight Preprod</p>
                    <p>
                      <strong>Action:</strong> Creates a brand-new on-chain CommonVeil governance contract instance.
                    </p>
                    <p>
                      <strong>Constructor Arguments:</strong> Derived Registrar Public Key and Validated Certifier Public Key.
                    </p>
                    <p>
                      <strong>Resource Consumption:</strong> DUST and network transaction fees will be consumed from your 1AM wallet.
                    </p>
                    <p>
                      <strong>Key Permanence:</strong> The Registrar and Certifier keys cannot be replaced once the contract is deployed.
                    </p>
                    <p>
                      <strong>Wallet Review:</strong> You must review and approve the transaction in the 1AM popup.
                    </p>
                  </div>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={deploymentUi.backupConfirmed}
                      onChange={(e) => handleToggleBackupConfirmed(e.target.checked)}
                    />
                    <span>I confirm I have exported and securely stored an encrypted backup of my Registrar secret.</span>
                  </label>

                  <div className="button-row">
                    <button
                      type="button"
                      className="action-button primary"
                      disabled={!deploymentUi.backupConfirmed || !deploymentUi.certifierPublicKey || isDeploying}
                      onClick={handleDeployContract}
                      aria-label="Confirm and submit deployment transaction to 1AM wallet"
                    >
                      Confirm and Deploy via 1AM
                    </button>
                    <button
                      type="button"
                      className="action-button secondary"
                      disabled={isDeploying}
                      onClick={handleCancelDeployConfirmation}
                      aria-label="Cancel deployment"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Main Deployment Action Trigger */}
              {deploymentUi.stage !== 'confirming' &&
                deploymentUi.stage !== 'requesting-wallet' &&
                deploymentUi.stage !== 'deploying' &&
                deploymentUi.stage !== 'finalized-indexing' && (
                  <div className="deploy-action-section">
                    <label className="checkbox-label backup-confirm-checkbox">
                      <input
                        type="checkbox"
                        checked={deploymentUi.backupConfirmed}
                        onChange={(e) => handleToggleBackupConfirmed(e.target.checked)}
                      />
                      <span>I have exported an encrypted backup of my Registrar secret.</span>
                    </label>

                    <button
                      type="button"
                      className="action-button primary"
                      disabled={
                        !canInitiateDeployment({
                          isConnected: !!wallet,
                          hasSecret: registrarUi.hasSecret,
                          backupConfirmed: deploymentUi.backupConfirmed,
                          backupRecoveryStatus: registrarUi.backupRecoveryStatus,
                          isDeploying,
                          proofProviderAvailable: !!wallet?.proofMode,
                          certifierPublicKey: deploymentUi.certifierPublicKey,
                        })
                      }
                      onClick={handleStartDeployConfirmation}
                      aria-label="Initiate CommonVeil contract deployment flow"
                    >
                      Deploy CommonVeil Contract
                    </button>

                    {registrarUi.backupRecoveryStatus !== 'recovery-tested' && (
                      <p className="form-hint-text">
                        Deploying the CommonVeil contract requires testing and verifying your encrypted backup in Step 03 first.
                      </p>
                    )}
                  </div>
                )}
            </article>
          )}

          {/* Registrar Member Admission Workflow Section (Step 05) */}
          {role === 'registrar' && (
            <article className="workspace-card registrar-admission-card">
              <div className="card-header">
                <span className="card-step">05</span>
                <h2>Member Admission Review & Registration</h2>
              </div>
              <p className="card-caption">
                Import and review restricted Member Admission packages, verify they target this exact contract, and register member credentials on-chain via genuine 1AM approval.
              </p>

              {/* Status Header */}
              <div className="registrar-status-row" aria-live="polite">
                <div>
                  <span className="field-caption">Attached Contract</span>
                  <strong>
                    {contractState.attachedAddress
                      ? shortenAddress(contractState.attachedAddress)
                      : 'None (Required)'}
                  </strong>
                </div>
                <div>
                  <span className="field-caption">Admission Stage</span>
                  <strong className={`verification-badge ${admissionUi.stage === 'admitted' ? 'verified' : 'unverified'}`}>
                    {admissionUi.stage === 'admitted'
                      ? 'Admitted'
                      : admissionUi.stage === 'confirming'
                        ? 'Reviewing package'
                        : admissionUi.stage === 'requesting-wallet'
                          ? '1AM Approval'
                          : admissionUi.stage === 'submitting'
                            ? 'Proving & Submitting'
                            : admissionUi.stage === 'finalized-indexing'
                              ? 'Finalized (Indexing)'
                              : admissionUi.stage === 'failed'
                                ? 'Failed'
                                : admissionUi.stage === 'cancelled'
                                  ? 'Cancelled'
                                  : 'Idle'}
                  </strong>
                </div>
              </div>

              {admissionNotice && (
                <div className="safe-notice-banner" role="status">
                  <p>{admissionNotice}</p>
                </div>
              )}

              {admissionUi.errorMessage && (
                <div className="safe-error-banner" role="alert">
                  <strong>Admission Error</strong>
                  <p>{admissionUi.errorMessage}</p>
                </div>
              )}

              {/* Import Package Box (when idle or failed or cancelled) */}
              {(admissionUi.stage === 'idle' ||
                admissionUi.stage === 'failed' ||
                admissionUi.stage === 'cancelled') && (
                <div className="admission-import-box">
                  <label htmlFor="member-admission-file-input">
                    Import Member Admission Package (.json)
                  </label>
                  <p className="form-hint-text">
                    Package must contain a valid <code>commonveil.member-admission/v1</code> schema matching the attached contract address.
                  </p>
                  <input
                    id="member-admission-file-input"
                    type="file"
                    accept=".json,application/json"
                    disabled={
                      !canInitiateAdmission({
                        isConnected: !!wallet,
                        attachedContractAddress: contractState.attachedAddress,
                        hasSecret: registrarUi.hasSecret,
                        verificationStatus: registrarUi.verificationStatus,
                        isAdmitting,
                      })
                    }
                    onChange={handleAdmissionPackageSelect}
                  />

                  {(!wallet ||
                    !contractState.attachedAddress ||
                    !registrarUi.hasSecret ||
                    registrarUi.verificationStatus !== 'verified') && (
                    <p className="form-hint-text warning-text">
                      Requires a connected 1AM wallet on Preprod, an attached contract, and an active verified Registrar secret before importing admission packages.
                    </p>
                  )}
                </div>
              )}

              {/* Confirming Modal / Box */}
              {admissionUi.stage === 'confirming' && admissionUi.importedPackage && (
                <div className="admission-confirmation-box" role="dialog" aria-labelledby="admit-confirm-heading">
                  <h3 id="admit-confirm-heading">Confirm Member Admission</h3>
                  <div className="admission-review-details">
                    <p>
                      <strong>Target Contract:</strong>{' '}
                      <code>{shortenAddress(admissionUi.importedPackage.contractAddress)}</code>
                    </p>
                    <p>
                      <strong>Member Credential:</strong>{' '}
                      <code title={admissionUi.importedPackage.memberCredential}>
                        {shortenAddress(admissionUi.importedPackage.memberCredential)}
                      </code>
                    </p>
                    <p>
                      <strong>Package Created At:</strong> {admissionUi.importedPackage.createdAt}
                    </p>
                    <p className="card-caption">
                      This action will invoke the genuine <code>registerMember</code> circuit. DUST transaction fees will be paid by your connected 1AM wallet. Member secret is not requested or known.
                    </p>
                  </div>

                  <div className="button-row">
                    <button
                      type="button"
                      className="action-button primary"
                      disabled={
                        !canInitiateAdmission({
                          isConnected: !!wallet,
                          attachedContractAddress: contractState.attachedAddress,
                          hasSecret: registrarUi.hasSecret,
                          verificationStatus: registrarUi.verificationStatus,
                          isAdmitting,
                        })
                      }
                      onClick={handleConfirmAndAdmitMember}
                      aria-label="Confirm member registration and submit transaction via 1AM"
                    >
                      Confirm and Admit via 1AM
                    </button>
                    <button
                      type="button"
                      className="action-button secondary"
                      disabled={isAdmitting}
                      onClick={handleDismissAdmissionConfirmation}
                      aria-label="Cancel admission review"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* In-Flight States */}
              {admissionUi.stage === 'requesting-wallet' && (
                <div className="status-callout warning">
                  <span className="status-indicator warning">Preparing 1AM Transaction</span>
                  <p>Preparing proof and transaction. Review 1AM when the approval request appears.</p>
                </div>
              )}

              {admissionUi.stage === 'submitting' && (
                <div className="status-callout notice">
                  <span className="status-indicator notice">Submitting Admission</span>
                  <p>Generating zero-knowledge proof and broadcasting transaction to Midnight Preprod...</p>
                </div>
              )}

              {/* Indexer Lag / Waiting with manual retry that never resubmits */}
              {admissionUi.stage === 'finalized-indexing' && (
                <div className="status-callout notice indexer-lag-box">
                  <span className="status-indicator notice">Finalized On-Chain</span>
                  <p>
                    The admission transaction was finalized on Midnight Preprod, but the public indexer has not yet indexed the updated <code>memberCredentials</code> set.
                  </p>
                  <p className="card-caption">
                    Click below to retry on-chain confirmation without resubmitting any transaction.
                  </p>
                  <button
                    type="button"
                    className="action-button primary"
                    onClick={handleRetryAdmissionVerification}
                    aria-label="Retry indexer confirmation without resubmitting transaction"
                  >
                    Retry Indexer Confirmation
                  </button>
                </div>
              )}

              {/* Admitted Success State & Receipt */}
              {admissionUi.stage === 'admitted' && admissionUi.receipt && (
                <div className="admission-success-box">
                  <span className="status-indicator success">Member Admitted</span>
                  <p>
                    Member credential{' '}
                    <code>{shortenAddress(admissionUi.receipt.admittedMemberCredential)}</code> has been confirmed in the contract member credentials set.
                  </p>
                  <dl className="receipt-details-list">
                    <dt>Contract Address</dt>
                    <dd><code>{shortenAddress(admissionUi.receipt.contractAddress)}</code></dd>
                    {admissionUi.receipt.admissionTxId && (
                      <>
                        <dt>Transaction ID</dt>
                        <dd><code>{shortenAddress(admissionUi.receipt.admissionTxId)}</code></dd>
                      </>
                    )}
                    <dt>Admitted At</dt>
                    <dd>{admissionUi.receipt.admittedAt}</dd>
                  </dl>

                  <div className="button-row">
                    <button
                      type="button"
                      className="action-button primary"
                      onClick={handleDownloadAdmissionReceipt}
                      aria-label="Download public member admission receipt JSON"
                    >
                      Download Admission Receipt (.json)
                    </button>
                    <button
                      type="button"
                      className="action-button secondary"
                      onClick={handleResetAdmission}
                      aria-label="Admit another member"
                    >
                      Admit Another Member
                    </button>
                  </div>
                </div>
              )}
            </article>
          )}

          {/* Public State Panel */}
          <article className="workspace-card public-state-card">
            <div className="card-header">
              <span className="card-step">{role === 'registrar' ? '06' : role === 'member' ? '05' : '04'}</span>
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
