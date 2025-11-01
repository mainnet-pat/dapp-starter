import { binToHex, hexToBin, sha256, Transaction, utf8ToBin } from "@bitauth/libauth";
import { AuthChainElement, BCMR } from "@mainnet-cash/bcmr";
// @ts-ignore
import { default as blockies } from "blockies";

export interface LocalStorageCacheResponse {
  simpleResponse: {
    responseText: string,
    status: number,
    url: string
  },
  timestamp: number
}

export async function cachedFetch(input: string, duration?: number): Promise<Response> {
  const now = Date.now();
  const cacheDuration = duration ?? 7 * 24 * 60 * 60 * 1000; // 7 days

  const key = 'cachedFetch-' + binToHex(sha256.hash(utf8ToBin(input.toString())));

  const { simpleResponse, timestamp }: LocalStorageCacheResponse = JSON.parse(
    localStorage.getItem(key) || '{ "timestamp": 0, "simpleResponse": {} }'
  );

  // If item exists in localStorage and is still valid, return it
  if ((now - timestamp < cacheDuration) && simpleResponse.status) {
    // create a new Response object from the cached data
    const resp = new Response(simpleResponse.responseText, {
      status: simpleResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });

    // Set the URL property on the response object
    Object.defineProperty(resp, "url", { value: input });
    return resp;
  }

  const response = await fetch(input);
  if (!response.ok) {
    throw new Error(`Fetch ${input} failed: ${response.status} ${response.statusText}`);
  }
  const clonedResponse = response.clone();
  let shouldCache = true;
  let responseData;
  try {
    responseData = await clonedResponse.json()
    if ('error' in responseData) {
      shouldCache = false;
    }
  } catch (e) {
    console.error("Error parsing API response as JSON:", e);
    shouldCache = false;
  }
  if(!shouldCache) return response

  localStorage.setItem(`${key}`, JSON.stringify(
    {
      timestamp: now,
      simpleResponse: {
        responseText: JSON.stringify(responseData),
        status: response.status,
        url: response.url
      }
    }
  ));

  return response;
}

export const chunkArrayInGroups = <T>(arr: Array<T>, size: number) => {
  var myArray: T[][] = [];
  for(var i = 0; i < arr.length; i += size) {
    myArray.push(arr.slice(i, i+size));
  }
  return myArray;
}

const cacheTime = 1000 * 60 * 60 * 24; // 1 day
const queried: string[] = [];

export const addMissingBCMRs = async (categories: string[]) => {
  const now = Date.now();
  categories = categories.filter(category => {
    if (queried.includes(category)) {
      return false;
    }

    const last = Number(localStorage.getItem(`nonBcmrCategory-${category}`) || "0");
    if ((now - last) < cacheTime) {
      return false;
    }

    const { registry: existing, timestamp } = JSON.parse(localStorage.getItem(`bcmr-${category}`) || `{ "registry": {}, "timestamp": 0 }`);
    if (Object.keys(existing).length && ((now - timestamp) < cacheTime)) {
      BCMR.addMetadataRegistry(existing);
      return false;
    }

    return true;
  });

  if (!categories.length) {
    return;
  }
  queried.push(...categories);

  await Promise.all(chunkArrayInGroups(categories, 6).map(group => addMissingBCMRsInternal(group)));
}

