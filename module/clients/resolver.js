import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";

const clientResolver = {
    Query : {
        getClients: async (_,{input}) => {
            
            const {idMunicipio, idColonia} = input;

            let where = "";
            let and = "";
            if((idMunicipio !== 0) || (idColonia !== 0)){
                where = "WHERE";
            }

            if((idMunicipio !== 0) && (idColonia !== 0)){
                and = "AND";
            }
            
            let queryMunicipio = "";
            if(idMunicipio !== 0){
                queryMunicipio = `municipio = ${idMunicipio}`
            }

            let queryColonia = "";
            if(idColonia !== 0){
                queryColonia = `colonia = ${idColonia}`
            }

            try {
               const [clients] = await connection.query(
                    `   
                        SELECT c.*, m.nombre AS municipio_n, co.nombre AS colonia_n 
                            FROM clientes c
                            INNER JOIN municipios m ON c.municipio = m.idMunicipio
                            INNER JOIN colonias co ON c.colonia = co.idColonia
                            ${where} ${queryMunicipio} ${and} ${queryColonia}
                    `,
                );
                
                return clients;
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener los clientes.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        getClientsByCollector: async (_,{}) => {
            try {
               const [clients] = await connection.query(
                    `   
                        SELECT c.*, m.nombre AS municipio_n, co.nombre AS colonia_n
                            FROM asignacion_rutas ar  
                            INNER JOIN clientes c ON ar.idCliente = c.idCliente
                            INNER JOIN municipios m ON c.municipio = m.idMunicipio
                            INNER JOIN colonias co ON c.colonia = co.idColonia
                            WHERE ar.idCobrador = 2 ORDER BY ar.orden ASC
                    `,
                );
                
                return clients;
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener los clientes.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        getClient: async (_,{idCliente}) => {
            console.log(idCliente);
            
            try {
                const [clients] = await connection.query(
                    `   
                        SELECT c.*, m.nombre AS municipio_n, co.nombre AS colonia_n 
                            FROM clientes c
                            INNER JOIN municipios m ON c.municipio = m.idMunicipio
                            INNER JOIN colonias co ON c.colonia = co.idColonia
                            WHERE c.idCliente = ?
                    `, [idCliente]
                );
                
                return clients[0];
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener los clientes.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
    },
    
};

export default clientResolver;
