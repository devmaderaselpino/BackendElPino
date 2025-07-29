const salesSchema = `#graphql

    type SaleDetail {
        id: Int
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
    }

    type Venta{
        fecha: String!
        articulos: String!
        cliente: String!
        total: Float!
        tipo: String!
        status:String!
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

    input EditSale {
        precio: Float
        cantidad: Int
        idVenta: Int
        idProducto: Int
    }

    type Query {
        getSalesAmount(tipo: Int): [TotalSales]
        getLastSaleByClient(idCliente: Int) : String
        getSalesByClient(input: SalesInput): [Sale]
        getSaleByClient(idVenta: Int): Sale
        getClientStats(idCliente: Int): ClientStats
        GetVentas: [Venta]
        getTotalsBySale(idVenta: Int): SaleTotals
    }
    
    type Mutation {
        insertSale(input: NewSale) : String
        editSale(input: EditSale) : String
    }
    
`
export default salesSchema;
