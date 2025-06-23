import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";

const routedResolver = {
    Query: {
        getCobradores: async () => {
            try {
                const [Cobradores] = await connection.query(`
                    SELECT idUsuario, nombre FROM usuarios WHERE tipo = 3;
                `);
                return Cobradores;
            } catch (error) {
                console.error(error);
                throw new GraphQLError("Error al obtener el Cobrador.", {
                    extensions: { code: "BAD_REQUEST", http: { status: 400 } },
                });
            }
        },

        getClientesSinAsignar: async () => {
            try {
                const [ClientesSinCobrador] = await connection.query(`
                    SELECT 
                    DISTINCT c.idCliente,
                    CONCAT(c.nombre, ' ', c.aPaterno, ' ', c.aMaterno) AS nombreCliente,
                    CONCAT(' ', col.nombre, ' calle ', c.calle, ' num: ', c.numero_ext) AS direccion,
                    m.nombre AS municipio
                    FROM clientes c
                    JOIN ventas v ON v.idCliente = c.idCliente AND v.status = 1
                    JOIN municipios m ON c.municipio = m.idMunicipio
                    JOIN colonias col ON col.idColonia = c.colonia
                    WHERE NOT EXISTS (
                    SELECT 1 FROM asignacion_rutas ar WHERE ar.idCliente = c.idCliente
                    );
                `);
                return ClientesSinCobrador;
            } catch (error) {
                console.error(error);
                throw new GraphQLError("Error al obtener clientes sin cobrador.", {
                    extensions: { code: "BAD_REQUEST", http: { status: 400 } },
                });
            }
        },

        getRutas: async (_, { idCobrador }) => {
            
            try {
                const [rows] = await connection.query(`
                SELECT 
                    u.idUsuario AS idCobrador,
                    u.nombre AS nombreCobrador,
                    c.idCliente,
                    CONCAT(c.nombre, ' ', c.aPaterno, ' ', c.aMaterno) AS nombreCliente,
                    CONCAT('colonia: ', col.nombre, ' calle: ', c.calle, ' num: ', c.numero_ext) AS direccion,
                    m.nombre AS municipio
                    FROM asignacion_rutas ar
                    JOIN usuarios u ON ar.idCobrador = u.idUsuario
                    JOIN clientes c ON ar.idCliente = c.idCliente
                    JOIN ventas v ON v.idCliente = c.idCliente AND v.status = 1
                    JOIN colonias col ON col.idColonia = c.colonia
                    JOIN municipios m ON c.municipio = m.idMunicipio
                    WHERE u.tipo = 3 AND ar.idCobrador = ?
                    ORDER BY c.nombre
                    `, [idCobrador]);

                if (rows.length === 0) return [];

                    const route = {
                        idRuta: rows[0].idCobrador,
                        name: `Ruta de ${rows[0].nombreCobrador}`,
                        description: `Clientes asignados `,
                        color: "#3b82f6",
                        clientes: rows.map(row => ({
                            idCliente: row.idCliente,
                            nombreCliente: row.nombreCliente,
                            direccion: row.direccion,
                            municipio: row.municipio,
                        })),
                    };

                return [route];
            } catch (error) {
                console.error(error);
                throw new GraphQLError("Error al obtener las rutas.", {
                    extensions: { code: "BAD_REQUEST", http: { status: 400 } },
                });
            }
        }
    },

    Mutation: {
        asignarClienteARuta: async (_, { input }) => {
            const { idCobrador, idCliente } = input;
            
            try {
                const [result] = await connection.query(
                    `INSERT INTO asignacion_rutas (idCobrador, idCliente)
                        SELECT ?, c.idCliente
                        FROM clientes c
                        JOIN ventas v ON v.idCliente = c.idCliente AND v.status = 1
                        WHERE c.idCliente = ?;`,
                    [idCobrador, idCliente]
                );
                return result.affectedRows > 0;
            } catch (error) {
                console.error(error);
                throw new GraphQLError("Error al asignar cliente a un cobrador. con venta activa", {
                    extensions: { code: "BAD_REQUEST", http: { status: 400 } },
                });
            }
        },
        eliminarClienteDeRuta: async (_, { input }) => {
            const { idCliente } = input;
            try {
                const [result] = await connection.query(
                `DELETE ar
                    FROM asignacion_rutas ar
                    JOIN clientes c ON ar.idCliente = c.idCliente
                    JOIN ventas v ON v.idCliente = c.idCliente AND v.status = 1
                    WHERE ar.idCliente = ?;`,
                [idCliente]
                );
                return true;
            } catch (error) {
                console.error(error);
                throw new GraphQLError("Error al eliminar la asignación.", {
                    extensions: { code: "BAD_REQUEST", http: { status: 400 } },
                });
            }
        },
    },
};

export default routedResolver;
