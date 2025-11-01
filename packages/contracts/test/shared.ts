import { encodeCashAddress, encodePrivateKeyWif, hash160, hexToBin, secp256k1 } from "@bitauth/libauth";
import { MockNetworkProvider, NetworkProvider, SignatureTemplate } from "cashscript";
import { BaseWallet, binToHex, TestNetWallet, TokenI, UtxoI } from "mainnet-js";

export const alicePriv = hexToBin('1'.repeat(64));
export const aliceSigTemplate = new SignatureTemplate(alicePriv);
export const alicePub = secp256k1.derivePublicKeyCompressed(alicePriv) as Uint8Array;
export const alicePkh = hash160(alicePub);
export const aliceAddress = encodeCashAddress({ prefix: 'bchtest', type: 'p2pkh', payload: alicePkh, throwErrors: true }).address;

export const bobPriv = hexToBin('2'.repeat(64));
export const bobSigTemplate = new SignatureTemplate(bobPriv);
export const bobPub = secp256k1.derivePublicKeyCompressed(bobPriv) as Uint8Array;
export const bobPkh = hash160(bobPub);
export const bobAddress = encodeCashAddress({ prefix: 'bchtest', type: 'p2pkh', payload: bobPkh, throwErrors: true }).address;

export const charliePriv = hexToBin('3'.repeat(64));
export const charlieSigTemplate = new SignatureTemplate(charliePriv);
export const charliePub = secp256k1.derivePublicKeyCompressed(charliePriv) as Uint8Array;
export const charliePkh = hash160(charliePub);
export const charlieAddress = encodeCashAddress({ prefix: 'bchtest', type: 'p2pkh', payload: charliePkh, throwErrors: true }).address;

export const davePriv = hexToBin('4'.repeat(64));
export const daveSigTemplate = new SignatureTemplate(davePriv);
export const davePub = secp256k1.derivePublicKeyCompressed(davePriv) as Uint8Array;
export const davePkh = hash160(davePub);
export const daveAddress = encodeCashAddress({ prefix: 'bchtest', type: 'p2pkh', payload: davePkh, throwErrors: true }).address;

export const MockWallet = async (provider: MockNetworkProvider, privateKey?: Uint8Array): Promise<TestNetWallet> => {
  const wif = encodePrivateKeyWif(privateKey ?? alicePriv, "testnet");
  const wallet = await TestNetWallet.fromWIF(wif);

  MockWalletMethods(wallet, provider);

  return wallet;
}

export const MockWalletMethods = (wallet: BaseWallet, provider: NetworkProvider) => {
  wallet.getAddressUtxos = async (address?: string): Promise<UtxoI[]> => {
    const utxos = await provider.getUtxos(address ?? wallet.cashaddr);
    return utxos.map(utxo => ({
      txid: utxo.txid,
      vout: utxo.vout,
      satoshis: Number(utxo.satoshis),
      token: utxo.token ? {
        amount: utxo.token.amount,
        tokenId: utxo.token.category,
        capability: utxo.token.nft?.capability,
        commitment: utxo.token.nft?.commitment,
      } as TokenI : undefined,
    }));
  };

  wallet.getUtxos = async (): Promise<UtxoI[]> => {
    return wallet.getAddressUtxos(wallet.cashaddr);
  };

  wallet.submitTransaction = async (transaction: Uint8Array, awaitPropagation?: boolean | undefined): Promise<string> => {
    const txid = await provider.sendRawTransaction(binToHex(transaction));
    return txid;
  };

  wallet.provider.sendRawTransaction = async (txHex: string, awaitPropagation: boolean = true): Promise<string> => {
    const txid = await provider.sendRawTransaction(txHex);
    return txid;
  };

  wallet.provider.getBlockHeight = async () => {
    return provider.getBlockHeight();
  };

  wallet.provider.getRelayFee = async () => {
    return 0.0001;
  }
}
