// edit.js - Halaman edit jumlah sebelum export PDF

// =====================================================
// KONFIGURASI STORAGE
// =====================================================
const STORAGE_KEY = 'inventory_data';

// =====================================================
// BACA DATA DARI LOCALSTORAGE
// =====================================================
function loadDataFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            if (data.items && Array.isArray(data.items)) {
                return data;
            }
        }
        return { items: [], nextId: 1 };
    } catch (error) {
        console.error('Error loading data:', error);
        return { items: [], nextId: 1 };
    }
}

// =====================================================
// VARIABEL GLOBAL
// =====================================================
let inventoryData = loadDataFromStorage();
let editQuantities = {};

// =====================================================
// FUNGSI HELPER
// =====================================================
function getOutOfStockItems() {
    return inventoryData.items.filter(item => item.isOut);
}

function getItemById(id) {
    return inventoryData.items.find(item => item.id === id);
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
// RENDER TABEL EDIT
// =====================================================
function renderEditTable() {
    const outItems = getOutOfStockItems();
    const tbody = document.getElementById('editTableBody');
    
    if (!tbody) return;

    // Inisialisasi editQuantities jika kosong
    if (Object.keys(editQuantities).length === 0) {
        outItems.forEach(item => {
            editQuantities[item.id] = item.value;
        });
    }

    // Update total
    document.getElementById('editTotalItems').textContent = outItems.length;
    document.getElementById('editTotalItems2').textContent = outItems.length;
    
    // Update tanggal
    const now = new Date();
    document.getElementById('editDateDisplay').textContent = 
        now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID');

    if (outItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-slate-400">
                    <i class="fa-regular fa-face-smile text-2xl block mb-2"></i>
                    Tidak ada barang dengan status "Habis"
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = outItems.map((item, index) => {
        const qty = editQuantities[item.id] !== undefined ? editQuantities[item.id] : item.value;
        const isChanged = qty !== item.value;
        
        return `
            <tr>
                <td class="text-center font-medium text-slate-500">${index + 1}</td>
                <td class="font-medium text-slate-800">${escapeHtml(item.name)}</td>
                <td class="text-slate-500 text-sm">${item.unit || 'Unit'}</td>
                <td>
                    <div class="flex items-center gap-1 sm:gap-2">
                        <button onclick="adjustQuantity(${item.id}, -1)" class="qty-control-btn minus" title="Kurangi">
                            <i class="fa-solid fa-minus"></i>
                        </button>
                        <input 
                            type="number" 
                            id="editQty_${item.id}" 
                            value="${qty}" 
                            min="0"
                            class="edit-quantity-input"
                            onchange="updateQuantityFromInput(${item.id})"
                            onfocus="this.select()"
                        />
                        <button onclick="adjustQuantity(${item.id}, 1)" class="qty-control-btn plus" title="Tambah">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                </td>
                <td>
                    <span class="current-stock-badge ${isChanged ? 'changed' : ''}">
                        ${item.value} ${item.unit || 'Unit'}
                    </span>
                    ${isChanged ? `<span class="text-xs text-amber-600 ml-1">(ubah)</span>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// =====================================================
// FUNGSI MANIPULASI QUANTITY
// =====================================================

/**
 * Adjust quantity dengan tombol +/- 
 */
function adjustQuantity(id, delta) {
    const input = document.getElementById(`editQty_${id}`);
    if (!input) return;
    
    let currentValue = parseInt(input.value, 10) || 0;
    let newValue = Math.max(0, currentValue + delta);
    input.value = newValue;
    editQuantities[id] = newValue;
    
    // Update tampilan badge
    updateBadgeDisplay(id);
}

/**
 * Update quantity dari input langsung
 */
function updateQuantityFromInput(id) {
    const input = document.getElementById(`editQty_${id}`);
    if (!input) return;
    
    let value = parseInt(input.value, 10);
    if (isNaN(value) || value < 0) {
        value = 0;
        input.value = 0;
    }
    editQuantities[id] = value;
    
    // Update tampilan badge
    updateBadgeDisplay(id);
}

/**
 * Update badge stok saat ini
 */
function updateBadgeDisplay(id) {
    const item = getItemById(id);
    if (!item) return;
    
    const row = document.getElementById(`editQty_${id}`)?.closest('tr');
    if (row) {
        const badge = row.querySelector('.current-stock-badge');
        const changedText = row.querySelector('.text-amber-600');
        if (badge) {
            const qty = editQuantities[id] !== undefined ? editQuantities[id] : item.value;
            const isChanged = qty !== item.value;
            
            badge.textContent = `${item.value} ${item.unit || 'Unit'}`;
            badge.className = `current-stock-badge ${isChanged ? 'changed' : ''}`;
            
            if (isChanged) {
                if (!changedText) {
                    const span = document.createElement('span');
                    span.className = 'text-xs text-amber-600 ml-1';
                    span.textContent = '(ubah)';
                    badge.parentNode.appendChild(span);
                }
            } else {
                if (changedText) {
                    changedText.remove();
                }
            }
        }
    }
}

/**
 * Reset semua quantity ke stok awal
 */
function resetEditQuantities() {
    const outItems = getOutOfStockItems();
    outItems.forEach(item => {
        editQuantities[item.id] = item.value;
        const input = document.getElementById(`editQty_${item.id}`);
        if (input) {
            input.value = item.value;
        }
    });
    renderEditTable();
    showStatusBar('↩️ Jumlah direset ke stok awal');
}

// =====================================================
// EXPORT PDF DENGAN HASIL EDIT
// =====================================================

function exportEditedPDF() {
    const outItems = getOutOfStockItems();
    
    if (outItems.length === 0) {
        alert('Tidak ada barang dengan status "Habis" untuk diekspor.');
        return;
    }

    // Kumpulkan data dengan quantity hasil edit
    const editedItems = outItems.map(item => {
        const editedQty = editQuantities[item.id];
        return {
            ...item,
            orderQty: editedQty !== undefined ? editedQty : item.value
        };
    });

    // Filter item dengan quantity > 0
    const filteredItems = editedItems.filter(item => item.orderQty > 0);
    
    if (filteredItems.length === 0) {
        alert('Tidak ada barang dengan jumlah pesanan > 0. Silakan atur jumlah terlebih dahulu.');
        return;
    }

    // Siapkan konten PDF
    const pdfContent = document.getElementById('pdfContent');
    const tbody = document.getElementById('pdfTableBody');
    const dateEl = document.getElementById('pdfDate');
    const footerDate = document.getElementById('pdfFooterDate');

    if (!pdfContent || !tbody || !dateEl || !footerDate) {
        console.error('Elemen PDF tidak ditemukan!');
        alert('Terjadi kesalahan. Silakan refresh halaman.');
        return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID');
    dateEl.textContent = `Tanggal cetak: ${dateStr}`;
    footerDate.textContent = dateStr;

    // Tabel menampilkan Nama Barang dan Jumlah Pemesanan (hasil edit)
    tbody.innerHTML = filteredItems.map((item, idx) => `
        <tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 500;">${idx + 1}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1;">
                <strong>${escapeHtml(item.name)}</strong>
            </td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">
                <span style="background: transparent; color: #1e40af; padding: 4px 12px; border-radius: 6px; font-weight: 600;">
                    ${item.orderQty} ${item.unit || 'Unit'}
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
                showStatusBar('✅ PDF daftar pesanan berhasil diekspor');
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

function showStatusBar(message) {
    let statusBar = document.getElementById('statusBar');
    if (!statusBar) {
        statusBar = document.createElement('div');
        statusBar.id = 'statusBar';
        document.body.appendChild(statusBar);
    }
    
    statusBar.textContent = message;
    statusBar.className = 'show';
    
    clearTimeout(statusBar._timeout);
    statusBar._timeout = setTimeout(() => {
        statusBar.className = '';
    }, 3000);
}

// =====================================================
// CEK APAKAH ADA DATA
// =====================================================

function checkData() {
    const outItems = getOutOfStockItems();
    if (outItems.length === 0) {
        // Tampilkan pesan jika tidak ada data
        const tbody = document.getElementById('editTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-8 text-center text-slate-400">
                        <i class="fa-regular fa-face-smile text-3xl block mb-2"></i>
                        Tidak ada barang dengan status "Habis"
                        <div class="mt-2 text-sm">
                            <a href="index.html" class="text-purple-600 hover:text-purple-700 underline">
                                Kembali ke halaman utama
                            </a>
                        </div>
                    </td>
                </tr>
            `;
        }
        return false;
    }
    return true;
}

// =====================================================
// INISIALISASI
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    // Cek data
    if (checkData()) {
        renderEditTable();
    }
    
    // Keyboard shortcut: Escape untuk kembali
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            window.location.href = 'index.html';
        }
    });
});