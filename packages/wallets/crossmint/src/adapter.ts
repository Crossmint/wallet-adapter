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
    WalletSignMessageError,
    WalletSignTransactionError,
    WalletWindowClosedError,
} from '@solana/wallet-adapter-base';
import { PublicKey, Transaction } from '@solana/web3.js';
import { CrossmintWalletName, CROSSMINT_LOGO_21x21 } from './crossmint-embed/consts/branding';
import { CrossmintWalletAdapterParams, CrossmintWalletAdapterConfig } from './crossmint-embed/types';
import { buildConfig } from './crossmint-embed/utils/config';

import { CrossmintWindow } from './crossmint-embed/windowController/WindowController';

export class CrossmintWalletAdapter extends BaseMessageSignerWalletAdapter {
    name = CrossmintWalletName;
    url = 'https://crossmint.io';
    icon = CROSSMINT_LOGO_21x21;

    private _connecting: boolean;
    private _publicKey: PublicKey | null;
    private _readyState: WalletReadyState =
        typeof window === 'undefined' ? WalletReadyState.Unsupported : WalletReadyState.Loadable;

    private _config: CrossmintWalletAdapterConfig;

    constructor(params: CrossmintWalletAdapterParams) {
        super();

        this._connecting = false;
        this._publicKey = null;

        this._config = buildConfig(params);
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

            const crossmint = new CrossmintWindow(this._config);
            await crossmint.init({
                parentWindow: window,
            });

            let accounts = undefined;
            accounts = await crossmint.login();

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
            } else {
                // User either closed the window, or rejected
                throw new WalletNotConnectedError('Something went wrong...');
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
        try {
            const crossmint = new CrossmintWindow(this._config);
            await crossmint.init({
                parentWindow: window,
            });

            try {
                const signedMessage = await crossmint.signMessage(message);

                if (signedMessage === null) {
                    throw new WalletSignMessageError('Something went wrong...');
                }

                return signedMessage;
            } catch (error: any) {
                throw new WalletSignMessageError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }
}
