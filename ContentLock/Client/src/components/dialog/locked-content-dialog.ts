import { css, customElement, html, LitElement, property, query } from '@umbraco-cms/backoffice/external/lit';
import '@lottiefiles/dotlottie-wc';


@customElement('locked-content-dialog')
export class LockedContentDialog extends LitElement {

    // Pass in a name of a person who has locked the content
    @property({ type: String })
    lockedBy = '';

    @query('#locked-modal')
    dialogEl!: HTMLDialogElement;

    openDialog() {
        this.dialogEl?.showModal();
    }

    closeDialog() {
        this.dialogEl?.close();
    }

    render() {
        return html`
            <dialog id="locked-modal">
                <uui-dialog-layout headline="Content Lock - This page is locked">
                    <div id="grid-container">
                        <div id="text">
                            <p>This page is currently locked by <strong>${this.lockedBy}</strong></p>
                        </div>
                        <div id="vector">
                            <!-- Lottie Animation  -->
                            <dotlottie-wc 
                                src="https://lottie.host/ad442657-73e5-4495-876b-a825f34b836e/Da2Zx8BXSz.lottie" 
                                autoplay 
                                loop
                                style="width: 300px; height: 300px"></dotlottie-wc>
                        </div>
                    </div>
                    <uui-button slot="actions" @click=${this.closeDialog}>Close</uui-button>
                </uui-dialog-layout>
            </dialog>
        `;
    }

    static styles = css`
        dialog {
            border: none;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        dialog::backdrop {
            background-color: rgba(0, 0, 0, 0.2);
        }

        #grid-container {
            display: grid;
            grid-template-columns: auto 90px;
            gap: 50px;
            align-items: center;
        }

        #text p {
            align-self: start;
            margin: 0;
        }

        #vector {
            margin-top: -50px;
        }
    `;
}

export default LockedContentDialog;

export interface LockedContentDialogElement extends HTMLElement {
    lockedBy: string;
    openDialog: () => void;
    closeDialog: () => void;
}