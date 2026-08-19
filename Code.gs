/*************************************************************
 * KASIRPRO - BACKEND GOOGLE APPS SCRIPT
 * ------------------------------------------------------------
 * Backend ini berfungsi sebagai REST API sederhana yang
 * menyimpan data ke Google Sheets (sebagai database) dan
 * bisa dipanggil dari frontend (index.html) yang di-hosting
 * di GitHub Pages atau ditanam (embed) di Blogger.
 *
 * CARA PASANG:
 * 1. Buat Google Spreadsheet baru, buka Extensions > Apps Script.
 * 2. Hapus isi default, tempel seluruh isi file ini.
 * 3. Jalankan fungsi setupSheets() sekali (Run > setupSheets)
 *    untuk membuat semua sheet & header otomatis. Izinkan akses
 *    saat diminta.
 * 4. Deploy > New deployment > pilih tipe "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 5. Salin URL Web App yang dihasilkan (.../exec), tempelkan
 *    di halaman Pengaturan aplikasi KasirPro (setApiUrl).
 * 6. Setiap request dari frontend akan doGet/doPost ke URL itu.
 *************************************************************/

const SHEET_PRODUCTS   = 'Produk';
const SHEET_TRANSAKSI  = 'Transaksi';
const SHEET_TRX_ITEMS  = 'TransaksiItem';
const SHEET_USERS      = 'Pengguna';
const SHEET_CUSTOMERS  = 'Pelanggan';
const SHEET_PROMOS     = 'Promo';
const SHEET_SETTINGS   = 'Pengaturan';

/** Jalankan sekali secara manual untuk membuat struktur sheet */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  createSheetIfMissing_(ss, SHEET_PRODUCTS,
    ['id','nama','kategori','harga','stok','icon']);

  createSheetIfMissing_(ss, SHEET_TRANSAKSI,
    ['id','tanggal','subtotal','diskon','pajak','total','metode','uangDiterima','kembalian','kasir']);

  createSheetIfMissing_(ss, SHEET_TRX_ITEMS,
    ['transaksiId','produkNama','qty','harga']);

  createSheetIfMissing_(ss, SHEET_USERS,
    ['id','nama','role','pin']);

  createSheetIfMissing_(ss, SHEET_CUSTOMERS,
    ['id','nama','noHp','totalTransaksi','totalBelanja']);

  createSheetIfMissing_(ss, SHEET_PROMOS,
    ['id','nama','tipe','nilai','aktif']);

  createSheetIfMissing_(ss, SHEET_SETTINGS,
    ['key','value']);

  // seed data awal jika sheet Produk masih kosong
  const prodSheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (prodSheet.getLastRow() <= 1) {
    const seed = [
      [1,'Ayam Geprek','Makanan',18000,42,'🍗'],
      [2,'Nasi Goreng','Makanan',15000,35,'🍛'],
      [3,'Es Teh Manis','Minuman',5000,80,'🥤'],
      [4,'Es Jeruk','Minuman',6000,60,'🧃'],
      [5,'Mie Goreng','Makanan',13000,28,'🍜'],
      [6,'Air Mineral','Minuman',4000,100,'💧'],
      [7,'Kopi Hitam','Minuman',6000,50,'☕'],
      [8,'Keripik Kentang','Snack',8000,24,'🍟']
    ];
    prodSheet.getRange(2,1,seed.length,seed[0].length).setValues(seed);
  }

  const userSheet = ss.getSheetByName(SHEET_USERS);
  if (userSheet.getLastRow() <= 1) {
    userSheet.getRange(2,1,3,4).setValues([
      [1,'Admin','admin','1234'],
      [2,'Kasir Satu','kasir','1111'],
      [3,'Supervisor','supervisor','2222']
    ]);
  }

  const setSheet = ss.getSheetByName(SHEET_SETTINGS);
  if (setSheet.getLastRow() <= 1) {
    setSheet.getRange(2,1,4,2).setValues([
      ['storeName','TOKO MAJU JAYA'],
      ['phone','021-1234567'],
      ['address','Jl. Merdeka No. 123, Jakarta'],
      ['tax','10']
    ]);
  }

  SpreadsheetApp.getUi().alert('Setup selesai! Semua sheet & data awal sudah dibuat.');
}

function createSheetIfMissing_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/* ============== ROUTER ============== */

