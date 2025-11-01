"use client";

import { useWatchAddress } from '@/hooks/useWatchAddress';
import { addMissingBCMRs, getTokenDecimals, getTokenImage, getTokenLabel, getTokenName } from '@/utils';
import { useWeb3ModalConnectorContext } from '@bch-wc2/web3modal-connector';
import React, { useCallback, useEffect, useState } from 'react';

const ConnectButton: React.FC = () => {
  const { address, connect, disconnect, isConnected } = useWeb3ModalConnectorContext();
  const [loading, setLoading] = useState(false);
  const { balance, utxos } = useWatchAddress(address || '');
  const [balancesByToken, setBalancesByToken] = useState<Record<string, bigint>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [showAssets, setShowAssets] = useState(false);

  useEffect(() => {
    (async () => {
      if (utxos) {
        const categories = utxos.map((utxo) => utxo.token?.capability ? undefined : utxo.token?.tokenId).filter((tokenId) => tokenId !== undefined).filter((value, index, array) => array.indexOf(value) === index);
        setCategories(categories);
        await addMissingBCMRs(categories);
        const balances = categories.reduce((acc, category) => {
          acc[category] = utxos.filter((utxo) => utxo.token?.tokenId === category).reduce((acc, utxo) => acc + (utxo.token!.amount ?? 0n), 0n);
          return acc;
        }, {} as Record<string, bigint>);
        setBalancesByToken(balances);
        setCategories(categories);
      }
    })();
  }, [utxos]);

  const connectWallet = useCallback(async () => {
    if (!connect) {
      return;
    }

    try {
      setLoading(true);
      await connect();
    } catch (err) {
      alert('Failed to connect wallet.');
    }
    setLoading(false);
  }, [connect]);

  const disconnectWallet = useCallback(async () => {
    if (!disconnect) {
      return;
    }

    try {
      setCategories([]);
      setLoading(true);
      await disconnect();
    } catch (err) {
      alert('Failed to disconnect wallet.');
    }
    setLoading(false);
  }, [disconnect]);

  return (
    <div className="flex flex-col w-full">
      {isConnected ? (
        <div className="flex flex-col w-full items-end gap-2">
          <button
            onClick={disconnectWallet}
            disabled={loading}
            className={`px-4 py-2 rounded-md font-bold text-white text-sm transition-colors ${
              loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-black hover:bg-gray-700 cursor-pointer'
            }`}
          >
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </button>

          <span>{address}</span>
          <p className="text-right">Balance: {(balance ?? 0)/1e8} BCH</p>
          {categories && <p className="underline decoration-dashed cursor-pointer" onClick={() => setShowAssets(!showAssets)}>Assets: {categories.length}</p>}
          {showAssets && <div className="h-72 rounded-md border p-3 overflow-y-scroll absolute bg-white dark:bg-zinc-800 shadow-md mt-33">
            <div className="flex flex-col">
              {categories?.map((category) => (
                <div key={category} className="mt-3 text-sm">
                  <div className="flex flex-row gap-2">
                    <img className="rounded-full w-12 h-12" src={getTokenImage(category)} width={48} height={48}  />
                    <div className="flex flex-col">
                      <div>{getTokenName(category)}</div>
                      <div className="flex flex-col gap">
                        <div className="flex flex-row gap-3">
                          <div>{(Number(balancesByToken[category]) / (10**getTokenDecimals(category))).toFixed(getTokenDecimals(category))}</div>
                          <div>${getTokenLabel(category)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          }
        </div>
      ) : (
        <div className="flex flex-col w-full items-end gap-2">
          <button
            onClick={connectWallet}
            disabled={loading}
            className={`px-4 py-2 rounded-md font-bold text-white text-sm transition-colors ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-black hover:bg-gray-700 cursor-pointer'
            }`}
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ConnectButton;