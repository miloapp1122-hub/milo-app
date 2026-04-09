// ============================================================
// MILO - Servicio de integración con HGI ERP
// Empresa: 900405097 | Compañía: 1 | Empresa código: 113
// ============================================================

const HGI_CONFIG = {
  baseUrl: "https://900405097.hginet.com.co/Api",
  usuario: "98711025",
  clave: "C9871",
  cod_compania: "1",
  cod_empresa: "1",
  codigo_empresa: "113",
  transaccion: "09-098-091"
};

let _token = null;
let _tokenExpira = null;

// ------------------------------------------------------------
// 1. AUTENTICACIÓN - Obtener y cachear el token JWT
// ------------------------------------------------------------
async function autenticar() {
  if (_token && _tokenExpira && new Date() < _tokenExpira) {
    return _token;
  }
  const url = `${HGI_CONFIG.baseUrl}/Autenticar?usuario=${HGI_CONFIG.usuario}&clave=${HGI_CONFIG.clave}&cod_compania=${HGI_CONFIG.cod_compania}&cod_empresa=${HGI_CONFIG.cod_empresa}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.JwtToken) {
    _token = data.JwtToken;
    _tokenExpira = new Date(Date.now() + 55 * 60 * 1000); // 55 min
    return _token;
  }
  // Si el token ya está vigente, usar el existente
  if (data.Error?.Codigo === 3) {
    console.log("Token aún vigente en el servidor, re-usando...");
    return _token || "TOKEN_VIGENTE";
  }
  throw new Error("Error autenticando: " + data.Error?.Mensaje);
}

// ------------------------------------------------------------
// 2. HELPER - Fetch con token JWT
// ------------------------------------------------------------
async function hgiFetch(endpoint) {
  const token = await autenticar();
  const res = await fetch(`${HGI_CONFIG.baseUrl}${endpoint}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  if (!res.ok) throw new Error(`HGI error ${res.status}: ${endpoint}`);
  return res.json();
}

// ------------------------------------------------------------
// 3. CLIENTES - Buscar por NIT o listar todos
// ------------------------------------------------------------
async function buscarClientes({ nit = "0", vendedor = "*", estado = "*" } = {}) {
  const endpoint = `/Terceros/ObtenerLista?numero_identificacion=${nit}&codigo_auxiliar=*&codigo_estado=${estado}&tipo_tercero=*&codigo_ciudad=*&codigo_vendedor=${vendedor}`;
  return hgiFetch(endpoint);
}

// ------------------------------------------------------------
// 4. INVENTARIO - Listar productos / buscar por EAN (código de barras)
// ------------------------------------------------------------
async function buscarProductos({ codigo = "*", ean = "*", bodega = "*" } = {}) {
  const endpoint = `/Inventario/Obtener?codigo_producto=${codigo}&movil=*&eccomerce=*&codigo_bodega=${bodega}&codigo_lote=*&codigo_talla=*&codigo_color=*&sku=*&ean=${ean}`;
  return hgiFetch(endpoint);
}

async function buscarPorCodigoBarras(ean) {
  return buscarProductos({ ean });
}

// ------------------------------------------------------------
// 5. CREAR PEDIDO - Enviar orden al ERP HGI
// ------------------------------------------------------------
async function crearPedido({ cliente, vendedor, items, formaPago, fechaEntrega, observaciones, gps }) {
  const token = await autenticar();

  // Estructura del documento según transacción 09-098-091
  const documento = {
    cod_empresa: HGI_CONFIG.codigo_empresa,
    transaccion: HGI_CONFIG.transaccion,
    tercero: cliente.codigo,
    nit_tercero: cliente.nit,
    nombre_tercero: cliente.nombre,
    vendedor: vendedor.codigo,
    forma_pago: formaPago,
    fecha_entrega: fechaEntrega,
    observaciones: observaciones || "",
    latitud: gps?.lat || "",
    longitud: gps?.lng || "",
    detalles: items.map(item => ({
      codigo_producto: item.codigo,
      ean: item.ean || "",
      descripcion: item.nombre,
      cantidad: item.cantidad,
      precio: item.precio,
      descuento: item.descuento || 0,
      bodega: item.bodega || "001"
    }))
  };

  const res = await fetch(`${HGI_CONFIG.baseUrl}/Documentos/Crear`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(documento)
  });

  if (!res.ok) throw new Error(`Error creando pedido: ${res.status}`);
  return res.json();
}

// ------------------------------------------------------------
// 6. EXPORTAR para uso en Milo PWA
// ------------------------------------------------------------
if (typeof module !== "undefined") {
  module.exports = { autenticar, buscarClientes, buscarProductos, buscarPorCodigoBarras, crearPedido };
}

