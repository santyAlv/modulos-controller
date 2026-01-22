// ==========================================
// SISTEMA DUAL: IndexedDB + Supabase
// ==========================================
// IndexedDB: Almacenamiento local (offline-first)
// Supabase: Base de datos en la nube (sincronización)
// ==========================================

// Cliente Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Variables globales
let db = null; // IndexedDB
let dbInitialized = false;

// ==========================================
// INDEXEDDB - Almacenamiento Local
// ==========================================

// Inicializar IndexedDB
async function initDatabase() {
    if (dbInitialized && db) {
        return db;
    }

    return new Promise((resolve, reject) => {
        console.log('🔵 Inicializando IndexedDB...');

        const request = indexedDB.open(INDEXEDDB_CONFIG.name, INDEXEDDB_CONFIG.version);

        request.onerror = () => {
            console.error('❌ Error al abrir IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            dbInitialized = true;
            console.log('✅ IndexedDB inicializado correctamente');

            // Sincronizar con Supabase al iniciar
            syncFromSupabase();

            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            console.log('🔧 Creando estructura de IndexedDB...');
            const db = event.target.result;

            // Crear object store si no existe
            if (!db.objectStoreNames.contains(INDEXEDDB_CONFIG.storeName)) {
                const objectStore = db.createObjectStore(INDEXEDDB_CONFIG.storeName, { keyPath: 'id' });

                // Crear índices para búsqueda
                objectStore.createIndex('model', 'model', { unique: false });
                objectStore.createIndex('brand', 'brand', { unique: false });
                objectStore.createIndex('createdAt', 'createdAt', { unique: false });

                console.log('✅ Object store "modulos" creado');
            }
        };
    });
}

// Guardar módulo en IndexedDB
async function saveToIndexedDB(module) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([INDEXEDDB_CONFIG.storeName], 'readwrite');
        const objectStore = transaction.objectStore(INDEXEDDB_CONFIG.storeName);
        const request = objectStore.put(module);

        request.onsuccess = () => {
            console.log('✅ Módulo guardado en IndexedDB');
            resolve(true);
        };

        request.onerror = () => {
            console.error('❌ Error al guardar en IndexedDB:', request.error);
            reject(request.error);
        };
    });
}

// Obtener todos los módulos de IndexedDB
async function getAllFromIndexedDB() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([INDEXEDDB_CONFIG.storeName], 'readonly');
        const objectStore = transaction.objectStore(INDEXEDDB_CONFIG.storeName);
        const request = objectStore.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('❌ Error al obtener de IndexedDB:', request.error);
            reject(request.error);
        };
    });
}

// Eliminar módulo de IndexedDB
async function deleteFromIndexedDB(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([INDEXEDDB_CONFIG.storeName], 'readwrite');
        const objectStore = transaction.objectStore(INDEXEDDB_CONFIG.storeName);
        const request = objectStore.delete(id);

        request.onsuccess = () => {
            console.log('✅ Módulo eliminado de IndexedDB');
            resolve(true);
        };

        request.onerror = () => {
            console.error('❌ Error al eliminar de IndexedDB:', request.error);
            reject(request.error);
        };
    });
}

// ==========================================
// SUPABASE - Sincronización en la Nube
// ==========================================

// Sincronizar desde Supabase (al iniciar)
async function syncFromSupabase() {
    try {
        console.log('📂 Sincronizando desde Supabase...');

        const { data, error } = await supabaseClient
            .from('modulos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error al sincronizar desde Supabase:', error);
            return;
        }

        if (data && data.length > 0) {
            console.log(`📊 ${data.length} módulos encontrados en Supabase`);

            // Guardar cada módulo en IndexedDB
            for (const module of data) {
                // Convertir nombres de columnas de snake_case a camelCase
                const localModule = {
                    id: module.id,
                    model: module.model,
                    brand: module.brand,
                    price: module.price,
                    description: module.description,
                    imageData: module.image_url,
                    createdAt: module.created_at
                };

                await saveToIndexedDB(localModule);
            }

            console.log('✅ Sincronización completada');
        } else {
            console.log('ℹ️ No hay datos en Supabase');
        }
    } catch (error) {
        console.error('❌ Error al guardar en Supabase:', error);
        return false;
    }
}

