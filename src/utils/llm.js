/**
 * LLM API 调用封装（兼容 OpenAI Chat Completions 格式）
 */

/**
 * @param {string} prompt
 * @param {{ baseURL: string, apiKey: string, model: string }} config
 * @returns {Promise<string>}
 */
export async function callLLM(prompt, config) {
    const url = `${config.baseURL.replace(/\/$/, '')}/chat/completions`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model: config.model || 'gpt-4o',
            messages: [{role: 'user', content: prompt}],
            temperature: 0.3,
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`LLM API error ${res.status}: ${text}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
}

/**
 * 带图片的 LLM 调用（Vision API，multimodal content）
 * @param {string} imageBase64  - 图片的 base64 字符串（不含 data URI 前缀）
 * @param {string} mimeType     - 图片 MIME 类型，如 "image/png"
 * @param {string} prompt       - 文字 Prompt
 * @param {{ baseURL: string, apiKey: string, model: string }} config
 * @returns {Promise<string>}
 */
export async function callLLMWithImage(imageBase64, mimeType, prompt, config) {
    const url = `${config.baseURL.replace(/\/$/, '')}/chat/completions`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model: config.model || 'gpt-4o',
            messages: [{
                role: 'user',
                content: [
                    {type: 'text', text: prompt},
                    {type: 'image_url', image_url: {url: `data:${mimeType};base64,${imageBase64}`}},
                ],
            }],
            temperature: 0.1,
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`LLM Vision API error ${res.status}: ${text}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
}

/**
 * 测试 LLM 连接是否可用
 * @param {{ baseURL: string, apiKey: string, model: string }} config
 * @returns {Promise<boolean>}
 */
export async function testLLMConnection(config) {
    const content = await callLLM('请回复"ok"', config);
    return typeof content === 'string' && content.length > 0;
}