function doGet(e) {
  try {
    const action = e.parameter.action || 'ping';
    let result;
    switch (action) {
      case 'ping':          result = {ok:true, message:'KasirPro API aktif'}; break;
      case 'getProducts':   result = getSheetAsObjects_(SHEET_PRODUCTS); break;
      case 'getCustomers':  result = getSheetAsObjects_(SHEET_CUSTOMERS); break;
      case 'getPromos':     result = getSheetAsObjects_(SHEET_PROMOS); break;
      case 'getUsers':      result = getSheetAsObjects_(SHEET_USERS).map(u=>({id:u.id,nama:u.nama,role:u.role})); break; // never expose PIN via GET
      case 'getSettings':   result = getSettingsObject_(); break;
      case 'getTransactions': result = getTransactionsWithItems_(); break;
      case 'getReport':     result = getReport_(e.parameter.period || 'harian'); break;
      default: result = {error:'Unknown action: '+action};
    }
    return jsonResponse_(result);
  } catch (err) {
    return jsonResponse_({error:String(err)});
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;
    let result;
    switch (action) {
      case 'login':           result = handleLogin_(body); break;
      case 'addProduct':      result = addProduct_(body); break;
      case 'updateStock':     result = updateStock_(body); break;
      case 'deleteProduct':   result = deleteRowById_(SHEET_PRODUCTS, body.id); break;
      case 'addCustomer':     result = addCustomer_(body); break;
      case 'deleteCustomer':  result = deleteRowById_(SHEET_CUSTOMERS, body.id); break;
      case 'addPromo':        result = addPromo_(body); break;
      case 'addUser':         result = addUser_(body); break;
      case 'changePin':       result = changePin_(body); break;
      case 'saveSettings':    result = saveSettings_(body); break;
      case 'createTransaction': result = createTransaction_(body); break;
      default: result = {error:'Unknown action: '+action};
    }
    return jsonResponse_(result);
  } catch (err) {
    return jsonResponse_({error:String(err)});
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============== HELPERS: SHEET <-> OBJECT ============== */

function getSheetAsObjects_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  return data.map(row => {
    const obj = {};
    headers.forEach((h,i) => obj[h] = row[i]);
    return obj;
  });
}

function appendRow_(sheetName, rowArray) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.appendRow(rowArray);
}

function deleteRowById_(sheetName, id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return {ok:true, deleted:id};
    }
  }
  return {ok:false, message:'ID tidak ditemukan'};
}

function nextId_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 1;
  const ids = sheet.getRange(2,1,lastRow-1,1).getValues().flat().map(Number);
  return Math.max(...ids, 0) + 1;
}

/* ============== BUSINESS LOGIC ============== */

function handleLogin_(body) {
  const users = getSheetAsObjects_(SHEET_USERS);
  const found = users.find(u => u.role === body.role && String(u.pin) === String(body.pin));
  if (!found) return {ok:false, message:'PIN atau role tidak sesuai'};
  return {ok:true, user:{id:found.id, nama:found.nama, role:found.role}};
}

function addProduct_(body) {
  const id = nextId_(SHEET_PRODUCTS);
  appendRow_(SHEET_PRODUCTS, [id, body.nama, body.kategori, body.harga, body.stok, body.icon || '🛍️']);
  return {ok:true, id:id};
}

function updateStock_(body) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRODUCTS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      const stokCol = 5; // index kolom 'stok' (0-based) => kolom E
      sheet.getRange(i+1, stokCol+1).setValue(body.newStock);
      return {ok:true};
    }
  }
  return {ok:false, message:'Produk tidak ditemukan'};
}

function addCustomer_(body) {
  const id = nextId_(SHEET_CUSTOMERS);
  appendRow_(SHEET_CUSTOMERS, [id, body.nama, body.noHp, 0, 0]);
  return {ok:true, id:id};
}

function addPromo_(body) {
  const id = nextId_(SHEET_PROMOS);
  appendRow_(SHEET_PROMOS, [id, body.nama, body.tipe, body.nilai, true]);
  return {ok:true, id:id};
}

function addUser_(body) {
  const id = nextId_(SHEET_USERS);
  appendRow_(SHEET_USERS, [id, body.nama, body.role, body.pin]);
  return {ok:true, id:id};
}

