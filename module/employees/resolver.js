import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";

const employeesResolver = {
    Query : {
        getEmployeesPaginated: async (_,{ input }) => {

            const { skip, limit, searchName } = input;

            let whereClauses = [];

            if (searchName && searchName.trim() !== "") {
                whereClauses.push(`CONCAT(nombre, ' ', apaterno, ' ', amaterno) LIKE ?`);
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
                        SELECT COUNT(*) AS total FROM usuarios
                        ${where}
                    `, countParams
                );

                params.push(limit, skip);

                const [items] = await connection.query(
                    `
                        SELECT idUsuario, nombre, aPaterno, aMaterno, tipo, status
                            FROM usuarios
                            ${where}
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
        // getEmployeesPaginated: async (_, { skip = 0, limit = 10 }) => {

        //     try {
        //         const [[{ total }]] = await connection.query('SELECT COUNT(*) AS total FROM usuarios');
        //         const [items] = await connection.query(
        //             `
        //                 SELECT usr.idUsuario, usr.nombre, usr.aPaterno, usr.aMaterno, usr.tipo, usr.status
        //                     FROM usuarios usr
        //                     LIMIT ? OFFSET ?
        //         `, [limit, skip]);

        //         return { total, items };
        //     } catch (error) {
        //         console.log(error);
        //         throw new GraphQLError("Error al obtener la colonia.",{
        //             extensions:{
        //                 code: "BAD_REQUEST",
        //                 http: {
        //                     "status" : 400
        //                 }
        //             }
        //         });
        //     }
            
        // },
        getEmployee: async (_, { idUsuario } ) => {

            try {
                const [empleado] = await connection.query(
                    `
                        SELECT usr.*,
                            mun.nombre AS municipio_n, col.nombre AS colonia_n
                            FROM usuarios usr
                            INNER JOIN municipios mun ON usr.municipio = mun.idMunicipio
                            INNER JOIN colonias col ON usr.colonia = col.idColonia WHERE usr.idUsuario = ?
                `, [idUsuario]);

                return empleado[0];
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener el empleado.",{
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

        insertEmployee: async(_,{ input }) => {

            try {
                
                const { nombre, aPaterno, aMaterno, municipio, colonia, calle, numero_ext, celular, tipo, usuario, password } = input;

                const empleado = await connection.execute(
                    `
                       INSERT INTO usuarios SET nombre = ?, aPaterno = ?, aMaterno = ?, municipio = ?, colonia = ?, calle = ?, numero_ext = ?, celular = ?, tipo = ?, usuario = ?, password = ?; 
                    `, [nombre, aPaterno, aMaterno, municipio, colonia, calle, numero_ext, celular, tipo, usuario, password]
                );

                return "Empleado insertado";
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error insertando empleado.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
            }
        },
        editEmployee: async(_,{ input }) => {

            try {
                
                const {idUsuario, nombre, aPaterno, aMaterno, municipio, colonia, calle, numero_ext, celular, tipo, usuario, password } = input;

                const empleado = await connection.execute(
                    `
                       UPDATE usuarios SET nombre = ?, aPaterno = ?, aMaterno = ?, municipio = ?, colonia = ?, calle = ?, numero_ext = ?, celular = ?, tipo = ?, usuario = ?, password = ? WHERE idUsuario = ?; 
                    `, [nombre, aPaterno, aMaterno, municipio, colonia, calle, numero_ext, celular, tipo, usuario, password, idUsuario]
                );

                return "Empleado actualizado";
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error actualizando empleado.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
            }
        },
        deleteEmployee: async(_,{ idUsuario }) => {
            
            try {
                
                const empleado = await connection.execute(
                    `
                       UPDATE usuarios SET status = 0 WHERE idUsuario = ?; 
                    `,[idUsuario]
                );

                return "Empleado eliminado";
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error eliminando empleado.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
            }
        },
        activateEmployee: async(_,{ idUsuario }) => {
            
            try {
                
                const empleado = await connection.execute(
                    `
                       UPDATE usuarios SET status = 1 WHERE idUsuario = ?; 
                    `,[idUsuario]
                );

                return "Empleado activado";
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error activando empleado.",{
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

export default employeesResolver;
