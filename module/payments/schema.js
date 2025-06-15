const paymentSchema = `#graphql

    type TotalPayments {
        month: String
        amount: Float
        color: String
    }

    type Query {
        getPayments(tipo: Int): [TotalPayments]
    }
    
    
`
export default paymentSchema;