function changePin_(body) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.userId)) {
      sheet.getRange(i+1, 4).setValue(body.newPin); // kolom D = pin
      return {ok:true};
    }
  }
  return {ok:false, message:'Pengguna tidak ditemukan'};
}

function getSettingsObject_() {
  const rows = getSheetAsObjects_(SHEET_SETTINGS);
  const obj = {};
  rows.forEach(r => obj[r.key] = r.value);
  return obj;
}

function saveSettings_(body) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SETTINGS);
  const data = sheet.getDataRange().getValues();
  Object.keys(body).forEach(key => {
    if (key === 'action') return;
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i+1, 2).setValue(body[key]);
        found = true;
        break;
      }
    }
    if (!found) sheet.appendRow([key, body[key]]);
  });
  return {ok:true};
}

/**
 * Membuat transaksi baru:
 * body = {
 *   items: [{nama, qty, harga}],
 *   subtotal, diskon, pajak, total, metode, uangDiterima, kembalian, kasir
 * }
 * Otomatis: hitung ulang total di server (validasi), simpan header +
 * detail item, dan kurangi stok produk terkait.
 */
function createTransaction_(body) {
  const now = new Date();
  const id = 'TRX-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');

  // Validasi ulang perhitungan di server (jangan percaya total dari client)
  const subtotal = body.items.reduce((s, it) => s + (it.qty * it.harga), 0);
  const diskon = Number(body.diskon) || 0;
  const settings = getSettingsObject_();
  const taxPercent = Number(settings.tax) || 10;
  const taxable = Math.max(subtotal - diskon, 0);
  const pajak = Math.round(taxable * (taxPercent/100));
  const total = taxable + pajak;

  let kembalian = 0;
  if (body.metode === 'cash') {
    kembalian = Math.max((Number(body.uangDiterima)||0) - total, 0);
  }

  appendRow_(SHEET_TRANSAKSI, [
    id, now, subtotal, diskon, pajak, total, body.metode,
    body.metode === 'cash' ? (Number(body.uangDiterima)||0) : total,
    kembalian, body.kasir || 'Kasir'
  ]);

  body.items.forEach(it => {
    appendRow_(SHEET_TRX_ITEMS, [id, it.nama, it.qty, it.harga]);
    reduceStockByName_(it.nama, it.qty);
  });

  return {ok:true, id:id, subtotal, diskon, pajak, total, kembalian};
}

function reduceStockByName_(productName, qty) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRODUCTS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === productName) {
      const currentStock = Number(data[i][4]) || 0;
      sheet.getRange(i+1, 5).setValue(Math.max(currentStock - qty, 0));
      return;
    }
  }
}

function getTransactionsWithItems_() {
  const headers = getSheetAsObjects_(SHEET_TRANSAKSI);
  const items = getSheetAsObjects_(SHEET_TRX_ITEMS);
  return headers.map(h => {
    h.items = items.filter(it => it.transaksiId === h.id);
    return h;
  });
}

/**
 * period: 'harian' | 'bulanan' | 'tahunan'
 * Mengembalikan agregasi total penjualan, transaksi, item per periode.
 */
function getReport_(period) {
  const txs = getSheetAsObjects_(SHEET_TRANSAKSI);
  const items = getSheetAsObjects_(SHEET_TRX_ITEMS);
  const tz = Session.getScriptTimeZone();

  function keyFor(dateVal) {
    const d = new Date(dateVal);
    if (period === 'harian') return Utilities.formatDate(d, tz, 'yyyy-MM-dd');
    if (period === 'bulanan') return Utilities.formatDate(d, tz, 'yyyy-MM');
    return Utilities.formatDate(d, tz, 'yyyy');
  }

  const groups = {};
  txs.forEach(t => {
    const k = keyFor(t.tanggal);
    if (!groups[k]) groups[k] = {periode:k, transaksi:0, item:0, total:0};
    groups[k].transaksi += 1;
    groups[k].total += Number(t.total) || 0;
  });
  items.forEach(it => {
    const parentTx = txs.find(t => t.id === it.transaksiId);
    if (!parentTx) return;
    const k = keyFor(parentTx.tanggal);
    if (groups[k]) groups[k].item += Number(it.qty) || 0;
  });

  return Object.values(groups).sort((a,b) => a.periode.localeCompare(b.periode));
}
