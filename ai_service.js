// ==========================================
// SERVICIO DE IA (GROQ VERSION - LLAMA 4)
// ==========================================

let availableVisionModels = [];
let isInitializing = false;
let initPromise = null;

export async function initAI() {
    if (isInitializing) return initPromise;
    isInitializing = true;

    initPromise = (async () => {
        if (!CONFIG.GROQ_API_KEY) {
            console.warn('⚠️ No hay API Key de Groq configurada.');
            return false;
        }

        try {
            console.log('🤖 Inicializando IA (Groq)...');
            await discoverVisionModels();
            return true;
        } catch (error) {
            console.error('❌ Error al inicializar IA:', error);
            return false;
        }
    })();

    return initPromise;
}

/**
 * Descubre dinámicamente qué modelos de visión están disponibles
 */
async function discoverVisionModels() {
    try {
        const response = await fetch("https://api.groq.com/openai/v1/models", {
            headers: { "Authorization": `Bearer ${CONFIG.GROQ_API_KEY}` }
        });
        const data = await response.json();

        if (data.data) {
            const allModels = data.data.map(m => m.id);
            console.log("📋 LISTA COMPLETA DE MODELOS GROQ DISPONIBLES:", allModels);

            // Intentar detectar modelos de visión por nombre (priorizando Llama 4 Maverick/Scout)
            availableVisionModels = allModels.filter(id =>
                id.toLowerCase().includes("maverick") ||
                id.toLowerCase().includes("scout") ||
                id.toLowerCase().includes("vision") ||
                id.toLowerCase().includes("llava") ||
                id.toLowerCase().includes("pixtral")
            );

            console.log("✅ Modelos de visión detectados dinámicamente:", availableVisionModels);

            // Si no detectamos ninguno por nombre, usamos la lista confirmada de Llama 4
            if (availableVisionModels.length === 0) {
                console.warn("⚠️ No se detectaron modelos por nombre. Usando modelos Llama 4 confirmados.");
                availableVisionModels = [
                    "meta-llama/llama-4-maverick-17b-128e-instruct",
                    "meta-llama/llama-4-scout-17b-16e-instruct"
                ];
            }
        }
    } catch (e) {
        console.error("❌ Error al descubrir modelos:", e);
        availableVisionModels = [
            "meta-llama/llama-4-maverick-17b-128e-instruct",
            "meta-llama/llama-4-scout-17b-16e-instruct"
        ];
    }
}

/**
 * Identifica el modelo de celular en una imagen usando Groq Vision
 */
export async function identifyPhoneModel(imageFile, modules = []) {
    await initAI();

    if (!CONFIG.GROQ_API_KEY) {
        alert('⚠️ Falta configurar la API Key de Groq en config.js');
        return null;
    }

    try {
        const base64Image = await fileToBase64(imageFile);
        const knownModels = [...new Set(modules.map(m => m.model))];

        // Prompt mejorado para búsqueda en dos etapas
        let prompt = `Analizá exclusivamente la imagen proporcionada, que corresponde a la parte trasera de un teléfono móvil.

Tu tarea es identificar el modelo exacto del dispositivo en DOS ETAPAS:

ETAPA 1 (Comparación Local):
Compará la imagen proporcionada con los modelos que ya existen en la base de datos del usuario: ${knownModels.join(', ')}.
Si la imagen coincide claramente con uno de estos modelos (basándote en tu conocimiento visual de esos modelos), responde con ese nombre exacto.

ETAPA 2 (Búsqueda General):
Si el equipo NO parece ser ninguno de los modelos de la lista anterior, identificalo usando tu conocimiento general de internet.

REGLAS CRÍTICAS:
1. No adivines ni supongas.
2. Si hay mínima duda entre dos modelos similares, elegí el más preciso basado en diferencias físicas visibles.
3. No menciones marcas alternativas ni rangos de modelos.
4. No expliques el razonamiento.
5. Responde ÚNICAMENTE con la marca y el modelo exacto (ej: iPhone 13 Pro Max).
6. NO agregues texto adicional, comentarios ni aclaraciones.
7. El REDMI A3X se reconoce por un MÓDULO DE CÁMARAS CIRCULAR MUY GRANDE Y CENTRADO en la parte superior.
8. MOTOROLA ONE HYPER: 2 cámaras traseras alineadas verticalmente, SENSOR DE HUELLAS CIRCULAR en la parte trasera (con logo M).
9. MOTO G32: 3 cámaras traseras en módulo rectangular, SENSOR DE HUELLAS LATERAL (en el botón).`;

        console.log("🤖 Consultando a Groq (Búsqueda Dual)...");
        console.log("🔍 Modelos de referencia enviados:", knownModels);

        let lastError = null;

        for (const modelId of availableVisionModels) {
            try {
                console.log(`Intentando con modelo: ${modelId}...`);
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${CONFIG.GROQ_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages: [
                            {
                                role: "user",
                                content: [
                                    { type: "text", text: prompt },
                                    {
                                        type: "image_url",
                                        image_url: {
                                            url: `data:image/jpeg;base64,${base64Image}`
                                        }
                                    }
                                ]
                            }
                        ],
                        temperature: 0.1,
                        max_tokens: 50
                    })
                });

                const data = await response.json();

                if (data.choices && data.choices[0]) {
                    const text = data.choices[0].message.content.trim();
                    console.log(`✅ ¡ÉXITO! Groq (${modelId}) detectó:`, text);
                    return text;
                }

                if (data.error) {
                    console.warn(`Modelo ${modelId} falló:`, data.error.message);
                    lastError = data.error.message;
                }
            } catch (e) {
                console.warn(`Error de conexión con ${modelId}:`, e.message);
                lastError = e.message;
            }
        }

        throw new Error(lastError || "No se pudo conectar con ningún modelo de visión de Groq");

    } catch (error) {
        console.error("Error en identificación IA (Groq):", error);

        if (error.message.includes("429") || error.message.toLowerCase().includes("quota")) {
            alert("⚠️ Límite de uso alcanzado en Groq. Espera un momento.");
            return "Error de Cuota";
        }

        alert("Error de Groq: " + error.message);
        return null;
    }
}

/**
 * Helper: Convertir File a Base64 con redimensionamiento
 */
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const base64String = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
                resolve(base64String);
            };
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Exponer funciones globalmente
window.identifyPhoneModel = identifyPhoneModel;
window.findBestVisualMatch = async (file, modules) => {
    return identifyPhoneModel(file, modules);
};

// Inicializar
initAI();
