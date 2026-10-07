import type { ContractAddress, SigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type {
  ExportPrivateStatesOptions,
  ExportSigningKeysOptions,
  ImportPrivateStatesOptions,
  ImportPrivateStatesResult,
  ImportSigningKeysOptions,
  ImportSigningKeysResult,
  PrivateStateExport,
  PrivateStateId,
  PrivateStateProvider,
  SigningKeyExport,
} from '@midnight-ntwrk/midnight-js-types';

export const inMemoryPrivateStateProvider = <PSI extends PrivateStateId, PS = unknown>(): PrivateStateProvider<PSI, PS> => {
  const privateStates = new Map<ContractAddress, Map<PSI, PS>>();
  const signingKeys = new Map<ContractAddress, SigningKey>();
  let contractAddress: ContractAddress | null = null;
  const requireAddress = () => {
    if (contractAddress === null) throw new Error('Contract address not set');
    return contractAddress;
  };
  const scoped = (address: ContractAddress) => {
    let values = privateStates.get(address);
    if (!values) { values = new Map(); privateStates.set(address, values); }
    return values;
  };
  const encode = <T,>(value: T) => JSON.stringify(value);
  const decode = <T,>(value: string) => JSON.parse(value) as T;

  return {
    setContractAddress(address) { contractAddress = address; },
    set(key, state) { scoped(requireAddress()).set(key, state); return Promise.resolve(); },
    get(key) { return Promise.resolve(scoped(requireAddress()).get(key) ?? null); },
    remove(key) { scoped(requireAddress()).delete(key); return Promise.resolve(); },
    clear() { privateStates.delete(requireAddress()); return Promise.resolve(); },
    setSigningKey(address, key) { signingKeys.set(address, key); return Promise.resolve(); },
    getSigningKey(address) { return Promise.resolve(signingKeys.get(address) ?? null); },
    removeSigningKey(address) { signingKeys.delete(address); return Promise.resolve(); },
    clearSigningKeys() { signingKeys.clear(); return Promise.resolve(); },
    exportPrivateStates(_options?: ExportPrivateStatesOptions): Promise<PrivateStateExport> {
      const address = requireAddress();
      const states = Object.fromEntries([...scoped(address)].map(([key, value]) => [key, encode(value)]));
      return Promise.resolve({ format: 'midnight-private-state-export', encryptedPayload: encode({ states }), salt: 'in-memory' });
    },
    importPrivateStates(data: PrivateStateExport, options?: ImportPrivateStatesOptions): Promise<ImportPrivateStatesResult> {
      const values = scoped(requireAddress());
      const strategy = options?.conflictStrategy ?? 'error';
      const payload = decode<{ states?: Record<string, string> }>(data.encryptedPayload);
      let imported = 0, skipped = 0, overwritten = 0;
      for (const [rawKey, serialized] of Object.entries(payload.states ?? {})) {
        const key = rawKey as PSI;
        if (values.has(key)) {
          if (strategy === 'skip') { skipped++; continue; }
          if (strategy === 'error') return Promise.reject(new Error(`Private state conflict: ${rawKey}`));
          overwritten++;
        } else imported++;
        values.set(key, decode<PS>(serialized));
      }
      return Promise.resolve({ imported, skipped, overwritten });
    },
    exportSigningKeys(_options?: ExportSigningKeysOptions): Promise<SigningKeyExport> {
      return Promise.resolve({ format: 'midnight-signing-key-export', encryptedPayload: encode({ keys: Object.fromEntries(signingKeys) }), salt: 'in-memory' });
    },
    importSigningKeys(data: SigningKeyExport, options?: ImportSigningKeysOptions): Promise<ImportSigningKeysResult> {
      const strategy = options?.conflictStrategy ?? 'error';
      const payload = decode<{ keys?: Record<string, SigningKey> }>(data.encryptedPayload);
      let imported = 0, skipped = 0, overwritten = 0;
      for (const [address, key] of Object.entries(payload.keys ?? {})) {
        if (signingKeys.has(address)) {
          if (strategy === 'skip') { skipped++; continue; }
          if (strategy === 'error') return Promise.reject(new Error(`Signing key conflict: ${address}`));
          overwritten++;
        } else imported++;
        signingKeys.set(address, key);
      }
      return Promise.resolve({ imported, skipped, overwritten });
    },
  };
};
