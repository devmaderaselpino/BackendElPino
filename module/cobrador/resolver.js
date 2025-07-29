const cobradorSchema = `#graphql

    type Cobrador {
        idUsuario: Int
        nombre_usuario: String
        apellidos: String
        celular: String
        direccion: String
    }

    type Cobranza {
        semana_actual: Float
        semana_anterior: Float
        meta_cobranza: Float
    }

    type Query {
        getInfoCobrador: Cobrador
        getCobranza: Cobranza
        getAbonosRango(fechaInicial: String, fechaFinal: String): Float
    }
    
`
export default cobradorSchema;
