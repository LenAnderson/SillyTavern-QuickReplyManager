import { event_types, eventSource } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { Popup, POPUP_TYPE } from '../../../popup.js';
import { quickReplyApi } from '../../quick-reply/index.js';
import { proxyFetch } from './lib/fetch.js';
import { QrsLink } from './src/QrsLink.js';




const settings = Object.assign({
    /** @type {QrsLink[]} */
    qrsList: [],
    qrList: [],
    updateCheckInterval: 0,
}, extension_settings.qrManager ?? {});
extension_settings.qrManager = settings;




const addToAdders = ()=>{
    const anchor = document.querySelector('#qr--editor .qr--head .qr--actions:not(:has(.stqrm--import)) .qr--add');
    if (anchor) {
        const importSetBtn = document.createElement('div'); {
            importSetBtn.classList.add('stqrm--import');
            importSetBtn.classList.add('menu_button');
            importSetBtn.classList.add('fa-solid', 'fa-cloud-arrow-down');
            importSetBtn.title = 'Import Quick Reply Set from external source';
            importSetBtn.addEventListener('click', async()=>{
                /*
                - large / full screen dialog (no aspect ratio)
                - URL on top with import button
                - check if set already exists: hand over to update process (offer rename to avoid overwrite)
                - show spinner during download
                - show QRS settings at the top, each QR in a collapsible drawer below (default expanded)
                - individual QRs the same: settings (label, title, context, auto-exec, etc) up top,
                collapsible code below with hljs
                - if accepted, run QRS import
                - save to settings.qrsList ({ url, updatedOn, set-name })
                - close dlg
                */
                /**@type {HTMLInputElement} */
                let urlInput;
                /**@type {HTMLElement} */
                let actionsWrap;
                const dom = document.createElement('div'); {
                    dom.classList.add('stqrm--importDlg');
                    const title = document.createElement('h3'); {
                        title.textContent = 'Import Quick Reply Set';
                        dom.append(title);
                    }
                    const form = document.createElement('div'); {
                        form.classList.add('stqrm--form');
                        const label = document.createElement('label'); {
                            const text = document.createElement('div'); {
                                text.classList.add('stqrm--text');
                                text.textContent = 'URL pointing to a Quick Reply Set JSON file:';
                                label.append(text);
                            }
                            const inp = document.createElement('input'); {
                                urlInput = inp;
                                inp.classList.add('text_pole');
                                inp.placeholder = 'URL pointing to a Quick Reply Set JSON file';
                                label.append(inp);
                            }
                            form.append(label);
                        }
                        const submit = document.createElement('div'); {
                            submit.classList.add('menu_button');
                            submit.textContent = 'Download';
                            submit.addEventListener('click', async()=>{
                                submit.style.pointerEvents = 'none';
                                submit.style.opacity = '0.5';
                                content.querySelectorAll('.stqrm--qrs').forEach(it=>it.remove());
                                const url = urlInput.value.trim();
                                if (url.length == 0) {
                                    toastr.warning('Cannot import Quick Reply Set from a blank URL.', 'Quick Reply Manager');
                                    return;
                                }
                                const link = new QrsLink();
                                link.url = url;
                                await link.fetch();
                                if (!link.verify()) {
                                    toastr.error(`URL does not point to a Quick Reply Set: ${url}`, 'Quick Reply Manager');
                                    return;
                                }
                                if (link.qrs) {
                                    toastr.warning(`Quick Reply Set with name "${link.qrs.name}" already exists.`, 'Quick Reply Manager');
                                    actionsWrap.insertAdjacentElement('beforebegin', link.render(true));
                                    const impBtn = document.createElement('div'); {
                                        impBtn.classList.add('menu_button');
                                        impBtn.textContent = 'Update';
                                        impBtn.addEventListener('click', async()=>{
                                            const inp = /**@type {HTMLInputElement}*/(document.querySelector('#qr--set-importFile'));
                                            const blob = new Blob([JSON.stringify(link.data)], { type: 'application/json' });
                                            const file = new File([blob], `${link.data.name}.qrs.json`);
                                            const container = new DataTransfer();
                                            container.items.add(file);
                                            inp.files = container.files;
                                            inp.dispatchEvent(new Event('change', { bubbles:true }));
                                            dlg.completeAffirmative();
                                        });
                                        actionsWrap.prepend(impBtn);
                                    }
                                    submit.style.pointerEvents = '';
                                    submit.style.opacity = '';
                                    return;
                                }
                                actionsWrap.insertAdjacentElement('beforebegin', link.render());
                                const impBtn = document.createElement('div'); {
                                    impBtn.classList.add('menu_button');
                                    impBtn.textContent = 'Import';
                                    impBtn.addEventListener('click', async()=>{
                                        const inp = /**@type {HTMLInputElement}*/(document.querySelector('#qr--set-importFile'));
                                        const blob = new Blob([JSON.stringify(link.data)], { type: 'application/json' });
                                        const file = new File([blob], `${link.data.name}.qrs.json`);
                                        const container = new DataTransfer();
                                        container.items.add(file);
                                        inp.files = container.files;
                                        inp.dispatchEvent(new Event('change', { bubbles:true }));
                                        dlg.completeAffirmative();
                                    });
                                    actionsWrap.prepend(impBtn);
                                }
                                submit.style.pointerEvents = '';
                                submit.style.opacity = '';
                            });
                            form.append(submit);
                        }
                        dom.append(form);
                    }
                    const content = document.createElement('div'); {
                        content.classList.add('stqrm--content');
                        const actions = document.createElement('div'); {
                            actionsWrap = actions;
                            actions.classList.add('stqrm--actions');
                            const cancel = document.createElement('div'); {
                                cancel.classList.add('menu_button');
                                cancel.textContent = 'Cancel';
                                cancel.addEventListener('click', ()=>dlg.completeCancelled());
                                actions.append(cancel);
                            }
                            content.append(actions);
                        }
                        dom.append(content);
                    }
                }
                const dlg = new Popup(
                    dom,
                    POPUP_TYPE.TEXT,
                );
                const url = await dlg.show();
                if (false && typeof url == 'string' && url) {
                    const data = JSON.parse(await proxyFetch(url));
                    console.warn('[QRM]', data);
                    toastr.success(data.name, 'Quick Reply Manager');
                    const qrs = quickReplyApi.getSetByName(data.name);
                    if (qrs) {
                        const odata = qrs.toJSON();
                        const diffs = [];
                        for (const oqr of odata.qrList) {
                            const nqr = data.qrList.find(it=>it.id == oqr.id);
                            if (oqr.message == nqr?.message) continue;
                            const d = Diff.createTwoFilesPatch(
                                `${oqr.label}.qr.stscript`,
                                `${nqr?.label ?? oqr.label}.qr.stscript`,
                                oqr.message,
                                nqr?.message ?? '',
                            );
                            diffs.push(d);
                        }
                        const dom = document.createElement('div');
                        const configuration = {
                            drawFileList: true,
                            matching: 'lines',
                            outputFormat: 'side-by-side',
                            colorScheme: 'dark',
                            highlightLanguages: { stscript:'stscript' },
                        };
                        const diff2htmlUi = new Diff2HtmlUI(dom, diffs.join('\n'), configuration, hljs);
                        diff2htmlUi.draw();
                        [...dom.querySelectorAll('.hljs.stscript')].forEach(it=>it.classList.add('language-stscript'));
                        [...dom.querySelectorAll('.d2h-files-diff')].forEach(it=>it.style.position = 'relative');
                        const diffDlg = new Popup(
                            // 'URL pointing to a Quick Reply Set JSON file.',
                            dom,
                            POPUP_TYPE.INPUT,
                            null,
                            { large:true, wider:true, allowVerticalScrolling:true },
                        );
                        diffDlg.show();
                    }
                }
            });
            anchor.insertAdjacentElement('afterend', importSetBtn);
        }
        const manageBtn = document.createElement('div'); {
            manageBtn.classList.add('stqrm--manage');
            manageBtn.classList.add('menu_button');
            manageBtn.classList.add('fa-solid', 'fa-cogs');
            manageBtn.title = 'Manage Quick Reply Sets';
            anchor.parentElement.append(manageBtn);
        }
    }
    const targets = [...document.querySelectorAll('#qr--set-qrList .qr--set-itemAdder .qr--actions:not(:has(.stqrm--import)), .qr--set-qrListActions:not(:has(.stqrm--import))')];
    for (const t of targets) {
        const importSetBtn = document.createElement('div'); {
            importSetBtn.classList.add('stqrm--import');
            importSetBtn.classList.add('qr--action');
            importSetBtn.classList.add('menu_button');
            importSetBtn.classList.add('fa-solid', 'fa-cloud-arrow-down');
            importSetBtn.title = 'Import Quick Reply from external source';
            importSetBtn.addEventListener('click', ()=>{
                toastr.info('Quick Reply import not implemented', 'Quick Reply Manager');
            });
            t.append(importSetBtn);
        }
    }
};
const init = async()=>{
    await new Promise(resolve=>{
        const script = document.createElement('script');
        script.addEventListener('load', resolve);
        script.addEventListener('error', resolve);
        script.src = '/scripts/extensions/third-party/SillyTavern-QuickReplyManager/lib/third-party/jsdiff/diff.js';
        document.body.append(script);
    });
    await new Promise(resolve=>{
        const script = document.createElement('script');
        script.addEventListener('load', resolve);
        script.addEventListener('error', resolve);
        script.src = '/scripts/extensions/third-party/SillyTavern-QuickReplyManager/lib/third-party/diff2html/diff2html-ui-base.min.js';
        document.body.append(script);
    });
    const style = document.createElement('link'); {
        style.rel = 'stylesheet';
        style.href = '/scripts/extensions/third-party/SillyTavern-QuickReplyManager/lib/third-party/diff2html/diff2html.min.css';
        document.body.append(style);
    }
    const styleDark = document.createElement('link'); {
        styleDark.rel = 'stylesheet';
        styleDark.href = '/scripts/extensions/third-party/SillyTavern-QuickReplyManager/lib/third-party/diff2html/github-dark.min.css';
        document.body.append(styleDark);
    }
    addToAdders();
    // document.querySelector('.stqrm--import').click();
    const mo = new MutationObserver(()=>addToAdders());
    window.qrc = document.querySelector('#qr--settings');
    mo.observe(document.querySelector('#qr--settings'), { childList:true, subtree:true });

    const dom = document.createElement('div');
    const configuration = {
        drawFileList: true,
        matching: 'lines',
        outputFormat: 'side-by-side',
        colorScheme: 'dark',
        highlightLanguages: { stscript:'stscript' },
    };
    const f1 = `
/echo foobar |
/delay 500 |
/echo foo |
/times 4 {:
    /delay 600 |
    /echo bar |
:} |
    `;
    const f2 = `
/echo fooobar |
/delay 600 |
/echo foo |
/times 4 {:
    /delay 600 |
    /echo bar! |
:} |
    `;
    const diff = Diff.createTwoFilesPatch('file.stscript', 'file.stscript', f1, f2, null, null, { context:Number.MAX_SAFE_INTEGER });
    const diff2htmlUi = new Diff2HtmlUI(dom, diff, configuration, hljs);
    diff2htmlUi.draw();
    [...dom.querySelectorAll('.hljs.stscript')].forEach(it=>it.classList.add('language-stscript'));
    const dlg = new Popup(
        // 'URL pointing to a Quick Reply Set JSON file.',
        dom,
        POPUP_TYPE.INPUT,
        null,
        { cancelButton: 'Cancel', large:true, wide:true, wider:true },
    );
    // const url = await dlg.show();
};
eventSource.on(event_types.APP_READY, ()=>(init(),null));
