import type { IConnector } from '@bch-wc2/interfaces';
import { P2PKH } from "@dapp-starter/contracts";
import { ElectrumNetworkProvider } from "cashscript";
import { Wallet } from "mainnet-js";
import { useEffect, useState } from "react";

export function useP2PKHContract(address?: string, connector?: IConnector) {
  const [p2pkh, setP2pkh] = useState<P2PKH>();

  useEffect(() => {
    if (!address || !connector) {
      return;
    }

    (async () => {
      const wallet = await Wallet.watchOnly(address);
      const provider = new ElectrumNetworkProvider(undefined, {
        electrum: wallet.provider.electrum,
        manualConnectionManagement: true,
      });

      const p2pkh = new P2PKH({
        wallet: wallet,
        provider: provider,
        connector: connector,
      });
      setP2pkh(p2pkh);
    })();
  }, [address, connector]);

  return { p2pkh, P2PKH };
}
