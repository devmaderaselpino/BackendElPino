import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";

const cobradorResolver = {
    Query : {
        getInfoCobrador: async (_,{}, ctx) => {

            try {

                const [info] = await connection.query(
                    `
                        SELECT usr.idUsuario, usr.nombre AS nombre_usuario, CONCAT(usr.aPaterno, " ", usr.aMaterno) AS apellidos, usr.celular,
                            CONCAT(mun.nombre, ", ", col.nombre, ", ", usr.calle, " #", numero_ext) AS direccion
                            FROM usuarios usr
                            INNER JOIN municipios mun ON usr.municipio = mun.idMunicipio
                            INNER JOIN colonias col ON usr.colonia = col.idColonia
                            WHERE usr.idUsuario = ?
                    `,
                    [ctx.usuario.idUsuario]
                );

                return info[0];
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener info del usuario.", {
                    extensions: {
                        code: "BAD_REQUEST",
                        http: {
                            status: 400
                        }
                    }
                });
            }
        },
        getCobranza: async (_,{}, ctx) => {
            try {

                const [cobranza] = await connection.query(
                    `
                       SELECT
                            SUM(CASE 
                                WHEN YEARWEEK(fecha_reg, 1) = YEARWEEK(CURDATE(), 1) 
                                THEN abono 
                                ELSE 0 
                            END) AS semana_actual,
                            SUM(CASE 
                                WHEN YEARWEEK(fecha_reg, 1) = YEARWEEK(CURDATE() - INTERVAL 1 WEEK, 1) 
                                THEN abono 
                                ELSE 0 
                            END) AS semana_anterior,
                            3500.00 AS meta_cobranza
                            FROM abonos
                            WHERE usuario_reg = ?
                            AND tipo = 1 AND status = 1;
                    `,
                    [ctx.usuario.idUsuario]
                );

                const [cobranza_ofi]  = await connection.query(
                    `
                        SELECT 
                            SUM(CASE 
                                WHEN YEARWEEK(a.fecha_reg, 1) = YEARWEEK(CURDATE(), 1) 
                                THEN a.abono 
                                ELSE 0 
                                END) AS semana_actual,
                            SUM(CASE 
                                WHEN YEARWEEK(a.fecha_reg, 1) = YEARWEEK(CURDATE() - INTERVAL 1 WEEK, 1) 
                                THEN a.abono 
                                ELSE 0 
                                END) AS semana_anterior
                            FROM asignacion_rutas ar 
                            INNER JOIN ventas v ON ar.idCliente = v.idCliente AND v.status = 1
                            INNER JOIN abonos a ON v.idVenta = a.idVenta AND a.status = 1 AND a.usuario_reg <> ? AND a.tipo = 1
                            WHERE ar.idCobrador = ? AND ar.status = 1
                    `,
                    [ctx.usuario.idUsuario, ctx.usuario.idUsuario]
                );

                const result = {
                    semana_actual: cobranza[0].semana_actual + cobranza_ofi[0].semana_actual,
                    semana_anterior: cobranza[0].semana_anterior + cobranza_ofi[0].semana_anterior,
                    meta_cobranza: cobranza[0].meta_cobranza
                }

                return result;
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener cobranza del usuario.", {
                    extensions: {
                        code: "BAD_REQUEST",
                        http: {
                            status: 400
                        }
                    }
                });
            }
        },
        getAbonosRango: async (_,{fechaInicial, fechaFinal}, ctx) => {
            
            try {

                const [cobranza] = await connection.query(
                    `
                       SELECT SUM(abono) AS total_cobrado
                            FROM abonos 
                            WHERE usuario_reg = ? AND tipo = 1 AND STATUS = 1 AND fecha_reg BETWEEN ? AND ?;
                    `,
                    [ctx.usuario.idUsuario, fechaInicial, fechaFinal]
                );

                return cobranza[0].total_cobrado;
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener cobranza del usuario.", {
                    extensions: {
                        code: "BAD_REQUEST",
                        http: {
                            status: 400
                        }
                    }
                });
            }
        },
        getAbonosRangoCobrador: async (_, { idCobrador, fechaInicial, fechaFinal }, ctx) => {
            try {
                const [rows] = await connection.query(
                    `
                    SELECT COALESCE(SUM(abono), 0) AS total_cobrado
                    FROM abonos
                    WHERE usuario_reg = ?
                    AND tipo = 1
                    AND status = 1
                    AND fecha_reg BETWEEN ? AND ?
                    `,
                    [idCobrador, fechaInicial, fechaFinal]
                );
                return Number(rows?.[0]?.total_cobrado || 0);
            } catch (error) {
                console.error(error);
                throw new GraphQLError("Error al obtener cobranza del usuario.", {
                    extensions: { code: "BAD_REQUEST", http: { status: 400 } }
                });
            }
        }
    },
};

export default cobradorResolver;
