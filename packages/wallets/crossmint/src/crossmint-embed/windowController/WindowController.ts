import getSiteMetadata from '../site-metadata';

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
        width = 400,
        height = 750,
        target = 'popupWindow',
    }: {
        parentWindow: Window;
        url: string;
        width?: number;
        height?: number;
        target?: string;
    }) {
        return await new Promise((resolve, reject) => {
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
        const left = window.innerWidth / 2 - 200;
        const top = window.innerHeight / 2 - 375;

        // In newer versions of chrome (>99) you need to add the `popup=true` for the new window to actually open in a popup
        const chromeVersion = this.getChromeVersion();
        const chromeVersionGreaterThan99 = chromeVersion && chromeVersion > 99;
        const popupStringBase = chromeVersionGreaterThan99 ? 'popup=true,' : '';

        return `${popupStringBase}height=${height},width=${width},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=yes,menubar=true,location=no,directories=no, status=yes`;
    }

    private getChromeVersion() {
        const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
        return raw ? parseInt(raw[2]) : null;
    }
}

export class CrossmintWindow extends WindowController {
    async login() {
        if (!this.controlledWindow) throw new Error('Cannot login when window is not open. TODO: open window auto');

        return await new Promise<string[] | null>(async (resolve, reject) => {
            let _accounts: string[] | null = null;

            window.addEventListener('message', (e) => {
                if (!ALLOWED_ORIGINS.includes(e.origin)) return;

                const { type, data } = e.data;

                switch (type) {
                    case 'crossmint_requestAccounts':
                        const { accounts } = data;

                        _accounts = accounts;
                        this.controlledWindow?.close();
                    default:
                        break;
                }
            });

            while (this.open) {
                console.log('waiting login');

                this.controlledWindow?.postMessage(
                    {
                        type: 'crossmint_requestAccounts',
                        data: {
                            siteMetadata: await getSiteMetadata(),
                        },
                    },
                    'http://localhost:3001'
                );

                await this.sleep(100);
            }

            resolve(_accounts);
        });
    }

    async sleep(waitTime: number) {
        return new Promise((resolve) => setTimeout(resolve, waitTime));
    }
}
