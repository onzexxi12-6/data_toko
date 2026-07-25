// script.js - Menggunakan LocalStorage untuk menyimpan data

// =====================================================
// KONFIGURASI STORAGE
// =====================================================
const STORAGE_KEY = 'inventory_data';
const DEFAULT_KEY = 'inventory_default'; // Key khusus untuk default data

// =====================================================
// DATA DEFAULT (Bisa di-update otomatis)
// =====================================================
function getDefaultData() {
    // Cek apakah ada default data di localStorage
    const savedDefault = localStorage.getItem(DEFAULT_KEY);
    if (savedDefault) {
        try {
            const parsed = JSON.parse(savedDefault);
            if (parsed.items && Array.isArray(parsed.items)) {
                return parsed;
            }
        } catch (e) {
            console.error('Error parsing default data:', e);
        }
    }
    
    // Jika tidak ada, gunakan data default hardcode
    const defaultItems = [];

    // Auto-generate ID
    const items = defaultItems.map((item, index) => ({
        ...item,
        id: index + 1
    }));

    const defaultData = {
        items: items,
        nextId: items.length + 1
    };

    // Simpan ke localStorage
    localStorage.setItem(DEFAULT_KEY, JSON.stringify(defaultData));
    return defaultData;
}

// =====================================================
// FUNGSI BACA & TULIS DATA
// =====================================================

// Baca data dari LocalStorage
function loadDataFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            if (data.items && Array.isArray(data.items)) {
                // Pastikan semua item punya ID
                data.items = data.items.map((item, index) => {
                    if (!item.id) {
                        item.id = data.nextId || index + 1;
                    }
                    return item;
                });
                // Update nextId jika perlu
                if (data.items.length > 0) {
                    const maxId = Math.max(...data.items.map(item => item.id));
                    data.nextId = Math.max(data.nextId || 1, maxId + 1);
                }
                return data;
            }
        }
        return getDefaultData();
    } catch (error) {
        console.error('Error loading data:', error);
        return getDefaultData();
    }
}

// Simpan data ke LocalStorage
function saveDataToStorage(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving data:', error);
        return false;
    }
}

// =====================================================
// UPDATE DEFAULT DATA (Otomatis saat ada perubahan)
// =====================================================
function updateDefaultData() {
    // Ambil data saat ini dari inventory
    const currentData = loadDataFromStorage();
    
    // Simpan sebagai default baru
    localStorage.setItem(DEFAULT_KEY, JSON.stringify(currentData));
    
    console.log('✅ Default data berhasil diupdate');
    updateStatusBar('✅ Data default berhasil diupdate');
}

// =====================================================
// VARIABEL GLOBAL
// =====================================================
let inventoryData = loadDataFromStorage();

// =====================================================
// FUNGSI CRUD (dengan auto-save & auto-update default)
// =====================================================

function getItems() {
    return inventoryData.items;
}

function getItemById(id) {
    return inventoryData.items.find(item => item.id === id);
}

function addItemData(name, value, unit, price) {
    const newItem = {
        id: inventoryData.nextId++,
        name: name.trim(),
        value: parseInt(value, 10),
        unit: unit || 'Unit',
        price: isNaN(parseInt(price, 10)) ? 0 : parseInt(price, 10),
        isOut: false
    };
    inventoryData.items.push(newItem);
    saveDataToStorage(inventoryData);
    updateDefaultData(); // Auto-update default
    updateStatusBar(`✅ "${name}" berhasil ditambahkan`);
    return newItem;
}

function updateItemData(id, updatedData) {
    const index = inventoryData.items.findIndex(item => item.id === id);
    if (index !== -1) {
        inventoryData.items[index] = {
            ...inventoryData.items[index],
            ...updatedData
        };
        saveDataToStorage(inventoryData);
        updateDefaultData(); // Auto-update default
        updateStatusBar('✅ Data berhasil diupdate');
        return true;
    }
    return false;
}

