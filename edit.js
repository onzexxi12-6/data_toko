// edit.js - Halaman edit jumlah dengan preview

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
let currentPage = 1;
let currentSize = 'compact';

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
// FUNGSI UKURAN (Sama untuk Preview & Export)
// =====================================================
function getSizeStyles() {
    const sizes = {
        'normal': {
            container: 'padding: 30px; font-size: 13px;',
            header: 'font-size: 20px; padding-bottom: 15px; margin-bottom: 20px;',
            date: 'font-size: 12px;',
            th: 'padding: 10px; font-size: 12px;',
            td: 'padding: 10px; font-size: 12px;',
            badge: 'padding: 4px 12px; font-size: 11px;',
            footer: 'font-size: 11px; padding-top: 15px; margin-top: 30px;',
            pageInfo: 'font-size: 10px;'
        },
        'compact': {
            container: 'padding: 20px; font-size: 11px;',
            header: 'font-size: 16px; padding-bottom: 10px; margin-bottom: 15px;',
            date: 'font-size: 10px;',
            th: 'padding: 6px 8px; font-size: 10px;',
            td: 'padding: 6px 8px; font-size: 10px;',
            badge: 'padding: 2px 8px; font-size: 9px;',
            footer: 'font-size: 9px; padding-top: 10px; margin-top: 15px;',
            pageInfo: 'font-size: 8px;'
        },
        'very-compact': {
            container: 'padding: 10px; font-size: 9px;',
            header: 'font-size: 13px; padding-bottom: 5px; margin-bottom: 8px;',
            date: 'font-size: 8px;',
            th: 'padding: 3px 4px; font-size: 8px;',
            td: 'padding: 3px 4px; font-size: 8px;',
            badge: 'padding: 1px 6px; font-size: 7px;',
            footer: 'font-size: 7px; padding-top: 5px; margin-top: 8px;',
            pageInfo: 'font-size: 6px;'
        }
    };
    return sizes[currentSize] || sizes['compact'];
}

