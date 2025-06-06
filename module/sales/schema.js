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

    input SalesInput {
        idCliente: Int
        status: Int
    }

    type ClientStats {
        total_comprado: Float
        total_compras: Int
    }

    type Query {
        sales: Int
        getLastSaleByClient(idCliente: Int) : String
        getSalesByClient(input: SalesInput): [Sale]
        getClientStats(idCliente: Int): ClientStats
    }
    
`
export default salesSchema;
