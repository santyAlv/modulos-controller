// Variables globales
let modules = [];
let editingId = null;
let currentImageData = null;

// Cargar módulos al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Inicializar base de datos SQLite
        await initDatabase();
        await loadModules();
        setupSearch();
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
    const modulesToRender = filteredModules || modules;

    container.innerHTML = '';

    if (modulesToRender.length === 0) {
        emptyState.classList.add('show');
        container.style.display = 'none';
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
            <div class="module-price">$${formatPrice(module.price)}</div>
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
                <div class="detail-price">$${formatPrice(module.price)}</div>
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
        title.textContent = 'Editar Módulo';
        const module = await getModuleById(moduleId);
        if (module) {
            document.getElementById('model').value = module.model;
            document.getElementById('brand').value = module.brand;
            document.getElementById('price').value = module.price;
            document.getElementById('description').value = module.description || '';

            // Mostrar imagen actual si existe
            if (module.imageData) {
                currentImageData = module.imageData;
                showImagePreview(module.imageData);
            }
        }
    } else {
        title.textContent = 'Agregar Nuevo Módulo';
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

    console.log('🟢 Iniciando guardado de módulo...');

    const model = document.getElementById('model').value.trim();
    const brand = document.getElementById('brand').value.trim();
    const price = parseFloat(document.getElementById('price').value);
    const description = document.getElementById('description').value.trim();

    console.log(`📝 Datos del formulario: ${model} (${brand}) - $${price}`);

    try {
        let success = false;

        if (editingId) {
            // Editar módulo existente
            console.log(`✏️ Editando módulo existente: ${editingId}`);
            const existingModule = await getModuleById(editingId);
            if (existingModule) {
                const updatedModule = {
                    id: editingId,
                    model,
                    brand,
                    imageData: currentImageData || existingModule.imageData || null,
                    price,
                    description: description || null
                };
                success = await updateModule(updatedModule);
            }
        } else {
            // Agregar nuevo módulo
            console.log('➕ Agregando nuevo módulo...');
            const newModule = {
                id: generateId(),
                model,
                brand,
                imageData: currentImageData || null,
                price,
                description: description || null,
                createdAt: new Date().toISOString()
            };
            console.log(`🆔 ID generado: ${newModule.id}`);
            success = await insertModule(newModule);
        }

        if (success !== false) {
            console.log('✅ Módulo guardado exitosamente');

            // Recargar módulos para mostrar los cambios
            await loadModules();

            // Cerrar modal
            closeModal();

            // Mostrar mensaje de éxito al usuario
            const mensaje = editingId ? 'Módulo actualizado correctamente' : 'Módulo agregado correctamente';
            showSuccessMessage(mensaje);
        } else {
            console.error('❌ Error: La función de guardado retornó false');
            alert('No se pudo guardar el módulo. Por favor revisa la consola para más detalles.');
        }
    } catch (error) {
        console.error('❌ Error al guardar módulo:', error);
        alert('Error al guardar el módulo: ' + error.message);
    }
}

// Mostrar mensaje de éxito temporal
function showSuccessMessage(message) {
    // Crear elemento de notificación
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

    // Remover después de 3 segundos
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
        // Validar que sea una imagen
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen válido');
            event.target.value = '';
            return;
        }

        // Convertir a base64
        const reader = new FileReader();
        reader.onload = function (e) {
            currentImageData = e.target.result;
            showImagePreview(currentImageData);
        };
        reader.onerror = function () {
            alert('Error al cargar la imagen. Por favor intenta de nuevo.');
            event.target.value = '';
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
    document.getElementById('imageFile').value = '';
    document.getElementById('imagePreview').innerHTML = '';
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
    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();

        if (query === '') {
            renderModules();
            return;
        }

        // Buscar en base de datos
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
        // Mostrar mensaje de confirmación
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
            // Procesar archivo Excel
            await loadFromExcel(file);
        } else {
            // Procesar archivo SQLite
            const fileBuffer = await loadDatabaseFromFile(file);

            // Reinicializar base de datos con el archivo cargado
            db = null;
            dbInitialized = false;
            await initDatabase(fileBuffer);

            // Guardar en LocalStorage
            autosaveDatabase();

            // Recargar módulos
            await loadModules();

            alert('Base de datos cargada correctamente');
        }

        // Limpiar input
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

                // Obtener la primera hoja
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convertir a JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    alert('El archivo Excel está vacío o no tiene datos');
                    reject(new Error('Archivo Excel vacío'));
                    return;
                }

                // Asegurar que la base de datos esté inicializada
                if (!dbInitialized || !db) {
                    db = null;
                    dbInitialized = false;
                    await initDatabase();
                }

                // Mapear columnas de Excel a módulos
                // Acepta diferentes nombres de columnas (case insensitive)
                let modulesLoaded = 0;
                let modulesError = 0;

                for (const row of jsonData) {
                    try {
                        // Buscar columnas (case insensitive)
                        const model = row['Modelo'] || row['modelo'] || row['Model'] || row['model'] || row['MODELO'] || '';
                        const brand = row['Marca'] || row['marca'] || row['Brand'] || row['brand'] || row['MARCA'] || '';
                        const price = row['Precio'] || row['precio'] || row['Price'] || row['price'] || row['PRECIO'] || 0;
                        const description = row['Descripción'] || row['descripción'] || row['Description'] || row['description'] || row['DESCRIPCIÓN'] || row['Descripcion'] || '';
                        const imageUrl = row['Imagen'] || row['imagen'] || row['Image'] || row['image'] || row['IMAGEN'] || '';

                        // Validar datos requeridos
                        if (!model || !brand || !price) {
                            console.warn('Fila omitida - faltan datos requeridos:', row);
                            modulesError++;
                            continue;
                        }

                        // Convertir precio a número
                        const priceNum = typeof price === 'number' ? price : parseFloat(String(price).replace(/[^0-9.-]/g, ''));

                        if (isNaN(priceNum) || priceNum <= 0) {
                            console.warn('Fila omitida - precio inválido:', row);
                            modulesError++;
                            continue;
                        }

                        // Crear módulo
                        const module = {
                            id: generateId(),
                            model: String(model).trim(),
                            brand: String(brand).trim(),
                            price: priceNum,
                            description: description ? String(description).trim() : null,
                            imageData: imageUrl ? String(imageUrl).trim() : null,
                            createdAt: new Date().toISOString()
                        };

                        // Insertar en la base de datos
                        insertModule(module);
                        modulesLoaded++;

                    } catch (error) {
                        console.error('Error al procesar fila:', row, error);
                        modulesError++;
                    }
                }

                // Recargar módulos
                await loadModules();

                // Mostrar resultado
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

        reader.onerror = function (error) {
            reject(new Error('Error al leer el archivo Excel'));
        };

        reader.readAsArrayBuffer(file);
    });
}

// Guardar módulos automáticamente después de cada operación
async function saveModules() {
    try {
        renderModules();
        // Opcional: puedes activar la descarga automática aquí si lo deseas
        // downloadDatabaseFile();
    } catch (error) {
        console.error('Error al guardar módulos:', error);
    }
}

// Cerrar modales al hacer clic fuera
window.onclick = function (event) {
    const modal = document.getElementById('modal');
    const detailModal = document.getElementById('detailModal');

    if (event.target === modal) {
        closeModal();
    }
    if (event.target === detailModal) {
        closeDetailModal();
    }
}

