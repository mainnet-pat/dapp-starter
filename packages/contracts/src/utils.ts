import { bigIntToVmNumber, CashAddressNetworkPrefix, cashAddressToLockingBytecode, CashAddressType, decodeCashAddress, encodeCashAddress, hexToBin, padMinimallyEncodedVmNumber, vmNumberToBigInt } from "@bitauth/libauth";
import { TokenDetails, Utxo } from "cashscript";
import { UtxoI } from "mainnet-js";
import { WrapWallet } from "@bch-wc2/mainnet-js-signer"

export const require = (predicate: boolean, message: string) => {
  if (!predicate) {
    throw new Error(message);
  }
}

export const padVmNumber = (num: bigint, length: number) => {
  return padMinimallyEncodedVmNumber(bigIntToVmNumber(num), length).slice(0, length);
}

export const vmToBigInt = (vmNumber: string) => {
  return vmNumberToBigInt(hexToBin(vmNumber), { requireMinimalEncoding: false }) as bigint;
}

export function addressToLockScript(address: string): Uint8Array {
  const result = cashAddressToLockingBytecode(address);
  if (typeof result === 'string') throw new Error(result);

  return result.bytecode;
}

export const toCashAddress = (address: string) => {
  const decoded = decodeCashAddress(address);
  if (typeof decoded === 'string') {
    throw new Error(decoded);
  }

  return encodeCashAddress({
    ...decoded,
    prefix: address.split(':')[0] as CashAddressNetworkPrefix,
    type: decoded.type.replace('WithTokens', '') as CashAddressType,
  }).address;
}

export const toTokenAddress = (address: string) => {
  const decoded = decodeCashAddress(address);
  if (typeof decoded === 'string') {
    throw new Error(decoded);
  }

  return encodeCashAddress({
    ...decoded,
    prefix: decoded.prefix,
    type: decoded.type.replace('WithTokens', '') + 'WithTokens' as CashAddressType,
  }).address;
}

export const toCashScriptUtxo = (utxo: UtxoI) =>
  ({
    satoshis: BigInt(utxo.satoshis),
    txid: utxo.txid,
    vout: utxo.vout,
    token: utxo.token
      ? ({
          amount: utxo.token?.amount ? BigInt(utxo.token.amount) : 0n,
          category: utxo.token?.tokenId,
          nft:
            utxo.token?.capability || utxo.token?.commitment
              ? ({
                  capability: utxo.token?.capability,
                  commitment: utxo.token?.commitment,
                } as TokenDetails["nft"])
              : undefined,
        } as TokenDetails)
      : undefined,
  } as Utxo);

export const consolidateUtxos = async ({
  signer,
  minSatoshis,
} : {
  signer: ReturnType<typeof WrapWallet>,
  minSatoshis?: bigint,
}) => {
  if (!minSatoshis) {
    return signer.sendMax(signer.cashaddr, {
      userPrompt: "Sign to consolidate UTXOs",
      queryBalance: false,
    });
  };

  return signer.send({
    cashaddr: signer.cashaddr,
    value: Number(minSatoshis),
    unit: "sat",
  }, {
    userPrompt: "Sign to consolidate UTXOs",
    queryBalance: false,
  });
}