function deleteItemData(id) {
    const initialLength = inventoryData.items.length;
    inventoryData.items = inventoryData.items.filter(item => item.id !== id);
    if (inventoryData.items.length < initialLength) {
        saveDataToStorage(inventoryData);
        updateDefaultData(); // Auto-update default
        updateStatusBar('✅ Barang berhasil dihapus');
        return true;
    }
    return false;
}

function toggleItemStatus(id) {
    const item = getItemById(id);
    if (item) {
        item.isOut = !item.isOut;
        saveDataToStorage(inventoryData);
        updateDefaultData(); // Auto-update default
        updateStatusBar('✅ Status berhasil diubah');
        return true;
    }
    return false;
}

function getOutOfStockItems() {
    return inventoryData.items.filter(item => item.isOut);
}

function getAvailableItems() {
    return inventoryData.items.filter(item => !item.isOut);
}

// =====================================================
// RESET KE DEFAULT
// =====================================================
function resetToDefaultData() {
    if (!confirm('Reset semua data ke default?')) return;
    
    // Ambil default data terbaru dari localStorage
    inventoryData = getDefaultData();
    saveDataToStorage(inventoryData);
    renderTable();
    updateStatusBar('✅ Data berhasil direset ke default');
}

// =====================================================
// EXPORT & IMPORT DATA
// =====================================================

