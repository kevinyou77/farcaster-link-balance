export type FrameSignaturePacket = {
  untrustedData: {
    fid: number;
    url: string;
    messageHash: string;
    timestamp: number;
    network: number;
    buttonIndex: number;
    inputText?: string;
    castId: {
      fid: number;
      hash: string;
    };
  };
  trustedData: {
    messageBytes: string;
  };
};

export interface TokenBalance {
  name: string;
  address: string;
  totalBalance: string;
  decimals: string;
};

export interface UsernameProofData {
  timestamp: number,
  name: string,
  owner: string,
  signature: string,
  fid: number,
  type: string
}

export interface TokenData {
  name: string
  usdValue: number
}