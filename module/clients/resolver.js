import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";
import mazatlanHora from "../../functions/MazatlanHora.js";

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
        getClientsPaginated: async (_,{input}) => {
  
            const { idMunicipio, idColonia, skip, limit, searchName } = input;

            let whereClauses = [];

            if (idMunicipio !== 0) {
                whereClauses.push(`c.municipio = ${idMunicipio}`);
            }

            if (idColonia !== 0) {
                whereClauses.push(`c.colonia = ${idColonia}`);
            }

            if (searchName && searchName.trim() !== "") {
                whereClauses.push(`CONCAT(c.nombre, ' ', c.apaterno, ' ', c.amaterno) LIKE ?`);
            }

            const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

            try {
                const params = [];
                const countParams = [];

                if (searchName && searchName.trim() !== "") {
                    const likeSearch = `%${searchName}%`;
                    params.push(likeSearch);
                    countParams.push(likeSearch);
                }

                const [[{ total }]] = await connection.query(
                    `
                        SELECT COUNT(*) as total
                            FROM clientes c
                            INNER JOIN municipios m ON c.municipio = m.idMunicipio
                            INNER JOIN colonias co ON c.colonia = co.idColonia
                            ${where}
                    `,
                    countParams
                );

                params.push(mazatlanHora());
                params.push(limit, skip);

                const [items] = await connection.query(
                    `
                        SELECT c.*, m.nombre AS municipio_n, co.nombre AS colonia_n,
                            IFNULL(SUM(sf.cantidad),0) AS saldo_favor
                            FROM clientes c
                            INNER JOIN municipios m ON c.municipio = m.idMunicipio
                            INNER JOIN colonias co ON c.colonia = co.idColonia
                            LEFT JOIN saldo_favor sf ON c.idCliente = sf.idCliente AND sf.vencimiento >= ? AND sf.status = 1
                            ${where}
                            GROUP BY c.idCliente
                            LIMIT ? OFFSET ?
                    `,
                    params
                );

                return { total, items };
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener los clientes.", {
                    extensions: {
                        code: "BAD_REQUEST",
                        http: {
                            status: 400
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
            
            try {
                const [clients] = await connection.query(
                    `   
                        SELECT c.*, m.nombre AS municipio_n, co.nombre AS colonia_n, IFNULL(doc.url, "") AS url 
                            FROM clientes c
                            INNER JOIN municipios m ON c.municipio = m.idMunicipio
                            INNER JOIN colonias co ON c.colonia = co.idColonia
                            LEFT JOIN documentos doc ON c.idCliente = doc.idCliente
                            WHERE c.idCliente = ? ORDER BY doc.id DESC LIMIT 1
                    `, [idCliente]
                );

                console.log(clients[0]);
                

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
    Mutation: {
        insertClient: async(_,{ input }) => {
            try {
                
                const { nombre, aPaterno, aMaterno, municipio, colonia, calle, numero_ext, celular, distinguido, img_domicilio, descripcion } = input;

                const [clients] = await connection.query(
                    `   
                        SELECT c.*, m.nombre AS municipio_n, co.nombre AS colonia_n 
                            FROM clientes c
                            INNER JOIN municipios m ON c.municipio = m.idMunicipio
                            INNER JOIN colonias co ON c.colonia = co.idColonia 
                            WHERE c.nombre LIKE '%${nombre}%' AND c.aPaterno LIKE '%${aPaterno}%' AND c.aMaterno LIKE '%${aMaterno}%'
                    `
                );

                if(clients.length > 0){
                    console.log("Se encontraron coincidencias!");
                    
                    return clients;
                }

                const idCliente = await connection.execute(
                    `
                       INSERT INTO clientes SET nombre = ?, aPaterno = ?, aMaterno = ?, municipio = ?, colonia = ?, calle = ?, numero_ext = ?, celular = ?, distinguido = ?, img_domicilio = ?, descripcion = ?; 
                    `,[nombre.toUpperCase(), aPaterno.toUpperCase(), aMaterno.toUpperCase(), municipio, colonia, calle.toUpperCase(), numero_ext, celular, distinguido, img_domicilio, descripcion.toUpperCase()]
                );

                return [ {
                    idCliente: idCliente[0].insertId, 
                    nombre,
                    aPaterno,
                    aMaterno,
                    municipio,
                    municipio_n: 'nombre',
                    colonia,
                    colonia_n: "colonia_nombre",
                    calle,
                    numero_ext,
                    celular,
                    distinguido,
                    img_domicilio,
                    descripcion
                } ]
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error insertando cliente.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
            }
        },
        insertValidatedClient: async(_,{ input }) => {
            console.log(input);
            
            try {
                
                const { nombre, aPaterno, aMaterno, municipio, colonia, calle, numero_ext, celular, distinguido, img_domicilio, descripcion } = input;

                const cliente = await connection.execute(
                    `
                       INSERT INTO clientes SET nombre = ?, aPaterno = ?, aMaterno = ?, municipio = ?, colonia = ?, calle = ?, numero_ext = ?, celular = ?, distinguido = ?, img_domicilio = ?, descripcion = ?; 
                    `,[nombre.toUpperCase(), aPaterno.toUpperCase(), aMaterno.toUpperCase(), municipio, colonia, calle.toUpperCase(), numero_ext, celular, distinguido, img_domicilio, descripcion.toUpperCase()]
                );

                return "Cliente insertado";
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error insertando cliente.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
            }
        },
        updateClient: async(_,{ input }) => {
            console.log(input);
            
            try {
                
                const { idCliente, nombre, aPaterno, aMaterno, municipio, colonia, calle, numero_ext, celular, distinguido, img_domicilio, descripcion } = input;

                const cliente = await connection.execute(
                    `
                       UPDATE clientes SET nombre = ?, aPaterno = ?, aMaterno = ?, municipio = ?, colonia = ?, calle = ?, numero_ext = ?, celular = ?, distinguido = ?, img_domicilio = ?, descripcion = ? WHERE idCliente = ?; 
                    `,[nombre.toUpperCase(), aPaterno.toUpperCase(), aMaterno.toUpperCase(), municipio, colonia, calle.toUpperCase(), numero_ext, celular, distinguido, img_domicilio, descripcion.toUpperCase(), idCliente]
                );

                return "Cliente actualizado";
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error insertando cliente.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
            }
        },
    }
    
};

export default clientResolver;
