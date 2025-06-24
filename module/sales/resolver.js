import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";
import { addDay, weekEnd, weekStart, format, addMonth } from "@formkit/tempo"

const salesResolver = {
    Query : {
       
        getSalesAmount: async (_,{ tipo }) => {
            
            try {
                
                const [currentSales] = await connection.query(
                    `   
                        SELECT IFNULL(SUM(total),0) AS total FROM ventas
                            INNER JOIN clientes ON ventas.idCliente = clientes.idCliente AND clientes.municipio = ?
                            WHERE MONTH(ventas.fecha) = MONTH(CURDATE()) AND YEAR(ventas.fecha) = YEAR(CURDATE())
                    `, [tipo]
                );

                const [lastSales] = await connection.query(
                    `   	
                        SELECT IFNULL(SUM(total),0) AS total FROM ventas
                            INNER JOIN clientes ON ventas.idCliente = clientes.idCliente AND clientes.municipio = ?
                            WHERE MONTH(ventas.fecha) = MONTH(CURDATE() - INTERVAL 1 MONTH)
                            AND YEAR(ventas.fecha) = YEAR(CURDATE() - INTERVAL 1 MONTH)

                    `, [tipo]
                );

                return [
                    {
                        month: "Mes Anterior",
                        amount: lastSales[0].total,
                        color: "#6b7280",
                    },
                    {
                        month: "Mes Actual",
                        amount: currentSales[0].total,
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
        getSalesByClient: async (_, { input }) => {

            const {idCliente, status} = input;
            
            let queryStatus = "";

            if(status === 1){
                queryStatus = "AND status = 0"
            }

            if(status === 2){
                queryStatus = "AND status = 1"
            }

            if(status === 3){
                queryStatus = "AND status = 2"
            }

            const [ventas] = await connection.query(
                `SELECT * FROM ventas WHERE idCliente = ? ${queryStatus}`,
                [idCliente]
            );
            return ventas;
        },
        getLastSaleByClient: async (_,{idCliente}) => {
            try {
                
                const [date] = await connection.query(
                    `   
                       SELECT fecha FROM ventas WHERE idCliente = ? ORDER BY fecha DESC LIMIT 1;
                    `, [idCliente]
                );

                if(date.length > 0){
                    return date[0].fecha;
                }
                
                return '';
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
        getClientStats: async (_,{idCliente}) => {
            try {
                
                const [sales] = await connection.query(
                    `   
                       SELECT IFNULL(SUM(total),0) AS total_comprado, COUNT(idVenta) AS total_compras FROM ventas WHERE idCliente = ? AND (STATUS = 1 OR STATUS = 0);
                    `, [idCliente]
                );
                
                return sales[0];
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
        GetVentas: async (_,{}) => {
            try {
                
                const [ventas] = await connection.query(
                    `   SELECT 
                            DATE_FORMAT(v.fecha, '%Y-%m-%d') AS fecha,
                            GROUP_CONCAT(p.descripcion SEPARATOR ', ') AS articulos,
                            CONCAT(c.nombre, ' ', c.apaterno, ' ', c.amaterno) AS cliente,
                            v.total,
                            CASE v.tipo
                                WHEN 1 THEN 'contado'
                                WHEN 2 THEN 'credito 6 meses'
                                WHEN 3 THEN 'credito 12 meses'
                                ELSE 'Otro'
                            END AS tipo,
                            CASE v.status
                                WHEN 0 THEN 'Liquidada'
                                WHEN 1 THEN 'Pendiente'
                                WHEN 2 THEN 'Cancelada'
                                ELSE 'Desconocido'
                            END AS status
                            FROM ventas v
                            JOIN productos_venta pv ON v.idventa = pv.idventa
                            JOIN productos p ON pv.idproducto = p.idproducto
                            JOIN clientes c ON v.idcliente = c.idcliente
                            GROUP BY v.idventa, v.fecha, c.nombre, c.apaterno, c.amaterno, v.tipo, v.status
                            ORDER BY v.fecha DESC;

                    `, 
                );
                
                return ventas;
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener el historial ventas.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        getTotalsBySale: async (_, {idVenta}) => {
            try {
                
                const [[pendiente]] = await connection.query(
                    `   
                       SELECT SUM(cantidad) AS cantidad_pendiente FROM abonos_programados WHERE idVenta = ? AND pagado = 0;
                    `, [idVenta]
                );

                const [[abono]] = await connection.query(
                    `   
                        SELECT IFNULL(SUM(cantidad),0) AS cantidad_abono FROM abonos_programados WHERE idVenta = ? 
                            AND pagado = 0 AND (fecha_programada < NOW() || MONTH(fecha_programada) = MONTH(CURDATE()) AND YEAR(fecha_programada) = YEAR(CURDATE()));
                    `, [idVenta]
                );

                const [[nombre_cliente]] = await connection.query(
                    `   
                        SELECT CONCAT(c.nombre, " ", c.aPaterno, " ", c.aMaterno) AS nombre_cliente FROM ventas 
                            INNER JOIN clientes c ON ventas.idCliente = c.idCliente
                            WHERE idVenta = ?;
                    `, [idVenta]
                );

                return {
                    pendiente: pendiente.cantidad_pendiente,
                    abono: abono.cantidad_abono,
                    nombre: nombre_cliente.nombre_cliente
                };
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener totales.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        }
    },
    Sale: {
        getProducts: async (parent) => {
            const [products] = await connection.query(
                `SELECT 
                    p.descripcion, pv.id,
                    pv.cantidad,
                    p.precio, p.img_producto 
                    FROM productos_venta pv
                    INNER JOIN productos p ON pv.idProducto = p.idProducto
                    WHERE pv.idVenta = ?`,
                [parent.idVenta]
            );
            return products;
        },
    },
    Mutation : {
        insertSale: async(_,{ input }, ctx) => {

            try {
                let status = 1;
                
                const { total, idCliente, fecha, tipo, productos, abono, municipio} = input;
                
                let plazo = tipo;
                
                if(tipo === 1){
                    status = 0;
                }

                if(tipo === 2){
                    plazo = 6;
                }

                if(tipo === 3){
                    plazo = 12;
                }

                const venta = await connection.execute(
                    `
                       INSERT INTO ventas SET total = ?, usuario_reg = ?, idCliente = ?, fecha = NOW(), tipo = ?, status = ?; 
                    `,[total, ctx.usuario.idUsuario, idCliente, tipo, status]
                );

                for(const producto of productos){
                    
                    const productosVenta = await connection.execute(
                        `
                           INSERT INTO productos_venta SET idVenta = ?, idProducto = ?, cantidad = ?, precio = ?; 
                        `,[venta[0].insertId, producto.idProducto, producto.cantidad, producto.precio]
                    
                    );
                }
   
                if(abono > 0 && tipo !== 1){
                    const abonoI = await connection.execute(
                        `
                            INSERT INTO abonos SET idVenta = ?, abono = ?, fecha_reg = NOW(), usuario_reg = ?, tipo = 2; 
                        `,[venta[0].insertId, abono, ctx.usuario.idUsuario]
                        
                    );
                }

                if(tipo === 1){
                    const abonoI = await connection.execute(
                        `
                            INSERT INTO abonos SET idVenta = ?, abono = ?, fecha_reg = NOW(), usuario_reg = ?, tipo = 4; 
                        `,[venta[0].insertId, total, ctx.usuario.idUsuario]
                        
                    );
                }

                if(municipio === 1){
                    for(const producto of productos){
                    
                        const inventariosVenta = await connection.execute(
                            `
                            UPDATE inventario_rosario SET stock = (stock - ?) WHERE idProducto = ?; 
                            `,[producto.cantidad, producto.idProducto]
                        
                        );
                    }
                }else if(municipio === 2){
                    for(const producto of productos){
                    
                        const inventariosVenta = await connection.execute(
                            `
                            UPDATE inventario_escuinapa SET stock = (stock - ?) WHERE idProducto = ?; 
                            `,[producto.cantidad, producto.idProducto]
                        
                        );
                    }
                }

                let fecha_programada = format(weekEnd(new Date()), "YYYY-MM-DD", "en");

                if(tipo !== 1){
                    for( let index = 0; index < plazo; index++ ){
                        fecha_programada = format(addMonth(fecha_programada), "YYYY-MM-DD", "en");
    
                        const abonoProgramados = await connection.execute(
                            `
                                INSERT INTO abonos_programados SET idVenta = ?, num_pago = ?, cantidad = ?, fecha_programada = ?; 
                            `,[venta[0].insertId, index + 1, (total - abono) / plazo, fecha_programada]
                            
                        );
                        
                    }
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

export default salesResolver;