// Export data ke file JSON (Backup)
function exportData() {
    const jsonData = JSON.stringify(inventoryData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    updateStatusBar('✅ Data berhasil diekspor');
}

// Import data dari file JSON (Restore)
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const jsonData = JSON.parse(e.target.result);
            if (jsonData.items && Array.isArray(jsonData.items)) {
                inventoryData = jsonData;
                saveDataToStorage(inventoryData);
                renderTable();
                updateStatusBar('✅ Data berhasil diimpor');
            } else {
                alert('Format file tidak valid!');
            }
        } catch (error) {
            alert('Gagal membaca file. Pastikan file adalah JSON yang valid.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// =====================================================
// RENDER TABEL
// =====================================================
function renderTable() {
    const filter = document.getElementById('filterStatus').value;
    const tbody = document.getElementById('itemTableBody');
    if (!tbody) return;

    let items = getItems();
    let filtered = items;

    if (filter === 'available') filtered = getAvailableItems();
    else if (filter === 'out') filtered = getOutOfStockItems();

    // Update jumlah barang di header
    updateItemCount(items.length, filtered.length);

    // Update total nilai inventaris
    const totalValue = items.reduce((sum, item) => sum + (item.price || 0) * (item.value || 0), 0);
    updateTotalValueBar(totalValue);

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-6 text-center text-sm text-slate-400">
                    <i class="fa-regular fa-face-frown mr-1"></i> Tidak ada data
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(item => `
        <tr class="hover:bg-slate-50 transition">
            <td class="py-3 px-4 font-medium text-slate-800">${escapeHtml(item.name)}</td>
            <td class="py-3 px-4 text-slate-600">${item.value} ${item.unit || 'Unit'}</td>
            <td class="py-3 px-4 text-slate-600">${formatRupiah(item.price)}</td>
            <td class="py-3 px-4 text-right font-semibold text-slate-800">${formatRupiah((item.price || 0) * (item.value || 0))}</td>
            <td class="py-3 px-4 text-center">
                <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ${item.isOut ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}">
                    ${item.isOut ? 'Habis' : 'Tersedia'}
                </span>
            </td>
            <td class="py-3 px-4">
                <div class="flex items-center justify-center gap-1">
                    <button onclick="toggleStatus(${item.id})" class="action-btn text-blue-600 hover:bg-blue-50" title="Ubah Status">
                        <i class="fa-solid fa-rotate"></i>
                    </button>
                    <button onclick="editItem(${item.id})" class="action-btn text-amber-600 hover:bg-amber-50" title="Edit Barang">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button onclick="deleteItem(${item.id})" class="action-btn text-rose-600 hover:bg-rose-50" title="Hapus Barang">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Update jumlah barang
function updateItemCount(total, filtered) {
    let countEl = document.getElementById('itemCount');
    if (!countEl) {
        const header = document.querySelector('.flex.flex-col.sm\\:flex-row.justify-between.items-center.mb-4');
        if (header) {
            countEl = document.createElement('span');
            countEl.id = 'itemCount';
            countEl.className = 'text-xs text-slate-500';
            header.appendChild(countEl);
        }
    }
    if (countEl) {
        countEl.textContent = `Total: ${total} item | Ditampilkan: ${filtered} item`;
    }
}

// Tampilkan total nilai inventaris di atas tabel
function updateTotalValueBar(totalValue) {
    let bar = document.getElementById('totalValueBar');
    const tableWrapper = document.querySelector('.overflow-x-auto');
    if (!bar && tableWrapper) {
        bar = document.createElement('div');
        bar.id = 'totalValueBar';
        bar.className = 'total-value-bar mb-4';
        tableWrapper.parentNode.insertBefore(bar, tableWrapper);
    }
    if (bar) {
        bar.innerHTML = `
            <i class="fa-solid fa-sack-dollar"></i>
            <span>Total Nilai Inventaris: <strong>${formatRupiah(totalValue)}</strong></span>
        `;
    }
}

// =====================================================
// HANDLER FUNCTIONS
// =====================================================

function toggleStatus(id) {
    if (toggleItemStatus(id)) {
        renderTable();
    }
}

function editItem(id) {
    const item = getItemById(id);
    if (!item) {
        alert('Data tidak ditemukan!');
        return;
    }

    const newName = prompt('Edit Nama Barang:', item.name);
    if (newName === null) return;
    
    const newValue = prompt('Edit Jumlah:', item.value);
    if (newValue === null) return;
    
    const newUnit = prompt('Edit Satuan:', item.unit || 'Unit');
    if (newUnit === null) return;

    const newPrice = prompt('Edit Harga Satuan (Rp):', item.price || 0);
    if (newPrice === null) return;

    const updated = updateItemData(id, {
        name: newName.trim() || item.name,
        value: parseInt(newValue, 10) || item.value,
        unit: newUnit.trim() || item.unit,
        price: isNaN(parseInt(newPrice, 10)) ? (item.price || 0) : parseInt(newPrice, 10)
    });

    if (updated) {
        renderTable();
    }
}

// =====================================================
// VARIABEL UNTUK UNDO DELETE
// =====================================================
let deletedItemHistory = null;
let undoTimeout = null;

// =====================================================
// FUNGSI DELETE DENGAN UNDO
// =====================================================
function deleteItem(id) {
    const item = getItemById(id);
    if (!item) return;

    // Simpan data yang akan dihapus untuk keperluan undo
    deletedItemHistory = {
        item: { ...item },
        index: inventoryData.items.findIndex(i => i.id === id)
    };

    // Hapus data
    const initialLength = inventoryData.items.length;
    inventoryData.items = inventoryData.items.filter(item => item.id !== id);
    
    if (inventoryData.items.length < initialLength) {
        saveDataToStorage(inventoryData);
        updateDefaultData(); // Auto-update default
        renderTable();
        
        // Tampilkan notifikasi dengan tombol undo
        showUndoNotification(item.name);
    }
}

// =====================================================
// FUNGSI UNDO DELETE
// =====================================================
function undoDelete() {
    if (!deletedItemHistory) return;

    // Kembalikan data yang dihapus
    const { item, index } = deletedItemHistory;
    
    // Masukkan kembali ke posisi semula jika memungkinkan
    if (index !== undefined && index >= 0 && index <= inventoryData.items.length) {
        inventoryData.items.splice(index, 0, item);
    } else {
        // Jika posisi tidak valid, tambahkan di akhir
        inventoryData.items.push(item);
    }
    
    // Update nextId jika perlu
    if (item.id >= inventoryData.nextId) {
        inventoryData.nextId = item.id + 1;
    }
    
    saveDataToStorage(inventoryData);
    updateDefaultData(); // Auto-update default
    renderTable();
    
    // Reset history
    deletedItemHistory = null;
    clearTimeout(undoTimeout);
    
    // Sembunyikan notifikasi
    hideUndoNotification();
    
    updateStatusBar(`↩️ "${item.name}" berhasil dikembalikan`);
}

// =====================================================
// TAMPILKAN NOTIFIKASI DENGAN TOMBOL UNDO
// =====================================================
function showUndoNotification(itemName) {
    // Hapus notifikasi sebelumnya jika ada
    hideUndoNotification();
    
    // Buat elemen notifikasi
    const notification = document.createElement('div');
    notification.id = 'undoNotification';
    notification.className = 'fixed bottom-20 right-4 bg-white border border-slate-200 shadow-lg rounded-lg p-4 flex items-center gap-4 z-50 transition-all duration-300';
    notification.style.transform = 'translateY(20px)';
    notification.style.opacity = '0';
    
    notification.innerHTML = `
        <span class="text-sm text-slate-700">
            <i class="fa-solid fa-trash-can text-rose-500 mr-2"></i>
            "${escapeHtml(itemName)}" berhasil dihapus
        </span>
        <button onclick="undoDelete()" class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg text-sm transition flex items-center gap-1">
            <i class="fa-solid fa-rotate-left"></i> Urungkan
        </button>
        <button onclick="hideUndoNotification()" class="text-slate-400 hover:text-slate-600 transition text-sm">
            <i class="fa-solid fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Animasi muncul
    setTimeout(() => {
        notification.style.transform = 'translateY(0)';
        notification.style.opacity = '1';
    }, 50);
    
    // Auto hide setelah 5 detik
    clearTimeout(undoTimeout);
    undoTimeout = setTimeout(() => {
        hideUndoNotification();
        deletedItemHistory = null;
    }, 5000);
}

// =====================================================
// SEMBUNYIKAN NOTIFIKASI
// =====================================================
function hideUndoNotification() {
    const notification = document.getElementById('undoNotification');
    if (notification) {
        notification.style.transform = 'translateY(20px)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
    clearTimeout(undoTimeout);
}

// =====================================================
// TAMBAH BARANG
// =====================================================
function addItem(e) {
    e.preventDefault();
    const nameInput = document.getElementById('itemName');
    const valueInput = document.getElementById('itemValue');
    const unitInput = document.getElementById('itemUnit');
    const priceInput = document.getElementById('itemPrice');
    
    const name = nameInput.value.trim();
    const value = parseInt(valueInput.value.trim(), 10);
    const unit = unitInput ? unitInput.value : 'Unit';
    const price = priceInput ? parseInt(priceInput.value, 10) : 0;

    if (!name || isNaN(value) || value < 0) {
        alert('Harap isi nama barang dan nilai yang valid (minimal 0).');
        return;
    }

    addItemData(name, value, unit, price);
    nameInput.value = '';
    valueInput.value = '';
    if (unitInput) unitInput.value = 'Unit';
    if (priceInput) priceInput.value = '';
    renderTable();
}

// =====================================================
// EXPORT PDF - Versi Sederhana (Tanpa Status)
// =====================================================
function exportToPDF() {
    const outItems = getOutOfStockItems();
    
    if (outItems.length === 0) {
        alert('Tidak ada barang dengan status "Habis" untuk diekspor.');
        return;
    }

    const pdfContent = document.getElementById('pdfContent');
    const tbody = document.getElementById('pdfTableBody');
    const dateEl = document.getElementById('pdfDate');

    if (!pdfContent || !tbody || !dateEl) {
        console.error('Elemen PDF tidak ditemukan!');
        alert('Terjadi kesalahan. Silakan refresh halaman.');
        return;
    }

    const now = new Date();
    dateEl.textContent = `Tanggal cetak: ${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID')}`;

    // Tabel hanya menampilkan Nama Barang dan Jumlah (tanpa Status)
    tbody.innerHTML = outItems.map((item, idx) => `
        <tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 500;">${idx + 1}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1;">
                <strong>${escapeHtml(item.name)}</strong>
            </td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">
                <span style="background: transparent; color: #1e40af; padding: 4px 12px; border-radius: 6px; font-weight: 600;">
                    ${item.value} ${item.unit || 'Unit'}
                </span>
            </td>
        </tr>
    `).join('');

    // Tampilkan container sementara untuk capture
    const container = document.getElementById('pdfTemplateContainer');
    container.style.display = 'block';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px';
    container.style.background = 'white';
    container.style.zIndex = '9999';

    setTimeout(() => {
        const opt = {
            margin: [0.5, 0.5, 0.5, 0.5],
            filename: `daftar_pesanan_barang_${new Date().toISOString().slice(0,10)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                letterRendering: true,
                useCORS: true,
                logging: false
            },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf()
            .set(opt)
            .from(pdfContent)
            .save()
            .then(() => {
                container.style.display = 'none';
                updateStatusBar('✅ PDF daftar pesanan berhasil diekspor');
            })
            .catch((error) => {
                console.error('Error generating PDF:', error);
                container.style.display = 'none';
                alert('Terjadi kesalahan saat membuat PDF. Silakan coba lagi.');
            });
    }, 300);
}

// =====================================================
// STATUS BAR
// =====================================================
function updateStatusBar(message) {
    let statusBar = document.getElementById('statusBar');
    if (!statusBar) {
        statusBar = document.createElement('div');
        statusBar.id = 'statusBar';
        statusBar.className = 'fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm transition-all duration-300';
        statusBar.style.transform = 'translateY(100px)';
        statusBar.style.opacity = '0';
        statusBar.style.zIndex = '9999';
        document.body.appendChild(statusBar);
    }
    
    statusBar.textContent = message;
    statusBar.style.transform = 'translateY(0)';
    statusBar.style.opacity = '1';
    
    clearTimeout(statusBar._timeout);
    statusBar._timeout = setTimeout(() => {
        statusBar.style.transform = 'translateY(100px)';
        statusBar.style.opacity = '0';
    }, 3000);
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
function formatRupiah(number) {
    const value = Number(number) || 0;
    return 'Rp' + value.toLocaleString('id-ID');
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// =====================================================
// TAMBAH TOMBOL MANAJEMEN DATA
// =====================================================
function addDataManagementButtons() {
    const container = document.querySelector('.bg-white.shadow-sm.rounded-xl.p-6.border.border-slate-100:last-child');
    if (!container) return;

    if (document.getElementById('dataManagementButtons')) return;

    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'dataManagementButtons';
    buttonContainer.className = 'mt-4 flex flex-wrap gap-2';
    buttonContainer.innerHTML = `
        <button onclick="exportData()" class="btn-press bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md text-sm transition flex items-center gap-2">
            <i class="fa-solid fa-download"></i> Backup Data
        </button>
        <label class="btn-press bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md text-sm transition flex items-center gap-2 cursor-pointer">
            <i class="fa-solid fa-upload"></i> Restore Data
            <input type="file" accept=".json" onchange="importData(event)" class="hidden">
        </label>
        <button onclick="updateDefaultData()" class="btn-press bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md text-sm transition flex items-center gap-2" title="Simpan data saat ini sebagai default">
            <i class="fa-solid fa-bookmark"></i> Simpan sebagai Default
        </button>
        <button onclick="resetToDefaultData()" class="btn-press bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md text-sm transition flex items-center gap-2">
            <i class="fa-solid fa-rotate"></i> Reset Default
        </button>
        <button onclick="if(confirm('Hapus semua data?')){inventoryData={items:[],nextId:1};saveDataToStorage(inventoryData);updateDefaultData();renderTable();updateStatusBar('✅ Semua data dihapus');}" class="btn-press bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md text-sm transition flex items-center gap-2">
            <i class="fa-solid fa-trash"></i> Hapus Semua
        </button>
    `;
    container.appendChild(buttonContainer);
}

// =====================================================
// INISIALISASI
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
    renderTable();
    addDataManagementButtons();
});