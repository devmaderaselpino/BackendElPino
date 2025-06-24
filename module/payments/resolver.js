import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";

const paymentResolver = {
    Query : {
        getPayments: async (_,{ tipo }) => {
            try {
                
                const [currentPayments] = await connection.query(
                    `   
                        SELECT IFNULL(SUM(abono),0) total FROM abonos
                            INNER JOIN ventas ON abonos.idVenta = ventas.idVenta
                            INNER JOIN clientes ON ventas.idCliente = clientes.idCliente AND clientes.municipio = ?
                            WHERE MONTH(abonos.fecha_reg) = MONTH(CURDATE()) AND YEAR(abonos.fecha_reg) = YEAR(CURDATE())
                    `, [tipo]
                );

                const [lastPayments] = await connection.query(
                    `   	
                        SELECT IFNULL(SUM(abono),0) total FROM abonos
                            INNER JOIN ventas ON abonos.idVenta = ventas.idVenta
                            INNER JOIN clientes ON ventas.idCliente = clientes.idCliente AND clientes.municipio = ?
                            WHERE MONTH(abonos.fecha_reg) = MONTH(CURDATE() - INTERVAL 1 MONTH)
                            AND YEAR(abonos.fecha_reg) = YEAR(CURDATE() - INTERVAL 1 MONTH)

                    `, [tipo]
                );

                return [
                    {
                        month: "Mes Anterior",
                        amount: lastPayments[0].total,
                        color: "#6b7280",
                    },
                    {
                        month: "Mes Actual",
                        amount: currentPayments[0].total,
                        color: "#10b981",
                    },
                ]

            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener pagos adeudados.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        GetAbonos: async (_,{}) => {
            try {
                
                const [payments] = await connection.query(
                    `   
                    SELECT 
                        DATE_FORMAT(a.fecha_reg, '%Y-%m-%d') AS fecha,
                        CONCAT(c.nombre, ' ', c.apaterno, ' ', c.amaterno) AS cliente,
                        a.abono AS abono,
                        CASE a.tipo
                        WHEN 1 THEN 'Abono'
                        WHEN 2 THEN 'Enganche'
                        WHEN 3 THEN 'Apartado'
                        END AS tipo_abono,
                        u.nombre AS cobrador
                        FROM abonos a
                        JOIN usuarios u ON a.usuario_reg = u.idUsuario
                        JOIN ventas v ON a.idVenta = v.idVenta
                        JOIN clientes c ON v.idCliente = c.idCliente
                        WHERE a.tipo IN (1, 2, 3)
                        ORDER BY a.fecha_reg DESC;
                    `, 
                );
                
                return payments;
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener pagos adeudados.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        getPaymentsBySale: async (_,{ idVenta }) => {
            try {
                
                const [payments] = await connection.query(
                    `   
                        SELECT idAbonoProgramado, num_pago, cantidad, abono, IFNULL(fecha_programada, "N/A") AS fecha_programada, IFNULL(fecha_liquido, "N/A") AS fecha_liquido, pagado FROM abonos_programados WHERE idVenta = ?
                    `, [idVenta]
                );

               return payments;

            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener pagos.",{
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
        insertPayment: async(_,{ abono, idVenta }, ctx) => {

            console.log(abono, "  ", idVenta);

            try {

                const [pagos] = await connection.query(`
                    SELECT * FROM abonos_programados WHERE idVenta = ? AND pagado = 0`, 
                    [idVenta]
                );

                let abonoRecibido = abono;
                const resultado = [];

                for (const item of pagos) {
                    
                    const pendiente = parseFloat(item.cantidad - item.abono);
                    if (abonoRecibido <= 0) break;

                    const abonoAportado = Math.min(abonoRecibido, pendiente);

                    if(abonoAportado === item.cantidad){
                        await connection.execute(
                            `UPDATE abonos_programados SET abono = (abono + ?), pagado = 1, fecha_liquido = NOW() WHERE idAbonoProgramado = ?;`,
                            [abonoAportado, item.idAbonoProgramado]
                        )
                    }else{
                        await connection.execute(
                            `UPDATE abonos_programados SET abono = (abono + ?) WHERE idAbonoProgramado = ?;`,
                            [abonoAportado, item.idAbonoProgramado]
                        )
                    }

                    abonoRecibido -= abonoAportado;
                }

                for ( const item of resultado ) {
                    
                    await connection.execute(
                        `UPDATE abonos_programados SET abono = ;`,
                        [item.abonadoInteres, item.abonadoIVAInteres, idCredito, item.id]
                    )
                    
                }

                
                return "Venta realizada."
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error insertando venta.",{
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

export default paymentResolver;
