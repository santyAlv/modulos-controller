// Variables globales
let modules = [];
let editingId = null;
let currentImageData = null;
let currentCategory = 'modulo'; // por defecto: 'modulo', 'pin', 'vidrio'

// Cambiar de categoría (pestañas)
function setCategory(category) {
    currentCategory = category;
    
    // Actualizar botones de pestañas
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        if (tab.getAttribute('data-category') === category) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Limpiar búsqueda si hay
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }

    // Volver a renderizar
    renderModules();
}

// Cargar módulos al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Inicializar base de datos SQLite
        await initDatabase();
        await loadModules();
        setupSearch();
        await fixIPhoneBrands(); // Corregir marcas de iPhone al iniciar
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        alert('Error al inicializar la base de datos. Por favor recarga la página.');
    }
});

// Cargar módulos desde base de datos
async function loadModules() {
    try {
        modules = await getAllModules();
        renderModules();

        // Habilitar botón de cámara cuando los datos estén listos
        const cameraBtn = document.getElementById('cameraBtn');
        if (cameraBtn) {
            cameraBtn.disabled = false;
            cameraBtn.title = "Buscar por foto (Cámara/Galería)";
        }
    } catch (error) {
        console.error('Error al cargar módulos:', error);
    }
}

// Guardar módulos
async function saveModules() {
    try {
        renderModules();
    } catch (error) {
        console.error('Error al guardar módulos:', error);
    }
}

// Renderizar módulos en la página
function renderModules(filteredModules = null) {
    const container = document.getElementById('modulesContainer');
    const emptyState = document.getElementById('emptyState');
    
    let modulesToRender = filteredModules || modules;

    container.innerHTML = '';

    if (modulesToRender.length === 0) {
        emptyState.classList.add('show');
        container.style.display = 'none';
        
        // Cambiar ícono y texto según categoría
        const icon = document.getElementById('emptyStateIcon');
        const msg = document.getElementById('emptyStateMessage');
        if (currentCategory === 'modulo') {
            icon.textContent = '📱';
            msg.textContent = 'No hay ítems registrados en tu búsqueda. Agrega módulos.';
        } else if (currentCategory === 'pin') {
            icon.textContent = '🔌';
            msg.textContent = 'No hay ítems registrados en tu búsqueda.';
        } else {
            icon.textContent = '🔍';
            msg.textContent = 'No hay ítems registrados en tu búsqueda.';
        }
    } else {
        emptyState.classList.remove('show');
        container.style.display = 'grid';

        modulesToRender.forEach(module => {
            const card = createModuleCard(module);
            container.appendChild(card);
        });
    }
}

// Crear tarjeta de módulo
function createModuleCard(module) {
    const card = document.createElement('div');
    card.className = 'module-card';
    card.onclick = () => openDetailModal(module.id);

    const defaultImage = '📱';
    const imageData = module.imageData || '';
    
    let displayPrice = module.price || 0;
    if (currentCategory === 'pin') displayPrice = module.pricePin || 0;
    else if (currentCategory === 'vidrio') displayPrice = module.priceVidrio || 0;

    card.innerHTML = `
        <div class="module-image">
            ${imageData ?
            `<img src="${imageData}" alt="${module.model}" onerror="this.parentElement.innerHTML='${defaultImage}'">` :
            defaultImage
        }
        </div>
        <div class="module-info">
            <div class="module-brand">${escapeHtml(module.brand)}</div>
            <div class="module-model">${escapeHtml(module.model)}</div>
            <div class="module-price">$${formatPrice(displayPrice)}</div>
            ${module.description ?
            `<div class="module-description">${escapeHtml(module.description)}</div>` :
            ''
        }
            <div class="module-actions" onclick="event.stopPropagation()">
                <button class="btn btn-edit" onclick="event.stopPropagation(); editModule('${module.id}')">
                    ✏️ Editar
                </button>
                <button class="btn btn-danger" onclick="event.stopPropagation(); deleteModule('${module.id}')">
                    🗑️ Eliminar
                </button>
            </div>
        </div>
    `;

    return card;
}

