import { event_types, eventSource } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { Popup, POPUP_TYPE } from '../../../popup.js';
import { delay } from '../../../utils.js';
import { quickReplyApi } from '../../quick-reply/index.js';
import { QuickReplySet } from '../../quick-reply/src/QuickReplySet.js';
import { proxyFetch } from './lib/fetch.js';
import { QrsLink } from './src/QrsLink.js';
import { Settings } from './src/Settings.js';




/**@type {Settings} */
let settings;



const updateCheckLoop = async()=>{
    while (true) {
        await delay(1000 * 5);
        let hasChange = false;
        for (const link of settings.qrsLinkList) {
            if (!link.linkedQrs) continue;
            if (link.name != link.linkedQrs.name) {
                hasChange = true;
                link.name = link.linkedQrs.name;
            }
            if (!link.qrs) {
                settings.qrsLinkList.splice(settings.qrsLinkList.indexOf(link), 1);
                hasChange = true;
            }
        }
        if (hasChange) settings.save();
        if (!settings.updateOnInterval) continue;
        const now = Date.now();
        /**@type {QrsLink[]} */
        const updateList = [];
        for (const link of settings.qrsLinkList) {
            if (now - link.checkedOnTimestamp < settings.updateOnIntervalSeconds * 1000) continue;
            const hasUpdate = await link.checkForUpdate();
            link.checkedOnTimestamp = now;
            if (hasUpdate) {
                updateList.push(link);
            }
        }
        notifyUpdate(updateList);
    }
};
const notifyUpdate = async(updateList) => {
    if (updateList.length) {
        toastr.info(`${updateList.length} Quick Reply Sets can be updated.`, 'Quick Reply Manager', {
            timeOut: 0,
            onclick: async()=>{
                let idx = 0;
                for (const link of updateList) {
                    idx++;
                    /**@type {HTMLElement} */
                    let actionsWrap;
                    const dom = document.createElement('div'); {
                        dom.classList.add('stqrm--importDlg');
                        const title = document.createElement('h3'); {
                            const text = document.createElement('span'); {
                                text.textContent = 'Update Quick Reply Set';
                                title.append(text);
                            }
                            const counter = document.createElement('small'); {
                                counter.textContent = ` (${idx} / ${updateList.length})`;
                                title.append(counter);
                            }
                            dom.append(title);
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
                    if (link.qrs) {
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
                                const pop = document.querySelector('#shadow_popup');
                                while (pop.style.display != 'block') await delay(10);
                                document.querySelector('#dialogue_popup_ok').click();
                                dlg.completeAffirmative();
                                link.checkedOnTimestamp = Date.now();
                                link.name = link.data.name;
                                while (quickReplyApi.getSetByName(link.name) == link.linkedQrs) await delay(100);
                                link.linkedQrs = quickReplyApi.getSetByName(link.name);
                                link.updatedOnTimestamp = Date.now();
                                settings.save();
                            });
                            actionsWrap.prepend(impBtn);
                        }
                    } else {
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
                                link.checkedOnTimestamp = Date.now();
                                link.name = link.data.name;
                                while (quickReplyApi.getSetByName(link.name) == link.linkedQrs) await delay(100);
                                link.linkedQrs = quickReplyApi.getSetByName(link.name);
                                link.updatedOnTimestamp = Date.now();
                                settings.qrsLinkList.push(link);
                                settings.save();
                            });
                            actionsWrap.prepend(impBtn);
                        }
                    }
                    const dlg = new Popup(
                        dom,
                        POPUP_TYPE.TEXT,
                    );
                    await dlg.show();
                }
            },
            closeButton: true,
        });
    }
};


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
                                inp.addEventListener('keydown', (evt)=>{
                                    if (evt.key == 'Enter' && !evt.ctrlKey && !evt.shiftKey && !evt.altKey) {
                                        submit.click();
                                    }
                                });
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
                                            const pop = document.querySelector('#shadow_popup');
                                            while (pop.style.display != 'block') await delay(10);
                                            document.querySelector('#dialogue_popup_ok').click();
                                            dlg.completeAffirmative();
                                            link.checkedOnTimestamp = Date.now();
                                            link.name = link.data.name;
                                            const olink = settings.qrsLinkList.find(it=>it.name == link.name);
                                            while (quickReplyApi.getSetByName(link.name) == (olink ?? link).linkedQrs) await delay(100);
                                            link.linkedQrs = quickReplyApi.getSetByName(link.name);
                                            link.updatedOnTimestamp = Date.now();
                                            const idx = settings.qrsLinkList.findIndex(it=>it.url == link.url || it.qrs == link.qrs);
                                            if (idx > -1) {
                                                settings.qrsLinkList.splice(idx, 1, link);
                                            } else {
                                                settings.qrsLinkList.push(link);
                                            }
                                            settings.save();
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
                                        link.checkedOnTimestamp = Date.now();
                                        link.name = link.data.name;
                                        link.linkedQrs = quickReplyApi.getSetByName(link.name);
                                        link.updatedOnTimestamp = Date.now();
                                        settings.qrsLinkList.push(link);
                                        settings.save();
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
                await dlg.show();
            });
            anchor.insertAdjacentElement('afterend', importSetBtn);
        }
        const manageBtn = document.createElement('div'); {
            manageBtn.classList.add('stqrm--manage');
            manageBtn.classList.add('menu_button');
            manageBtn.classList.add('fa-solid', 'fa-cogs');
            manageBtn.title = 'Quick Reply Manager';
            manageBtn.addEventListener('click', async()=>{
                const dom = document.createElement('div'); {
                    dom.classList.add('stqrm--manager');
                    const title = document.createElement('h3'); {
                        title.textContent = 'Quick Reply Manager';
                        dom.append(title);
                    }
                    const config = document.createElement('div'); {
                        config.classList.add('stqrm--config');
                        const uplaunch = document.createElement('div'); {
                            uplaunch.classList.add('stqrm--item');
                            const check = document.createElement('label'); {
                                check.classList.add('stqrm--checkbox');
                                const cb = document.createElement('input'); {
                                    cb.type = 'checkbox';
                                    cb.checked = settings.updateOnLaunch;
                                    cb.addEventListener('click', ()=>{
                                        settings.updateOnLaunch = cb.checked;
                                        settings.save();
                                    });
                                    check.append(cb);
                                }
                                const txt = document.createElement('div'); {
                                    txt.textContent = 'Check for updates on launch';
                                    check.append(txt);
                                }
                                uplaunch.append(check);
                            }
                            const time = document.createElement('label'); {
                                time.classList.add('stqrm--checkbox');
                                const txt = document.createElement('div'); {
                                    txt.textContent = 'Check every X minutes:';
                                    time.append(txt);
                                }
                                const inp = document.createElement('input'); {
                                    inp.classList.add('text_pole');
                                    inp.type = 'number';
                                    inp.min = '1';
                                    inp.max = (60 * 24).toString();
                                    inp.step = '1';
                                    inp.value = Math.ceil(settings.updateOnLaunchSeconds / 60).toString();
                                    inp.addEventListener('input', ()=>{
                                        settings.updateOnLaunchSeconds = parseInt(inp.value) * 60;
                                        settings.save();
                                    });
                                    time.append(inp);
                                }
                                uplaunch.append(time);
                            }
                            config.append(uplaunch);
                        }
                        const upiv = document.createElement('div'); {
                            upiv.classList.add('stqrm--item');
                            const check = document.createElement('label'); {
                                check.classList.add('stqrm--checkbox');
                                const cb = document.createElement('input'); {
                                    cb.type = 'checkbox';
                                    cb.checked = settings.updateOnInterval;
                                    cb.addEventListener('click', ()=>{
                                        settings.updateOnInterval = cb.checked;
                                        settings.save();
                                    });
                                    check.append(cb);
                                }
                                const txt = document.createElement('div'); {
                                    txt.textContent = 'Check for updates on interval';
                                    check.append(txt);
                                }
                                upiv.append(check);
                            }
                            const time = document.createElement('label'); {
                                time.classList.add('stqrm--checkbox');
                                const txt = document.createElement('div'); {
                                    txt.textContent = 'Check every X minutes:';
                                    time.append(txt);
                                }
                                const inp = document.createElement('input'); {
                                    inp.classList.add('text_pole');
                                    inp.type = 'number';
                                    inp.min = '1';
                                    inp.max = (60 * 24).toString();
                                    inp.step = '1';
                                    inp.value = Math.ceil(settings.updateOnIntervalSeconds / 60).toString();
                                    inp.addEventListener('input', ()=>{
                                        settings.updateOnIntervalSeconds = parseInt(inp.value) * 60;
                                        settings.save();
                                    });
                                    time.append(inp);
                                }
                                upiv.append(time);
                            }
                            config.append(upiv);
                        }
                        dom.append(config);
                    }
                    const content = document.createElement('div'); {
                        content.classList.add('stqrm--content');
                        const tbl = document.createElement('table'); {
                            tbl.classList.add('stqrm--qrsTable');
                            const thead = document.createElement('thead'); {
                                for (const col of ['Quick Reply Set', 'QRs', 'URL', 'Last updated', 'Last checked', 'Actions']) {
                                    const th = document.createElement('th'); {
                                        if (col == 'Qrs') {
                                            th.classList.add('stqrm--numeric');
                                        }
                                        th.textContent = col;
                                        thead.append(th);
                                    }
                                }
                                tbl.append(thead);
                            }
                            const tbody = document.createElement('tbody'); {
                                for (const qrs of QuickReplySet.list) {
                                    const link = settings.qrsLinkList.find(it=>it.linkedQrs == qrs);
                                    const tr = document.createElement('tr'); {
                                        const name = document.createElement('td'); {
                                            name.textContent = qrs.name;
                                            tr.append(name);
                                        }
                                        const count = document.createElement('td'); {
                                            count.classList.add('stqrm--numeric');
                                            count.textContent = qrs.qrList.length.toString();
                                            tr.append(count);
                                        }
                                        const url = document.createElement('td'); {
                                            url.classList.add('stqrm--main');
                                            let u = link?.url ?? '';
                                            url.title = u;
                                            const wrap = document.createElement('span'); {
                                                wrap.classList.add('stqrm--wrap');
                                                const first = document.createElement('span'); {
                                                    first.textContent = u.split('/').slice(0,-1).join('/');
                                                    wrap.append(first);
                                                }
                                                const last = document.createElement('span'); {
                                                    last.textContent = u.split('/').pop();
                                                    wrap.append(last);
                                                }
                                                url.append(wrap);
                                            }
                                            tr.append(url);
                                        }
                                        const updated = document.createElement('td'); {
                                            updated.textContent = link?.updatedOn?.toLocaleString() ?? '';
                                            tr.append(updated);
                                        }
                                        const checked = document.createElement('td'); {
                                            checked.textContent = link?.checkedOn?.toLocaleString() ?? '';
                                            tr.append(checked);
                                        }
                                        const actions = document.createElement('td'); {
                                            const wrap = document.createElement('div'); {
                                                wrap.classList.add('stqrm--actions');
                                                const update = document.createElement('div'); {
                                                    update.classList.add('stqrm--action');
                                                    if (!link) update.classList.add('stqrm--disabled');
                                                    update.classList.add('menu_button');
                                                    update.classList.add('fa-solid', 'fa-fw');
                                                    update.classList.add('fa-arrow-left-rotate');
                                                    update.title = 'Check for updates';
                                                    update.addEventListener('click', async()=>{
                                                        const hasUpdate = await link.checkForUpdate();
                                                        if (hasUpdate) {
                                                            /**@type {HTMLElement} */
                                                            let actionsWrap;
                                                            const dom = document.createElement('div'); {
                                                                dom.classList.add('stqrm--importDlg');
                                                                const title = document.createElement('h3'); {
                                                                    const text = document.createElement('span'); {
                                                                        text.textContent = 'Update Quick Reply Set';
                                                                        title.append(text);
                                                                    }
                                                                    dom.append(title);
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
                                                            if (link.qrs) {
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
                                                                        const pop = document.querySelector('#shadow_popup');
                                                                        while (pop.style.display != 'block') await delay(10);
                                                                        document.querySelector('#dialogue_popup_ok').click();
                                                                        dlg.completeAffirmative();
                                                                        link.checkedOnTimestamp = Date.now();
                                                                        link.name = link.data.name;
                                                                        while (quickReplyApi.getSetByName(link.name) == link.linkedQrs) await delay(100);
                                                                        link.linkedQrs = quickReplyApi.getSetByName(link.name);
                                                                        link.updatedOnTimestamp = Date.now();
                                                                        settings.save();
                                                                    });
                                                                    actionsWrap.prepend(impBtn);
                                                                }
                                                            } else {
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
                                                                        link.checkedOnTimestamp = Date.now();
                                                                        link.name = link.data.name;
                                                                        while (quickReplyApi.getSetByName(link.name) == link.linkedQrs) await delay(100);
                                                                        link.linkedQrs = quickReplyApi.getSetByName(link.name);
                                                                        link.updatedOnTimestamp = Date.now();
                                                                        settings.qrsLinkList.push(link);
                                                                        settings.save();
                                                                    });
                                                                    actionsWrap.prepend(impBtn);
                                                                }
                                                            }
                                                            const dlg = new Popup(
                                                                dom,
                                                                POPUP_TYPE.TEXT,
                                                            );
                                                            await dlg.show();
                                                        } else {
                                                            toastr.info(`No updates for ${qrs.name}`, 'Quick Reply Manager');
                                                            link.checkedOnTimestamp = Date.now();
                                                            settings.save();
                                                        }
                                                    });
                                                    wrap.append(update);
                                                }
                                                const exp = document.createElement('div'); {
                                                    exp.classList.add('stqrm--action');
                                                    exp.classList.add('menu_button');
                                                    exp.classList.add('fa-solid', 'fa-fw');
                                                    exp.classList.add('fa-file-export');
                                                    exp.title = 'Export Quick Reply Set';
                                                    exp.addEventListener('click', async()=>{
                                                        const sel = /**@type {HTMLSelectElement} */(document.querySelector('#qr--set'));
                                                        sel.value = qrs.name;
                                                        sel.dispatchEvent(new Event('change', { bubbles:true }));
                                                        document.querySelector('#qr--set-export').click();
                                                    });
                                                    wrap.append(exp);
                                                }
                                                const del = document.createElement('div'); {
                                                    del.classList.add('stqrm--action');
                                                    del.classList.add('menu_button');
                                                    del.classList.add('redWarningBG');
                                                    del.classList.add('fa-solid', 'fa-fw');
                                                    del.classList.add('fa-trash-can');
                                                    del.title = 'Delete Quick Reply Set';
                                                    del.addEventListener('click', async()=>{
                                                        const confirmed = await Popup.show.confirm('Delete Quick Reply Set', `Are you sure you want to delete the Quick Reply Set "${qrs.name}"?<br>This cannot be undone.`);
                                                        if (confirmed) {
                                                            quickReplyApi.deleteSet(qrs.name);
                                                            tr.remove();
                                                        }
                                                    });
                                                    wrap.append(del);
                                                }
                                                actions.append(wrap);
                                            }
                                            tr.append(actions);
                                        }
                                        tbody.append(tr);
                                    }
                                }
                                tbl.append(tbody);
                            }
                            content.append(tbl);
                        }
                        dom.append(content);
                    }
                }
                const dlg = new Popup(
                    dom,
                    POPUP_TYPE.TEXT,
                );
                await dlg.show();
            });
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
    mo.observe(document.querySelector('#qr--settings'), { childList:true, subtree:true });

    settings = Settings.from(extension_settings.quickReplyManager ?? {});

    if (settings.updateOnLaunch) {
        const now = Date.now();
        /**@type {QrsLink[]} */
        const updateList = [];
        for (const link of settings.qrsLinkList) {
            if (now - link.checkedOnTimestamp < settings.updateOnLaunchSeconds * 1000) continue;
            const hasUpdate = await link.checkForUpdate();
            link.checkedOnTimestamp = now;
            if (hasUpdate) {
                updateList.push(link);
            }
        }
        notifyUpdate(updateList);
        settings.save();
    }
    updateCheckLoop();
};
eventSource.on(event_types.APP_READY, ()=>(init(),null));
