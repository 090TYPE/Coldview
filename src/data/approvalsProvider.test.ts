import { describe, it, expect } from 'vitest';
import { parseApprovals, ownerToTopic, APPROVAL_TOPIC0 } from './approvalsProvider';

const OWNER = '0x' + 'a'.repeat(40);
const OWNER_TOPIC = '0x' + '0'.repeat(24) + 'a'.repeat(40);
const SPENDER_A = '0x' + 'b'.repeat(40);
const SPENDER_B = '0x' + 'c'.repeat(40);
const spenderTopic = (addr: string) => '0x' + '0'.repeat(24) + addr.slice(2);
const valueHex = (n: bigint) => '0x' + n.toString(16).padStart(64, '0');
const MAX_U256 = '0x' + 'f'.repeat(64);

function log(over: Partial<Record<string, unknown>> = {}) {
  return {
    address: '0x' + 'd'.repeat(40),
    data: valueHex(100n),
    blockNumber: '0xa',
    timeStamp: '0x10',
    transactionHash: '0x' + 'e'.repeat(64),
    topics: [APPROVAL_TOPIC0, OWNER_TOPIC, spenderTopic(SPENDER_A), null],
    ...over,
  };
}

describe('ownerToTopic', () => {
  it('left-pads a lowercased address to a 32-byte topic', () => {
    expect(ownerToTopic('0x' + 'A'.repeat(40))).toBe(OWNER_TOPIC);
  });
});

describe('parseApprovals', () => {
  it('keeps only the latest event per (token, spender)', () => {
    const rows = parseApprovals([
      log({ blockNumber: '0xa', data: valueHex(100n) }),
      log({ blockNumber: '0xb', data: valueHex(200n) }),
    ], OWNER);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ amount: '200', spender: SPENDER_A, blockNumber: 11 });
  });

  it('flags max-uint256 (and huge values) as unlimited (null amount)', () => {
    const rows = parseApprovals([log({ data: MAX_U256 })], OWNER);
    expect(rows[0].amount).toBeNull();
  });

  it('drops an approval whose latest value is zero (already revoked)', () => {
    const rows = parseApprovals([
      log({ blockNumber: '0xa', data: valueHex(500n) }),
      log({ blockNumber: '0xb', data: valueHex(0n) }),
    ], OWNER);
    expect(rows).toHaveLength(0);
  });

  it('keeps different spenders on the same token as separate rows', () => {
    const rows = parseApprovals([
      log({ topics: [APPROVAL_TOPIC0, OWNER_TOPIC, spenderTopic(SPENDER_A), null] }),
      log({ topics: [APPROVAL_TOPIC0, OWNER_TOPIC, spenderTopic(SPENDER_B), null] }),
    ], OWNER);
    expect(rows.map((r) => r.spender).sort()).toEqual([SPENDER_A, SPENDER_B].sort());
  });

  it('skips malformed logs and non-array input', () => {
    expect(parseApprovals(null, OWNER)).toEqual([]);
    expect(parseApprovals([{ topics: [APPROVAL_TOPIC0, OWNER_TOPIC] }], OWNER)).toEqual([]);
  });
});