// Abrir modal de detalles
async function openDetailModal(moduleId) {
    const modal = document.getElementById('detailModal');
    const detailContent = document.getElementById('detailContent');
    const module = await getModuleById(moduleId);

    if (!module) return;

    const defaultImage = '📱';
    const imageData = module.imageData || '';
    
    let displayPrice = module.price || 0;
    if (currentCategory === 'pin') displayPrice = module.pricePin || 0;
    else if (currentCategory === 'vidrio') displayPrice = module.priceVidrio || 0;

    detailContent.innerHTML = `
        <div class="detail-container">
            <div class="detail-image">
                ${imageData ?
            `<img src="${imageData}" alt="${module.model}" onerror="this.parentElement.innerHTML='<div style=\\'font-size: 8rem; padding: 40px 0;\\'>${defaultImage}</div>'">` :
            `<div style="font-size: 8rem; padding: 40px 0;">${defaultImage}</div>`
        }
            </div>
            <div class="detail-info">
                <div class="detail-brand">${escapeHtml(module.brand)}</div>
                <h2 class="detail-model">${escapeHtml(module.model)}</h2>
                <div class="detail-price">$${formatPrice(displayPrice)}</div>
                ${module.description ?
            `<div class="detail-description">
                        <h3>Descripción</h3>
                        <p>${escapeHtml(module.description)}</p>
                    </div>` :
            ''
        }
                <div class="detail-actions">
                    <button class="btn btn-edit" onclick="closeDetailModal(); editModule('${module.id}')">
                        ✏️ Editar
                    </button>
                    <button class="btn btn-danger" onclick="closeDetailModal(); deleteModule('${module.id}')">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.classList.add('show');
}

// Cerrar modal de detalles
function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('show');
}

// Agregar nuevo módulo
async function openModal(moduleId = null) {
    const modal = document.getElementById('modal');
    const form = document.getElementById('moduleForm');
    const title = document.getElementById('modalTitle');
    const imagePreview = document.getElementById('imagePreview');
    const imageFile = document.getElementById('imageFile');

    editingId = moduleId;
    currentImageData = null;
    imagePreview.innerHTML = '';
    imageFile.value = '';

    if (moduleId) {
        title.textContent = 'Editar Ítem';
        const module = await getModuleById(moduleId);
        if (module) {
            document.getElementById('model').value = module.model;
            document.getElementById('brand').value = module.brand;
            document.getElementById('price').value = module.price || '';
            document.getElementById('pricePin').value = module.pricePin || '';
            document.getElementById('priceVidrio').value = module.priceVidrio || '';
            document.getElementById('description').value = module.description || '';

            // Mostrar imagen actual si existe
            if (module.imageData) {
                currentImageData = module.imageData;
                showImagePreview(module.imageData);
            }
        }
    } else {
        title.textContent = 'Agregar Nuevo Ítem';
        form.reset();
        imagePreview.innerHTML = '';
    }

    modal.classList.add('show');
}

// Cerrar modal
function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('show');
    document.getElementById('moduleForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('imageFile').value = '';
    editingId = null;
    currentImageData = null;
}

// Guardar módulo (crear o actualizar)
async function saveModule(event) {
    event.preventDefault();

    const model = document.getElementById('model').value.trim();
    const brand = document.getElementById('brand').value.trim();
    const price = parseFloat(document.getElementById('price').value) || 0;
    const pricePin = parseFloat(document.getElementById('pricePin').value) || 0;
    const priceVidrio = parseFloat(document.getElementById('priceVidrio').value) || 0;
    const description = document.getElementById('description').value.trim();

    try {
        let success = false;

        if (editingId) {
            const existingModule = await getModuleById(editingId);
            if (existingModule) {
                const updatedModule = {
                    id: editingId,
                    model,
                    brand,
                    imageData: currentImageData, // Usar currentImageData directamente para permitir null
                    price,
                    pricePin,
                    priceVidrio,
                    description: description || null
                };
                success = await updateModule(updatedModule);
            }
        } else {
            const newModule = {
                id: generateId(),
                model,
                brand,
                imageData: currentImageData || null,
                price,
                pricePin,
                priceVidrio,
                description: description || null,
                createdAt: new Date().toISOString()
            };
            success = await insertModule(newModule);
        }

        if (success !== false) {
            await loadModules();
            closeModal();
            const mensaje = editingId ? 'Ítem actualizado correctamente' : 'Ítem agregado correctamente';
            showSuccessMessage(mensaje);
        }
    } catch (error) {
        console.error('Error al guardar módulo:', error);
        alert('Error al guardar el módulo: ' + error.message);
    }
}

// Mostrar mensaje de éxito temporal
function showSuccessMessage(message) {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.textContent = '✅ ' + message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 500;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentElement) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Manejar selección de imagen
function handleImageSelect(event) {
    const file = event.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen válido');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            currentImageData = e.target.result;
            showImagePreview(currentImageData);
        };
        reader.readAsDataURL(file);
    } else {
        currentImageData = null;
        document.getElementById('imagePreview').innerHTML = '';
    }
}

// Mostrar vista previa de la imagen
function showImagePreview(imageData) {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = `
        <div class="preview-container">
            <img src="${imageData}" alt="Vista previa" class="preview-image">
            <button type="button" class="btn-remove-image" onclick="removeImage()">✕ Quitar imagen</button>
        </div>
    `;
}

// Quitar imagen seleccionada
function removeImage() {
    currentImageData = null;
    const imageFile = document.getElementById('imageFile');
    if (imageFile) imageFile.value = '';
    document.getElementById('imagePreview').innerHTML = '';
}

// Corregir marcas de iPhone (cambiar Motorola/otros por Apple)
async function fixIPhoneBrands() {
    let changed = false;
    for (const module of modules) {
        if (module.model.toLowerCase().includes('iphone') && module.brand.toLowerCase() !== 'apple') {
            console.log(`🔧 Corrigiendo marca para ${module.model}: ${module.brand} -> Apple`);
            module.brand = 'Apple';
            await updateModule(module);
            changed = true;
        }
    }
    if (changed) {
        renderModules();
    }
}

// Editar módulo
function editModule(moduleId) {
    openModal(moduleId);
}

// Eliminar módulo
async function deleteModule(moduleId) {
    if (confirm('¿Estás seguro de que quieres eliminar este módulo?')) {
        try {
            await deleteModuleById(moduleId);
            await loadModules();
        } catch (error) {
            console.error('Error al eliminar módulo:', error);
            alert('Error al eliminar el módulo. Por favor intenta de nuevo.');
        }
    }
}

// Configurar búsqueda
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();

        // Ocultar resultado de IA al empezar a escribir manualmente
        const iaResult = document.getElementById('iaResult');
        if (iaResult) iaResult.style.display = 'none';

        if (query === '') {
            renderModules();
            return;
        }

        const filtered = await searchModules(query);
        renderModules(filtered);
    });
}

// Generar ID único
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Formatear precio
function formatPrice(price) {
    return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Descargar base de datos como archivo Excel
async function downloadDatabase() {
    try {
        downloadDatabaseAsExcel();
        setTimeout(() => {
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            alert(`Base de datos exportada como phone_modules_${dateStr}.xlsx`);
        }, 100);
    } catch (error) {
        console.error('Error al descargar base de datos:', error);
        alert('Error al descargar la base de datos');
    }
}

// Cargar base de datos desde archivo (SQLite o Excel)
async function loadDatabaseFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isSQLite = fileName.endsWith('.db') || fileName.endsWith('.sqlite') || fileName.endsWith('.sqlite3');

    if (!isExcel && !isSQLite) {
        alert('Por favor selecciona un archivo SQLite (.db, .sqlite, .sqlite3) o Excel (.xlsx, .xls)');
        return;
    }

    try {
        if (isExcel) {
            await loadFromExcel(file);
        } else {
            const fileBuffer = await loadDatabaseFromFile(file);
            db = null;
            dbInitialized = false;
            await initDatabase(fileBuffer);
            autosaveDatabase();
            await loadModules();
            alert('Base de datos cargada correctamente');
        }
        event.target.value = '';
    } catch (error) {
        console.error('Error al cargar archivo:', error);
        alert('Error al cargar el archivo: ' + error.message);
    }
}

// Cargar datos desde archivo Excel
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
                    alert('El archivo Excel está vacío o no tiene datos');
                    reject(new Error('Archivo Excel vacío'));
                    return;
                }

                if (!dbInitialized || !db) {
                    db = null;
                    dbInitialized = false;
                    await initDatabase();
                }

                let modulesLoaded = 0;
                let modulesError = 0;

                for (const row of jsonData) {
                    try {
                        const model = row['Modelo'] || row['modelo'] || row['Model'] || row['model'] || row['MODELO'] || '';
                        const brand = row['Marca'] || row['marca'] || row['Brand'] || row['brand'] || row['MARCA'] || '';
                        const price = row['Precio'] || row['precio'] || row['Price'] || row['price'] || row['PRECIO'] || 0;
                        const description = row['Descripción'] || row['descripción'] || row['Description'] || row['description'] || row['DESCRIPCIÓN'] || row['Descripcion'] || '';
                        const imageUrl = row['Imagen'] || row['imagen'] || row['Image'] || row['image'] || row['IMAGEN'] || '';

                        if (!model || !brand || !price) {
                            modulesError++;
                            continue;
                        }

                        const priceNum = typeof price === 'number' ? price : parseFloat(String(price).replace(/[^0-9.-]/g, ''));
                        if (isNaN(priceNum) || priceNum <= 0) {
                            modulesError++;
                            continue;
                        }

                        const module = {
                            id: generateId(),
                            model: String(model).trim(),
                            brand: String(brand).trim(),
                            price: priceNum,
                            description: description ? String(description).trim() : null,
                            imageData: imageUrl ? String(imageUrl).trim() : null,
                            createdAt: new Date().toISOString()
                        };

                        insertModule(module);
                        modulesLoaded++;
                    } catch (error) {
                        modulesError++;
                    }
                }

                await loadModules();
                let message = `${modulesLoaded} módulo(s) cargado(s) correctamente desde Excel.`;
                if (modulesError > 0) {
                    message += `\n${modulesError} fila(s) tuvieron errores y fueron omitidas.`;
                }
                alert(message);
                resolve();
            } catch (error) {
                reject(error);
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

// Guardar módulos automáticamente después de cada operación
async function saveModules() {
    try {
        renderModules();
    } catch (error) {
        console.error('Error al guardar módulos:', error);
    }
}

// Cerrar modales al hacer clic fuera
window.onclick = function (event) {
    const modal = document.getElementById('modal');
    const detailModal = document.getElementById('detailModal');
    if (event.target === modal) closeModal();
    if (event.target === detailModal) closeDetailModal();
}

// ==========================================
// BÚSQUEDA VISUAL (IA)
// ==========================================

async function handleCameraCapture(event) {
    const file = event.target.files[0];
    if (!file) return;

    const loadingIndicator = document.getElementById('loadingIndicator');
    const searchInput = document.getElementById('searchInput');
    const iaResult = document.getElementById('iaResult');
    const iaModelName = document.getElementById('iaModelName');

    // Mostrar indicador de carga
    loadingIndicator.style.display = 'block';
    iaResult.style.display = 'none';
    searchInput.value = 'Analizando imagen...';
    searchInput.disabled = true;

    try {
        // Llamar a la IA (función global expuesta por ai_service.js)
        if (typeof window.findBestVisualMatch !== 'function') {
            throw new Error('El servicio de IA no está cargado correctamente.');
        }

        // Usar la nueva función de comparación visual directa
        console.log(`📦 Enviando ${modules.length} modelos como contexto a la IA...`);
        const modelName = await window.findBestVisualMatch(file, modules);

        if (modelName) {
            if (modelName === 'Error de Cuota') {
                searchInput.value = '';
            } else if (modelName === 'Desconocido') {
                alert('No se pudo identificar el modelo. Intenta con una foto más clara.');
                searchInput.value = '';
            } else {
                // Limpiar el nombre para que solo busque el modelo (quitar marcas comunes de forma recursiva)
                let searchTerms = modelName.trim();
                const brands = ['redmi', 'xiaomi', 'samsung', 'motorola', 'moto', 'iphone', 'apple', 'realme', 'oppo', 'vivo', 'huawei', 'honor', 'infinix', 'tecno', 'google', 'pixel', 'nokia', 'sony', 'lg', 'zte', 'alcatel', 'tcl'];
                const suffixes = ['original', 'con marco', 'sin marco', 'oled', 'incell', 'tft', 'amoled', 'premium', 'calidad', 'display', 'pantalla', 'modulo', 'completo'];

                let changed = true;
                while (changed) {
                    changed = false;
                    let lowerSearch = searchTerms.toLowerCase();

                    // Quitar marcas al inicio
                    for (const brand of brands) {
                        if (lowerSearch.startsWith(brand + ' ')) {
                            searchTerms = searchTerms.substring(brand.length + 1).trim();
                            changed = true;
                            break;
                        } else if (lowerSearch === brand) {
                            searchTerms = '';
                            changed = true;
                            break;
                        }
                    }

                    if (changed) continue;

                    // Quitar sufijos al final
                    for (const suffix of suffixes) {
                        if (lowerSearch.endsWith(' ' + suffix)) {
                            searchTerms = searchTerms.substring(0, searchTerms.length - (suffix.length + 1)).trim();
                            changed = true;
                            break;
                        } else if (lowerSearch.includes(' ' + suffix + ' ')) {
                            // También quitar si está en el medio (ej: "A03 Core Original Con Marco")
                            searchTerms = searchTerms.replace(new RegExp(' ' + suffix + ' ', 'gi'), ' ').trim();
                            changed = true;
                            break;
                        }
                    }
                }

                // Mostrar resultado original en la interfaz
                iaResult.style.display = 'block';
                iaModelName.textContent = modelName;

                // NUEVA LÓGICA: Guardar imagen si el módulo no tiene una
                try {
                    const matchingModule = modules.find(m => m.model === modelName);
                    if (matchingModule && !matchingModule.imageData) {
                        console.log(`📸 Asignando imagen escaneada al módulo: ${modelName}`);

                        // Convertir a base64 (usando FileReader para simplicidad en script.js)
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                            matchingModule.imageData = e.target.result;
                            await updateModule(matchingModule);
                            renderModules();
                            console.log('✅ Imagen guardada automáticamente');
                        };
                        reader.readAsDataURL(file);
                    }
                } catch (imgErr) {
                    console.warn('No se pudo guardar la imagen automáticamente:', imgErr);
                }

                // Poner solo el modelo en el buscador
                searchInput.value = searchTerms;
                setupSearch();
                const inputEvent = new Event('input');
                searchInput.dispatchEvent(inputEvent);
            }
        } else {
            searchInput.value = '';
        }
    } catch (error) {
        console.error('Error en búsqueda visual:', error);
        alert('Error al analizar la imagen. Asegúrate de tener la API Key configurada.');
        searchInput.value = '';
    } finally {
        loadingIndicator.style.display = 'none';
        searchInput.disabled = false;
        searchInput.focus();
        event.target.value = '';
    }
}