// =====================================================
// GENERATE KONTEN PDF (Sama untuk Preview & Export)
// =====================================================
function generatePDFContent(items, page, totalPages, style) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID');
    const start = (page - 1) * 20;
    
    let html = `
        <div style="${style.container}">
            <div style="text-align: center; border-bottom: 2px solid #cbd5e1; ${style.header}">
                <h2 style="margin: 0; font-weight: bold; color: #0f172a; ${style.header}">DAFTAR BARANG YANG AKAN DIPESAN</h2>
                <p style="margin: 3px 0 0 0; color: #64748b; ${style.date}">
                    Tanggal: ${dateStr}
                </p>
                <p style="margin: 2px 0 0 0; color: #94a3b8; ${style.pageInfo}">
                    Halaman ${page} dari ${totalPages} | Total ${items.length} item
                </p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f1f5f9;">
                        <th style="padding: ${style.th}; text-align: center; border: 1px solid #cbd5e1; width: 8%;">No</th>
                        <th style="padding: ${style.th}; text-align: left; border: 1px solid #cbd5e1; width: 55%;">Nama Barang</th>
                        <th style="padding: ${style.th}; text-align: center; border: 1px solid #cbd5e1; width: 37%;">Jumlah</th>
                    </tr>
                </thead>
                <tbody>
    `;

    items.forEach((item, index) => {
        const nomor = start + index + 1;
        html += `
            <tr>
                <td style="padding: ${style.td}; border: 1px solid #cbd5e1; text-align: center; font-weight: 500;">${nomor}</td>
                <td style="padding: ${style.td}; border: 1px solid #cbd5e1;">
                    <strong>${escapeHtml(item.name)}</strong>
                </td>
                <td style="padding: ${style.td}; border: 1px solid #cbd5e1; text-align: center;">
                    <span style="background: #dbeafe; color: #1e40af; padding: ${style.badge}; border-radius: 6px; font-weight: 600;">
                        ${item.orderQty} ${item.unit || 'Unit'}
                    </span>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
            
            <div style="border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; ${style.footer}">
                <p>Dicetak pada: ${dateStr}</p>
                <p style="margin-top: 3px;">Mohon segera dilakukan pemesanan untuk barang-barang di atas.</p>
            </div>
        </div>
    `;

    return html;
}

// =====================================================
// RENDER PREVIEW
// =====================================================
function renderPreview() {
    const outItems = getOutOfStockItems();
    const container = document.getElementById('previewContent');
    if (!container) return;

    // Ambil data dengan quantity hasil edit
    const editedItems = outItems.map(item => {
        const qty = editQuantities[item.id] !== undefined ? editQuantities[item.id] : item.value;
        return { ...item, orderQty: qty };
    });

    // Filter item dengan quantity > 0
    const filteredItems = editedItems.filter(item => item.orderQty > 0);
    const totalItems = filteredItems.length;
    const itemsPerPage = 15;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, totalItems);
    const pageItems = filteredItems.slice(start, end);
    const style = getSizeStyles();

    // Update info
    document.getElementById('pageInfo').textContent = `${currentPage} / ${totalPages}`;
    document.getElementById('pageDetail').textContent = 
        totalItems > 0 ? `Menampilkan ${start + 1} - ${end} dari ${totalItems} item` : 'Tidak ada data';
    
    document.getElementById('prevBtn').disabled = currentPage <= 1;
    document.getElementById('nextBtn').disabled = currentPage >= totalPages;

    if (pageItems.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-slate-400">
                <i class="fa-regular fa-face-frown text-4xl mb-2"></i>
                <p>Tidak ada barang dengan status "Habis" atau quantity > 0</p>
            </div>
        `;
        return;
    }

    // Gunakan fungsi yang sama untuk generate konten
    container.innerHTML = generatePDFContent(pageItems, currentPage, totalPages, style);
}

// =====================================================
// NAVIGASI PREVIEW
// =====================================================
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderPreview();
    }
}

function nextPage() {
    const outItems = getOutOfStockItems();
    const editedItems = outItems.map(item => {
        const qty = editQuantities[item.id] !== undefined ? editQuantities[item.id] : item.value;
        return { ...item, orderQty: qty };
    });
    const filteredItems = editedItems.filter(item => item.orderQty > 0);
    const totalPages = Math.ceil(filteredItems.length / 15) || 1;
    
    if (currentPage < totalPages) {
        currentPage++;
        renderPreview();
    }
}

function updatePreview() {
    currentSize = document.getElementById('sizeOption').value;
    currentPage = 1;
    renderPreview();
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
        renderPreview();
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
    
    renderPreview();
}

// =====================================================
// FUNGSI MANIPULASI QUANTITY
// =====================================================

function adjustQuantity(id, delta) {
    const input = document.getElementById(`editQty_${id}`);
    if (!input) return;
    
    let currentValue = parseInt(input.value, 10) || 0;
    let newValue = Math.max(0, currentValue + delta);
    input.value = newValue;
    editQuantities[id] = newValue;
    
    updateBadgeDisplay(id);
    renderPreview();
}

function updateQuantityFromInput(id) {
    const input = document.getElementById(`editQty_${id}`);
    if (!input) return;
    
    let value = parseInt(input.value, 10);
    if (isNaN(value) || value < 0) {
        value = 0;
        input.value = 0;
    }
    editQuantities[id] = value;
    
    updateBadgeDisplay(id);
    renderPreview();
}

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
    renderPreview();
    showStatusBar('↩️ Jumlah direset ke stok awal');
}

// =====================================================
// EXPORT PDF (Menggunakan style yang sama dengan preview)
// =====================================================
// EXPORT PDF (Menggunakan style yang sama dengan preview)
// =====================================================

function exportEditedPDF() {
    const outItems = getOutOfStockItems();
    
    if (outItems.length === 0) {
        alert('Tidak ada barang dengan status "Habis" untuk diekspor.');
        return;
    }

    // Ambil data dengan quantity hasil edit
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

    // Gunakan style yang sama dengan preview
    const style = getSizeStyles();
    const itemsPerPage = 20;
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const pdfContent = document.getElementById('pdfContent');
    
    if (!pdfContent) {
        alert('Terjadi kesalahan. Silakan refresh halaman.');
        return;
    }

    // Fungsi untuk render halaman PDF
    function renderPDFPage(page) {
        const start = (page - 1) * itemsPerPage;
        const end = Math.min(start + itemsPerPage, filteredItems.length);
        const pageItems = filteredItems.slice(start, end);
        
        // Generate konten dengan fungsi yang sama
        const htmlContent = generatePDFContent(pageItems, page, totalPages, style);
        pdfContent.innerHTML = htmlContent;
    }

    // Fungsi untuk download satu halaman
    function downloadPage(page) {
        return new Promise((resolve, reject) => {
            renderPDFPage(page);
            
            const container = document.getElementById('pdfTemplateContainer');
            container.style.display = 'block';
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '0';
            container.style.width = '794px';
            container.style.background = 'white';
            container.style.zIndex = '9999';
            container.style.padding = '0';
            container.style.margin = '0';
            
            // Beri waktu untuk render
            setTimeout(() => {
                const opt = {
                    margin: [0.4, 0.4, 0.4, 0.4],
                    filename: `daftar_pesanan_barang_${new Date().toISOString().slice(0,10)}_halaman_${page}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { 
                        scale: 2, 
                        letterRendering: true,
                        useCORS: true,
                        logging: false,
                        width: 794,
                        height: 1123
                    },
                    jsPDF: { 
                        unit: 'in', 
                        format: 'a4', 
                        orientation: 'portrait' 
                    },
                    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                };

                html2pdf()
                    .set(opt)
                    .from(pdfContent)
                    .outputPdf('blob')
                    .then((pdfBlob) => {
                        container.style.display = 'none';
                        resolve(pdfBlob);
                    })
                    .catch((error) => {
                        container.style.display = 'none';
                        reject(error);
                    });
            }, 500);
        });
    }

    // Generate semua halaman
    async function generateAllPages() {
        try {
            const pdfBlobs = [];
            
            for (let i = 1; i <= totalPages; i++) {
                const blob = await downloadPage(i);
                pdfBlobs.push(blob);
            }

            // Download semua PDF
            if (pdfBlobs.length === 1) {
                const url = URL.createObjectURL(pdfBlobs[0]);
                const a = document.createElement('a');
                a.href = url;
                a.download = `daftar_pesanan_barang_${new Date().toISOString().slice(0,10)}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } else {
                pdfBlobs.forEach((blob, index) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `daftar_pesanan_barang_${new Date().toISOString().slice(0,10)}_halaman_${index + 1}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                });
                showStatusBar(`✅ ${pdfBlobs.length} file PDF berhasil didownload!`);
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Terjadi kesalahan saat membuat PDF. Silakan coba lagi.');
        }
    }

    generateAllPages();
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
    if (checkData()) {
        renderEditTable();
        renderPreview();
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            window.location.href = 'index.html';
        }
    });
});