// Subir imagen a Supabase Storage
async function uploadImageToSupabase(imageData, moduleId) {
    if (!imageData || !imageData.startsWith('data:image')) return null;

    try {
        // Convertir base64 a Blob
        const res = await fetch(imageData);
        const blob = await res.blob();
        const fileExt = blob.type.split('/')[1];
        const fileName = `${moduleId}.${fileExt}`;
        const filePath = `${fileName}`;

        console.log('☁️ Subiendo imagen a Supabase Storage...');

        const { data, error } = await supabaseClient.storage
            .from('module-images')
            .upload(filePath, blob, {
                upsert: true
            });

        if (error) {
            console.error('❌ Error al subir imagen:', error);
            if (error.message && error.message.includes('Bucket not found')) {
                alert('⚠️ Error de Supabase: No existe el bucket de imágenes.\n\nPor favor crea un bucket llamado "module-images" en la sección Storage de Supabase y hazlo público.');
            } else if (error.message && error.message.includes('row-level security policy')) {
                alert('⚠️ Error de Permisos: Supabase bloqueó la subida.\n\nNecesitas agregar una "Policy" en tu bucket "module-images" para permitir uploads (INSERT/SELECT) a todos (public).');
            }
            return null;
        }

        // Obtener URL pública
        const { data: { publicUrl } } = supabaseClient.storage
            .from('module-images')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('❌ Error procesando imagen:', error);
        return null;
    }
}

// Guardar en Supabase
async function saveToSupabase(module) {
    try {
        console.log('☁️ Guardando en Supabase...');

        // Subir imagen si existe y es base64
        let imageUrl = module.imageData;
        if (module.imageData && module.imageData.startsWith('data:image')) {
            const uploadedUrl = await uploadImageToSupabase(module.imageData, module.id);
            if (uploadedUrl) {
                imageUrl = uploadedUrl;
            }
        }

        // Convertir a formato de Supabase (snake_case)
        const supabaseModule = {
            id: module.id,
            model: module.model,
            brand: module.brand,
            price: module.price,
            description: module.description || null,
            image_url: imageUrl || null,
            created_at: module.createdAt,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseClient
            .from('modulos')
            .upsert(supabaseModule, { onConflict: 'id' });

        if (error) {
            console.error('❌ Error al guardar en Supabase:', error.message);
            if (error.message.includes('Could not find the table')) {
                alert('⚠️ Error Crítico: No se encuentra la tabla "modulos" en Supabase.\n\nPor favor ejecuta el script SQL de creación de tabla en el SQL Editor de Supabase.');
            } else if (error.message.includes('Could not find the')) {
                alert('⚠️ Error de Supabase: Faltan columnas en la tabla.\n\nAsegúrate de crear las columnas: brand, model, price, description, image_url');
            }
            return false;
        }

        console.log('✅ Guardado en Supabase correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error al guardar en Supabase:', error);
        return false;
    }
}

// Eliminar de Supabase
async function deleteFromSupabase(id) {
    try {
        console.log('☁️ Eliminando de Supabase...');

        const { error } = await supabaseClient
            .from('modulos')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('❌ Error al eliminar de Supabase:', error.message);
            return false;
        }

        console.log('✅ Eliminado de Supabase correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error al eliminar de Supabase:', error);
        return false;
    }
}

// ==========================================
// FUNCIONES PÚBLICAS (API)
// ==========================================

