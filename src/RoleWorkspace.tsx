import { useEffect, useRef, useState } from 'react';
import type { ConnectedWallet } from './providers';
import { connectProviders } from './providers';
import {
  queryCommonVeilContract,
  attachCommonVeilContract,
  verifyRegistrarSecret,
  verifyCertifierSecret,
  ContractSessionError,
  type CommonVeilPublicState,
} from './contract-session';
import {
  encryptToEnvelope,
  decryptAndValidateEnvelope,
  type EncryptedEnvelope,
  isHex,
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
  buildCertifiedSnapshotPackage,
  validateCertifiedSnapshotPackage,
  validateInventoryCertificationReceipt,
  type InventoryCertificationReceipt,
  buildInventoryCertificationReceipt,
  INVENTORY_CERTIFICATION_RECEIPT_SCHEMA,
  productDigest,
  advisoryDigest,
  AFFECTED_RELEASE_POLICY_SCHEMA,
  AFFECTED_RELEASE_REGISTRATION_RECEIPT_SCHEMA,
  type AffectedReleasePolicyPackage,
  validateAffectedReleasePolicyPackage,
  buildAffectedReleasePolicyPackage,
  type AffectedReleaseRegistrationReceipt,
  validateAffectedReleaseRegistrationReceipt,
  buildAffectedReleaseRegistrationReceipt,
  isCanonicalTransactionId,
  PRIVATE_ATTESTATION_RECEIPT_SCHEMA,
  type PrivateAttestationReceipt,
  validatePrivateAttestationReceipt,
  buildPrivateAttestationReceipt,
  type CertifiedSnapshotPackage,
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
  onMemberVerificationPending,
  onMemberVerificationSuccess,
  onMemberVerificationNotAdmitted,
  onMemberVerificationFailed,
  onMemberVerificationReset,
  getMemberVerificationStatusLabel,
  mapMemberAdmissionInspectionError,
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
  type CertifierCertificationUiState,
  INITIAL_CERTIFIER_CERTIFICATION_UI_STATE,
  checkCertifierCertificationPrerequisites,
  canInitiateCertification,
  getCertifierCertificationStageLabel,
  isCertifierCertificationImportVisible,
  isCertifierCertificationReviewVisible,
  sanitizeCertificationImportError,
  onCertificationRequestImported,
  onCertificationConfirmationOpen,
  onCertificationConfirmationDismissed,
  onCertificationWalletRequest,
  onCertificationSubmitting,
  onCertificationFinalizedIndexing,
  onSnapshotExported,
  onSnapshotRecoveryTested,
  onCertificationCompleted,
  onCertificationFailed,
  onCertificationReset,
  mapCertificationError,
  mapCertificationInspectionError,
  CERTIFICATION_VERIFICATION_ERROR_MESSAGES,
  INITIAL_REGISTRAR_AFFECTED_RELEASE_UI_STATE,
  type RegistrarAffectedReleaseUiState,
  checkRegistrarAffectedReleasePrerequisites,
  canInitiateAffectedReleaseRegistration,
  onAffectedReleasePolicyImported,
  onAffectedReleaseConfirmationOpen,
  onAffectedReleaseConfirmationDismissed,
  onAffectedReleaseWalletRequest,
  onAffectedReleaseSubmitting,
  onAffectedReleaseFinalizedIndexing,
  onAffectedReleaseCompleted,
  onAffectedReleaseFailed,
  onAffectedReleaseReset,
  mapAffectedReleaseInspectionError,
  mapAffectedReleaseRegistrationError,
  INITIAL_MEMBER_ATTESTATION_UI_STATE,
  type MemberAttestationUiState,
  checkMemberAttestationPrerequisites,
  canInitiateAttestation,
  onCertifiedSnapshotDecrypted,
  onAffectedReleaseReceiptImported,
  onAttestationConfirmationOpen,
  onAttestationConfirmationDismissed,
  onAttestationWalletRequest,
  onAttestationSubmitting,
  onAttestationFinalizedIndexing,
  onAttestationCompleted,
  onAttestationFailed,
  onAttestationLifecycleReset,
  mapAttestationInspectionError,
  mapAttestationError,
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

  // Registrar Affected Release & Policy Activation state (CV-010)
  const [affectedReleaseUi, setAffectedReleaseUi] = useState<RegistrarAffectedReleaseUiState>(
    INITIAL_REGISTRAR_AFFECTED_RELEASE_UI_STATE,
  );
  const [affectedReleaseNotice, setAffectedReleaseNotice] = useState<string | null>(null);
  const [policyAdvisoryInput, setPolicyAdvisoryInput] = useState('CVE-2024-3094');
  const [policyProductInput, setPolicyProductInput] = useState('pkg:generic/xz-utils');
  const [policyMajorInput, setPolicyMajorInput] = useState('5');
  const [policyMinorInput, setPolicyMinorInput] = useState('6');
  const [policyPatchInput, setPolicyPatchInput] = useState('0');
  const [policyPublisherInput, setPolicyPublisherInput] = useState('Red Hat / CISA');
  const [policyRefInput, setPolicyRefInput] = useState('https://nvd.nist.gov/vuln/detail/CVE-2024-3094');
  const [policyPubDateInput, setPolicyPubDateInput] = useState('2024-03-29T00:00:00.000Z');
  const affectedPolicyInputRef = useRef<HTMLInputElement | null>(null);

  const resetAffectedReleaseState = (preserveReceipt: boolean = false) => {
    setAffectedReleaseUi((prev) => {
      if (preserveReceipt && prev.receipt) {
        return {
          ...INITIAL_REGISTRAR_AFFECTED_RELEASE_UI_STATE,
          stage: 'registered',
          registrationTxId: prev.registrationTxId,
          receipt: prev.receipt,
        };
      }
      return onAffectedReleaseReset();
    });
    setAffectedReleaseNotice(null);
    if (affectedPolicyInputRef.current) {
      affectedPolicyInputRef.current.value = '';
    }
  };

  // Certifier Certification Workflow state (CV-009)
  const [certificationUi, setCertificationUi] = useState<CertifierCertificationUiState>(
    INITIAL_CERTIFIER_CERTIFICATION_UI_STATE,
  );
  const [certificationNotice, setCertificationNotice] = useState<string | null>(null);
  const [certPreflightMemberAdmitted, setCertPreflightMemberAdmitted] = useState<boolean | null>(null);
  // Snapshot envelope passphrase inputs (never stored in long-lived React state)
  const [certSnapshotPassphrase, setCertSnapshotPassphrase] = useState('');
  const [certSnapshotConfirmPassphrase, setCertSnapshotConfirmPassphrase] = useState('');
  const [certSnapshotShowPassphrase, setCertSnapshotShowPassphrase] = useState(false);
  const [ackWhitespaceCertSnapshot, setAckWhitespaceCertSnapshot] = useState(false);
  // Snapshot salt held in volatile ref only — zeroized on unmount, role switch, or certifier change
  const snapshotSaltRef = useRef<Uint8Array | null>(null);
  // Commitment hex captured from proof (needed for receipt and envelope)
  const certificationCommitmentRef = useRef<string | null>(null);
  // certificationRequestInputRef for file input DOM reset
  const certificationRequestInputRef = useRef<HTMLInputElement | null>(null);
  // Snapshot envelope recovery test states (testing the actual downloaded file)
  const [certSnapshotTestFileContent, setCertSnapshotTestFileContent] = useState<string | null>(null);
  const [certSnapshotTestPassphrase, setCertSnapshotTestPassphrase] = useState('');
  const [certSnapshotShowTestPassphrase, setCertSnapshotShowTestPassphrase] = useState(false);
  const certSnapshotTestInputRef = useRef<HTMLInputElement | null>(null);
  const activeSnapshotRecoveryTokenRef = useRef<number | null>(null);
  const snapshotRecoveryGenerationRef = useRef(0);

  const resetCertificationState = () => {
    setCertificationUi((prev) => onCertificationReset(prev));
    setCertificationNotice(null);
    setCertPreflightMemberAdmitted(null);
    setCertSnapshotPassphrase('');
    setCertSnapshotConfirmPassphrase('');
    setCertSnapshotShowPassphrase(false);
    setAckWhitespaceCertSnapshot(false);
    setCertSnapshotTestFileContent(null);
    setCertSnapshotTestPassphrase('');
    setCertSnapshotShowTestPassphrase(false);
    activeSnapshotRecoveryTokenRef.current = null;
    zeroizeBytes(snapshotSaltRef.current);
    snapshotSaltRef.current = null;
    certificationCommitmentRef.current = null;
    if (certificationRequestInputRef.current) {
      certificationRequestInputRef.current.value = '';
    }
    if (certSnapshotTestInputRef.current) {
      certSnapshotTestInputRef.current.value = '';
    }
  };

  // Preflight query: verify member credential admittance on-chain when request is present
  useEffect(() => {
    let cancelled = false;
    if (!wallet?.providers || !contractState.attachedAddress || !certificationUi.importedRequest) {
      setCertPreflightMemberAdmitted(null);
      return;
    }
    const checkAdmitted = async () => {
      try {
        const session = await queryCommonVeilContract(wallet.providers, contractState.attachedAddress!);
        if (cancelled) return;
        const credBytes = hexToBytes(certificationUi.importedRequest!.memberCredential);
        setCertPreflightMemberAdmitted(session.hasMemberCredential(credBytes));
      } catch {
        if (!cancelled) {
          setCertPreflightMemberAdmitted(null);
        }
      }
    };
    checkAdmitted();
    return () => {
      cancelled = true;
    };
  }, [wallet?.providers, contractState.attachedAddress, certificationUi.importedRequest?.memberCredential]);

  // ── CV-011: Member Attestation Workflow State ─────────────────────────────
  const [memberAttestationUi, setMemberAttestationUi] = useState<MemberAttestationUiState>(
    INITIAL_MEMBER_ATTESTATION_UI_STATE,
  );
  const [memberAttestationNotice, setMemberAttestationNotice] = useState<string | null>(null);

  // Snapshot import inputs
  const [memberSnapshotEnvelopeContent, setMemberSnapshotEnvelopeContent] = useState<string | null>(null);
  const [memberSnapshotPassphrase, setMemberSnapshotPassphrase] = useState('');
  const [memberSnapshotShowPassphrase, setMemberSnapshotShowPassphrase] = useState(false);
  const [memberSnapshotSelectedFileName, setMemberSnapshotSelectedFileName] = useState<string | null>(null);
  const [memberSnapshotSelectedFileSize, setMemberSnapshotSelectedFileSize] = useState<number | null>(null);
  const memberSnapshotFileInputRef = useRef<HTMLInputElement | null>(null);

  // Decrypted volatile snapshot salt (Uint8Array, never persisted, zeroized on reset)
  const memberDecryptedSnapshotSaltRef = useRef<Uint8Array | null>(null);

  // Affected release policy receipt import inputs
  const [memberPolicyReceiptContent, setMemberPolicyReceiptContent] = useState<string | null>(null);
  const [memberPolicyReceiptSelectedFileName, setMemberPolicyReceiptSelectedFileName] = useState<string | null>(null);
  const [memberPolicyReceiptSelectedFileSize, setMemberPolicyReceiptSelectedFileSize] = useState<number | null>(null);
  const memberPolicyReceiptFileInputRef = useRef<HTMLInputElement | null>(null);

  // Monotonically increasing attestation token to prevent race conditions
  const attestationGenerationRef = useRef(0);
  const activeAttestationTokenRef = useRef<number | null>(null);

  const resetMemberAttestationState = (preserveFinalizedReceipt: boolean = false) => {
    attestationGenerationRef.current++;
    activeAttestationTokenRef.current = null;
    zeroizeBytes(memberDecryptedSnapshotSaltRef.current);
    memberDecryptedSnapshotSaltRef.current = null;
    setMemberSnapshotEnvelopeContent(null);
    setMemberSnapshotPassphrase('');
    setMemberSnapshotShowPassphrase(false);
    setMemberSnapshotSelectedFileName(null);
    setMemberSnapshotSelectedFileSize(null);
    setMemberPolicyReceiptContent(null);
    setMemberPolicyReceiptSelectedFileName(null);
    setMemberPolicyReceiptSelectedFileSize(null);
    setMemberAttestationNotice(null);
    if (memberSnapshotFileInputRef.current) {
      memberSnapshotFileInputRef.current.value = '';
    }
    if (memberPolicyReceiptFileInputRef.current) {
      memberPolicyReceiptFileInputRef.current.value = '';
    }
    if (!preserveFinalizedReceipt) {
      setMemberAttestationUi(onAttestationLifecycleReset());
    } else {
      setMemberAttestationUi((prev) => {
        if (prev.stage === 'attested') return prev;
        return onAttestationLifecycleReset();
      });
    }
  };

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

  const certificationGenerationRef = useRef(0);
  const activeCertificationTokenRef = useRef<number | null>(null);

  const regAffectedGenerationRef = useRef(0);
  const activeRegAffectedTokenRef = useRef<number | null>(null);

  const memberVerificationGenerationRef = useRef(0);
  const activeMemberVerificationTokenRef = useRef<number | null>(null);

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
      certificationGenerationRef.current++;
      activeCertificationTokenRef.current = null;
      regAffectedGenerationRef.current++;
      activeRegAffectedTokenRef.current = null;
      attestationGenerationRef.current++;
      activeAttestationTokenRef.current = null;
      memberVerificationGenerationRef.current++;
      activeMemberVerificationTokenRef.current = null;
      zeroizeBytes(plaintextSecretRef.current);
      plaintextSecretRef.current = null;
      zeroizeBytes(plaintextCertifierSecretRef.current);
      plaintextCertifierSecretRef.current = null;
      zeroizeBytes(plaintextMemberSecretRef.current);
      plaintextMemberSecretRef.current = null;
      zeroizeBytes(plaintextMemberSaltRef.current);
      plaintextMemberSaltRef.current = null;
      zeroizeBytes(snapshotSaltRef.current);
      snapshotSaltRef.current = null;
      zeroizeBytes(memberDecryptedSnapshotSaltRef.current);
      memberDecryptedSnapshotSaltRef.current = null;
      resetMemberInventory();
      resetMemberAttestationState(false);
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

  const isRegisteringAffected =
    affectedReleaseUi.stage === 'requesting-wallet' ||
    affectedReleaseUi.stage === 'submitting' ||
    affectedReleaseUi.stage === 'finalized-indexing';

  const isAttesting =
    memberAttestationUi.stage === 'requesting-wallet' ||
    memberAttestationUi.stage === 'submitting' ||
    memberAttestationUi.stage === 'finalized-indexing';

  const isBusy =
    contractState.inspectionState === 'inspecting' ||
    contractState.inspectionState === 'attaching' ||
    isDeploying ||
    isAdmitting ||
    isRegisteringAffected ||
    isAttesting;

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
    regAffectedGenerationRef.current++;
    activeRegAffectedTokenRef.current = null;
    zeroizeBytes(plaintextSecretRef.current);
    plaintextSecretRef.current = null;
    setRegistrarUi((prev) => onSecretClearedOrLocked(prev, isLocked));
    setDeploymentUi((prev) => onDeploymentReset(prev));
    setAdmissionUi((prev) => onAdmissionReset(prev));
    resetAffectedReleaseState(false);
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
    certificationGenerationRef.current++;
    activeCertificationTokenRef.current = null;
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
    // Certifier identity changed: invalidate any in-progress certification operation
    resetCertificationState();
  };


  // Helper to securely clear member secret and salt in memory
  const clearMemberSecret = (isLocked: boolean = false) => {
    memberCopyGenerationRef.current++;
    activeMemberCopyTokenRef.current = null;
    memberVerificationGenerationRef.current++;
    activeMemberVerificationTokenRef.current = null;
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
    resetMemberAttestationState(false);
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
    resetAffectedReleaseState(false);
    resetCertificationState();
    resetMemberAttestationState(false);
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
    certificationGenerationRef.current++;
    activeCertificationTokenRef.current = null;
    regAffectedGenerationRef.current++;
    activeRegAffectedTokenRef.current = null;
    attestationGenerationRef.current++;
    activeAttestationTokenRef.current = null;
    memberVerificationGenerationRef.current++;
    activeMemberVerificationTokenRef.current = null;
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
    setMemberUi((prev) => onMemberVerificationReset(prev));
    setDeploymentUi((prev) => onDeploymentReset(prev));
    setAdmissionUi((prev) => onAdmissionReset(prev));
    resetAffectedReleaseState(false);
    resetCertificationState();
    resetMemberAttestationState(false);
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
      if (
        contractState.attachedAddress &&
        contractState.attachedAddress.toLowerCase().trim() !==
          session.publicState.contractAddress.toLowerCase().trim()
      ) {
        resetCertificationState();
      }
      resetMemberInventory();

      // If we already have a secret in memory, verify it against the newly attached public state
      if (plaintextSecretRef.current && session.publicState) {
        const matches = verifyRegistrarSecret(session.publicState, plaintextSecretRef.current);
        setRegistrarUi((prev) => ({
          ...prev,
          verificationStatus: matches ? 'verified' : 'failed',
        }));
      }

      if (plaintextCertifierSecretRef.current && session.publicState) {
        const derivedKey = bytesToHex(
          CommonVeil.pureCircuits.deriveCertifierKey(plaintextCertifierSecretRef.current),
        );
        const matches =
          derivedKey.toLowerCase() === session.publicState.certifierKey.toLowerCase();
        setCertifierUi((prev) => ({
          ...prev,
          verificationStatus: matches ? 'verified' : 'failed',
        }));
      }

      if (plaintextMemberSecretRef.current && plaintextMemberSaltRef.current) {
        const credBytes = CommonVeil.pureCircuits.deriveMemberCredential(
          plaintextMemberSecretRef.current,
          plaintextMemberSaltRef.current,
        );
        const matches = session.hasMemberCredential(credBytes);
        setMemberUi((prev) =>
          matches ? onMemberVerificationSuccess(prev) : onMemberVerificationNotAdmitted(prev),
        );
      } else {
        setMemberUi((prev) => onMemberVerificationReset(prev));
      }
    } catch (err: unknown) {
      if (!isMounted.current) return;
      resetMemberInventory();
      setMemberUi((prev) => onMemberVerificationReset(prev));
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

  const verifyMemberAdmissionOnChain = async (
    targetContractAddress?: string,
    existingSession?: Awaited<ReturnType<typeof queryCommonVeilContract>>,
  ) => {
    const addressToQuery = targetContractAddress ?? contractState.attachedAddress;
    if (!wallet?.providers || !addressToQuery) {
      return;
    }
    if (!plaintextMemberSecretRef.current || !plaintextMemberSaltRef.current) {
      return;
    }

    const currentGeneration = ++memberVerificationGenerationRef.current;
    activeMemberVerificationTokenRef.current = currentGeneration;

    setMemberUi((prev) => onMemberVerificationPending(prev));

    try {
      const session =
        existingSession ?? (await queryCommonVeilContract(wallet.providers, addressToQuery));

      if (
        !isMounted.current ||
        memberVerificationGenerationRef.current !== currentGeneration ||
        activeMemberVerificationTokenRef.current !== currentGeneration
      ) {
        return;
      }

      if (!plaintextMemberSecretRef.current || !plaintextMemberSaltRef.current) {
        return;
      }

      const credBytes = CommonVeil.pureCircuits.deriveMemberCredential(
        plaintextMemberSecretRef.current,
        plaintextMemberSaltRef.current,
      );
      const isAdmitted = session.hasMemberCredential(credBytes);

      if (isAdmitted) {
        setMemberUi((prev) => onMemberVerificationSuccess(prev));
      } else {
        setMemberUi((prev) => onMemberVerificationNotAdmitted(prev));
      }
    } catch (err: unknown) {
      if (
        !isMounted.current ||
        memberVerificationGenerationRef.current !== currentGeneration ||
        activeMemberVerificationTokenRef.current !== currentGeneration
      ) {
        return;
      }
      const sanitizedError = mapMemberAdmissionInspectionError(err);
      setMemberUi((prev) => onMemberVerificationFailed(prev, sanitizedError));
    }
  };

  const handleVerifyMemberAdmission = () => {
    if (!contractState.attachedAddress) {
      setMemberError('Attach to a verified CommonVeil contract before verifying Member admission.');
      return;
    }
    if (!wallet?.providers) {
      setMemberError('Connect 1AM wallet on Midnight Preprod before verifying Member admission.');
      return;
    }
    if (!plaintextMemberSecretRef.current || !plaintextMemberSaltRef.current) {
      setMemberError('No Member identity loaded in session memory.');
      return;
    }
    setMemberError(null);
    verifyMemberAdmissionOnChain(contractState.attachedAddress);
  };

  // CV-007: Automatically run read-only Member admission preflight whenever compatible contract
  // is attached and Member secret and salt are loaded in session memory
  useEffect(() => {
    if (
      role === 'member' &&
      wallet?.providers &&
      contractState.attachedAddress &&
      memberUi.hasSecret &&
      plaintextMemberSecretRef.current &&
      plaintextMemberSaltRef.current &&
      memberUi.verificationStatus === 'unverified'
    ) {
      verifyMemberAdmissionOnChain(contractState.attachedAddress);
    }
  }, [
    role,
    wallet?.providers,
    contractState.attachedAddress,
    memberUi.hasSecret,
    memberUi.verificationStatus,
  ]);

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
      if (contractState.attachedAddress && wallet?.providers) {
        verifyMemberAdmissionOnChain(contractState.attachedAddress);
      }
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
      if (contractState.attachedAddress && wallet?.providers) {
        verifyMemberAdmissionOnChain(contractState.attachedAddress);
      }
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
      if (contractState.attachedAddress && wallet?.providers) {
        verifyMemberAdmissionOnChain(contractState.attachedAddress);
      }
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
      const rawTxId: unknown = finalized.public.txId;
      if (!isCanonicalTransactionId(rawTxId)) {
        throw new Error('Finalized transaction data missing canonical transaction ID');
      }
      const txId: string = rawTxId;

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

  // ── CV-009 Certifier Certification prerequisites ──────────────────────────
  const isCertifying =
    certificationUi.stage === 'requesting-wallet' ||
    certificationUi.stage === 'submitting' ||
    certificationUi.stage === 'finalized-indexing';

  const certifierCertificationPrereqs = checkCertifierCertificationPrerequisites({
    isConnected: !!wallet,
    attachedContractAddress: contractState.attachedAddress,
    hasCertifierSecret: certifierUi.hasSecret,
    certifierBackupRecoveryStatus: certifierUi.backupRecoveryStatus,
    certifierVerificationStatus: certifierUi.verificationStatus,
    importedRequest: certificationUi.importedRequest,
    isMemberAdmitted: certPreflightMemberAdmitted,
    isProofProviderConfigured: !!wallet?.providers,
    isOperationPending: isCertifying,
    policyActive: publicState?.policyActive ?? false,
  });

  const canCertify = certifierCertificationPrereqs.length === 0;

  // ── CV-009: Import certification request file ─────────────────────────────
  const handleCertificationRequestFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        throw new Error('File content is not valid JSON.');
      }
      const pkg = await validateCertificationRequestPackage(raw);
      setCertificationUi((prev) =>
        onCertificationRequestImported(
          prev,
          pkg,
          contractState.attachedAddress,
          certifierUi.verificationStatus,
        ),
      );
      setCertificationNotice(null);

      // Perform preflight admitted member query immediately if connected & attached
      if (wallet?.providers && contractState.attachedAddress) {
        try {
          const preflightSession = await queryCommonVeilContract(
            wallet.providers,
            contractState.attachedAddress,
          );
          const credBytes = hexToBytes(pkg.memberCredential);
          setCertPreflightMemberAdmitted(preflightSession.hasMemberCredential(credBytes));
        } catch {
          setCertPreflightMemberAdmitted(null);
        }
      } else {
        setCertPreflightMemberAdmitted(null);
      }
    } catch (err: unknown) {
      const sanitized = sanitizeCertificationImportError(err);
      setCertificationUi((prev) =>
        onCertificationFailed({ ...prev, importedRequest: null }, sanitized),
      );
    } finally {
      if (e.target) {
        e.target.value = '';
      }
      if (certificationRequestInputRef.current) {
        certificationRequestInputRef.current.value = '';
      }
    }
  };

  // ── CV-009: Initiate certifyInventory circuit ─────────────────────────────
  const handleInitiateCertification = async () => {
    setCertificationNotice(null);

    if (
      !wallet ||
      !contractState.attachedAddress ||
      !plaintextCertifierSecretRef.current ||
      !certificationUi.importedRequest ||
      (certificationUi.stage !== 'confirming' && certificationUi.stage !== 'reviewing')
    ) {
      return;
    }

    const attachedAddress = contractState.attachedAddress;
    const pkg = certificationUi.importedRequest;
    const certifierSecretBytes = plaintextCertifierSecretRef.current;
    const credentialHex = pkg.memberCredential;

    // Pre-flight: verify member credential is actually admitted on-chain
    let isMemberAdmitted: boolean | null = null;
    try {
      const preflightSession = await queryCommonVeilContract(wallet.providers, attachedAddress);
      const credentialBytes = hexToBytes(credentialHex);
      isMemberAdmitted = preflightSession.hasMemberCredential(credentialBytes);
    } catch {
      // Indexer lag: proceed cautiously; the circuit will reject if truly not admitted
      isMemberAdmitted = null;
    }

    if (isMemberAdmitted === false) {
      setCertificationUi((prev) =>
        onCertificationFailed(
          prev,
          CERTIFICATION_VERIFICATION_ERROR_MESSAGES.MEMBER_NOT_ADMITTED,
        ),
      );
      return;
    }

    // Generate ephemeral snapshot salt — volatile memory only, zeroized on cleanup
    const snapshotSalt = crypto.getRandomValues(new Uint8Array(32));
    zeroizeBytes(snapshotSaltRef.current);
    snapshotSaltRef.current = snapshotSalt;

    const operationToken = ++certificationGenerationRef.current;
    activeCertificationTokenRef.current = operationToken;

    const logCertDiagnostic = (stage: string, detail?: { errorClass?: string; errorMessage?: string }) => {
      if (typeof window !== 'undefined' && (window as unknown as { __COMMONVEIL_DEV__?: boolean }).__COMMONVEIL_DEV__) {
        console.debug(`[certify:${stage}]`, detail ?? '');
      }
    };

    logCertDiagnostic('prereqs-validated');
    setCertificationUi((prev) => {
      const confirming = prev.stage === 'reviewing' ? onCertificationConfirmationOpen(prev) : prev;
      return onCertificationWalletRequest(confirming);
    });

    try {
      setCertificationUi((prev) => onCertificationSubmitting(prev));

      const credentialBytes = hexToBytes(credentialHex);

      // productDigest: SHA-256("commonveil:product:v1:" + label) → 32 bytes ProductId
      const productIdBytes = await productDigest(pkg.product);

      logCertDiagnostic('circuit-invoke-start');

      // Call genuine certifyInventory circuit via installed Midnight SDK.
      // CommonVeil has vacant witness private state (Contract<undefined>).
      // We omit privateStateId to invoke getContractPublicStates and avoid
      // querying uninitialized private state store before proving.
      const finalized = await submitCallTx(
        wallet.providers,
        {
          compiledContract: CompiledCommonVeilContract,
          contractAddress: attachedAddress,
          circuitId: 'certifyInventory',
          // certifyInventory(certifierSecret, credential, productId, major, minor, patch, snapshotSalt)
          args: [
            certifierSecretBytes,
            credentialBytes,
            productIdBytes,
            BigInt(pkg.version.major),
            BigInt(pkg.version.minor),
            BigInt(pkg.version.patch),
            snapshotSalt,
          ],
        },
      );

      logCertDiagnostic('circuit-finalized');

      if (!isMounted.current || activeCertificationTokenRef.current !== operationToken) {
        return;
      }

      // Extract genuine transaction ID from SDK FinalizedTxData
      const rawTxId: unknown = finalized.public.txId;
      if (!isCanonicalTransactionId(rawTxId)) {
        throw new Error('Finalized transaction data missing canonical transaction ID');
      }
      const txId: string = rawTxId;

      // Derive commitment exactly using CommonVeil pureCircuits.deriveInventoryCommitment
      const derivedCommitmentBytes = CommonVeil.pureCircuits.deriveInventoryCommitment(
        credentialBytes,
        productIdBytes,
        BigInt(pkg.version.major),
        BigInt(pkg.version.minor),
        BigInt(pkg.version.patch),
        snapshotSalt,
      );
      const commitmentHex: string = bytesToHex(derivedCommitmentBytes);

      // Store commitment in volatile ref for use by envelope export
      certificationCommitmentRef.current = commitmentHex;

      // Automatically inspect public ledger to verify inventoryCommitments contains commitment
      try {
        logCertDiagnostic('inspect-ledger-start');
        const session = await queryCommonVeilContract(wallet.providers, attachedAddress);
        if (!isMounted.current || activeCertificationTokenRef.current !== operationToken) {
          return;
        }

        const commitmentBytes = hexToBytes(commitmentHex);
        const isCommitted = session.hasInventoryCommitment(commitmentBytes);

        if (!isCommitted) {
          logCertDiagnostic('ledger-indexing-lag');
          setCertificationUi((prev) => onCertificationFinalizedIndexing(prev, txId));
          return;
        }

        // Build certifier key hex from the on-chain certifier key (32 bytes)
        const certifierKeyHex = bytesToHex(
          CommonVeil.pureCircuits.deriveCertifierKey(certifierSecretBytes),
        );

        const receipt = buildInventoryCertificationReceipt({
          contractAddress: attachedAddress,
          certifierKey: certifierKeyHex,
          memberCredential: credentialHex,
          commitment: commitmentHex,
          certificationTxId: txId,
        });

        activeCertificationTokenRef.current = null;
        logCertDiagnostic('certification-confirmed');
        setCertificationUi((prev) => onCertificationCompleted(prev, receipt));
        setCertificationNotice(
          `Inventory commitment ${commitmentHex.slice(0, 10)}… certified on Midnight Preprod.`,
        );

        setContractState((prev) => ({
          ...prev,
          inspectedState: session.publicState,
        }));
      } catch (inspectError: unknown) {
        if (!isMounted.current || activeCertificationTokenRef.current !== operationToken) {
          return;
        }

        const errorCode =
          inspectError instanceof ContractSessionError
            ? inspectError.code
            : (inspectError as { code?: string } | null)?.code;

        logCertDiagnostic('inspect-ledger-error', {
          errorClass: inspectError instanceof Error ? inspectError.name : typeof inspectError,
          errorMessage: inspectError instanceof Error ? inspectError.message : String(inspectError),
        });

        if (errorCode === 'CONTRACT_NOT_FOUND' || errorCode === 'INDEXER_QUERY_FAILED') {
          setCertificationUi((prev) => onCertificationFinalizedIndexing(prev, txId));
        } else {
          activeCertificationTokenRef.current = null;
          setCertificationUi((prev) =>
            onCertificationFailed(prev, mapCertificationInspectionError(inspectError)),
          );
        }
      }
    } catch (certError: unknown) {
      if (!isMounted.current || activeCertificationTokenRef.current !== operationToken) {
        return;
      }
      activeCertificationTokenRef.current = null;

      logCertDiagnostic('circuit-invoke-error', {
        errorClass: certError instanceof Error ? certError.name : typeof certError,
        errorMessage: certError instanceof Error ? certError.message : String(certError),
      });

      const raw = (certError instanceof Error
        ? certError.message
        : typeof certError === 'string'
          ? certError
          : ''
      ).toLowerCase();

      if (
        raw.includes('cancel') ||
        raw.includes('reject') ||
        raw.includes('denied') ||
        raw.includes('declined') ||
        raw.includes('user aborted')
      ) {
        setCertificationUi((prev) =>
          onCertificationFailed(prev, 'Inventory certification transaction was cancelled in 1AM.', true),
        );
      } else {
        setCertificationUi((prev) => onCertificationFailed(prev, mapCertificationError(certError)));
      }
    }
  };

  // ── CV-009: Retry commitment verification after indexer lag ───────────────
  const handleRetryCommitmentVerification = async () => {
    if (
      certificationUi.stage !== 'finalized-indexing' ||
      !wallet ||
      !contractState.attachedAddress ||
      !certificationCommitmentRef.current ||
      !certificationUi.importedRequest ||
      !plaintextCertifierSecretRef.current
    ) {
      return;
    }

    const attachedAddress = contractState.attachedAddress;
    const commitmentHex = certificationCommitmentRef.current;
    const pkg = certificationUi.importedRequest;
    const certifierKeyHex = bytesToHex(
      CommonVeil.pureCircuits.deriveCertifierKey(plaintextCertifierSecretRef.current),
    );

    try {
      const session = await queryCommonVeilContract(wallet.providers, attachedAddress);
      if (!isMounted.current) return;

      const commitmentBytes = hexToBytes(commitmentHex);
      const isCommitted = session.hasInventoryCommitment(commitmentBytes);

      if (!isCommitted) {
        // Still not indexed — stay in finalized-indexing
        setCertificationNotice('Indexer has not yet reflected the certified commitment. Check again shortly.');
        return;
      }

      const receipt = buildInventoryCertificationReceipt({
        contractAddress: attachedAddress,
        certifierKey: certifierKeyHex,
        memberCredential: pkg.memberCredential,
        commitment: commitmentHex,
        certificationTxId: certificationUi.certificationTxId,
      });

      setCertificationUi((prev) => onCertificationCompleted(prev, receipt));
      setCertificationNotice(
        `Inventory commitment ${commitmentHex.slice(0, 10)}… confirmed in on-chain inventoryCommitments set.`,
      );
      setContractState((prev) => ({
        ...prev,
        inspectedState: session.publicState,
      }));
    } catch (err: unknown) {
      if (!isMounted.current) return;
      const errorCode =
        err instanceof ContractSessionError
          ? err.code
          : (err as { code?: string } | null)?.code;

      if (errorCode !== 'CONTRACT_NOT_FOUND' && errorCode !== 'INDEXER_QUERY_FAILED') {
        setCertificationUi((prev) =>
          onCertificationFailed(prev, mapCertificationInspectionError(err)),
        );
      }
      // else: still lagging, stay in finalized-indexing
    }
  };

  // ── CV-009: Export encrypted certified snapshot envelope ──────────────────
  const handleExportCertifiedSnapshot = async () => {
    if (
      !certificationUi.importedRequest ||
      !snapshotSaltRef.current ||
      !certificationCommitmentRef.current ||
      !certificationUi.certificationTxId
    ) {
      return;
    }

    const val = validatePasswordConfirmation(certSnapshotPassphrase, certSnapshotConfirmPassphrase);
    if (!val.valid) {
      setCertificationNotice(val.error);
      return;
    }

    if (hasPasswordWhitespaceWarning(certSnapshotPassphrase) && !ackWhitespaceCertSnapshot) {
      setCertificationNotice('Please acknowledge the leading or trailing whitespace warning before exporting snapshot.');
      return;
    }

    const pkg = certificationUi.importedRequest;
    const snapshotSaltHex = bytesToHex(snapshotSaltRef.current);

    try {
      const snapshot = buildCertifiedSnapshotPackage({
        contractAddress: pkg.contractAddress,
        memberCredential: pkg.memberCredential,
        product: pkg.product,
        version: pkg.version,
        snapshotSalt: snapshotSaltHex,
        commitment: certificationCommitmentRef.current,
        txId: certificationUi.certificationTxId,
      });

      const envelope = await encryptToEnvelope(snapshot, certSnapshotPassphrase);

      // Pre-download validation: verify envelope decrypts with exact passphrase in memory
      const restored = await decryptAndValidateEnvelope(
        envelope,
        certSnapshotPassphrase,
        validateCertifiedSnapshotPackage,
      );
      if (restored.schema !== 'commonveil.certified-snapshot/v1') {
        throw new Error('Encrypted envelope self-test failed');
      }

      triggerBlobDownload(
        JSON.stringify(envelope, null, 2),
        `commonveil-certified-snapshot-${pkg.memberCredential.slice(0, 10)}.enc.json`,
      );
      setCertSnapshotPassphrase('');
      setCertSnapshotConfirmPassphrase('');
      setAckWhitespaceCertSnapshot(false);
      setCertificationUi((prev) => onSnapshotExported(prev));
      setCertificationNotice(
        'Certified snapshot envelope downloaded. Test the downloaded envelope below to complete recovery verification.',
      );
    } catch {
      setCertificationNotice('Certified snapshot export failed. Check passphrase and try again.');
    }
  };

  // ── CV-009: Downloaded-file recovery testing for certified snapshot ────────
  const handleCertSnapshotTestFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCertificationNotice(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setCertSnapshotTestFileContent(content);
        setCertificationNotice('Downloaded snapshot envelope loaded. Enter passphrase to test recovery.');
      }
    };
    reader.onerror = () => {
      setCertificationNotice('Could not read the selected snapshot file.');
    };
    reader.readAsText(file);
  };

  const handleTestDownloadedCertSnapshot = async () => {
    setCertificationNotice(null);
    if (!certSnapshotTestFileContent) {
      setCertificationNotice('The selected file is not a valid CommonVeil encrypted snapshot envelope.');
      return;
    }
    if (!certificationUi.importedRequest || !certificationCommitmentRef.current || !certificationUi.certificationTxId) {
      setCertificationNotice('No active certification in memory to verify recovery against.');
      return;
    }
    if (certSnapshotTestPassphrase.length < 12) {
      setCertificationNotice('Snapshot recovery passphrase must be at least 12 characters.');
      return;
    }

    const pkg = certificationUi.importedRequest;
    const expectedCommitment = certificationCommitmentRef.current;
    const expectedTxId = certificationUi.certificationTxId;
    const operationToken = ++snapshotRecoveryGenerationRef.current;
    activeSnapshotRecoveryTokenRef.current = operationToken;

    try {
      let parsedEnvelope: unknown;
      try {
        parsedEnvelope = JSON.parse(certSnapshotTestFileContent);
      } catch {
        throw new Error('The selected file is not a valid CommonVeil encrypted snapshot envelope.');
      }

      const restored = await decryptAndValidateEnvelope(
        parsedEnvelope as EncryptedEnvelope,
        certSnapshotTestPassphrase,
        validateCertifiedSnapshotPackage,
      );

      if (!isMounted.current || activeSnapshotRecoveryTokenRef.current !== operationToken) {
        return;
      }
      activeSnapshotRecoveryTokenRef.current = null;

      // Strict match against active finalized certification parameters
      if (restored.contractAddress.toLowerCase().trim() !== pkg.contractAddress.toLowerCase().trim()) {
        throw new Error('Recovery test failed: snapshot contract address does not match active certified contract.');
      }
      if (restored.memberCredential.toLowerCase().trim() !== pkg.memberCredential.toLowerCase().trim()) {
        throw new Error('Recovery test failed: snapshot member credential does not match active certified member.');
      }
      if (restored.product.trim() !== pkg.product.trim()) {
        throw new Error('Recovery test failed: snapshot product does not match active certified product.');
      }
      if (
        restored.version.major !== pkg.version.major ||
        restored.version.minor !== pkg.version.minor ||
        restored.version.patch !== pkg.version.patch
      ) {
        throw new Error('Recovery test failed: snapshot version tuple does not match active certified version.');
      }
      if (restored.commitment.toLowerCase().trim() !== expectedCommitment.toLowerCase().trim()) {
        throw new Error('Recovery test failed: snapshot commitment does not match on-chain certified commitment.');
      }
      if (restored.txId.toLowerCase().trim() !== expectedTxId.toLowerCase().trim()) {
        throw new Error('Recovery test failed: snapshot transaction ID does not match finalized certification txId.');
      }

      setCertificationUi((prev) => onSnapshotRecoveryTested(prev));
      setCertSnapshotTestPassphrase('');
      setCertSnapshotTestFileContent(null);
      if (certSnapshotTestInputRef.current) {
        certSnapshotTestInputRef.current.value = '';
      }
      setCertificationNotice('Downloaded certified snapshot successfully tested and verified! Recovery Tested ✔');
    } catch (err: unknown) {
      if (!isMounted.current || activeSnapshotRecoveryTokenRef.current !== operationToken) {
        return;
      }
      activeSnapshotRecoveryTokenRef.current = null;
      const msg = err instanceof Error ? err.message : String(err);
      setCertificationNotice(`Snapshot recovery test failed: ${msg.slice(0, 150)}`);
    }
  };

  // ── CV-009: Download public certification receipt ─────────────────────────
  const handleDownloadCertificationReceipt = () => {
    if (!certificationUi.receipt) return;
    try {
      triggerBlobDownload(
        JSON.stringify(certificationUi.receipt, null, 2),
        `commonveil-certification-receipt-${certificationUi.receipt.commitment.slice(0, 10)}.json`,
      );
    } catch {
      setCertificationNotice('Could not create valid certification receipt.');
    }
  };

  // ── CV-010: Affected Release & Policy Activation Prerequisites ───────────
  const registrarAffectedReleasePrereqs = checkRegistrarAffectedReleasePrerequisites({
    isConnected: !!wallet,
    attachedContractAddress: contractState.attachedAddress,
    hasRegistrarSecret: registrarUi.hasSecret,
    registrarBackupRecoveryStatus: registrarUi.backupRecoveryStatus,
    registrarVerificationStatus: registrarUi.verificationStatus,
    importedPolicy: affectedReleaseUi.importedPolicy,
    isReleaseAlreadyRegistered: null,
    isProofProviderConfigured: !!wallet?.providers,
    isOperationPending: isRegisteringAffected,
  });

  const canRegisterAffectedRelease = canInitiateAffectedReleaseRegistration({
    isConnected: !!wallet,
    attachedContractAddress: contractState.attachedAddress,
    hasRegistrarSecret: registrarUi.hasSecret,
    registrarBackupRecoveryStatus: registrarUi.backupRecoveryStatus,
    registrarVerificationStatus: registrarUi.verificationStatus,
    importedPolicy: affectedReleaseUi.importedPolicy,
    isReleaseAlreadyRegistered: null,
    isProofProviderConfigured: !!wallet?.providers,
    isOperationPending: isRegisteringAffected,
  });

  // ── CV-010: File selection and import of affected release policy package ───
  const handleAffectedPolicyFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const pkg = validateAffectedReleasePolicyPackage(raw);
      setAffectedReleaseUi((prev) =>
        onAffectedReleasePolicyImported(prev, pkg, contractState.attachedAddress),
      );
      setAffectedReleaseNotice(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAffectedReleaseUi((prev) =>
        onAffectedReleaseFailed(prev, `Invalid affected-release policy package: ${msg.slice(0, 140)}`),
      );
    }
  };

  // ── CV-010: Builder export for affected release policy package ─────────────
  const handleBuildAndExportPolicy = () => {
    if (!contractState.attachedAddress) {
      setAffectedReleaseNotice('Please attach a CommonVeil contract before generating an affected release policy package.');
      return;
    }
    const major = parseInt(policyMajorInput.trim(), 10);
    const minor = parseInt(policyMinorInput.trim(), 10);
    const patch = parseInt(policyPatchInput.trim(), 10);
    if (isNaN(major) || isNaN(minor) || isNaN(patch) || major < 0 || minor < 0 || patch < 0) {
      setAffectedReleaseNotice('Release version must consist of non-negative integers (major, minor, patch).');
      return;
    }

    try {
      const pkg = buildAffectedReleasePolicyPackage({
        contractAddress: contractState.attachedAddress,
        advisoryId: policyAdvisoryInput.trim(),
        product: policyProductInput.trim(),
        version: { major, minor, patch },
        sourcePublisher: policyPublisherInput.trim(),
        sourceReference: policyRefInput.trim(),
        sourcePublicationDate: policyPubDateInput.trim(),
      });
      triggerBlobDownload(
        JSON.stringify(pkg, null, 2),
        `commonveil-affected-policy-${pkg.advisoryId.toLowerCase()}-${pkg.version.major}.${pkg.version.minor}.${pkg.version.patch}.json`,
      );
      setAffectedReleaseUi((prev) =>
        onAffectedReleasePolicyImported(prev, pkg, contractState.attachedAddress),
      );
      setAffectedReleaseNotice(
        `Generated and loaded affected-release policy for ${pkg.advisoryId} on ${pkg.product} ${pkg.version.major}.${pkg.version.minor}.${pkg.version.patch}.`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAffectedReleaseNotice(`Policy creation rejected: ${msg}`);
    }
  };

  const handleOpenAffectedReleaseConfirmation = () => {
    setAffectedReleaseNotice(null);
    setAffectedReleaseUi((prev) => onAffectedReleaseConfirmationOpen(prev));
  };

  const handleDismissAffectedReleaseConfirmation = () => {
    setAffectedReleaseUi((prev) => onAffectedReleaseConfirmationDismissed(prev));
  };

  // ── CV-010: Initiate registerAffectedRelease on Midnight Preprod ───────────
  const handleConfirmAndRegisterAffectedRelease = async () => {
    setAffectedReleaseNotice(null);

    if (
      !wallet ||
      !contractState.attachedAddress ||
      !plaintextSecretRef.current ||
      !affectedReleaseUi.importedPolicy ||
      affectedReleaseUi.stage !== 'confirming'
    ) {
      return;
    }

    const attachedAddress = contractState.attachedAddress;
    const pkg = affectedReleaseUi.importedPolicy;
    const adminSecretBytes = plaintextSecretRef.current;

    // Check authority against attached contract
    if (registrarUi.verificationStatus !== 'verified') {
      setAffectedReleaseUi((prev) =>
        onAffectedReleaseFailed(
          prev,
          'Registrar authority must be verified against the attached contract before registering affected releases.',
        ),
      );
      return;
    }

    // Verify contract address matches attached contract
    if (pkg.contractAddress.toLowerCase().trim() !== attachedAddress.toLowerCase().trim()) {
      setAffectedReleaseUi((prev) =>
        onAffectedReleaseFailed(
          prev,
          'Policy package contract address does not match the attached contract.',
        ),
      );
      return;
    }

    // Compute advisoryId (32 bytes) and productId (32 bytes)
    let advisoryIdBytes: Uint8Array;
    let productIdBytes: Uint8Array;
    let releaseIdBytes: Uint8Array;
    try {
      advisoryIdBytes = await advisoryDigest(pkg.advisoryId);
      productIdBytes = await productDigest(pkg.product);
      releaseIdBytes = CommonVeil.pureCircuits.deriveReleaseId(
        advisoryIdBytes,
        productIdBytes,
        BigInt(pkg.version.major),
        BigInt(pkg.version.minor),
        BigInt(pkg.version.patch),
      );
    } catch (digestErr: unknown) {
      const msg = digestErr instanceof Error ? digestErr.message : String(digestErr);
      setAffectedReleaseUi((prev) =>
        onAffectedReleaseFailed(prev, `Failed to derive release digests: ${msg}`),
      );
      return;
    }

    // Pre-flight check: query whether release is already registered on-chain
    try {
      const preflightSession = await queryCommonVeilContract(wallet.providers, attachedAddress);
      if (preflightSession.hasAffectedRelease(releaseIdBytes)) {
        setAffectedReleaseUi((prev) =>
          onAffectedReleaseFailed(
            prev,
            'This exact release is already registered on-chain in affectedReleases.',
          ),
        );
        return;
      }
    } catch {
      // Proceed cautiously if indexer is lagging; circuit will assert if duplicate
    }

    // Capture unique registration generation token
    const operationToken = ++regAffectedGenerationRef.current;
    activeRegAffectedTokenRef.current = operationToken;

    const logRegDiagnostic = (stage: string, detail?: { errorClass?: string; errorMessage?: string }) => {
      if (typeof window !== 'undefined' && (window as unknown as { __COMMONVEIL_DEV__?: boolean }).__COMMONVEIL_DEV__) {
        console.debug(`[affected-release:${stage}]`, detail ?? '');
      }
    };

    logRegDiagnostic('prereqs-validated');
    setAffectedReleaseUi((prev) => onAffectedReleaseWalletRequest(prev));

    try {
      setAffectedReleaseUi((prev) => onAffectedReleaseSubmitting(prev));

      logRegDiagnostic('circuit-invoke-start');

      // Call genuine registerAffectedRelease circuit via installed Midnight SDK.
      // Signature: (context, adminSecret_0, advisoryId_0, productId_0, major_0, minor_0, patch_0)
      // Vacant witness private state -> omit privateStateId.
      const finalized = await submitCallTx(
        wallet.providers,
        {
          compiledContract: CompiledCommonVeilContract,
          contractAddress: attachedAddress,
          circuitId: 'registerAffectedRelease',
          args: [
            adminSecretBytes,
            advisoryIdBytes,
            productIdBytes,
            BigInt(pkg.version.major),
            BigInt(pkg.version.minor),
            BigInt(pkg.version.patch),
          ],
        },
      );

      logRegDiagnostic('circuit-finalized');

      if (!isMounted.current || activeRegAffectedTokenRef.current !== operationToken) {
        return;
      }

      // Extract genuine transaction ID from SDK FinalizedTxData (canonical 64 or 66 hex TransactionId)
      const rawTxId: unknown = finalized.public.txId;
      if (!isCanonicalTransactionId(rawTxId)) {
        throw new Error('Finalized transaction data missing valid canonical hexadecimal transaction ID');
      }
      const txId: string = rawTxId;

      // Automatically inspect public ledger to verify affectedReleases and policyActive
      try {
        logRegDiagnostic('inspect-ledger-start');
        const session = await queryCommonVeilContract(wallet.providers, attachedAddress);
        if (!isMounted.current || activeRegAffectedTokenRef.current !== operationToken) {
          return;
        }

        const isRegistered = session.hasAffectedRelease(releaseIdBytes);
        if (!isRegistered || !session.publicState.policyActive) {
          logRegDiagnostic('ledger-indexing-lag');
          // Finalized on-chain, but indexer ledger not yet reflecting it - preserve txId
          setAffectedReleaseUi((prev) => onAffectedReleaseFinalizedIndexing(prev, txId));
          return;
        }

        const receipt: AffectedReleaseRegistrationReceipt = buildAffectedReleaseRegistrationReceipt({
          contractAddress: attachedAddress,
          advisoryId: pkg.advisoryId,
          product: pkg.product,
          version: pkg.version,
          sourcePublisher: pkg.sourcePublisher,
          sourceReference: pkg.sourceReference,
          registrationTxId: txId,
          policyActive: true,
        });

        activeRegAffectedTokenRef.current = null;
        logRegDiagnostic('registration-confirmed');
        setAffectedReleaseUi((prev) => onAffectedReleaseCompleted(prev, receipt));
        setAffectedReleaseNotice(
          `Affected release ${pkg.product} ${pkg.version.major}.${pkg.version.minor}.${pkg.version.patch} for ${pkg.advisoryId} registered on Midnight Preprod. Policy is now ACTIVE.`,
        );

        // Update public contract state display
        setContractState((prev) => ({
          ...prev,
          inspectedState: session.publicState,
        }));
      } catch (inspectError: unknown) {
        if (!isMounted.current || activeRegAffectedTokenRef.current !== operationToken) {
          return;
        }

        const errorCode =
          inspectError instanceof ContractSessionError
            ? inspectError.code
            : (inspectError as { code?: string } | null)?.code;

        logRegDiagnostic('inspect-ledger-error', {
          errorClass: inspectError instanceof Error ? inspectError.name : typeof inspectError,
          errorMessage: inspectError instanceof Error ? inspectError.message : String(inspectError),
        });

        if (errorCode === 'CONTRACT_NOT_FOUND' || errorCode === 'INDEXER_QUERY_FAILED') {
          // Indexer query lag after finalization: transition to finalized-indexing preserving genuine txId
          setAffectedReleaseUi((prev) => onAffectedReleaseFinalizedIndexing(prev, txId));
        } else {
          activeRegAffectedTokenRef.current = null;
          setAffectedReleaseUi((prev) =>
            onAffectedReleaseFailed(prev, mapAffectedReleaseInspectionError(inspectError)),
          );
        }
      }
    } catch (regError: unknown) {
      if (!isMounted.current || activeRegAffectedTokenRef.current !== operationToken) {
        return;
      }
      activeRegAffectedTokenRef.current = null;

      logRegDiagnostic('circuit-invoke-error', {
        errorClass: regError instanceof Error ? regError.name : typeof regError,
        errorMessage: regError instanceof Error ? regError.message : String(regError),
      });

      const raw = (
        regError instanceof Error
          ? regError.message
          : typeof regError === 'string'
            ? regError
            : ''
      ).toLowerCase();

      if (
        raw.includes('cancel') ||
        raw.includes('reject') ||
        raw.includes('denied') ||
        raw.includes('declined') ||
        raw.includes('user aborted')
      ) {
        setAffectedReleaseUi((prev) =>
          onAffectedReleaseFailed(prev, 'Affected release registration transaction was cancelled in 1AM.'),
        );
      } else {
        setAffectedReleaseUi((prev) =>
          onAffectedReleaseFailed(prev, mapAffectedReleaseRegistrationError(regError)),
        );
      }
    }
  };

  // ── CV-010: Read-only indexer retry for affected release registration ─────
  const handleRetryAffectedReleaseVerification = async () => {
    if (
      !wallet ||
      !contractState.attachedAddress ||
      !affectedReleaseUi.importedPolicy ||
      affectedReleaseUi.stage !== 'finalized-indexing'
    ) {
      return;
    }

    const attachedAddress = contractState.attachedAddress;
    const pkg = affectedReleaseUi.importedPolicy;

    try {
      const advisoryIdBytes = await advisoryDigest(pkg.advisoryId);
      const productIdBytes = await productDigest(pkg.product);
      const releaseIdBytes = CommonVeil.pureCircuits.deriveReleaseId(
        advisoryIdBytes,
        productIdBytes,
        BigInt(pkg.version.major),
        BigInt(pkg.version.minor),
        BigInt(pkg.version.patch),
      );

      const session = await queryCommonVeilContract(wallet.providers, attachedAddress);
      if (!isMounted.current) return;

      const isRegistered = session.hasAffectedRelease(releaseIdBytes);
      if (!isRegistered || !session.publicState.policyActive) {
        // Still not indexed; keep finalized-indexing without resubmitting transaction
        setAffectedReleaseNotice('Indexer has not yet reflected the affected release registration. Check again shortly.');
        return;
      }

      const receipt = buildAffectedReleaseRegistrationReceipt({
        contractAddress: attachedAddress,
        advisoryId: pkg.advisoryId,
        product: pkg.product,
        version: pkg.version,
        sourcePublisher: pkg.sourcePublisher,
        sourceReference: pkg.sourceReference,
        registrationTxId: affectedReleaseUi.registrationTxId,
        policyActive: session.publicState.policyActive,
      });

      setAffectedReleaseUi((prev) => onAffectedReleaseCompleted(prev, receipt));
      setAffectedReleaseNotice(
        `Affected release registration confirmed on-chain in affectedReleases set. Policy is active.`,
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

      setAffectedReleaseUi((prev) =>
        onAffectedReleaseFailed(prev, mapAffectedReleaseInspectionError(inspectError)),
      );
    }
  };

  // ── CV-010: Download affected release registration receipt ────────────────
  const handleDownloadAffectedReleaseReceipt = () => {
    if (!affectedReleaseUi.receipt) return;
    try {
      const validated = validateAffectedReleaseRegistrationReceipt(affectedReleaseUi.receipt);
      triggerBlobDownload(
        JSON.stringify(validated, null, 2),
        `commonveil-affected-release-receipt-${validated.advisoryId.toLowerCase()}-${validated.version.major}.${validated.version.minor}.${validated.version.patch}.json`,
      );
    } catch {
      setAffectedReleaseNotice('Could not create valid affected release registration receipt.');
    }
  };

  const handleResetAffectedRelease = () => {
    resetAffectedReleaseState(false);
  };

  // ── CV-011: Member Certified Snapshot Import & Decryption ─────────────────
  const handleMemberSnapshotFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMemberAttestationNotice(null);
    const file = e.target.files?.[0];
    if (!file) {
      setMemberSnapshotEnvelopeContent(null);
      setMemberSnapshotSelectedFileName(null);
      setMemberSnapshotSelectedFileSize(null);
      return;
    }
    setMemberSnapshotSelectedFileName(file.name);
    setMemberSnapshotSelectedFileSize(file.size);
    try {
      const text = await file.text();
      setMemberSnapshotEnvelopeContent(text);
    } catch {
      setMemberSnapshotEnvelopeContent(null);
      setMemberAttestationUi((prev) =>
        onAttestationFailed(prev, 'Could not read encrypted snapshot file content.'),
      );
    }
  };

  const handleDecryptMemberSnapshot = async () => {
    if (!wallet || !contractState.attachedAddress) {
      setMemberAttestationUi((prev) =>
        onAttestationFailed(prev, 'Attach a compatible CommonVeil contract before decrypting a certified snapshot.'),
      );
      return;
    }
    if (!memberSnapshotEnvelopeContent) {
      setMemberAttestationUi((prev) =>
        onAttestationFailed(prev, 'Select an encrypted snapshot file to import.'),
      );
      return;
    }
    if (!memberSnapshotPassphrase) {
      setMemberAttestationUi((prev) =>
        onAttestationFailed(prev, 'Enter the handoff password to decrypt the snapshot envelope.'),
      );
      return;
    }
    if (!plaintextMemberSecretRef.current || !plaintextMemberSaltRef.current || !memberUi.memberCredentialHex) {
      setMemberAttestationUi((prev) =>
        onAttestationFailed(prev, 'Active Member secret and salt must exist in volatile session memory.'),
      );
      return;
    }

    try {
      let envelopeJson: unknown;
      try {
        envelopeJson = JSON.parse(memberSnapshotEnvelopeContent);
      } catch {
        throw new Error('Encrypted snapshot file does not contain valid JSON.');
      }

      // Decrypt using AES-256-GCM + PBKDF2-SHA-256 (600,000 iterations)
      const decryptedSnapshot = await decryptAndValidateEnvelope<CertifiedSnapshotPackage>(
        envelopeJson as EncryptedEnvelope,
        memberSnapshotPassphrase,
        (payload) => validateCertifiedSnapshotPackage(payload),
      );

      // Verify contract matches attached contract
      const attachedAddress = contractState.attachedAddress;
      if (decryptedSnapshot.contractAddress.toLowerCase().trim() !== attachedAddress.toLowerCase().trim()) {
        throw new Error(
          `Snapshot contract address (${decryptedSnapshot.contractAddress}) does not match attached contract (${attachedAddress}).`,
        );
      }

      // Verify memberCredential matches active member credential
      if (
        decryptedSnapshot.memberCredential.toLowerCase().trim() !==
        memberUi.memberCredentialHex.toLowerCase().trim()
      ) {
        throw new Error('Snapshot member credential does not match the active Member credential.');
      }

      // Verify snapshot salt is exactly 32 bytes hex
      if (!isHex(decryptedSnapshot.snapshotSalt, 32)) {
        throw new Error('Snapshot salt must be exactly 32 bytes hex.');
      }

      // Verify snapshot commitment reproduces the derived commitment
      const memberCredentialBytes = hexToBytes(memberUi.memberCredentialHex);
      const productIdBytes = await productDigest(decryptedSnapshot.product);
      const snapshotSaltBytes = hexToBytes(decryptedSnapshot.snapshotSalt);

      const derivedCommitment = CommonVeil.pureCircuits.deriveInventoryCommitment(
        memberCredentialBytes,
        productIdBytes,
        BigInt(decryptedSnapshot.version.major),
        BigInt(decryptedSnapshot.version.minor),
        BigInt(decryptedSnapshot.version.patch),
        snapshotSaltBytes,
      );
      const derivedCommitmentHex = bytesToHex(derivedCommitment).toLowerCase();

      if (derivedCommitmentHex !== decryptedSnapshot.commitment.toLowerCase()) {
        throw new Error('Snapshot commitment does not match recomputed inventory commitment.');
      }

      // Verify snapshot commitment exists in the attached on-chain public ledger
      const session = await queryCommonVeilContract(wallet.providers, attachedAddress);
      if (!isMounted.current) return;

      const hasCommitmentOnChain = session.hasInventoryCommitment(derivedCommitment);
      if (!hasCommitmentOnChain) {
        throw new Error('Snapshot inventory commitment does not exist in the on-chain public ledger.');
      }

      // Keep the decrypted snapshot salt ONLY in volatile memory
      zeroizeBytes(memberDecryptedSnapshotSaltRef.current);
      memberDecryptedSnapshotSaltRef.current = new Uint8Array(snapshotSaltBytes);

      // Clear password inputs immediately from state
      setMemberSnapshotPassphrase('');

      setMemberAttestationUi((prev) =>
        onCertifiedSnapshotDecrypted(prev, decryptedSnapshot, {
          attachedContractAddress: attachedAddress,
          activeMemberCredentialHex: memberUi.memberCredentialHex,
          hasCommitmentOnChain: true,
        }),
      );
      setMemberAttestationNotice('Encrypted certified snapshot verified and bound locally.');
    } catch (err: unknown) {
      if (!isMounted.current) return;
      const rawMsg = err instanceof Error ? err.message : String(err);
      setMemberAttestationUi((prev) => onAttestationFailed(prev, rawMsg));
    }
  };

  // ── CV-011: Public Affected-Release Policy Receipt Import ──────────────────
  const handleMemberPolicyReceiptFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMemberAttestationNotice(null);
    const file = e.target.files?.[0];
    if (!file) {
      setMemberPolicyReceiptContent(null);
      setMemberPolicyReceiptSelectedFileName(null);
      setMemberPolicyReceiptSelectedFileSize(null);
      return;
    }
    setMemberPolicyReceiptSelectedFileName(file.name);
    setMemberPolicyReceiptSelectedFileSize(file.size);
    try {
      const text = await file.text();
      setMemberPolicyReceiptContent(text);
    } catch {
      setMemberPolicyReceiptContent(null);
      setMemberAttestationUi((prev) =>
        onAttestationFailed(prev, 'Could not read policy registration receipt file content.'),
      );
    }
  };

  const handleImportMemberPolicyReceipt = async () => {
    if (!wallet || !contractState.attachedAddress) {
      setMemberAttestationUi((prev) =>
        onAttestationFailed(prev, 'Attach a compatible CommonVeil contract before importing an affected-release receipt.'),
      );
      return;
    }
    if (!memberPolicyReceiptContent) {
      setMemberAttestationUi((prev) =>
        onAttestationFailed(prev, 'Select an affected-release registration receipt JSON file.'),
      );
      return;
    }
    if (!memberAttestationUi.snapshotEvidence) {
      setMemberAttestationUi((prev) =>
        onAttestationFailed(prev, 'Import and decrypt the certified snapshot before importing the affected-release receipt.'),
      );
      return;
    }
    if (!plaintextMemberSecretRef.current) {
      setMemberAttestationUi((prev) =>
        onAttestationFailed(prev, 'Active Member secret must exist in volatile session memory.'),
      );
      return;
    }

    try {
      let receiptJson: unknown;
      try {
        receiptJson = JSON.parse(memberPolicyReceiptContent);
      } catch {
        throw new Error('Receipt file does not contain valid JSON.');
      }

      const receipt = validateAffectedReleaseRegistrationReceipt(receiptJson);
      const attachedAddress = contractState.attachedAddress;

      if (receipt.contractAddress.toLowerCase().trim() !== attachedAddress.toLowerCase().trim()) {
        throw new Error(
          `Receipt contract address (${receipt.contractAddress}) does not match attached contract (${attachedAddress}).`,
        );
      }
      if (!receipt.policyActive) {
        throw new Error('Affected-release receipt indicates that the on-chain policy is not active.');
      }

      // Check whether product and version match the certified snapshot
      const productMatches = memberAttestationUi.snapshotEvidence.product === receipt.product;
      const versionMatches =
        memberAttestationUi.snapshotEvidence.version.major === receipt.version.major &&
        memberAttestationUi.snapshotEvidence.version.minor === receipt.version.minor &&
        memberAttestationUi.snapshotEvidence.version.patch === receipt.version.patch;

      if (!productMatches || !versionMatches) {
        // Honest negative outcome: e.g. xz-utils 5.2.5 vs CVE-2024-3094 5.6.0/5.6.1
        setMemberAttestationUi((prev) =>
          onAffectedReleaseReceiptImported(prev, receipt, {
            attachedContractAddress: attachedAddress,
            isReleaseInLedger: false,
            isNullifierUsed: false,
            derivedNullifierHex: '',
          }),
        );
        return;
      }

      // Recompute release ID and verify it exists in affectedReleases on-chain
      const advisoryIdBytes = await advisoryDigest(receipt.advisoryId);
      const productIdBytes = await productDigest(receipt.product);
      const releaseIdBytes = CommonVeil.pureCircuits.deriveReleaseId(
        advisoryIdBytes,
        productIdBytes,
        BigInt(receipt.version.major),
        BigInt(receipt.version.minor),
        BigInt(receipt.version.patch),
      );

      const session = await queryCommonVeilContract(wallet.providers, attachedAddress);
      if (!isMounted.current) return;

      const isReleaseInLedger = session.hasAffectedRelease(releaseIdBytes);
      if (!isReleaseInLedger) {
        throw new Error('Derived release ID does not exist in the on-chain affectedReleases set.');
      }

      // Preflight nullifier derivation: deriveNullifier(advisoryId, memberSecret)
      const nullifierBytes = CommonVeil.pureCircuits.deriveNullifier(
        advisoryIdBytes,
        plaintextMemberSecretRef.current,
      );
      const nullifierHex = bytesToHex(nullifierBytes).toLowerCase();
      const isNullifierUsed = session.hasUsedNullifier(nullifierBytes);

      setMemberAttestationUi((prev) =>
        onAffectedReleaseReceiptImported(prev, receipt, {
          attachedContractAddress: attachedAddress,
          isReleaseInLedger: true,
          isNullifierUsed,
          derivedNullifierHex: nullifierHex,
        }),
      );
      if (isNullifierUsed) {
        setMemberAttestationNotice('Member already attested for this advisory on-chain (nullifier recorded).');
      } else {
        setMemberAttestationNotice('Certified snapshot matches registered affected release. Ready to attest.');
      }
    } catch (err: unknown) {
      if (!isMounted.current) return;
      const rawMsg = err instanceof Error ? err.message : String(err);
      setMemberAttestationUi((prev) => onAttestationFailed(prev, rawMsg));
    }
  };

  // ── CV-011: Confirmation Dialog Controls ──────────────────────────────────
  const handleOpenAttestConfirmation = () => {
    setMemberAttestationUi((prev) => onAttestationConfirmationOpen(prev));
  };

  const handleDismissAttestConfirmation = () => {
    setMemberAttestationUi((prev) => onAttestationConfirmationDismissed(prev));
  };

  // ── CV-011: Submit Genuine Attest Transaction ─────────────────────────────
  const handleConfirmAndAttest = async () => {
    if (
      !wallet ||
      !contractState.attachedAddress ||
      !memberAttestationUi.snapshotEvidence ||
      !memberAttestationUi.importedPolicyReceipt ||
      !plaintextMemberSecretRef.current ||
      !plaintextMemberSaltRef.current ||
      !memberDecryptedSnapshotSaltRef.current
    ) {
      return;
    }

    const operationToken = ++attestationGenerationRef.current;
    activeAttestationTokenRef.current = operationToken;

    setMemberAttestationUi((prev) => onAttestationWalletRequest(prev));
    setMemberAttestationNotice(null);

    const attachedAddress = contractState.attachedAddress;
    const policyReceipt = memberAttestationUi.importedPolicyReceipt;
    const snapshotEvidence = memberAttestationUi.snapshotEvidence;
    const memberSecretBytes = plaintextMemberSecretRef.current;
    const memberSaltBytes = plaintextMemberSaltRef.current;
    const snapshotSaltBytes = memberDecryptedSnapshotSaltRef.current;

    try {
      // Local Preflight check before wallet submission
      const advisoryIdBytes = await advisoryDigest(policyReceipt.advisoryId);
      const productIdBytes = await productDigest(snapshotEvidence.product);

      // Verify nullifier not already used on-chain
      const nullifierBytes = CommonVeil.pureCircuits.deriveNullifier(
        advisoryIdBytes,
        memberSecretBytes,
      );
      const sessionBefore = await queryCommonVeilContract(wallet.providers, attachedAddress);
      if (!isMounted.current || activeAttestationTokenRef.current !== operationToken) return;

      if (sessionBefore.hasUsedNullifier(nullifierBytes)) {
        setMemberAttestationUi((prev) => ({
          ...prev,
          stage: 'already-attested',
          noticeMessage: 'Member already attested for this advisory.',
        }));
        return;
      }

      const preSubmitAcceptedCount = sessionBefore.publicState.accepted;

      setMemberAttestationUi((prev) => onAttestationSubmitting(prev));

      // Call genuine attest circuit via Midnight SDK
      // attest(advisoryId, memberSecret, memberSalt, productId, major, minor, patch, snapshotSalt)
      const finalized = await submitCallTx(
        wallet.providers,
        {
          compiledContract: CompiledCommonVeilContract,
          contractAddress: attachedAddress,
          circuitId: 'attest',
          args: [
            advisoryIdBytes,
            memberSecretBytes,
            memberSaltBytes,
            productIdBytes,
            BigInt(snapshotEvidence.version.major),
            BigInt(snapshotEvidence.version.minor),
            BigInt(snapshotEvidence.version.patch),
            snapshotSaltBytes,
          ],
        },
      );

      if (!isMounted.current || activeAttestationTokenRef.current !== operationToken) return;

      const rawTxId: unknown = finalized.public.txId;
      if (!isCanonicalTransactionId(rawTxId)) {
        throw new Error(
          `Indexer or SDK returned non-canonical transaction ID: ${String(rawTxId)}`,
        );
      }
      const canonicalTxId = (rawTxId as string).toLowerCase();

      // Enter finalized-indexing state
      setMemberAttestationUi((prev) => onAttestationFinalizedIndexing(prev, canonicalTxId));

      // Inspect same contract to verify accepted increased by at least 1 and nullifier is recorded
      try {
        const sessionAfter = await queryCommonVeilContract(wallet.providers, attachedAddress);
        if (!isMounted.current || activeAttestationTokenRef.current !== operationToken) return;

        const nullifierRecorded = sessionAfter.hasUsedNullifier(nullifierBytes);
        const acceptedIncreased = sessionAfter.publicState.accepted >= preSubmitAcceptedCount + 1n;

        if (nullifierRecorded && acceptedIncreased) {
          const receipt = buildPrivateAttestationReceipt({
            contractAddress: attachedAddress,
            advisoryId: policyReceipt.advisoryId,
            attestationTxId: canonicalTxId,
          });

          setMemberAttestationUi((prev) => onAttestationCompleted(prev, receipt));
          setMemberAttestationNotice(
            'Private attestation confirmed on-chain. Public accepted report count incremented.',
          );
          setContractState((prev) => ({
            ...prev,
            inspectedState: sessionAfter.publicState,
          }));
        } else {
          // Delayed indexing: stay in finalized-indexing without resubmitting
          setMemberAttestationNotice(
            'Attestation transaction finalized on-chain; indexer synchronization is pending. Use retry confirmation below.',
          );
        }
      } catch (inspectError: unknown) {
        if (!isMounted.current) return;
        setMemberAttestationNotice(
          'Attestation transaction finalized on-chain; indexer synchronization is pending. Use retry confirmation below.',
        );
      }
    } catch (attestError: unknown) {
      if (!isMounted.current || activeAttestationTokenRef.current !== operationToken) return;

      const raw = (
        attestError instanceof Error
          ? attestError.message
          : typeof attestError === 'string'
            ? attestError
            : ''
      ).toLowerCase();

      if (
        raw.includes('cancel') ||
        raw.includes('reject') ||
        raw.includes('denied') ||
        raw.includes('declined') ||
        raw.includes('user aborted')
      ) {
        setMemberAttestationUi((prev) =>
          onAttestationFailed(prev, 'Attestation transaction was cancelled in 1AM.'),
        );
      } else {
        setMemberAttestationUi((prev) =>
          onAttestationFailed(prev, mapAttestationError(attestError)),
        );
      }
    }
  };

  // ── CV-011: Read-Only Indexer Retry for Attestation ────────────────────────
  const handleRetryAttestationVerification = async () => {
    if (
      !wallet ||
      !contractState.attachedAddress ||
      !memberAttestationUi.snapshotEvidence ||
      !memberAttestationUi.importedPolicyReceipt ||
      !plaintextMemberSecretRef.current ||
      memberAttestationUi.stage !== 'finalized-indexing'
    ) {
      return;
    }

    const attachedAddress = contractState.attachedAddress;
    const policyReceipt = memberAttestationUi.importedPolicyReceipt;

    try {
      const advisoryIdBytes = await advisoryDigest(policyReceipt.advisoryId);
      const nullifierBytes = CommonVeil.pureCircuits.deriveNullifier(
        advisoryIdBytes,
        plaintextMemberSecretRef.current,
      );

      const session = await queryCommonVeilContract(wallet.providers, attachedAddress);
      if (!isMounted.current) return;

      const nullifierRecorded = session.hasUsedNullifier(nullifierBytes);
      if (!nullifierRecorded) {
        setMemberAttestationNotice(
          'Indexer has not yet recorded the derived nullifier. Check again shortly.',
        );
        return;
      }

      const canonicalTxId = memberAttestationUi.attestationTxId ?? '00'.repeat(32);
      const receipt = buildPrivateAttestationReceipt({
        contractAddress: attachedAddress,
        advisoryId: policyReceipt.advisoryId,
        attestationTxId: canonicalTxId,
      });

      setMemberAttestationUi((prev) => onAttestationCompleted(prev, receipt));
      setMemberAttestationNotice(
        'Private attestation confirmed on-chain in usedNullifiers set. Public accepted report count incremented.',
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
        return;
      }

      setMemberAttestationUi((prev) =>
        onAttestationFailed(prev, mapAttestationInspectionError(inspectError)),
      );
    }
  };

  // ── CV-011: Download Privacy-Preserving Attestation Receipt ─────────────────
  const handleDownloadPrivateAttestationReceipt = () => {
    if (!memberAttestationUi.receipt) return;
    try {
      const validated = validatePrivateAttestationReceipt(memberAttestationUi.receipt);
      triggerBlobDownload(
        JSON.stringify(validated, null, 2),
        `commonveil-private-attestation-receipt-${validated.advisoryId.toLowerCase()}-${validated.attestationTxId.slice(0, 16)}.json`,
      );
    } catch {
      setMemberAttestationNotice('Could not create valid private attestation receipt.');
    }
  };

  const handleResetMemberAttestation = () => {
    resetMemberAttestationState(false);
  };

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
                    <dt>Indexer</dt>
                    <dd id="wallet-indexer-status">
                      <span className="status-indicator active" aria-label={`Indexer configuration: ${wallet.indexerStatus}`}>
                        {wallet.indexerStatus}
                      </span>
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

          {/* Certifier Inventory Review & Certification Workflow Section (Step 04) */}
          {role === 'certifier' && (
            <article className="workspace-card certifier-certification-card">
              <div className="card-header">
                <span className="card-step">04</span>
                <h2>Review Inventory & Certify via Midnight</h2>
              </div>
              <p className="card-caption">
                Import and review restricted Member certification request packages, verify they target this exact contract, verify active admission, and invoke <code>certifyInventory</code> on-chain via 1AM.
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
                  <span className="field-caption">Certification Stage</span>
                  <strong className={`verification-badge ${certificationUi.stage === 'certified' ? 'verified' : 'unverified'}`}>
                    {getCertifierCertificationStageLabel(certificationUi.stage)}
                  </strong>
                </div>
              </div>

              {certificationNotice && (
                <div className="safe-notice-banner" role="status">
                  <p>{certificationNotice}</p>
                </div>
              )}

              {certificationUi.errorMessage && (
                <div className="safe-error-banner" role="alert">
                  <strong>Certification Error</strong>
                  <p>{certificationUi.errorMessage}</p>
                </div>
              )}

              {/* Import Request Box */}
              {isCertifierCertificationImportVisible(certificationUi.stage) && (
                <div className="admission-import-box">
                  <label htmlFor="certification-request-file-input">
                    Import Certification Request Package (.json)
                  </label>
                  <p className="form-hint-text">
                    Package must contain a valid <code>commonveil.certification-request/v1</code> schema with genuine <code>live-host-scan</code> provenance targeting the attached contract address.
                  </p>
                  <input
                    ref={certificationRequestInputRef}
                    id="certification-request-file-input"
                    type="file"
                    accept=".json,application/json"
                    disabled={isCertifying}
                    onChange={handleCertificationRequestFileSelect}
                  />

                  {(!wallet ||
                    !contractState.attachedAddress ||
                    !certifierUi.hasSecret ||
                    certifierUi.verificationStatus !== 'verified') && (
                    <p className="form-hint-text warning-text">
                      Requires a connected 1AM wallet on Preprod, an attached contract, and an active verified Certifier secret before certifying inventory requests.
                    </p>
                  )}
                </div>
              )}

              {/* Review / Confirmation Box */}
              {isCertifierCertificationReviewVisible(certificationUi) && certificationUi.importedRequest && (
                <div className="admission-confirmation-box" role="dialog" aria-labelledby="cert-confirm-heading">
                  <h3 id="cert-confirm-heading">Confirm Inventory Certification</h3>
                  <div className="admission-review-details">
                    <p>
                      <strong>Target Contract:</strong>{' '}
                      <code>{shortenAddress(certificationUi.importedRequest.contractAddress)}</code>{' '}
                      {contractState.attachedAddress &&
                      certificationUi.importedRequest.contractAddress.toLowerCase().trim() ===
                        contractState.attachedAddress.toLowerCase().trim() ? (
                        <span className="verification-badge verified" style={{ marginLeft: '8px' }}>
                          Matches Attached Contract
                        </span>
                      ) : (
                        <span className="verification-badge unverified" style={{ marginLeft: '8px' }}>
                          Contract Mismatch
                        </span>
                      )}
                    </p>
                    <p>
                      <strong>Member Credential:</strong>{' '}
                      <code title={certificationUi.importedRequest.memberCredential}>
                        {shortenAddress(certificationUi.importedRequest.memberCredential)}
                      </code>
                    </p>
                    <p>
                      <strong>Provenance:</strong>{' '}
                      <span className="verification-badge verified">
                        {certificationUi.importedRequest.provenance} (validated)
                      </span>
                    </p>
                    <p>
                      <strong>Product & Version:</strong>{' '}
                      <code>
                        {certificationUi.importedRequest.product} @ {certificationUi.importedRequest.rawVersion}{' '}
                        (v{certificationUi.importedRequest.version.major}.{certificationUi.importedRequest.version.minor}.{certificationUi.importedRequest.version.patch})
                      </code>
                    </p>
                    <p>
                      <strong>Measurement Digest:</strong>{' '}
                      <code title={certificationUi.importedRequest.measurementDigest}>
                        {shortenAddress(certificationUi.importedRequest.measurementDigest)}
                      </code>
                    </p>
                    <p>
                      <strong>Observed At:</strong> {certificationUi.importedRequest.observedAt}
                    </p>
                    <p>
                      <strong>Admitted Member Preflight:</strong>{' '}
                      {certPreflightMemberAdmitted === true ? (
                        <span className="verification-badge verified">Verified Admitted</span>
                      ) : certPreflightMemberAdmitted === false ? (
                        <span className="verification-badge unverified">Not Admitted on-chain</span>
                      ) : (
                        <span className="verification-badge unverified">Preflight Pending / Unverified</span>
                      )}
                    </p>
                    <p>
                      <strong>Policy Status:</strong>{' '}
                      <span className={`verification-badge ${publicState && !publicState.policyActive ? 'verified' : 'unverified'}`}>
                        {publicState
                          ? !publicState.policyActive
                            ? 'Open for certification'
                            : 'Policy active (Certification closed)'
                          : 'Unknown'}
                      </span>
                    </p>
                    <p className="card-caption">
                      This action will invoke the genuine <code>certifyInventory</code> circuit. DUST transaction fees will be paid by your connected 1AM wallet.
                    </p>
                  </div>

                  {certifierCertificationPrereqs.length > 0 && (
                    <div className="form-hint-text warning-text" style={{ marginBottom: '12px' }}>
                      Prerequisites not met: {certifierCertificationPrereqs.join(', ')}
                    </div>
                  )}

                  <div className="button-row">
                    <button
                      type="button"
                      className="action-button primary"
                      disabled={!canCertify}
                      onClick={handleInitiateCertification}
                      aria-label="Confirm inventory certification and submit transaction via 1AM"
                    >
                      Confirm and Certify via 1AM
                    </button>
                    <button
                      type="button"
                      className="action-button secondary"
                      disabled={isCertifying}
                      onClick={resetCertificationState}
                      aria-label="Cancel certification review"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* In-Flight States */}
              {certificationUi.stage === 'requesting-wallet' && (
                <div className="status-callout warning">
                  <span className="status-indicator warning">Preparing 1AM Transaction</span>
                  <p>Preparing zero-knowledge proof and transaction. Review 1AM when the approval request appears.</p>
                </div>
              )}

              {certificationUi.stage === 'submitting' && (
                <div className="status-callout notice">
                  <span className="status-indicator notice">Submitting Certification</span>
                  <p>Generating proof and broadcasting <code>certifyInventory</code> transaction to Midnight Preprod...</p>
                </div>
              )}

              {/* Indexer Lag / Waiting with manual retry that never resubmits */}
              {certificationUi.stage === 'finalized-indexing' && (
                <div className="status-callout notice indexer-lag-box">
                  <span className="status-indicator notice">Finalized On-Chain</span>
                  <p>
                    The certification transaction was finalized on Midnight Preprod, but the public indexer has not yet indexed the updated <code>inventoryCommitments</code> set.
                  </p>
                  <p className="card-caption">
                    Click below to retry on-chain confirmation without resubmitting any transaction.
                  </p>
                  <button
                    type="button"
                    className="action-button primary"
                    onClick={handleRetryCommitmentVerification}
                    aria-label="Retry indexer confirmation without resubmitting transaction"
                  >
                    Retry Indexer Confirmation
                  </button>
                </div>
              )}

              {/* Certified Success State, Receipt & Snapshot Envelope Export */}
              {certificationUi.stage === 'certified' && certificationUi.receipt && (
                <div className="admission-success-box">
                  <span className="status-indicator success">Inventory Certified</span>
                  <p>
                    Inventory commitment{' '}
                    <code>{shortenAddress(certificationUi.receipt.commitment)}</code> has been confirmed in the contract commitments set.
                  </p>
                  <dl className="receipt-details-list">
                    <dt>Contract Address</dt>
                    <dd><code>{shortenAddress(certificationUi.receipt.contractAddress)}</code></dd>
                    <dt>Member Credential</dt>
                    <dd><code>{shortenAddress(certificationUi.receipt.memberCredential)}</code></dd>
                    {certificationUi.receipt.certificationTxId && (
                      <>
                        <dt>Transaction ID</dt>
                        <dd><code>{shortenAddress(certificationUi.receipt.certificationTxId)}</code></dd>
                      </>
                    )}
                    <dt>Certified At</dt>
                    <dd>{certificationUi.receipt.certifiedAt}</dd>
                  </dl>

                  <div className="button-row" style={{ marginBottom: '16px' }}>
                    <button
                      type="button"
                      className="action-button primary"
                      onClick={handleDownloadCertificationReceipt}
                      aria-label="Download public certification receipt JSON"
                    >
                      Download Certification Receipt (.json)
                    </button>
                  </div>

                  {/* Certified Snapshot Envelope Export (Private to Member) */}
                  <div className="backup-creation-box" style={{ marginTop: '16px', borderTop: '1px solid var(--border-color, #333)', paddingTop: '16px' }}>
                    <h3>Export Certified Snapshot Envelope</h3>
                    <p className="form-hint-text">
                      Encrypts the member product, version, snapshot salt, commitment, and transaction ID using AES-256-GCM + PBKDF2 (600,000 iterations). Provide a shared passphrase (min 12 chars) to deliver privately to the Member.
                    </p>

                    <div className="input-field-group">
                      <label htmlFor="cert-snapshot-passphrase">Snapshot Passphrase (min 12 chars)</label>
                      <input
                        id="cert-snapshot-passphrase"
                        type={certSnapshotShowPassphrase ? 'text' : 'password'}
                        value={certSnapshotPassphrase}
                        placeholder="Passphrase to encrypt snapshot..."
                        onChange={(e) => setCertSnapshotPassphrase(e.target.value)}
                      />
                    </div>

                    <div className="input-field-group">
                      <label htmlFor="cert-snapshot-confirm-passphrase">Confirm Snapshot Passphrase</label>
                      <input
                        id="cert-snapshot-confirm-passphrase"
                        type={certSnapshotShowPassphrase ? 'text' : 'password'}
                        value={certSnapshotConfirmPassphrase}
                        placeholder="Confirm passphrase..."
                        onChange={(e) => setCertSnapshotConfirmPassphrase(e.target.value)}
                      />
                    </div>

                    <div className="checkbox-row" style={{ marginBottom: '8px' }}>
                      <label>
                        <input
                          type="checkbox"
                          checked={certSnapshotShowPassphrase}
                          onChange={(e) => setCertSnapshotShowPassphrase(e.target.checked)}
                        />
                        Show passphrase
                      </label>
                    </div>

                    {hasPasswordWhitespaceWarning(certSnapshotPassphrase) && (
                      <div className="warning-notice-box" style={{ marginBottom: '8px' }}>
                        <p>Warning: Passphrase contains leading or trailing whitespace.</p>
                        <label>
                          <input
                            type="checkbox"
                            checked={ackWhitespaceCertSnapshot}
                            onChange={(e) => setAckWhitespaceCertSnapshot(e.target.checked)}
                          />
                          I acknowledge leading/trailing whitespace is intentional
                        </label>
                      </div>
                    )}

                    <div className="button-row">
                      <button
                        type="button"
                        className="action-button primary"
                        disabled={
                          !validatePasswordConfirmation(certSnapshotPassphrase, certSnapshotConfirmPassphrase).valid ||
                          (hasPasswordWhitespaceWarning(certSnapshotPassphrase) && !ackWhitespaceCertSnapshot)
                        }
                        onClick={handleExportCertifiedSnapshot}
                        aria-label="Export encrypted certified snapshot envelope"
                      >
                        Export Encrypted Snapshot (.enc.json)
                      </button>
                    </div>

                    {/* Downloaded Snapshot Envelope Recovery Testing */}
                    <div className="test-backup-box" style={{ marginTop: '20px', borderTop: '1px dashed var(--border-color, #444)', paddingTop: '16px' }}>
                      <h4>Test Downloaded Snapshot Envelope</h4>
                      <p className="card-caption">
                        Verify your downloaded envelope file before delivering to Member. Select the downloaded file and enter the passphrase to confirm decryption and parameters match.
                      </p>

                      <div className="status-row" style={{ marginBottom: '10px' }}>
                        <span className="field-caption">Snapshot Recovery Status: </span>
                        <strong className={`recovery-badge ${certificationUi.snapshotRecoveryStatus}`}>
                          {certificationUi.snapshotRecoveryStatus === 'recovery-tested'
                            ? 'Recovery Tested ✔'
                            : certificationUi.snapshotRecoveryStatus === 'created-untested'
                              ? 'Created (Untested)'
                              : 'Not Created'}
                        </strong>
                      </div>

                      <label htmlFor="cert-snapshot-test-file-input">Select Downloaded Snapshot File (.enc.json)</label>
                      <input
                        ref={certSnapshotTestInputRef}
                        id="cert-snapshot-test-file-input"
                        type="file"
                        accept=".json,.enc.json,application/json"
                        onChange={handleCertSnapshotTestFileSelect}
                      />

                      {certSnapshotTestFileContent && (
                        <div style={{ marginTop: '12px' }}>
                          <div className="input-field-group">
                            <label htmlFor="cert-snapshot-test-passphrase-input">Snapshot Passphrase</label>
                            <input
                              id="cert-snapshot-test-passphrase-input"
                              type={certSnapshotShowTestPassphrase ? 'text' : 'password'}
                              value={certSnapshotTestPassphrase}
                              placeholder="Enter passphrase to verify recovery..."
                              onChange={(e) => setCertSnapshotTestPassphrase(e.target.value)}
                            />
                          </div>
                          <div className="checkbox-row" style={{ marginBottom: '10px' }}>
                            <label>
                              <input
                                type="checkbox"
                                checked={certSnapshotShowTestPassphrase}
                                onChange={(e) => setCertSnapshotShowTestPassphrase(e.target.checked)}
                              />
                              Show passphrase
                            </label>
                          </div>
                          <button
                            type="button"
                            className="action-button primary"
                            disabled={certSnapshotTestPassphrase.length < 12}
                            onClick={handleTestDownloadedCertSnapshot}
                            aria-label="Verify and test downloaded snapshot envelope"
                          >
                            Verify and Test Snapshot Envelope
                          </button>
                        </div>
                      )}

                      <div className="status-row" style={{ marginTop: '14px', marginBottom: '10px' }}>
                        <span className="field-caption">Private Handoff Status: </span>
                        {certificationUi.snapshotRecoveryStatus === 'recovery-tested' ? (
                          <strong className="recovery-badge recovery-tested" style={{ color: '#4ade80' }}>
                            Private Handoff Ready ✔ (Envelope Tested & Safe to Deliver)
                          </strong>
                        ) : certificationUi.snapshotRecoveryStatus === 'created-untested' ? (
                          <strong className="recovery-badge created-untested" style={{ color: '#fbbf24' }}>
                            Snapshot Downloaded (Handoff Blocked: Recovery Verification Pending)
                          </strong>
                        ) : (
                          <strong className="recovery-badge none" style={{ color: '#9ca3af' }}>
                            On-Chain Finalized (Snapshot Export & Recovery Pending)
                          </strong>
                        )}
                      </div>

                      <div className="button-row" style={{ marginTop: '16px' }}>
                        <button
                          type="button"
                          className="action-button secondary"
                          onClick={resetCertificationState}
                          aria-label="Certify another inventory report"
                        >
                          Certify Another Request
                        </button>
                      </div>
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
                  <span className="field-caption">On-chain Admission</span>
                  <strong className={`verification-badge ${memberUi.verificationStatus}`}>
                    {getMemberVerificationStatusLabel(memberUi.verificationStatus)}
                  </strong>
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

              {memberUi.verificationStatus === 'failed' && memberUi.verificationErrorMessage && (
                <div className="safe-error-banner" role="alert">
                  <strong>Admission Verification Error</strong>
                  <p>{memberUi.verificationErrorMessage}</p>
                </div>
              )}

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
                      onClick={handleVerifyMemberAdmission}
                      disabled={!contractState.attachedAddress || memberUi.verificationStatus === 'pending'}
                      className="action-button secondary"
                      aria-label="Verify member admission on-chain"
                    >
                      {memberUi.verificationStatus === 'pending'
                        ? 'Verifying Admission...'
                        : 'Verify On-Chain Admission'}
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
                      Attach a contract in Step 02 before verifying on-chain admission or generating an admission request package.
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

          {role === 'member' && (
            <article className="workspace-card member-snapshot-import-card">
              <div className="card-header">
                <span className="card-step">05</span>
                <h2>Import Certified Snapshot</h2>
              </div>
              <p className="card-caption">
                Import the encrypted snapshot envelope received privately from the Certifier and enter your handoff password to decrypt and verify the certified inventory commitment locally.
              </p>

              <div className="local-privacy-notice-box" role="note">
                <strong>Memory-Only Decryption & Privacy Notice</strong>
                <p>
                  Decryption occurs entirely within volatile browser session memory. The password, plaintext package, and snapshot salt are never written to disk, localStorage, or analytics. JavaScript runtime memory cannot guarantee absolute memory scrubbing.
                </p>
              </div>

              {memberAttestationNotice && (
                <div className="safe-notice-banner" role="status">
                  <p>{memberAttestationNotice}</p>
                </div>
              )}

              {memberAttestationUi.errorMessage && (
                <div className="safe-error-banner" role="alert">
                  <strong>Snapshot Error</strong>
                  <p>{memberAttestationUi.errorMessage}</p>
                </div>
              )}

              <div className="form-field-group">
                <label htmlFor="member-snapshot-file-input">
                  Select Encrypted Snapshot Envelope (<code>commonveil.encrypted-envelope/v1</code>)
                </label>
                <input
                  id="member-snapshot-file-input"
                  ref={memberSnapshotFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleMemberSnapshotFileSelect}
                  aria-label="Select encrypted snapshot envelope JSON file"
                />
                {memberSnapshotSelectedFileName && (
                  <small className="field-caption">
                    Selected file: {memberSnapshotSelectedFileName} ({memberSnapshotSelectedFileSize} bytes)
                  </small>
                )}
              </div>

              <div className="form-field-group">
                <label htmlFor="member-snapshot-passphrase-input">Snapshot Handoff Password</label>
                <div className="input-with-button-row">
                  <input
                    id="member-snapshot-passphrase-input"
                    type={memberSnapshotShowPassphrase ? 'text' : 'password'}
                    value={memberSnapshotPassphrase}
                    onChange={(e) => setMemberSnapshotPassphrase(e.target.value)}
                    placeholder="Enter envelope password (PBKDF2-SHA-256, 600,000 iterations)"
                    autoComplete="off"
                    aria-label="Snapshot envelope decryption password"
                  />
                  <button
                    type="button"
                    className="action-button secondary"
                    onClick={() => setMemberSnapshotShowPassphrase((v) => !v)}
                  >
                    {memberSnapshotShowPassphrase ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="button-row">
                <button
                  type="button"
                  className="action-button primary"
                  onClick={handleDecryptMemberSnapshot}
                  disabled={!memberSnapshotEnvelopeContent || !memberSnapshotPassphrase}
                  aria-label="Decrypt and verify certified snapshot"
                >
                  Decrypt & Verify Snapshot
                </button>
              </div>

              {memberAttestationUi.snapshotEvidence && (
                <div className="verified-evidence-box">
                  <div className="evidence-header-row">
                    <span className="provenance-badge live-host-scan">Encrypted Snapshot Verified ✔</span>
                    <span className="credential-match-tag">Member credential matched locally ✔</span>
                  </div>
                  <dl className="property-list">
                    <dt>Product</dt>
                    <dd><code>{memberAttestationUi.snapshotEvidence.product}</code></dd>
                    <dt>Exact Version</dt>
                    <dd>
                      <code>
                        {memberAttestationUi.snapshotEvidence.version.major}.
                        {memberAttestationUi.snapshotEvidence.version.minor}.
                        {memberAttestationUi.snapshotEvidence.version.patch}
                      </code>
                    </dd>
                    <dt>Certification Tx ID</dt>
                    <dd title={memberAttestationUi.snapshotEvidence.txId}>
                      <code>{shortenAddress(memberAttestationUi.snapshotEvidence.txId)}</code>
                    </dd>
                    <dt>Inventory Commitment</dt>
                    <dd title={memberAttestationUi.snapshotEvidence.commitment}>
                      <code>{shortenAddress(memberAttestationUi.snapshotEvidence.commitment)}</code>
                    </dd>
                    <dt>Attached Contract</dt>
                    <dd>
                      <code>{contractState.attachedAddress ? shortenAddress(contractState.attachedAddress) : 'None'}</code>
                    </dd>
                  </dl>
                </div>
              )}
            </article>
          )}

          {role === 'member' && (
            <article className="workspace-card member-attestation-card">
              <div className="card-header">
                <span className="card-step">06</span>
                <h2>Private Affected-Release Attestation</h2>
              </div>
              <p className="card-caption">
                Privately prove membership in an active on-chain affected-release policy without revealing your identity or inventory data to the public ledger.
              </p>

              <div className="honesty-notice-box" role="note">
                <strong>Honesty & Verification Notice</strong>
                <p>
                  CommonVeil proves membership against the on-chain affected-release policy. It does not independently authenticate the external advisory publisher.
                </p>
              </div>

              {/* Attestation Prerequisites Checklist */}
              {(() => {
                const prereqsMet = canInitiateAttestation({
                  isConnected: Boolean(wallet),
                  attachedContractAddress: contractState.attachedAddress,
                  hasMemberSecretAndSalt: Boolean(plaintextMemberSecretRef.current && plaintextMemberSaltRef.current),
                  memberBackupRecoveryStatus: memberUi.backupRecoveryStatus,
                  isMemberCredentialAdmitted: memberUi.verificationStatus === 'verified',
                  hasSnapshotEvidence: Boolean(memberAttestationUi.snapshotEvidence),
                  snapshotCredentialMatchesActiveMember: Boolean(
                    memberAttestationUi.snapshotEvidence && memberUi.memberCredentialHex,
                  ),
                  snapshotCommitmentExistsOnChain: Boolean(
                    memberAttestationUi.snapshotEvidence &&
                    contractState.inspectedState?.inventoryCommitments.toString() !== '0',
                  ),
                  hasPolicyReceipt: Boolean(memberAttestationUi.importedPolicyReceipt),
                  policyReceiptContractMatchesAttached: Boolean(
                    memberAttestationUi.importedPolicyReceipt &&
                    contractState.attachedAddress &&
                    memberAttestationUi.importedPolicyReceipt.contractAddress.toLowerCase().trim() ===
                      contractState.attachedAddress.toLowerCase().trim(),
                  ),
                  policyProductAndVersionMatchSnapshot: Boolean(
                    memberAttestationUi.importedPolicyReceipt &&
                    memberAttestationUi.snapshotEvidence &&
                    memberAttestationUi.importedPolicyReceipt.product === memberAttestationUi.snapshotEvidence.product &&
                    memberAttestationUi.importedPolicyReceipt.version.major === memberAttestationUi.snapshotEvidence.version.major &&
                    memberAttestationUi.importedPolicyReceipt.version.minor === memberAttestationUi.snapshotEvidence.version.minor &&
                    memberAttestationUi.importedPolicyReceipt.version.patch === memberAttestationUi.snapshotEvidence.version.patch,
                  ),
                  isReleaseRegisteredOnChain: Boolean(
                    memberAttestationUi.importedPolicyReceipt &&
                    contractState.inspectedState?.affectedReleases.toString() !== '0',
                  ),
                  isPolicyActive: Boolean(contractState.inspectedState?.policyActive),
                  isNullifierAlreadyUsed: memberAttestationUi.stage === 'already-attested',
                  isProofProviderConfigured: true,
                  isOperationPending: isBusy,
                });

                return (
                  <div className="prerequisites-warning-box" role="status">
                    <span className="field-caption">Attestation Prerequisites Status</span>
                    <ul className="prerequisites-list">
                      <li className={wallet ? 'met' : 'unmet'}>
                        {wallet ? '✔' : '○'} 1AM connected on Midnight Preprod
                      </li>
                      <li className={contractState.attachedAddress ? 'met' : 'unmet'}>
                        {contractState.attachedAddress ? '✔' : '○'} Compatible CommonVeil contract attached
                      </li>
                      <li className={plaintextMemberSecretRef.current && plaintextMemberSaltRef.current ? 'met' : 'unmet'}>
                        {plaintextMemberSecretRef.current && plaintextMemberSaltRef.current ? '✔' : '○'} Active Member secret & salt in session memory
                      </li>
                      <li className={memberUi.backupRecoveryStatus === 'recovery-tested' ? 'met' : 'unmet'}>
                        {memberUi.backupRecoveryStatus === 'recovery-tested' ? '✔' : '○'} Member backup is recovery-tested
                      </li>
                      <li className={memberUi.verificationStatus === 'verified' ? 'met' : 'unmet'}>
                        {memberUi.verificationStatus === 'verified' ? '✔' : '○'} Derived Member credential admitted in ledger
                      </li>
                      <li className={memberAttestationUi.snapshotEvidence ? 'met' : 'unmet'}>
                        {memberAttestationUi.snapshotEvidence ? '✔' : '○'} Certified snapshot decrypted and verified
                      </li>
                      <li className={memberAttestationUi.importedPolicyReceipt ? 'met' : 'unmet'}>
                        {memberAttestationUi.importedPolicyReceipt ? '✔' : '○'} Affected-release policy receipt imported
                      </li>
                      <li className={contractState.inspectedState?.policyActive ? 'met' : 'unmet'}>
                        {contractState.inspectedState?.policyActive ? '✔' : '○'} Policy active on-chain (policyActive = true)
                      </li>
                    </ul>
                  </div>
                );
              })()}

              <div className="form-field-group">
                <label htmlFor="member-policy-receipt-input">
                  Import Public Affected-Release Registration Receipt (<code>commonveil.affected-release-registration-receipt/v1</code>)
                </label>
                <input
                  id="member-policy-receipt-input"
                  ref={memberPolicyReceiptFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleMemberPolicyReceiptFileSelect}
                  aria-label="Select affected release registration receipt JSON file"
                />
                {memberPolicyReceiptSelectedFileName && (
                  <small className="field-caption">
                    Selected file: {memberPolicyReceiptSelectedFileName} ({memberPolicyReceiptSelectedFileSize} bytes)
                  </small>
                )}
              </div>

              <div className="button-row">
                <button
                  type="button"
                  className="action-button secondary"
                  onClick={handleImportMemberPolicyReceipt}
                  disabled={!memberPolicyReceiptContent || !memberAttestationUi.snapshotEvidence}
                  aria-label="Import affected release registration receipt"
                >
                  Import & Verify Policy Receipt
                </button>
              </div>

              {memberAttestationUi.stage === 'unaffected' && (
                <div className="safe-notice-banner" role="status">
                  <strong>Unaffected Release Evaluation</strong>
                  <p>This certified version is outside the registered affected-release set.</p>
                </div>
              )}

              {memberAttestationUi.stage === 'already-attested' && (
                <div className="safe-notice-banner" role="status">
                  <strong>Replay Protection Active</strong>
                  <p>Member already attested for this advisory (nullifier recorded on-chain). Duplicate attestation is prohibited.</p>
                </div>
              )}

              {memberAttestationUi.importedPolicyReceipt && memberAttestationUi.stage === 'ready-to-attest' && (
                <div className="policy-match-details">
                  <span className="field-caption">Policy Match Summary</span>
                  <dl className="property-list">
                    <dt>Advisory ID</dt>
                    <dd><code>{memberAttestationUi.importedPolicyReceipt.advisoryId}</code></dd>
                    <dt>Product & Version</dt>
                    <dd>
                      <code>
                        {memberAttestationUi.importedPolicyReceipt.product} @ {memberAttestationUi.importedPolicyReceipt.version.major}.{memberAttestationUi.importedPolicyReceipt.version.minor}.{memberAttestationUi.importedPolicyReceipt.version.patch}
                      </code>
                    </dd>
                    <dt>Policy Active</dt>
                    <dd><strong>Yes (On-Chain Confirmed)</strong></dd>
                  </dl>

                  <div className="button-row">
                    <button
                      type="button"
                      className="action-button primary"
                      onClick={handleOpenAttestConfirmation}
                      disabled={isBusy}
                      aria-label="Prove affected release"
                    >
                      Prove Affected Release
                    </button>
                  </div>
                </div>
              )}

              {/* Attestation Confirmation Dialog */}
              {memberAttestationUi.stage === 'confirming' && (
                <div className="confirmation-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="attest-confirm-title">
                  <div className="confirmation-modal-card">
                    <h3 id="attest-confirm-title">Confirm Private Affected-Release Attestation</h3>
                    <p className="modal-caption">
                      Review transaction details before invoking the Midnight zero-knowledge attest circuit.
                    </p>

                    <dl className="property-list">
                      <dt>Network</dt>
                      <dd><strong>Midnight Preprod</strong></dd>
                      <dt>Contract Address</dt>
                      <dd><code>{contractState.attachedAddress ? shortenAddress(contractState.attachedAddress) : ''}</code></dd>
                      <dt>Advisory Identifier</dt>
                      <dd><code>{memberAttestationUi.importedPolicyReceipt?.advisoryId}</code></dd>
                      <dt>Product & Version</dt>
                      <dd>
                        <code>
                          {memberAttestationUi.snapshotEvidence?.product} @ {memberAttestationUi.snapshotEvidence?.version.major}.{memberAttestationUi.snapshotEvidence?.version.minor}.{memberAttestationUi.snapshotEvidence?.version.patch}
                        </code>
                      </dd>
                      <dt>Certification Commitment</dt>
                      <dd>Verified on-chain ✔</dd>
                      <dt>Affected Release</dt>
                      <dd>Verified in policy ✔</dd>
                    </dl>

                    <div className="modal-warning-box">
                      <strong>DUST Fee & Replay Warning</strong>
                      <p>
                        A small DUST network transaction fee is consumed. The same Member cannot attest twice for the same advisory; an anonymous nullifier is published on-chain to prevent replay.
                      </p>
                    </div>

                    <div className="privacy-statement-box">
                      <strong>Privacy Statement</strong>
                      <p>
                        Your Member identity, Member secret, Member salt, and snapshot salt remain completely confidential. Only the advisory identifier, an anonymous nullifier, and the incremented accepted-report count become public.
                      </p>
                    </div>

                    <div className="modal-button-row">
                      <button
                        type="button"
                        className="action-button primary"
                        onClick={handleConfirmAndAttest}
                        disabled={isBusy}
                      >
                        {isBusy ? 'Submitting...' : 'Confirm & Submit Attestation'}
                      </button>
                      <button
                        type="button"
                        className="action-button secondary"
                        onClick={handleDismissAttestConfirmation}
                        disabled={isBusy}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress and Indexer Lag State */}
              {memberAttestationUi.stage === 'requesting-wallet' && (
                <div className="progress-banner" aria-live="polite">
                  <p>Awaiting authorization in 1AM wallet...</p>
                </div>
              )}

              {memberAttestationUi.stage === 'submitting' && (
                <div className="progress-banner" aria-live="polite">
                  <p>Generating zero-knowledge proof and submitting attestation transaction...</p>
                </div>
              )}

              {memberAttestationUi.stage === 'finalized-indexing' && (
                <div className="indexer-lag-box" aria-live="polite">
                  <strong>Attestation Finalized (Indexing Delayed)</strong>
                  <p>
                    Transaction finalized on-chain with ID <code>{shortenAddress(memberAttestationUi.attestationTxId ?? '')}</code>. The indexer has not yet synchronized.
                  </p>
                  <button
                    type="button"
                    className="action-button secondary"
                    onClick={handleRetryAttestationVerification}
                  >
                    Retry On-Chain Inspection (Zero New Tx)
                  </button>
                </div>
              )}

              {/* Completed Attestation Receipt State */}
              {memberAttestationUi.stage === 'attested' && memberAttestationUi.receipt && (
                <div className="completed-receipt-box">
                  <h3>Private Attestation Accepted ✔</h3>
                  <p>
                    Your affected-release attestation was successfully verified and recorded by the CommonVeil contract without disclosing your identity.
                  </p>

                  <dl className="property-list">
                    <dt>Transaction ID</dt>
                    <dd title={memberAttestationUi.receipt.attestationTxId}>
                      <code>{shortenAddress(memberAttestationUi.receipt.attestationTxId)}</code>
                    </dd>
                    <dt>Advisory ID</dt>
                    <dd><code>{memberAttestationUi.receipt.advisoryId}</code></dd>
                    <dt>Accepted Timestamp</dt>
                    <dd><small>{memberAttestationUi.receipt.acceptedAt}</small></dd>
                    <dt>Status</dt>
                    <dd><strong>{memberAttestationUi.receipt.status}</strong></dd>
                  </dl>

                  <div className="button-row">
                    <button
                      type="button"
                      className="action-button primary"
                      onClick={handleDownloadPrivateAttestationReceipt}
                      aria-label="Download private attestation receipt JSON"
                    >
                      Download Attestation Receipt (.json)
                    </button>
                    <button
                      type="button"
                      className="action-button secondary"
                      onClick={handleResetMemberAttestation}
                      aria-label="Attest another advisory"
                    >
                      Done / Reset
                    </button>
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

          {/* Registrar Affected Release & Policy Activation Section (Step 06) */}
          {role === 'registrar' && (
            <article className="workspace-card registrar-affected-release-card">
              <div className="card-header">
                <span className="card-step">06</span>
                <h2>Register Affected Release & Activate Policy</h2>
              </div>
              <p className="card-caption">
                Record an authoritative security advisory on-chain. Registering an affected release activates the contract policy and permanently closes the pre-policy inventory-certification window for the Certifier. The Member later uses attest.
              </p>

              {/* Explicit Publisher Notice Required by Audit */}
              <div className="advisory-attribution-banner" role="note">
                <p>
                  <strong>Notice:</strong> CommonVeil records the Registrar’s policy decision on-chain. It does not independently authenticate the external advisory publisher.
                </p>
              </div>

              {/* Status Header */}
              <div className="registrar-status-row" aria-live="polite">
                <div>
                  <span className="field-caption">Policy Status</span>
                  <strong className={`verification-badge ${publicState?.policyActive ? 'verified' : 'unverified'}`}>
                    {publicState?.policyActive ? 'Policy Active' : 'Pre-policy (Open)'}
                  </strong>
                </div>
                <div>
                  <span className="field-caption">Workflow Stage</span>
                  <strong className={`verification-badge ${affectedReleaseUi.stage === 'registered' ? 'verified' : 'unverified'}`}>
                    {affectedReleaseUi.stage === 'registered'
                      ? 'Registered (Policy Active)'
                      : affectedReleaseUi.stage === 'reviewing'
                        ? 'Reviewing Policy'
                        : affectedReleaseUi.stage === 'confirming'
                          ? 'Confirmation Required'
                          : affectedReleaseUi.stage === 'requesting-wallet'
                            ? '1AM Approval'
                            : affectedReleaseUi.stage === 'submitting'
                              ? 'Proving & Submitting'
                              : affectedReleaseUi.stage === 'finalized-indexing'
                                ? 'Finalized (Indexing)'
                                : affectedReleaseUi.stage === 'failed'
                                  ? 'Failed'
                                  : 'Idle'}
                  </strong>
                </div>
              </div>

              {affectedReleaseNotice && (
                <div className="safe-notice-banner" role="status">
                  <p>{affectedReleaseNotice}</p>
                </div>
              )}

              {affectedReleaseUi.errorMessage && (
                <div className="safe-error-banner" role="alert">
                  <strong>Policy Error</strong>
                  <p>{affectedReleaseUi.errorMessage}</p>
                </div>
              )}

              {/* Idle / Reviewing / Failed / Cancelled: Package Import & Builder */}
              {(affectedReleaseUi.stage === 'idle' ||
                affectedReleaseUi.stage === 'reviewing' ||
                affectedReleaseUi.stage === 'failed') && (
                <div className="affected-policy-container">
                  {/* Option A: Import Existing Policy Package */}
                  <div className="admission-import-box">
                    <label htmlFor="affected-release-file-input">
                      Import Affected-Release Policy (.json)
                    </label>
                    <p className="form-hint-text">
                      Upload a verified <code>commonveil.affected-release-policy/v1</code> package targeting this attached contract.
                    </p>
                    <input
                      id="affected-release-file-input"
                      type="file"
                      accept=".json,application/json"
                      ref={affectedPolicyInputRef}
                      disabled={isRegisteringAffected}
                      onChange={handleAffectedPolicyFileSelect}
                    />
                  </div>

                  {/* Option B: Policy Package Generator / Builder */}
                  <div className="policy-builder-box">
                    <h3>Draft Advisory Policy Package</h3>
                    <p className="form-hint-text">
                      Prepare an affected-release policy package for the active contract with full advisory metadata and HTTPS reference.
                    </p>
                    <div className="policy-builder-grid">
                      <div className="form-group">
                        <label htmlFor="policy-advisory-id">Advisory Identifier</label>
                        <input
                          id="policy-advisory-id"
                          type="text"
                          value={policyAdvisoryInput}
                          onChange={(e) => setPolicyAdvisoryInput(e.target.value)}
                          placeholder="CVE-2024-3094"
                          disabled={isRegisteringAffected}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="policy-product">Product Identifier</label>
                        <input
                          id="policy-product"
                          type="text"
                          value={policyProductInput}
                          onChange={(e) => setPolicyProductInput(e.target.value)}
                          placeholder="pkg:generic/xz-utils"
                          disabled={isRegisteringAffected}
                        />
                      </div>
                      <div className="form-group version-inputs">
                        <label>Affected Version (Major . Minor . Patch)</label>
                        <div className="version-tuple-row">
                          <input
                            type="number"
                            min="0"
                            value={policyMajorInput}
                            onChange={(e) => setPolicyMajorInput(e.target.value)}
                            aria-label="Major version"
                            disabled={isRegisteringAffected}
                          />
                          <span>.</span>
                          <input
                            type="number"
                            min="0"
                            value={policyMinorInput}
                            onChange={(e) => setPolicyMinorInput(e.target.value)}
                            aria-label="Minor version"
                            disabled={isRegisteringAffected}
                          />
                          <span>.</span>
                          <input
                            type="number"
                            min="0"
                            value={policyPatchInput}
                            onChange={(e) => setPolicyPatchInput(e.target.value)}
                            aria-label="Patch version"
                            disabled={isRegisteringAffected}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label htmlFor="policy-publisher">Advisory Source / Publisher</label>
                        <input
                          id="policy-publisher"
                          type="text"
                          value={policyPublisherInput}
                          onChange={(e) => setPolicyPublisherInput(e.target.value)}
                          placeholder="Red Hat / CISA"
                          disabled={isRegisteringAffected}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="policy-ref">HTTPS Reference URL</label>
                        <input
                          id="policy-ref"
                          type="url"
                          value={policyRefInput}
                          onChange={(e) => setPolicyRefInput(e.target.value)}
                          placeholder="https://nvd.nist.gov/vuln/detail/CVE-2024-3094"
                          disabled={isRegisteringAffected}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="policy-pubdate">Source Publication Date (ISO-8601)</label>
                        <input
                          id="policy-pubdate"
                          type="text"
                          value={policyPubDateInput}
                          onChange={(e) => setPolicyPubDateInput(e.target.value)}
                          placeholder="2024-03-29T00:00:00.000Z"
                          disabled={isRegisteringAffected}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="action-button secondary"
                      onClick={handleBuildAndExportPolicy}
                      disabled={!contractState.attachedAddress || isRegisteringAffected}
                      aria-label="Generate and download affected release policy package"
                    >
                      Export & Load Policy Package (.json)
                    </button>
                  </div>

                  {/* If policy is loaded, show review box with action to open confirmation */}
                  {affectedReleaseUi.importedPolicy && (
                    <div className="policy-summary-box">
                      <h3>Loaded Policy Summary</h3>
                      <div className="admission-review-details">
                        <p><strong>Advisory ID:</strong> <code>{affectedReleaseUi.importedPolicy.advisoryId}</code></p>
                        <p><strong>Product:</strong> <code>{affectedReleaseUi.importedPolicy.product}</code></p>
                        <p>
                          <strong>Version:</strong>{' '}
                          <code>
                            {affectedReleaseUi.importedPolicy.version.major}.
                            {affectedReleaseUi.importedPolicy.version.minor}.
                            {affectedReleaseUi.importedPolicy.version.patch}
                          </code>
                        </p>
                        <p><strong>Publisher:</strong> {affectedReleaseUi.importedPolicy.sourcePublisher}</p>
                        <p>
                          <strong>Reference:</strong>{' '}
                          <a
                            href={affectedReleaseUi.importedPolicy.sourceReference}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {affectedReleaseUi.importedPolicy.sourceReference}
                          </a>
                        </p>
                        <p><strong>Target Contract:</strong> <code>{shortenAddress(affectedReleaseUi.importedPolicy.contractAddress)}</code></p>
                      </div>

                      <div className="button-row">
                        <button
                          type="button"
                          className="action-button primary"
                          disabled={!canRegisterAffectedRelease}
                          onClick={handleOpenAffectedReleaseConfirmation}
                          aria-label="Review and register affected release on-chain"
                        >
                          Review & Register on Midnight Preprod
                        </button>
                        <button
                          type="button"
                          className="action-button secondary"
                          onClick={handleResetAffectedRelease}
                          aria-label="Clear loaded policy"
                        >
                          Clear Policy
                        </button>
                      </div>

                      {registrarAffectedReleasePrereqs.length > 0 && (
                        <ul className="prereq-missing-list">
                          {registrarAffectedReleasePrereqs.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Confirmation Dialog / State */}
              {affectedReleaseUi.stage === 'confirming' && affectedReleaseUi.importedPolicy && (
                <div className="admission-confirmation-box" role="dialog" aria-labelledby="affected-confirm-heading">
                  <h3 id="affected-confirm-heading">Confirm Affected Release Registration</h3>

                  {/* Prominent policy activation warning */}
                  <div className="safe-error-banner" role="alert">
                    <strong>CRITICAL POLICY ACTIVATION NOTICE:</strong>
                    <p>
                      Submitting this transaction sets <code>policyActive = true</code> on-chain! Policy activation closes the pre-policy inventory-certification window for the Certifier. Once active, the Member later uses attest.
                    </p>
                  </div>

                  <div className="admission-review-details">
                    <p><strong>Contract:</strong> <code>{shortenAddress(affectedReleaseUi.importedPolicy.contractAddress)}</code></p>
                    <p><strong>Advisory ID:</strong> <code>{affectedReleaseUi.importedPolicy.advisoryId}</code></p>
                    <p><strong>Product:</strong> <code>{affectedReleaseUi.importedPolicy.product}</code></p>
                    <p>
                      <strong>Version Tuple:</strong>{' '}
                      <code>
                        {affectedReleaseUi.importedPolicy.version.major}.
                        {affectedReleaseUi.importedPolicy.version.minor}.
                        {affectedReleaseUi.importedPolicy.version.patch}
                      </code>
                    </p>
                    <p><strong>Publisher:</strong> {affectedReleaseUi.importedPolicy.sourcePublisher}</p>
                    <p><strong>Reference:</strong> {affectedReleaseUi.importedPolicy.sourceReference}</p>
                    <p><strong>Publication Date:</strong> {affectedReleaseUi.importedPolicy.sourcePublicationDate}</p>
                  </div>

                  <div className="button-row">
                    <button
                      type="button"
                      className="action-button primary danger-button"
                      disabled={!canRegisterAffectedRelease}
                      onClick={handleConfirmAndRegisterAffectedRelease}
                      aria-label="Confirm registration and submit via 1AM"
                    >
                      Confirm Registration & Activate Policy via 1AM
                    </button>
                    <button
                      type="button"
                      className="action-button secondary"
                      disabled={isRegisteringAffected}
                      onClick={handleDismissAffectedReleaseConfirmation}
                      aria-label="Cancel registration confirmation"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* In-Flight States */}
              {affectedReleaseUi.stage === 'requesting-wallet' && (
                <div className="status-callout warning">
                  <span className="status-indicator warning">Preparing 1AM Transaction</span>
                  <p>Preparing proof and registration transaction. Approve the transaction in your 1AM wallet window.</p>
                </div>
              )}

              {affectedReleaseUi.stage === 'submitting' && (
                <div className="status-callout notice">
                  <span className="status-indicator notice">Submitting to Preprod</span>
                  <p>Generating zero-knowledge proof and registering affected release on Midnight Preprod...</p>
                </div>
              )}

              {/* Indexer Lag State */}
              {affectedReleaseUi.stage === 'finalized-indexing' && (
                <div className="status-callout notice indexer-lag-box">
                  <span className="status-indicator notice">Finalized On-Chain</span>
                  <p>
                    The registration transaction was finalized on Midnight Preprod, but the public indexer has not yet reflected the updated <code>affectedReleases</code> set or <code>policyActive</code> flag.
                  </p>
                  <p className="card-caption">
                    Click below to retry on-chain confirmation without resubmitting any transaction.
                  </p>
                  <button
                    type="button"
                    className="action-button primary"
                    onClick={handleRetryAffectedReleaseVerification}
                    aria-label="Retry indexer confirmation without resubmitting transaction"
                  >
                    Retry Indexer Confirmation
                  </button>
                </div>
              )}

              {/* Registered Success State & Receipt */}
              {affectedReleaseUi.stage === 'registered' && affectedReleaseUi.receipt && (
                <div className="admission-success-box">
                  <span className="status-indicator success">Release Registered & Policy Active</span>
                  <p>
                    Affected release{' '}
                    <code>
                      {affectedReleaseUi.receipt.product} {affectedReleaseUi.receipt.version.major}.{affectedReleaseUi.receipt.version.minor}.{affectedReleaseUi.receipt.version.patch}
                    </code>{' '}
                    is recorded in the on-chain <code>affectedReleases</code> set for advisory{' '}
                    <code>{affectedReleaseUi.receipt.advisoryId}</code>. Policy is now ACTIVE.
                  </p>
                  <dl className="receipt-details-list">
                    <dt>Contract Address</dt>
                    <dd><code>{shortenAddress(affectedReleaseUi.receipt.contractAddress)}</code></dd>
                    <dt>Advisory ID</dt>
                    <dd><code>{affectedReleaseUi.receipt.advisoryId}</code></dd>
                    <dt>Product</dt>
                    <dd><code>{affectedReleaseUi.receipt.product}</code></dd>
                    <dt>Version</dt>
                    <dd>
                      <code>
                        {affectedReleaseUi.receipt.version.major}.{affectedReleaseUi.receipt.version.minor}.{affectedReleaseUi.receipt.version.patch}
                      </code>
                    </dd>
                    <dt>Source Publisher</dt>
                    <dd>{affectedReleaseUi.receipt.sourcePublisher}</dd>
                    <dt>Policy Active</dt>
                    <dd><strong>Yes (true)</strong></dd>
                    {affectedReleaseUi.receipt.registrationTxId && (
                      <>
                        <dt>Transaction ID</dt>
                        <dd><code>{shortenAddress(affectedReleaseUi.receipt.registrationTxId)}</code></dd>
                      </>
                    )}
                    <dt>Registered At</dt>
                    <dd>{affectedReleaseUi.receipt.registeredAt}</dd>
                  </dl>

                  <div className="button-row">
                    <button
                      type="button"
                      className="action-button primary"
                      onClick={handleDownloadAffectedReleaseReceipt}
                      aria-label="Download public affected release registration receipt JSON"
                    >
                      Download Registration Receipt (.json)
                    </button>
                    <button
                      type="button"
                      className="action-button secondary"
                      onClick={handleResetAffectedRelease}
                      aria-label="Register another release"
                    >
                      Register Another Release
                    </button>
                  </div>
                </div>
              )}
            </article>
          )}

          {/* Public State Panel */}
          <article className="workspace-card public-state-card">
            <div className="card-header">
              <span className="card-step">{role === 'registrar' ? '07' : role === 'member' ? '07' : '05'}</span>
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
