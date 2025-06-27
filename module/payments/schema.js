const paymentSchema = `#graphql

    type TotalPayments {
        month: String
        amount: Float
        color: String
    }

    type Abono {
        fecha: String!
        cliente: String!
        abono: Float!
        tipo_abono: String!
        cobrador: String!
    }

    type TablaPago {
        idAbonoProgramado:Int
        num_pago: Int 
        cantidad: Float
        abono: Float
        fecha_programada: String 
        fecha_liquido: String
        pagado: Int
    }

    type AbonoCobrador {
        id: Int
        abono: Float
        fecha_reg: String
        nombre_cliente: String
    }

    type Query {
        getPayments(tipo: Int): [TotalPayments]
        GetAbonos: [Abono]
        getPaymentsBySale(idVenta: Int): [TablaPago]
        getPaymentsByCobrador: [AbonoCobrador]
    }

    type Mutation {
        insertPayment(abono: Float, idVenta: Int): String
    }
    
    
`
export default paymentSchema;