// Insertar módulo (IndexedDB + Supabase)
async function insertModule(module) {
    console.log('🔵 Insertando módulo:', module.model, module.brand);

    if (!db || !dbInitialized) {
        console.error('❌ IndexedDB no inicializado');
        alert('Error: La base de datos no está lista. Por favor recarga la página.');
        return false;
    }

    try {
        // 1. Guardar primero en IndexedDB (offline-first)
        await saveToIndexedDB(module);

        // 2. Intentar guardar en Supabase (si hay internet)
        const savedInCloud = await saveToSupabase(module);

        if (savedInCloud) {
            console.log('✅ Módulo guardado completamente (local + nube)');
        } else {
            console.warn('⚠️ Módulo guardado localmente, pendiente sincronización');
        }

        return true;
    } catch (error) {
        console.error('❌ Error al insertar módulo:', error);
        alert('Error al guardar el módulo: ' + error.message);
        return false;
    }
}

// Actualizar módulo (IndexedDB + Supabase)
async function updateModule(module) {
    console.log('🔵 Actualizando módulo:', module.model, module.brand);

    if (!db || !dbInitialized) {
        console.error('❌ IndexedDB no inicializado');
        alert('Error: La base de datos no está lista. Por favor recarga la página.');
        return false;
    }

    try {
        // Actualizar en IndexedDB
        await saveToIndexedDB(module);

        // Actualizar en Supabase
        const savedInCloud = await saveToSupabase(module);

        if (savedInCloud) {
            console.log('✅ Módulo actualizado completamente');
        } else {
            console.warn('⚠️ Módulo actualizado localmente, pendiente sincronización');
        }

        return true;
    } catch (error) {
        console.error('❌ Error al actualizar módulo:', error);
        alert('Error al actualizar el módulo: ' + error.message);
        return false;
    }
}

// Eliminar módulo (IndexedDB + Supabase)
async function deleteModuleById(moduleId) {
    if (!db || !dbInitialized) {
        console.error('❌ IndexedDB no inicializado');
        return false;
    }

    try {
        // Eliminar de IndexedDB
        await deleteFromIndexedDB(moduleId);

        // Eliminar de Supabase
        await deleteFromSupabase(moduleId);

        console.log('✅ Módulo eliminado completamente');
        return true;
    } catch (error) {
        console.error('❌ Error al eliminar módulo:', error);
        return false;
    }
}

// Obtener todos los módulos (desde IndexedDB)
async function getAllModules() {
    if (!db || !dbInitialized) {
        console.error('❌ IndexedDB no inicializado');
        return [];
    }

    try {
        const modules = await getAllFromIndexedDB();
        return modules.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
        console.error('❌ Error al obtener módulos:', error);
        return [];
    }
}

// Buscar módulos
async function searchModules(query) {
    if (!db || !dbInitialized) {
        console.error('❌ IndexedDB no inicializado');
        return [];
    }

    try {
        const allModules = await getAllFromIndexedDB();
        const lowerQuery = query.toLowerCase();

        return allModules.filter(module =>
            module.model.toLowerCase().includes(lowerQuery) ||
            module.brand.toLowerCase().includes(lowerQuery) ||
            module.price.toString().includes(lowerQuery) ||
            (module.description && module.description.toLowerCase().includes(lowerQuery))
        ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
        console.error('❌ Error al buscar módulos:', error);
        return [];
    }
}

// Obtener módulo por ID
async function getModuleById(moduleId) {
    if (!db || !dbInitialized) {
        console.error('❌ IndexedDB no inicializado');
        return null;
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([INDEXEDDB_CONFIG.storeName], 'readonly');
        const objectStore = transaction.objectStore(INDEXEDDB_CONFIG.storeName);
        const request = objectStore.get(moduleId);

        request.onsuccess = () => {
            resolve(request.result || null);
        };

        request.onerror = () => {
            console.error('❌ Error al obtener módulo:', request.error);
            reject(request.error);
        };
    });
}

// ==========================================
// EXPORTAR/IMPORTAR
// ==========================================

