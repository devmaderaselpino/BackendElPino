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
        fecha_reg: String
        status: Int
    }

    input ClientsInput {
        idMunicipio: Int
        idColonia: Int
    }

    input ClientInput {
        idCliente: Int
        nombre: String
        aPaterno: String
        aMaterno: String
        municipio: Int
        colonia: Int
        calle: String
        numero_ext: String
        celular: String
        distinguido: Int
        img_domicilio: String
        descripcion: String
    }

    type Query {
        getClientsByCollector: [Client]
        getClients(input:ClientsInput): [Client]
        getClient(idCliente:Int): Client
    }
    
    type Mutation {
        insertClient(input: ClientInput): [Client]
        insertValidatedClient(input: ClientInput): String
        updateClient(input: ClientInput): String
    }
    
`
export default clientsSchema