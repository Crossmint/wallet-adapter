import EventEmitter from 'eventemitter3';
import type { SolanaWalletsRegistry, SolanaWalletsRegistryEvents, Wallet } from '../interfaces';

export class SolanaWallets extends EventEmitter<SolanaWalletsRegistryEvents> implements SolanaWalletsRegistry {
    [name: string]:
        | Wallet
        | SolanaWalletsRegistry[keyof SolanaWalletsRegistry]
        | EventEmitter[keyof EventEmitter<SolanaWalletsRegistryEvents>];

    constructor() {
        super();
    }

    register(...wallets: Wallet[]) {
        for (const wallet of wallets) {
            let name = wallet.name;
            if (name in this) {
                console.error(`Wallet with name ${name} already registered!`);
                name += ' (duplicate)';
            }

            this[name] = wallet;
        }

        this.emit('registered', ...wallets);
    }
}
