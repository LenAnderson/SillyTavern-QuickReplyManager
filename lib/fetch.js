import { getRequestHeaders } from '../../../../../script.js';
import { uuidv4 } from '../../../../utils.js';

export const proxyFetch = async(url)=>{
    const fn = uuidv4();
    const dlResponse = await fetch('/api/assets/download', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
            url: url,
            filename: fn,
            category: 'ambient',
        }),
    });
    if (!dlResponse.ok) throw new Error(`failed to fetch URL: ${url}`);
    const contentResponse = await fetch(`/assets/ambient/${fn}`);
    if (!contentResponse.ok) throw new Error(`failed to fetch URL: ${url}`);
    const text = await contentResponse.text();
    fetch('/api/assets/delete', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
            filename: fn,
            category: 'ambient',
        }),
    });
    return text;
};