// Exportar a Excel (Customizado)
async function downloadDatabaseAsExcel() {
    try {
        const modules = await getAllModules();

        if (modules.length === 0) {
            alert('No hay datos para exportar');
            return;
        }

        // Agrupar por marca
        const modulesByBrand = {};
        modules.forEach(module => {
            const brand = module.brand || 'Otras';
            if (!modulesByBrand[brand]) {
                modulesByBrand[brand] = [];
            }
            modulesByBrand[brand].push(module);
        });

        const workbook = XLSX.utils.book_new();
        const worksheetData = [];
        const merges = [];
        let currentRow = 0;

        // Estilos
        const headerStyle = {
            font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4F46E5" } }, // Primary color
            alignment: { horizontal: "center" }
        };

        const subHeaderStyle = {
            font: { bold: true, sz: 12 },
            border: { bottom: { style: "thin", color: { rgb: "000000" } } }
        };

        const priceStyle = {
            fill: { fgColor: { rgb: "FFFF00" } }, // Yellow background
            font: { bold: true },
            numFmt: "$ #,##0.00"
        };

        const normalStyle = {
            alignment: { horizontal: "left" }
        };

        // Iterar por cada marca
        for (const brand in modulesByBrand) {
            // Título de la Marca
            worksheetData.push([{ v: brand.toUpperCase(), s: headerStyle }, { v: '', s: headerStyle }]);
            merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 1 } });
            currentRow++;

            // Cabeceras de columnas
            worksheetData.push([
                { v: 'Modelo', s: subHeaderStyle },
                { v: 'Precio', s: subHeaderStyle }
            ]);
            currentRow++;

            // Módulos de la marca
            modulesByBrand[brand].forEach(module => {
                worksheetData.push([
                    { v: module.model, s: normalStyle },
                    { v: module.price, s: priceStyle }
                ]);
                currentRow++;
            });

            // Fila vacía para separar
            worksheetData.push(['', '']);
            currentRow++;
        }

        // Crear hoja desde array de datos
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

        // Aplicar merges
        worksheet['!merges'] = merges;

        // Anchos de columna
        worksheet['!cols'] = [{ wch: 40 }, { wch: 20 }];

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Lista de Precios');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        a.download = `Lista_Precios_Javicell_${dateStr}.xlsx`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('✅ Lista de precios exportada correctamente');
    } catch (error) {
        console.error('❌ Error al exportar a Excel:', error);
        alert('Error al exportar la lista de precios');
    }
}

// Función para importar Excel (mantener compatibilidad)
async function loadFromExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    alert('El archivo Excel está vacío');
                    reject(new Error('Archivo vacío'));
                    return;
                }

                let modulesLoaded = 0;

                for (const row of jsonData) {
                    try {
                        const model = row['Modelo'] || row['Model'] || '';
                        const brand = row['Marca'] || row['Brand'] || '';
                        const price = row['Precio'] || row['Price'] || 0;
                        const description = row['Descripción'] || row['Description'] || '';

                        if (!model || !brand || !price) {
                            continue;
                        }

                        const priceNum = typeof price === 'number' ? price : parseFloat(String(price).replace(/[^0-9.-]/g, ''));

                        if (isNaN(priceNum) || priceNum <= 0) {
                            continue;
                        }

                        const module = {
                            id: generateId(),
                            model: String(model).trim(),
                            brand: String(brand).trim(),
                            price: priceNum,
                            description: description ? String(description).trim() : null,
                            imageData: null,
                            createdAt: new Date().toISOString()
                        };

                        await insertModule(module);
                        modulesLoaded++;
                    } catch (error) {
                        console.error('Error al procesar fila:', row, error);
                    }
                }

                alert(`${modulesLoaded} módulo(s) cargado(s) correctamente desde Excel.`);
                resolve();
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = function () {
            reject(new Error('Error al leer el archivo Excel'));
        };

        reader.readAsArrayBuffer(file);
    });
}

// Generar ID único
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
