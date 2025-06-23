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

    type Query {
        getPayments(tipo: Int): [TotalPayments]
        GetAbonos: [Abono]
    }
    
    
`
export default paymentSchema;
