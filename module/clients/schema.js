const clientsSchema = `#graphql

    type Client {
        idCliente: Int 
        nombre: String
        aPaterno: String
        aMaterno: String
        municipio: Int
        municipio_n: String
        colonia: Int
        colonia_n: String
        calle: String
        numero_ext: String
        celular: String
        distinguido: Int
        img_domicilio: String
        descripcion: String
    }

    input ClientsInput {
        idMunicipio: Int
        idColonia: Int
    }

    type Query {
        getClientsByCollector: [Client]
        getClients(input:ClientsInput): [Client]
        getClient(idCliente:Int): Client
    }
    
`
export default clientsSchema