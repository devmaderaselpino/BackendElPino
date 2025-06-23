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

    input ProductSale {
        idProducto: Int
        cantidad: Int
        precio: Float
    }

    input NewSale {
        total: Float
        usuario_reg: Int
        idCliente: Int
        fecha: String
        tipo: Int
        productos: [ProductSale]
        abono: Float
        municipio: Int
    }

    type Query {
        getSalesAmount(tipo: Int): [TotalSales]
        getLastSaleByClient(idCliente: Int) : String
        getSalesByClient(input: SalesInput): [Sale]
        getClientStats(idCliente: Int): ClientStats
        GetVentas: [Venta]
    }
    
    type Mutation {
        insertSale(input: NewSale) : String
    }
    
`
export default salesSchema;
