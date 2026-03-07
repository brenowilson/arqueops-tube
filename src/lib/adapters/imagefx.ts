/**

/**
 * ImageFX Adapter
 *
 * Integração com Google ImageFX para geração de imagens.
 * Baseado no código do Video Save Guardian (generate-imagefx).
 *
 * LIMITAÇÃO: ImageFX não tem API pública. Requer cookies de sessão do Google.
 */

// ======================
// TYPES
// ======================

export interface ImageFXConfig {
    cookies: string;
    aspect_ratio?: 'LANDSCAPE' | 'PORTRAIT' | 'SQUARE';
    num_images?: number;
    seed?: number;
}

export interface ImageFXResult {
    success: boolean;
    images?: Buffer[];
    imagesBase64?: string[];
    error?: string;
    count?: number;
}

// ======================
// DEFAULT HEADERS (simulating browser)
// ======================

const DEFAULT_HEADERS: Record<string, string> = {
    'Content-Type': 'application/json',
    'Origin': 'https://labs.google',
    'Referer': 'https://labs.google/fx/tools/image-fx',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// ======================
// PROMPT SANITIZATION
// (Ported from Guardian)
// ======================

export function sanitizePrompt(prompt: string): string {
    let cleanPrompt = prompt
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // 1. Protect minors - convert age < 18 to young adult
    cleanPrompt = cleanPrompt
        .replace(/\b([1-9]|1[0-7])\s*anos?\b/gi, 'jovem adulto')
        .replace(/\b([1-9]|1[0-7])\s*years?\s*old\b/gi, 'young adult')
        .replace(/\b([1-9]|1[0-7])-year-old\b/gi, 'young adult')
        .replace(/\bcriança\b/gi, 'jovem adulto')
        .replace(/\bchild\b/gi, 'young adult')
        .replace(/\bkid\b/gi, 'young adult')
        .replace(/\badolescente\b/gi, 'jovem adulto')
        .replace(/\bteenager\b/gi, 'young adult')
        .replace(/\bteen\b/gi, 'young adult')
        .replace(/\bmenor\b/gi, 'jovem adulto')
        .replace(/\bmenina\b/gi, 'jovem mulher')
        .replace(/\bmenino\b/gi, 'jovem homem')
        .replace(/\bgarota\b/gi, 'jovem mulher')
        .replace(/\bgaroto\b/gi, 'jovem homem');

    // 2. Remove Brazilian proper names (can cause blocks)
    const namesToRemove = [
        'Maria', 'Ana', 'Fernanda', 'Juliana', 'Camila', 'Amanda', 'Bruna', 'Larissa',
        'Beatriz', 'Letícia', 'Gabriela', 'Patricia', 'Vanessa', 'Carla', 'Helena',
        'Julia', 'Júlia', 'Sandra', 'Rosa', 'Lucia', 'Lúcia', 'Mariana', 'Aline',
        'João', 'José', 'Carlos', 'Paulo', 'Pedro', 'Lucas', 'Gabriel', 'Rafael',
        'Eduardo', 'Felipe', 'Gustavo', 'Henrique', 'Leonardo', 'Marcos', 'Ricardo',
        'Thiago', 'Victor', 'William', 'Bruno', 'Diego', 'Fernando', 'Rodrigo',
        'Santos', 'Silva', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves',
        'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho',
        'Almeida', 'Lopes', 'Cardoso', 'Mendes', 'Freitas'
    ];

    for (const name of namesToRemove) {
        cleanPrompt = cleanPrompt.replace(new RegExp(`\\b${name}\\b`, 'gi'), '');
    }

    // 3. Remove graphic violence
    cleanPrompt = cleanPrompt
        .replace(/\bsangue\b/gi, '')
        .replace(/\bsangrando\b/gi, 'machucado')
        .replace(/\bmatando\b/gi, '')
        .replace(/\bmatar\b/gi, '')
        .replace(/\besfaqueando\b/gi, '')
        .replace(/\btiro\b/gi, '')
        .replace(/\barma\b/gi, '');

    // 4. Remove school uniforms (trigger)
    cleanPrompt = cleanPrompt
        .replace(/\buniforme escolar\b/gi, 'roupa casual')
        .replace(/\bschool uniform\b/gi, 'casual clothes');

    // 5. Clean extra spaces and commas
    cleanPrompt = cleanPrompt
        .replace(/,\s*,/g, ',')
        .replace(/\s+/g, ' ')
        .replace(/^[\s,]+/, '')
        .replace(/[\s,]+$/, '')
        .trim();

    // 6. Limit length
    if (cleanPrompt.length > 1500) {
        cleanPrompt = cleanPrompt.substring(0, 1500);
    }

    return cleanPrompt;
}

// ======================
// IMAGEFX API
// ======================

async function getAccessToken(cookies: string): Promise<string> {
    const response = await fetch('https://labs.google/fx/api/auth/session', {
        headers: {
            ...DEFAULT_HEADERS,
            'Cookie': cookies,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Authentication failed (${response.status}): ${errorText}`);
    }

    const sessionData = await response.json();

    if (!sessionData.access_token) {
        throw new Error('Token not found. Cookie may have expired.');
    }

    return sessionData.access_token;
}

export async function generateImageFX(
    prompt: string,
    config: ImageFXConfig
): Promise<ImageFXResult> {
    const {
        cookies,
        aspect_ratio = 'LANDSCAPE',
        num_images = 1,
        seed = Math.floor(Math.random() * 1000000),
    } = config;

    if (!cookies) {
        return { success: false, error: 'Cookies do ImageFX são obrigatórios' };
    }

    try {
        // Sanitize prompt
        const cleanPrompt = sanitizePrompt(prompt);
        console.log(`[ImageFX] Generating image for prompt: ${cleanPrompt.substring(0, 100)}...`);

        // Get access token
        const accessToken = await getAccessToken(cookies);

        // Map aspect ratio
        const aspectRatioMap: Record<string, string> = {
            'LANDSCAPE': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
            'PORTRAIT': 'IMAGE_ASPECT_RATIO_PORTRAIT',
            'SQUARE': 'IMAGE_ASPECT_RATIO_SQUARE',
        };

        const requestBody = {
            userInput: {
                candidatesCount: num_images,
                prompts: [cleanPrompt],
                seed,
            },
            clientContext: {
                sessionId: `;${Date.now()}`,
                tool: 'IMAGE_FX',
            },
            modelInput: {
                modelNameType: 'IMAGEN_3_5',
            },
            aspectRatio: aspectRatioMap[aspect_ratio] || 'IMAGE_ASPECT_RATIO_LANDSCAPE',
        };

        const response = await fetch('https://aisandbox-pa.googleapis.com/v1:runImageFx', {
            method: 'POST',
            headers: {
                ...DEFAULT_HEADERS,
                'Cookie': cookies,
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();

            if (response.status === 401 || response.status === 403) {
                return { success: false, error: 'Cookie expirado. Exporte novamente.' };
            }

            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error?.message) {
                    const msg = errorJson.error.message.toLowerCase();
                    if (msg.includes('safety') || msg.includes('policy') || msg.includes('blocked')) {
                        return { success: false, error: 'Conteúdo bloqueado pela política do ImageFX' };
                    }
                    return { success: false, error: errorJson.error.message };
                }
            } catch {
                // Ignore parse error
            }

            return { success: false, error: `ImageFX error (${response.status})` };
        }

        const data = await response.json();

        // Extract images
        const imagesBase64: string[] = [];

        if (data.imagePanels && Array.isArray(data.imagePanels)) {
            for (const panel of data.imagePanels) {
                if (panel.generatedImages && Array.isArray(panel.generatedImages)) {
                    for (const img of panel.generatedImages) {
                        if (img.encodedImage) {
                            imagesBase64.push(img.encodedImage);
                        }
                    }
                }
            }
        }

        if (imagesBase64.length === 0) {
            return { success: false, error: 'Nenhuma imagem gerada' };
        }

        // Convert to Buffer
        const images = imagesBase64.map(b64 => Buffer.from(b64, 'base64'));

        console.log(`[ImageFX] Generated ${images.length} image(s)`);

        return {
            success: true,
            images,
            imagesBase64,
            count: images.length,
        };

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[ImageFX] Error: ${message}`);
        return { success: false, error: message };
    }
}

// ======================
// COOKIES MANAGEMENT
// ======================

export function validateCookies(cookies: string): boolean {
    // Check for required cookie names
    const requiredCookies = ['__Secure-1PSID', '__Secure-3PSID'];
    return requiredCookies.some(name => cookies.includes(name));
}

export function getCookiesFromEnv(): string | null {
    return process.env.IMAGEFX_COOKIES || null;
}
