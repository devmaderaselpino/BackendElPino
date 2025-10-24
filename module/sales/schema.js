const salesSchema = `#graphql

    type SaleDetail {
        id: Int
        idProducto: Int
        descripcion: String
        cantidad: Int
        precio: Float
        img_producto: String
    }

    type Sale {
        idVenta: Int
        total: Float
        subtotal: Float
        interes: Float
        fecha: String
        usuario_reg: Int
        idCliente: Int
        status: Int
        tipo: Int
        getProducts: [SaleDetail]
        getCancelados: [SaleDetail]
    }

    type Venta{
        fecha: String!
        numVenta: Int
        idcliente: Int
        articulos: String!
        cliente: String!
        total: Float!
        tipo: String!
        status:String!
        cantidad_cancelada: Float!
    }

    input SalesInput {
        idCliente: Int
        status: Int
    }

    type ClientStats {
        total_comprado: Float
        total_compras: Int
    }

    type TotalSales {
        month: String
        amount: Float
        color: String
    }

    type SaleTotals {
        nombre: String
        abono: Float
        pendiente: Float
        atrasado: Float
        interes: Float
        total: Float
    }

    type InfoPorcentaje {
        nombre: String
        porcentaje_abonado: Float
        abonos_total: Float
    }

    type VentaDescarga {
        idVenta: Int
        fecha: String
        idCliente: String
        total: Float
        tipo: Int
    }

    type DetalleVenta {
        id: Int
        idVenta: Int
        cantidad: Int
        descripcion: String
        img_producto: String
        precio: Float
    }

    type InfoEnganche {
        enganche: Float
        nombre: String
        celular: String
    }

    input ProductSale {
        idProducto: Int
        cantidad: Int
        precio: Float
    }

    input NewSale {
        total: Float
        idCliente: Int
        tipo: Int
        productos: [ProductSale]
        abono: Float
        municipio: Int
    }

    input Editar {
        precio: Float
        cantidad: Int
        idVenta: Int
        idProducto: Int
    }

    input EditSale {
        idVenta: Int
        productos: [Editar]
        totalCancelado: Float
        historial: [Editar]
        opcion: Int
        saldo: Float
    }

    type Query {
        getSalesAmount(tipo: Int): [TotalSales]
        getLastSaleByClient(idCliente: Int) : String
        getSalesByClient(input: SalesInput): [Sale]
        getSaleByClient(idVenta: Int): Sale
        getEngancheByVenta(idVenta: Int) : InfoEnganche
        getClientStats(idCliente: Int): ClientStats
        GetVentas: [Venta]
        getTotalsBySale(idVenta: Int): SaleTotals
        getPorcentajePagado(idVenta: Int): InfoPorcentaje
        getVentasByCobrador: [VentaDescarga]
        getDetallesVentaByCobrador: [DetalleVenta]
    }
    
    type Mutation {
        insertSale(input: NewSale) : Int
        editSale(input: EditSale) : String
    }
    
`
export default salesSchema;
