import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";

const locationResolver = {
    Query : {
        getColonias: async (_,{filter}) => {
            let query = "";
            if(filter !== 0){
                query = `AND idMunicipio = ${filter}`
            }

            try {
               const [colonias] = await connection.query(
                    `   
                        SELECT *
                        FROM (
                            SELECT 0 AS idColonia, 'Todas las colonias' AS nombre, 0 AS orden
                            UNION
                            SELECT idColonia, nombre, 1 AS orden
                            FROM colonias
                            WHERE status = 1 ${query}
                            ORDER BY nombre ASC
                        ) AS t
                        ORDER BY orden, nombre;
                    `,
                );
                
                return colonias;
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener las colonias.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        getColoniasList: async (_,{}) => {
            
            try {
               const [colonias] = await connection.query(
                    `   
                        SELECT c.idColonia, c.nombre, m.nombre AS nombreMunicipio, c.STATUS 
                            FROM colonias c
                            INNER JOIN municipios m ON c.idMunicipio = m.idMunicipio;
                    `,
                );
                
                return colonias;
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener las colonias.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        getMunicipiosPaginated: async (_,{ input }) => {

            const { skip, limit, searchName } = input;

            let whereClauses = [];

            if (searchName && searchName.trim() !== "") {
                whereClauses.push(`nombre LIKE ?`);
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
                        SELECT COUNT(*) AS total FROM municipios
                        ${where}
                    `, countParams
                );

                params.push(limit, skip);

                const [items] = await connection.query(
                    `
                        SELECT idMunicipio, nombre, status FROM municipios
                            ${where}
                            ORDER BY nombre ASC
                            LIMIT ? OFFSET ?
                    `,
                    params
                );

                return { total, items };
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener los municipios.", {
                    extensions: {
                        code: "BAD_REQUEST",
                        http: {
                            status: 400
                        }
                    }
                });
            }
        },
        getColoniasPaginated: async (_,{ input }) => {

            const { skip, limit, searchName } = input;

            let whereClauses = [];

            if (searchName && searchName.trim() !== "") {
                whereClauses.push(`c.nombre LIKE ?`);
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
                        SELECT COUNT(*) AS total FROM colonias c
                        ${where}
                    `, countParams
                );

                params.push(limit, skip);

                const [items] = await connection.query(
                    `
                        SELECT c.idColonia, c.nombre, m.nombre AS nombreMunicipio, c.status
                            FROM colonias c
                            INNER JOIN municipios m ON c.idMunicipio = m.idMunicipio
                            ${where}
                            ORDER BY c.nombre ASC
                            LIMIT ? OFFSET ?
                    `,
                    params
                );

                return { total, items };
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener las colonias.", {
                    extensions: {
                        code: "BAD_REQUEST",
                        http: {
                            status: 400
                        }
                    }
                });
            }
        },
        getColonia: async (_,{idColonia}) => {
           
            try {
               const [colonias] = await connection.query(
                    `   
                        SELECT idColonia, nombre, idMunicipio, cp FROM colonias WHERE idColonia = ?;
                    `, [idColonia]
                );
                
                return colonias[0];
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener la colonia.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        getMunicipios: async (_,{}) => {
            
            try {
               const [municipios] = await connection.query(
                    `   SELECT *
                            FROM (SELECT 0 AS idMunicipio, "Todos los municipios" AS nombre, 0 AS orden
                            UNION
                            SELECT idMunicipio, nombre, 1 AS orden FROM municipios WHERE STATUS = 1 ORDER BY nombre ASC ) AS t
                            ORDER BY orden, nombre;
                    `,
                );
                
                return municipios;
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener los municipios.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        getMunicipiosList: async (_,{}) => {
            
            try {
               const [municipios] = await connection.query(
                    `   
                        SELECT idMunicipio, nombre, status FROM municipios;
                    `,
                );
                
                return municipios;
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener los municipios.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        getMunicipio: async (_,{idMunicipio}) => {
            
            try {
               const [municipios] = await connection.query(
                    `   
                        SELECT * FROM municipios WHERE idMunicipio = ?;
                    `, [idMunicipio]
                );
                
                return municipios[0];
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener el municipio.",{
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
    Mutation : {
        insertCity: async(_,{ nombre }) => {
            
            try {
                
                const municipio = await connection.execute(
                    `
                       INSERT INTO municipios SET nombre = ?; 
                    `,[nombre]
                );

                return "Municipio insertado";
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error insertando municipio.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
            }
        },
        insertDistrict: async(_,{ input }) => {

            const {idMunicipio, nombre, cp} = input;
            
            try {
                
                const colonia = await connection.execute(
                    `
                       INSERT INTO colonias SET idMunicipio = ?, nombre = ?, cp = ?; 
                    `,[idMunicipio, nombre, cp]
                );

                return "Colonia insertada";
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error insertando colonia.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
            }
        },
        updateCity: async(_,{ input }) => {
            
            try {
                
                const { idMunicipio, nombre} = input;

                const municipio = await connection.execute(
                    `
                       UPDATE municipios SET nombre = ? WHERE idMunicipio = ?; 
                    `,[nombre, idMunicipio]
                );

                return "Municipio actualizado";
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error actualizando municipio.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
            }
        },
        updateDistrict: async(_,{ input }) => {
            
            try {
                
                const { idColonia, nombre, idMunicipio, cp} = input;

                const colonia = await connection.execute(
                    `
                       UPDATE colonias SET nombre = ?, idMunicipio = ?, cp = ? WHERE idColonia = ?; 
                    `, [nombre, idMunicipio, cp, idColonia]
                );

                return "Colonia actualizada";
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error actualizando colonia.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
            }
        },
        deleteCity: async(_,{ idMunicipio }) => {
            
            try {
                
                const municipio = await connection.execute(
                    `
                       UPDATE municipios SET status = 0 WHERE idMunicipio = ?; 
                    `,[idMunicipio]
                );

                return "Municipio eliminado";
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error eliminando municipio.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
            }
        },
        activateCity: async(_,{ idMunicipio }) => {
            
            try {
                
                const municipio = await connection.execute(
                    `
                       UPDATE municipios SET status = 1 WHERE idMunicipio = ?; 
                    `,[idMunicipio]
                );

                return "Municipio activado";
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error eliminando municipio.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
            }
        },
        deleteDistrict: async(_,{ idColonia }) => {
            
            try {
                
                const colonia = await connection.execute(
                    `
                       UPDATE colonias SET status = 0 WHERE idColonia = ?; 
                    `,[idColonia]
                );

                return "Colonia eliminada";
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error eliminando colonia.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
            }
        },
        activateDistrict: async(_,{ idColonia }) => {
            
            try {
                
                const colonia = await connection.execute(
                    `
                       UPDATE colonias SET status = 1 WHERE idColonia = ?; 
                    `,[idColonia]
                );

                return "Colonia activada";
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error eliminando colonia.",{
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

export default locationResolver;
