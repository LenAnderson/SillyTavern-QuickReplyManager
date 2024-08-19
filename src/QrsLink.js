import { quickReplyApi } from '../../../quick-reply/index.js';
import { QuickReplySet } from '../../../quick-reply/src/QuickReplySet.js';
import { proxyFetch } from '../lib/fetch.js';

export class QrsLink {
    /**@type {string} */ url;
    /**@type {string} */ name;
    /**@type {number} */ checkedOnTimestamp;

    /**@type {QuickReplySet} */ data;

    get checkedOn() { return new Date(this.checkedOnTimestamp); }

    get qrs() { return quickReplyApi.getSetByName(this.name ?? this.data?.name); }




    toJSON() {
        return {
            url: this.url,
            name: this.name,
            checkedOnTimestamp: this.checkedOnTimestamp,
        };
    }




    async fetch() {
        this.data = JSON.parse(await proxyFetch(this.url));
        return this.data;
    }

    verify() {
        return (
            typeof this.data.name == 'string'
            && Array.isArray(this.data.qrList)
        );
    }


    render(diff = false) {
        const root = document.createElement('div'); {
            root.classList.add('stqrm--qrs');
            const config = document.createElement('div'); {
                config.classList.add('stqrm--config');
                const name = document.createElement('div'); {
                    name.classList.add('stqrm--name');
                    name.textContent = this.data.name;
                    config.append(name);
                }
                const disableSend = document.createElement('div'); {
                    disableSend.classList.add('stqrm--checkbox');
                    const cb = document.createElement('input'); {
                        cb.type = 'checkbox';
                        cb.checked = this.data.disableSend;
                        cb.disabled = true;
                        disableSend.append(cb);
                    }
                    const lbl = document.createElement('div'); {
                        lbl.textContent = 'Disable send';
                        disableSend.append(lbl);
                    }
                    config.append(disableSend);
                }
                const placeBeforeInput = document.createElement('div'); {
                    placeBeforeInput.classList.add('stqrm--checkbox');
                    const cb = document.createElement('input'); {
                        cb.type = 'checkbox';
                        cb.checked = this.data.placeBeforeInput;
                        cb.disabled = true;
                        placeBeforeInput.append(cb);
                    }
                    const lbl = document.createElement('div'); {
                        lbl.textContent = 'Place before input';
                        placeBeforeInput.append(lbl);
                    }
                    config.append(placeBeforeInput);
                }
                const injectInput = document.createElement('div'); {
                    injectInput.classList.add('stqrm--checkbox');
                    const cb = document.createElement('input'); {
                        cb.type = 'checkbox';
                        cb.checked = this.data.injectInput;
                        cb.disabled = true;
                        injectInput.append(cb);
                    }
                    const lbl = document.createElement('div'); {
                        lbl.textContent = 'Inject user input';
                        injectInput.append(lbl);
                    }
                    config.append(injectInput);
                }
                const color = document.createElement('div'); {
                    color.classList.add('stqrm--checkbox');
                    const cb = document.createElement('div'); {
                        cb.classList.add('stqrm--color');
                        cb.style.backgroundColor = this.data.color ?? 'transparent';
                        color.append(cb);
                    }
                    const lbl = document.createElement('div'); {
                        lbl.textContent = 'Color';
                        color.append(lbl);
                    }
                    config.append(color);
                }
                const onlyBorderColor = document.createElement('div'); {
                    onlyBorderColor.classList.add('stqrm--checkbox');
                    const cb = document.createElement('input'); {
                        cb.type = 'checkbox';
                        cb.checked = this.data.onlyBorderColor;
                        cb.disabled = true;
                        onlyBorderColor.append(cb);
                    }
                    const lbl = document.createElement('div'); {
                        lbl.textContent = 'Only apply color as accent';
                        onlyBorderColor.append(lbl);
                    }
                    config.append(onlyBorderColor);
                }
                root.append(config);
            }
            const list = document.createElement('div'); {
                list.classList.add('stqrm--list');
                for (const qr of this.data.qrList) {
                    const oqr = this.qrs?.qrList?.find(it=>it.id == qr.id);
                    const wrap = document.createElement('div'); {
                        wrap.classList.add('stqrm--qr');
                        const head = document.createElement('div'); {
                            head.classList.add('stqrm--head');
                            if (qr.icon) {
                                const icon = document.createElement('div'); {
                                    icon.classList.add('stqrm--icon');
                                    if (diff && oqr && oqr.automationId != qr.automationId) {
                                        const del = document.createElement('del'); {
                                            del.classList.add('stqrm--oldValue');
                                            del.classList.add('fa-solid');
                                            del.classList.add(oqr.icon);
                                            icon.append(del);
                                        }
                                        const arrow = document.createElement('div'); {
                                            arrow.classList.add('stqrm--arrow');
                                            arrow.classList.add('fa-solid', 'fa-fw');
                                            arrow.classList.add('fa-arrow-right');
                                            icon.append(arrow);
                                        }
                                        const ins = document.createElement('ins'); {
                                            ins.classList.add('stqrm--newValue');
                                            ins.classList.add('fa-solid');
                                            ins.classList.add(qr.icon);
                                            icon.append(ins);
                                        }
                                    } else {
                                        icon.classList.add('fa-solid');
                                        icon.classList.add(qr.icon);
                                    }
                                    head.append(icon);
                                }
                            }
                            const label = document.createElement('div'); {
                                label.classList.add('stqrm--label');
                                if (diff && oqr && oqr.label != qr.label) {
                                    const del = document.createElement('del'); {
                                        del.classList.add('stqrm--oldValue');
                                        del.textContent = oqr.label;
                                        label.append(del);
                                    }
                                    const arrow = document.createElement('div'); {
                                        arrow.classList.add('stqrm--arrow');
                                        arrow.classList.add('fa-solid', 'fa-fw');
                                        arrow.classList.add('fa-arrow-right');
                                        label.append(arrow);
                                    }
                                    const ins = document.createElement('ins'); {
                                        ins.classList.add('stqrm--newValue');
                                        ins.textContent = qr.label;
                                        label.append(ins);
                                    }
                                } else {
                                    label.textContent = qr.label;
                                }
                                head.append(label);
                            }
                            const title = document.createElement('div'); {
                                title.classList.add('stqrm--title');
                                if (diff && oqr && oqr.title != qr.title) {
                                    const del = document.createElement('del'); {
                                        del.classList.add('stqrm--oldValue');
                                        del.textContent = oqr.title;
                                        title.append(del);
                                    }
                                    const arrow = document.createElement('div'); {
                                        arrow.classList.add('stqrm--arrow');
                                        arrow.classList.add('fa-solid', 'fa-fw');
                                        arrow.classList.add('fa-arrow-right');
                                        title.append(arrow);
                                    }
                                    const ins = document.createElement('ins'); {
                                        ins.classList.add('stqrm--newValue');
                                        ins.textContent = qr.title;
                                        title.append(ins);
                                    }
                                } else {
                                    title.textContent = qr.title;
                                }
                                head.append(title);
                            }
                            wrap.append(head);
                        }
                        const qrConfig = document.createElement('div'); {
                            qrConfig.classList.add('stqrm--config');
                            const autos = [
                                {
                                    key: 'preventAutoExecute',
                                    fa: 'fa-plane-slash',
                                    label: 'Don\'t trigger auto-execute',
                                },
                                {
                                    key: 'isHidden',
                                    fa: 'fa-eye-slash',
                                    label: 'Invisible (auto-execute only',
                                },
                                {
                                    key: 'executeOnStartup',
                                    fa: 'fa-rocket',
                                    label: 'Execute on startup',
                                },
                                {
                                    key: 'executeOnUser',
                                    fa: 'fa-user',
                                    label: 'Execute on user message',
                                },
                                {
                                    key: 'executeOnAi',
                                    fa: 'fa-robot',
                                    label: 'Execute on AI message',
                                },
                                {
                                    key: 'executeOnChatChange',
                                    fa: 'fa-message',
                                    label: 'Execute on chat change',
                                },
                                {
                                    key: 'executeOnNewChat',
                                    fa: 'fa-comments',
                                    label: 'Execute on new chat',
                                },
                                {
                                    key: 'executeOnGroupMemberDraft',
                                    fa: 'fa-people-group',
                                    label: 'Execute on group member draft',
                                },
                            ];
                            for (const a of autos) {
                                const auto = document.createElement('div'); {
                                    auto.classList.add('stqrm--checkbox');
                                    if (diff && oqr && oqr[a.key] != qr[a.key]) {
                                        const ocb = document.createElement('input'); {
                                            ocb.classList.add('stqrm--oldValue');
                                            ocb.type = 'checkbox';
                                            ocb.checked = oqr[a.key];
                                            ocb.disabled = true;
                                            auto.append(ocb);
                                        }
                                        const arrow = document.createElement('div'); {
                                            arrow.classList.add('stqrm--arrow');
                                            arrow.classList.add('fa-solid', 'fa-fw');
                                            arrow.classList.add('fa-arrow-right');
                                            auto.append(arrow);
                                        }
                                    }
                                    const cb = document.createElement('input'); {
                                        if (diff && oqr && oqr[a.key] != qr[a.key]) cb.classList.add('stqrm--newValue');
                                        cb.type = 'checkbox';
                                        cb.checked = qr[a.key];
                                        cb.disabled = true;
                                        auto.append(cb);
                                    }
                                    const icon = document.createElement('div'); {
                                        icon.classList.add('fa-solid', 'fa-fw');
                                        icon.classList.add(a.fa);
                                        auto.append(icon);
                                    }
                                    const lbl = document.createElement('div'); {
                                        lbl.textContent = a.label;
                                        auto.append(lbl);
                                    }
                                    qrConfig.append(auto);
                                }
                            }
                            const automationId = document.createElement('div'); {
                                automationId.classList.add('stqrm--automationId');
                                if (diff && oqr && oqr.automationId != qr.automationId) {
                                    const del = document.createElement('del'); {
                                        del.classList.add('stqrm--oldValue');
                                        del.textContent = oqr.automationId;
                                        automationId.append(del);
                                    }
                                    const arrow = document.createElement('div'); {
                                        arrow.classList.add('stqrm--arrow');
                                        arrow.classList.add('fa-solid', 'fa-fw');
                                        arrow.classList.add('fa-arrow-right');
                                        automationId.append(arrow);
                                    }
                                    const ins = document.createElement('ins'); {
                                        ins.classList.add('stqrm--newValue');
                                        ins.textContent = qr.automationId;
                                        automationId.append(ins);
                                    }
                                } else {
                                    automationId.textContent = qr.automationId;
                                }
                                qrConfig.append(automationId);
                            }
                            const context = document.createElement('div'); {
                                context.classList.add('stqrm--contextList');
                                if (diff && oqr && JSON.stringify(oqr.contextList) != JSON.stringify(qr.contextList)) {
                                    const del = document.createElement('del'); {
                                        del.classList.add('stqrm--oldValue');
                                        del.textContent = JSON.stringify(oqr.contextList);
                                        context.append(del);
                                    }
                                    const arrow = document.createElement('div'); {
                                        arrow.classList.add('stqrm--arrow');
                                        arrow.classList.add('fa-solid', 'fa-fw');
                                        arrow.classList.add('fa-arrow-right');
                                        context.append(arrow);
                                    }
                                    const ins = document.createElement('ins'); {
                                        ins.classList.add('stqrm--newValue');
                                        ins.textContent = JSON.stringify(qr.contextList);
                                        context.append(ins);
                                    }
                                } else {
                                    context.textContent = qr.contextList.length == 0 ? '' : JSON.stringify(qr.contextList);
                                }
                                qrConfig.append(context);
                            }
                            wrap.append(qrConfig);
                        }
                        if (diff && oqr && oqr.message != qr.message) {
                            const code = document.createElement('div'); {
                                code.classList.add('stqrm--diff');
                                const oqr = this.qrs.qrList.find(it=>it.id == qr.id);
                                const d = Diff.createTwoFilesPatch(
                                    `${oqr?.label ?? qr.label}.qr.stscript`,
                                    `${qr?.label ?? oqr.label}.qr.stscript`,
                                    oqr?.message ?? '',
                                    qr?.message ?? '',
                                    `${oqr?.label ?? qr.label}.qr.stscript`,
                                    `${qr?.label ?? oqr.label}.qr.stscript`,
                                    { context:Number.MAX_SAFE_INTEGER },
                                );
                                const configuration = {
                                    drawFileList: false,
                                    matching: 'lines',
                                    outputFormat: 'side-by-side',
                                    colorScheme: 'dark',
                                    highlightLanguages: { stscript:'stscript' },
                                };
                                const diff2htmlUi = new Diff2HtmlUI(code, d, configuration, hljs);
                                diff2htmlUi.draw();
                                [...code.querySelectorAll('.hljs')].forEach(it=>(it.classList.add('language-stscript'),it.classList.remove('plaintext')));
                                [...code.querySelectorAll('.d2h-files-diff')].forEach(it=>it.style.position = 'relative');
                                wrap.append(code);
                            }
                        } else {
                            const code = document.createElement('div'); {
                                code.classList.add('stqrm--code');
                                code.classList.add('hljs');
                                code.classList.add('language-stscript');
                                code.innerHTML = hljs.highlight(
                                    `${qr.message}${qr.message.slice(-1) == '\n' ? ' ' : ''}`,
                                    { language:'stscript', ignoreIllegals:true },
                                )?.value;
                                wrap.append(code);
                            }
                        }
                        list.append(wrap);
                    }
                }
                root.append(list);
            }
        }
        return root;
    }
}
