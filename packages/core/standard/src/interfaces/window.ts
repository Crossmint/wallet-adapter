import { EventEmitter } from './eventemitter';
import { Wallet } from './wallet';

export interface SolanaWindow extends Window {
    solana: Solana;
}

export interface Solana {
    wallets: SolanaWalletsRegistry & Readonly<Record<string, Wallet>>;
}

export interface SolanaWalletsRegistryEvents {
    registered(...wallets: Wallet[]): void;
}

/**
 * TODO: add push / events for wallet registration / actions
 */
export interface SolanaWalletsRegistry extends EventEmitter<SolanaWalletsRegistryEvents> {
    register(...wallets: Wallet[]): void;
}