export const addMissingBCMRsInternal = async (categories: string[]) => {
  if (!categories.length) {
    return;
  }

  const transformed = `[${categories.map(category => `"\\\\x${category}"`).join(",")}]`;
  const query = /* graphql */ `
{
  transaction(
    where: {
      hash:{_in: ${transformed}},
    }
  ) {
    hash
    authchains {
      authchain_length
      migrations(
        where: {
          transaction: {
            outputs: { locking_bytecode_pattern: { _like: "6a04%" } }
          }
        },
        order_by: { migration_index: desc }
        limit: 3
      ) {
        transaction {
          hash
          inputs(where:{ outpoint_index: { _eq:"0" } }){
            outpoint_index
          }
          outputs(where: { locking_bytecode_pattern: { _like: "6a04%" } }) {
            output_index
            locking_bytecode
          }
        }
      }
    }
  }
}`

  let jsonResponse: any = {};
  try {
    const response = await fetch("https://gql.chaingraph.pat.mn/v1/graphql", {
    // const response = await fetch("https://demo.chaingraph.cash/v1/graphql", {
      body: JSON.stringify({
        operationName: null,
        variables: {},
        query: query
      }),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      method: "POST",
    });

    const textResponse = await response.text();

    jsonResponse = JSON.parse(textResponse.replaceAll("\\\\x", ""));
  } catch {}

  const result: Array<[string, AuthChainElement]> = [];
  for (const tx of jsonResponse.data?.transaction ?? []) {
    const migrations = tx.authchains?.[0]?.migrations;

    const category = tx.hash.replace("\\x", "");

    if (!migrations) {
      continue;
    }

    let found = false;
    for (const migration of migrations) {
      const transaction = migration.transaction[0];
      if (!transaction) {
        continue;
      }
      transaction.inputs.forEach(
        (input: any) => (input.outpointIndex = Number(input.outpoint_index))
      );
      transaction.outputs.forEach((output: any) => {
        output.outputIndex = Number(output.output_index);
        output.lockingBytecode = hexToBin(
          output.locking_bytecode.replace("\\x", "")
        );
      });
      const txHash = transaction.hash.replace("\\x", "");

      const element = BCMR.makeAuthChainElement(transaction as Transaction, txHash);
      if (element.uris.length) {
        result.push([category, element]);
        found = true;
        break;
      }
    }

    if (!found) {
      localStorage.setItem(`nonBcmrCategory-${category}`, String(Date.now()));
    }
  };

  await Promise.all(result.map(async ([category, element]) => {
    try {
      const { registry: existing, timestamp } = JSON.parse(localStorage.getItem(`bcmr-${category}`) || `{ "registry": {}, "timestamp": 0 }`);
      if (Object.keys(existing).length) {
        BCMR.addMetadataRegistry(existing);
      }
      if (Date.now() - timestamp > cacheTime) {
        const fetched = await BCMR.fetchMetadataRegistry(element.httpsUrl.replace("https://ipfs://", "https://dweb.link/ipfs/"));
        localStorage.setItem(`bcmr-${category}`, JSON.stringify( { timestamp: Date.now(), registry: fetched }));
        BCMR.addMetadataRegistry(fetched);
      }
    } catch (e) {
      // failed to fetch, add to ignore list for next 5 minutes
      localStorage.setItem(`nonBcmrCategory-${category}`, String(Date.now()));;
    }
  }));
}


export const getTokenLabel = (tokenId: string) => {
  if (!tokenId) {
    return tokenId;
  }

  const bcmr = BCMR.getTokenInfo(tokenId);
  let label = bcmr?.token?.symbol;
  if (!label) {
    label = "CT-" + tokenId.slice(0, 8);
  }

  return label;
}

export const getTokenDecimals = (tokenId: string) => {
  const bcmr = BCMR.getTokenInfo(tokenId);
  return bcmr?.token?.decimals || 0;
}

export const getTokenName = (tokenId: string, commitment?: string) => {
  if (!tokenId) {
    return tokenId;
  }

  const bcmr = BCMR.getTokenInfo(tokenId);
  let label = bcmr?.token?.nfts?.parse?.types?.[commitment ?? ""]?.name || bcmr?.name
  if (!label) {
    label = "CT-" + tokenId.slice(0, 8);
  }

  return label;
}

export const getTokenAmount = (tokenId: string, rawAmount: number) => {
  const bcmr = BCMR.getTokenInfo(tokenId);
  const decimals = bcmr?.token?.decimals || 0;

  return rawAmount / (10 ** decimals);
}


export const getTokenImage = (tokenId: string, commitment?: string): string => {
  const bcmr = BCMR.getTokenInfo(tokenId);

  if (commitment !== undefined) {
    const hasTokenAsset = bcmr?.token?.nfts?.parse?.types?.[commitment ?? ""]?.uris?.asset;
    if (hasTokenAsset) {
      return convertIpfsLink(hasTokenAsset)!;
    }

    const hasTokenIcon = bcmr?.token?.nfts?.parse?.types?.[commitment ?? ""]?.uris?.icon;
    if (hasTokenIcon) {
      return convertIpfsLink(hasTokenIcon)!;
    }
  }

  const asset = bcmr?.uris?.asset;
  if (asset) {
    return convertIpfsLink(asset)!;
  }

  const icon = bcmr?.uris?.icon;
  if (icon) {
    return convertIpfsLink(icon)!;
  }

  return blockies({ seed: tokenId, size: 12, scale: 4, spotcolor: '#000'}).toDataURL()
}

export const convertIpfsLink = (uri: string | undefined, preferredGateway?: string): string | undefined => {
  if (uri?.indexOf("ipfs://") === 0) {
    const gateway = preferredGateway ?? getGateway();
    return `https://${gateway}/ipfs/${uri.replace("ipfs://", "")}`
  }

  return uri;
}

export const getGateway = () => {
  return globalThis.localStorage?.getItem("ipfs_gateway") || "w3s.link";
}