export enum BlockchainTypes {
    SOLANA = 'solana',
    ETHEREUM = 'ethereum',
    POLYGON = 'polygon',
}

export enum RequestType {
    REQUEST_ACCOUNTS = 'crossmint_requestAccounts',
    SIGN_MESSAGE = 'crossmint_signMessage',
    USER_REJECT = 'crossmint_userReject',
}

export interface CrossmintWalletAdapterParams {
    /**
     * API key
     * Get yours at {@link https://console.crossmint.io | Developer Dashboard}
     */
    apiKey: string;

    environment?: CrossmintEnvironment;

    /**
     * Dapp Metadata
     * If metadata is not provided, it will be extracted from your application automatically
     */
    appMetadata?: AppMetadata;
}

export interface AppMetadata {
    name?: string;
    icon?: string;
}

export interface CrossmintWalletAdapterConfig {
    libVersion: string;

    apiKey: string;

    environment: CrossmintEnvironment;

    appMetadata?: AppMetadata;
}

export enum CrossmintEnvironment {
    PROD = 'https://www.crossmint.io',
    LOCAL = 'htpp://localhost:3001',
}

export interface CrossmintAccountStore {
    publicKey: string;
    chain: BlockchainTypes;
}
