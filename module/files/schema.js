const filesSchema = `#graphql
    type ArchivoCliente {
        id: Int!
        idCliente: Int!
        archivo: String!
    }

    type Mutation {
        saveArchivoCliente(idCliente: Int!, archivo: String!): ArchivoCliente!
        updateArchivoCliente(idCliente: Int!, archivo: String!): ArchivoCliente!
    }
`;
export default filesSchema;
