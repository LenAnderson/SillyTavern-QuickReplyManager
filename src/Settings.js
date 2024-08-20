import { saveSettingsDebounced } from '../../../../../script.js';
import { extension_settings } from '../../../../extensions.js';
import { QrsLink } from './QrsLink.js';

export class Settings {
    /**
     * @param {*} props
     * @returns {Settings}
     */
    static from(props) {
        if (props.qrsLinkList) props.qrsLinkList = props.qrsLinkList.map(it=>QrsLink.from(it));
        const instance = Object.assign(new this(), props);
        return instance;
    }




    /**@type {QrsLink[]} */ qrsLinkList = [];
    /**@type {object[]} */ qrLinkList = [];
    /**@type {boolean} */ updateOnLaunch = true;
    /**@type {number} */ updateOnLaunchSeconds = 60 * 60;
    /**@type {boolean} */ updateOnInterval = false;
    /**@type {number} */ updateOnIntervalSeconds = 60 * 60 * 6;

    save() {
        extension_settings.quickReplyManager = this;
        saveSettingsDebounced();
    }
}
