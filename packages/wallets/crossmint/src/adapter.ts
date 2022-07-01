import {
    BaseMessageSignerWalletAdapter,
    WalletAccountError,
    WalletConfigError,
    WalletConnectionError,
    WalletDisconnectionError,
    WalletLoadError,
    WalletName,
    WalletNotConnectedError,
    WalletNotReadyError,
    WalletPublicKeyError,
    WalletReadyState,
    WalletSignTransactionError,
} from '@solana/wallet-adapter-base';
import { PublicKey, Transaction } from '@solana/web3.js';

import { CrossmintWindow } from './crossmint-embed/windowController/WindowController';

export const CrossmintWalletName = 'Crossmint' as WalletName<'Crossmint'>;

export class CrossmintWalletAdapter extends BaseMessageSignerWalletAdapter {
    name = CrossmintWalletName;
    url = 'https://crossmint.io';
    icon = 'https://www.crossmint.io/assets/crossmint/logo-21@2x.png';

    private _connecting: boolean;
    private _publicKey: PublicKey | null;
    private _readyState: WalletReadyState =
        typeof window === 'undefined' ? WalletReadyState.Unsupported : WalletReadyState.Loadable;

    constructor() {
        super();
        this._connecting = false;
        this._publicKey = null;
    }

    get publicKey(): PublicKey | null {
        return this._publicKey;
    }

    get connecting(): boolean {
        return this._connecting;
    }

    get connected(): boolean {
        return this._publicKey !== null && this._publicKey !== undefined;
    }

    get readyState(): WalletReadyState {
        return this._readyState;
    }

    async connect(): Promise<void> {
        try {
            if (this.connected || this.connecting) return;
            if (this._readyState !== WalletReadyState.Loadable) throw new WalletNotReadyError();
            console.log('Attempting to connect...');

            this._connecting = true;

            const loginWindow = new CrossmintWindow();
            await loginWindow.init({
                parentWindow: window,
                url: 'http://localhost:3001/frame',
            });

            const accounts = await loginWindow.login();

            console.log({ accounts });

            if (accounts) {
                let publicKey: PublicKey;
                try {
                    publicKey = new PublicKey(accounts[0]);

                    this._publicKey = publicKey;
                    this.emit('connect', publicKey);
                } catch (error: any) {
                    throw new WalletPublicKeyError(error?.message, error);
                }
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        } finally {
            console.log('in finally');
            this._connecting = false;
        }
    }

    async disconnect(): Promise<void> {
        this._publicKey = null;
        this.emit('disconnect');
    }

    async signTransaction(transaction: Transaction): Promise<Transaction> {
        throw new WalletSignTransactionError('Not implemented');
    }

    async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
        throw new WalletSignTransactionError('Not implemented');
    }

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        throw new WalletSignTransactionError('Not implemented');
    }
}
