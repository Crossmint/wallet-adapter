import { WalletConnectionError, WalletSignMessageError } from '@solana/wallet-adapter-base';
import { BlockchainTypes, CrossmintEnvironment, CrossmintWalletAdapterConfig, RequestType } from '../types/index';
import buildSiteMetadata from '../utils/siteMetadata';

const ALLOWED_ORIGINS = ['http://localhost:3001', 'https://www.crossmint.io'];

export default class WindowController {
    controlledWindow?: Window | null;

    open: boolean;

    onClose?: Function;

    constructor(onClose?: Function) {
        this.open = false;
        this.onClose = onClose;
    }

    async init({
        parentWindow,
        url,
        width = 375,
        height = 650,
        target = 'popupWindow',
    }: {
        parentWindow: Window;
        url: string;
        width?: number;
        height?: number;
        target?: string;
    }) {
        return await new Promise<Window | null>((resolve, reject) => {
            const _window = parentWindow.open(url, target, this.createPopupString(width, height));

            if (_window === null || _window === undefined) {
                reject(`Failed to open popup. This may be caused by the browsers' popup blocker`);
            }

            this.controlledWindow = _window;
            this.open = true;

            this.registerListeners(_window as Window);
            resolve(_window);
        });
    }

    private registerListeners(window: Window) {
        const timer = setInterval(() => {
            if (this.controlledWindow?.closed) {
                clearInterval(timer);

                console.log('WindowController window being closed');
                this.open = false;

                if (this.onClose) {
                    this.onClose();
                }
            }
        }, 50);
    }

    private createPopupString(width: number, height: number) {
        const left = window.innerWidth / 2 - width;
        const top = window.innerHeight / 2 - height;

        // In newer versions of chrome (>99) you need to add the `popup=true` for the new window to actually open in a popup
        const chromeVersion = this.getChromeVersion();
        const chromeVersionGreaterThan99 = chromeVersion && chromeVersion > 99;
        const popupStringBase = chromeVersionGreaterThan99 ? 'popup=true,' : '';

        return `${popupStringBase}height=${height},width=${width},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=yes,menubar=true,location=no,directories=no,status=yes`;
    }

    private getChromeVersion() {
        const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
        return raw ? parseInt(raw[2]) : null;
    }
}

export class CrossmintWindow extends WindowController {
    private _config: CrossmintWalletAdapterConfig;

    constructor(config: CrossmintWalletAdapterConfig) {
        super();

        this._config = config;
    }

    async init({ parentWindow }: { parentWindow: Window }) {
        return super.init({ parentWindow, url: this._config.environment + '/frame' });
    }

    async login() {
        if (!this.controlledWindow) throw new Error('Cannot login when window is not open. TODO: open window auto');

        return await new Promise<string[] | null>(async (resolve, reject) => {
            let _accounts: string[] | null = null;

            window.addEventListener('message', (e) => {
                if (!ALLOWED_ORIGINS.includes(e.origin)) return;

                const { type, data } = e.data;

                switch (type) {
                    case RequestType.REQUEST_ACCOUNTS:
                        const { accounts } = data;

                        _accounts = accounts;
                        this.controlledWindow?.close();
                        break;
                    case RequestType.USER_REJECT:
                        console.log('[Crossmint] User rejected login');
                        reject(new WalletSignMessageError('User rejected the request'));
                        break;
                    default:
                        break;
                }
            });

            while (this.open) {
                console.log('waiting login');

                this.controlledWindow?.postMessage(
                    {
                        type: RequestType.REQUEST_ACCOUNTS,
                        data: {
                            chain: BlockchainTypes.SOLANA,
                            siteMetadata: await buildSiteMetadata(this._config.appMetadata),
                        },
                    },
                    this._config.environment + '/frame'
                );

                await this.sleep(100);
            }

            resolve(_accounts);
        });
    }

    async signMessage(message: Uint8Array): Promise<Uint8Array | null> {
        if (!this.controlledWindow) throw new Error('Cannot login when window is not open. TODO: open window auto');

        return await new Promise<Uint8Array | null>(async (resolve, reject) => {
            let _signedMessage: Uint8Array | null = null;

            window.addEventListener('message', (e) => {
                if (!ALLOWED_ORIGINS.includes(e.origin)) return;

                const { type, data } = e.data;

                switch (type) {
                    case RequestType.SIGN_MESSAGE:
                        const { signedMessage } = data;

                        console.log({ signedMessage });

                        _signedMessage = new Uint8Array(signedMessage.split(',').map(Number));
                        this.controlledWindow?.close();
                        break;
                    case RequestType.USER_REJECT:
                        console.log('[Crossmint] User rejected signMessage');
                        reject(new WalletSignMessageError('User rejected the request'));
                        break;
                    default:
                        break;
                }
            });

            while (this.open) {
                console.log('waiting sign message');

                this.controlledWindow?.postMessage(
                    {
                        type: RequestType.SIGN_MESSAGE,
                        data: {
                            message,
                            chain: BlockchainTypes.SOLANA,
                            siteMetadata: await buildSiteMetadata(this._config.appMetadata),
                        },
                    },
                    this._config.environment + '/frame'
                );

                await this.sleep(100);
            }

            resolve(_signedMessage);
        });
    }

    async sleep(waitTime: number) {
        return new Promise((resolve) => setTimeout(resolve, waitTime));
    }
}
