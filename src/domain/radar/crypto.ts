/**
 * E2EE contracts for radar rooms. Implementations live in packages/radar-crypto
 * (Fase 3). This file is the stable interface so domain/storage can compile now.
 */

export const ROOM_KEY_BYTES = 32;
export const X25519_PK_BYTES = 32;

export type Bytes = Uint8Array;

export interface IdentityKeyPair {
  publicKey: Bytes;
  /** Wrapped with DB_KEY before disk. Never log. */
  secretKey: Bytes;
}

export interface WrappedRoomKey {
  memberPub: Bytes;
  nonce: Bytes;
  ciphertext: Bytes;
}

export interface SealedMove {
  seq: number;
  nonce: Bytes;
  ciphertext: Bytes;
  aad: Bytes;
}

export interface RadarCrypto {
  generateIdentity(): Promise<IdentityKeyPair>;
  generateRoomKey(): Promise<Bytes>;
  wrapRoomKey(roomKey: Bytes, recipientPub: Bytes, sender: IdentityKeyPair): Promise<WrappedRoomKey>;
  unwrapRoomKey(wrapped: WrappedRoomKey, recipient: IdentityKeyPair): Promise<Bytes>;
  sealMove(roomKey: Bytes, plaintext: Bytes, aad: Bytes): Promise<SealedMove>;
  openMove(roomKey: Bytes, sealed: SealedMove): Promise<Bytes>;
  hashPrev(ciphertext: Bytes): Promise<string>;
}

export function assertKeyLen(key: Bytes, len: number, label: string): void {
  if (key.byteLength !== len) {
    throw new Error(`${label} must be ${len} bytes`);
  }
}
