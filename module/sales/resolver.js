import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";
import { addDay, weekEnd, weekStart, format, addMonth, diffMonths } from "@formkit/tempo";
import mazatlanHora from "../../functions/MazatlanHora.js";
import firsSchedulePayment from "../../functions/firstSchedulePayment.js";

const salesResolver = {
    Query : {
       
        getSalesAmount: async (_,{ tipo }) => {
            
            try {
                
                const [currentSales] = await connection.query(
                    `   
                        SELECT IFNULL(SUM(total),0) AS total FROM ventas
                            INNER JOIN clientes ON ventas.idCliente = clientes.idCliente AND clientes.municipio = ?
                            WHERE MONTH(ventas.fecha) = MONTH(?) AND YEAR(ventas.fecha) = YEAR(?) AND ventas.status <> 2
                    `, [tipo, mazatlanHora(), mazatlanHora()]
                );

                const [lastSales] = await connection.query(
                    `   	
                        SELECT IFNULL(SUM(total),0) AS total FROM ventas
                            INNER JOIN clientes ON ventas.idCliente = clientes.idCliente AND clientes.municipio = ?
                            WHERE MONTH(ventas.fecha) = MONTH(? - INTERVAL 1 MONTH)
                            AND YEAR(ventas.fecha) = YEAR(? - INTERVAL 1 MONTH) AND ventas.status <> 2

                    `, [tipo, mazatlanHora(), mazatlanHora()]
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
                `SELECT * FROM ventas WHERE idCliente = ? ${queryStatus} ORDER BY fecha DESC`,
                [idCliente]
            );
 
            return ventas;
        },
        getSaleByClient: async (_, { idVenta }) => {

            const [ventas] = await connection.query(
                `SELECT * FROM ventas WHERE idVenta = ?`,
                [idVenta]
            );

            
            return ventas[0];
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
                            v.idVenta AS numVenta,
                            GROUP_CONCAT(p.descripcion SEPARATOR ', ') AS articulos,
                            v.idcliente as idcliente,
                            CONCAT(c.nombre, ' ', c.apaterno, ' ', c.amaterno) AS cliente,
                            v.total,
                            (SELECT IFNULL(SUM(pc.cantidad * pc.precio),0) FROM productos_cancelados pc WHERE pc.idVenta = v.idVenta) AS cantidad_cancelada,
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
                
                const [infoVenta]  = await connection.query(
                    `   
                       SELECT tipo, fecha, total FROM ventas WHERE idVenta = ?;
                    `, [idVenta]
                );

                let diferencia = diffMonths(new Date(), infoVenta[0].fecha);

                if(diferencia < 0) {
                    diferencia = diferencia * -1;
                }

                diferencia = diferencia + 1;
     
                const [[pendiente]] = await connection.query(
                    `   
                       SELECT SUM(cantidad - abono) AS cantidad_pendiente, SUM(interes-abono_interes) AS interes_pendiente FROM abonos_programados WHERE idVenta = ? AND pagado = 0 AND status = 1;
                    `, [idVenta]
                );
                
                let descuento = 0;
                
                let totalPendiente = pendiente.cantidad_pendiente;

                if(infoVenta[0].tipo === 2){
                    switch(diferencia){
                        case 1:
                            descuento = infoVenta[0].total * 0.275;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 2:
                            descuento = infoVenta[0].total * 0.20;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 3:
                            descuento = infoVenta[0].total * 0.15;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 4:
                            descuento = infoVenta[0].total * 0.10;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 5: 
                            descuento = infoVenta[0].total * 0.05;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        default: 
                            break;
                    }
                } else if(infoVenta[0].tipo === 3){
                    switch(diferencia){
                        case 1:
                            descuento = infoVenta[0].total * 0.275;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 2:
                            descuento = infoVenta[0].total * 0.20;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 3:
                            descuento = infoVenta[0].total * 0.18;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 4:
                            descuento = infoVenta[0].total * 0.16;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 5:
                            descuento = infoVenta[0].total * 0.14;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 6:
                            descuento = infoVenta[0].total * 0.12;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 7:
                            descuento = infoVenta[0].total * 0.10;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 8:
                            descuento = infoVenta[0].total * 0.08;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 9:
                            descuento = infoVenta[0].total * 0.06;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 10:
                            descuento = infoVenta[0].total * 0.04;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 11:
                            descuento = infoVenta[0].total * 0.02;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        default: 
                            break;
                    }
                }

                const [[abono]] = await connection.query(
                    `   
                        SELECT IFNULL(SUM(cantidad - abono),0) AS cantidad_abono FROM abonos_programados WHERE idVenta = ? 
	                        AND pagado = 0 AND status = 1 AND (MONTH(fecha_programada) = MONTH(?) AND YEAR(fecha_programada) = YEAR(?));
                    `, [idVenta, mazatlanHora(), mazatlanHora()]
                );

                const [[abonoaAtrasado]] = await connection.query(
                    `   
                        SELECT IFNULL(SUM(cantidad - abono),0) AS cantidad_abono FROM abonos_programados WHERE idVenta = ? 
	                        AND pagado = 0 AND status = 1 AND (fecha_programada < ?);
                    `, [idVenta, mazatlanHora()]
                );

                const [[nombre_cliente]] = await connection.query(
                    `   
                        SELECT CONCAT(c.nombre, " ", c.aPaterno, " ", c.aMaterno) AS nombre_cliente FROM ventas 
                            INNER JOIN clientes c ON ventas.idCliente = c.idCliente
                            WHERE idVenta = ?;
                    `, [idVenta]
                );

                return {
                    pendiente: Math.ceil(totalPendiente + pendiente.interes_pendiente),
                    total: pendiente.cantidad_pendiente + pendiente.interes_pendiente,
                    interes: pendiente.interes_pendiente,
                    abono: abono.cantidad_abono,
                    atrasado: abonoaAtrasado.cantidad_abono,
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
        },
        getPorcentajePagado: async (_, {idVenta}) => {
            try {
                
                const [infoVenta]  = await connection.query(
                    `   
                       SELECT tipo, fecha, total FROM ventas WHERE idVenta = ?;
                    `, [idVenta]
                );

                const [[abonado]] = await connection.query(
                    `   
                       SELECT SUM(abono) - SUM(interes) AS total_abonado FROM abonos_programados WHERE idVenta = ? AND status = 1;
                    `, [idVenta]
                );

                let diferencia = diffMonths(new Date(), infoVenta[0].fecha);

                if(diferencia < 0) {
                    diferencia = diferencia * -1;
                }

                diferencia = diferencia + 1;
     
                const [[pendiente]] = await connection.query(
                    `   
                       SELECT SUM(cantidad - abono) AS cantidad_pendiente FROM abonos_programados WHERE idVenta = ? AND pagado = 0 AND status = 1;
                    `, [idVenta]
                );
                
                let descuento = 0;
                
                let totalPendiente = pendiente.cantidad_pendiente;

                if(infoVenta[0].tipo === 2){
                    switch(diferencia){
                        case 1:
                            descuento = infoVenta[0].total * 0.275;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 2:
                            descuento = infoVenta[0].total * 0.20;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 3:
                            descuento = infoVenta[0].total * 0.15;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 4:
                            descuento = infoVenta[0].total * 0.10;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 5: 
                            descuento = infoVenta[0].total * 0.05;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        default: 
                            break;
                    }
                } else if(infoVenta[0].tipo === 3){
                    switch(diferencia){
                        case 1:
                            descuento = infoVenta[0].total * 0.275;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 2:
                            descuento = infoVenta[0].total * 0.20;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 3:
                            descuento = infoVenta[0].total * 0.18;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 4:
                            descuento = infoVenta[0].total * 0.16;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 5:
                            descuento = infoVenta[0].total * 0.14;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 6:
                            descuento = infoVenta[0].total * 0.12;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 7:
                            descuento = infoVenta[0].total * 0.10;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 8:
                            descuento = infoVenta[0].total * 0.08;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 9:
                            descuento = infoVenta[0].total * 0.06;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 10:
                            descuento = infoVenta[0].total * 0.04;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 11:
                            descuento = infoVenta[0].total * 0.02;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        default: 
                            break;
                    }
                }

                const [[info]] = await connection.query(
                    `   
                        SELECT (SUM(abono) * 100) / ? AS porcentaje_abonado FROM abonos_programados WHERE idVenta = ? AND status = 1;
                    `, [totalPendiente, idVenta]
                );

                const [[nombre_cliente]] = await connection.query(
                    `   
                        SELECT CONCAT(c.nombre, " ", c.aPaterno, " ", c.aMaterno) AS nombre_cliente FROM ventas 
                            INNER JOIN clientes c ON ventas.idCliente = c.idCliente
                            WHERE idVenta = ?;
                    `, [idVenta]
                );

                return {
                    nombre: nombre_cliente.nombre_cliente,
                    porcentaje_abonado: info.porcentaje_abonado,
                    abonos_total: abonado.total_abonado
                };
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener porcentaje.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        getVentasByCobrador: async (_,{}, ctx) => {
            try {
                const [ventas] = await connection.query(
                    `   SELECT v.idVenta, v.total, DATE_FORMAT(v.fecha, "%Y-%m-%d %H:%i:%s") AS fecha, v.idCliente, v.tipo
                            FROM ventas v
                            WHERE v.idCliente IN (SELECT ar.idCliente FROM asignacion_rutas ar WHERE ar.idCobrador = ?) AND v.status = 1

                    `, [ctx.usuario.idUsuario]
                );

                return ventas;
            } catch (error) {
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
        getDetallesVentaByCobrador: async (_,{}, ctx) => {
            try {
                const [detalle] = await connection.query(
                    `   SELECT pv.id, pv.idVenta, pv.cantidad, p.descripcion, pv.precio, p.img_producto
                            FROM productos_venta pv
                            INNER JOIN productos p ON pv.idProducto = p.idProducto
                            INNER JOIN ventas v ON pv.idVenta = v.idVenta AND v.status = 1
                            WHERE v.idCliente IN (SELECT idCliente FROM asignacion_rutas WHERE idCobrador = ? AND STATUS = 1)

                    `, [ctx.usuario.idUsuario]
                );

                return detalle;
            } catch (error) {
                throw new GraphQLError("Error al obtener el detalle de ventas.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
            }
        },
        getEngancheByVenta: async (_, { idVenta }) => {

            const [[info]] = await connection.query(
                `SELECT IFNULL(SUM(a.abono),0) AS enganche,
                    (SELECT CONCAT_WS(" ", c.nombre, c.aPaterno, c.aMaterno)
                        FROM clientes c
                        INNER JOIN ventas v ON c.idCliente = v.idCliente
                        WHERE v.idVenta = ?
                    ) AS nombre,
                    (SELECT c.celular
                        FROM clientes c
                        INNER JOIN ventas v ON c.idCliente = v.idCliente
                        WHERE v.idVenta = ?
                    ) AS celular
                    FROM abonos a
                    WHERE a.idVenta = ? AND a.tipo = 2`,
                [idVenta, idVenta, idVenta]
            );

            return info;
        },
    },
    Sale: {
        getProducts: async (parent) => {
            const [products] = await connection.query(
                `SELECT 
                    p.descripcion, pv.id, pv.idProducto,
                    pv.cantidad,
                    pv.precio, p.img_producto 
                    FROM productos_venta pv
                    INNER JOIN productos p ON pv.idProducto = p.idProducto
                    WHERE pv.idVenta = ? AND pv.cantidad > 0`,
                [parent.idVenta]
            );
            return products;
        },
        getCancelados: async (parent) => {
            const [products] = await connection.query(
                `SELECT 
                    p.descripcion, pc.id, pc.idProducto,
                    pc.cantidad,
                    pc.precio, p.img_producto 
                    FROM productos_cancelados pc
                    INNER JOIN productos p ON pc.idProducto = p.idProducto
                    WHERE pc.idVenta = ? AND pc.cantidad > 0`,
                [parent.idVenta]
            );
           
            return products;
        },
    },
    Mutation : {
        insertSale: async(_,{ input }, ctx) => {

            try {
                let status = 1;
                
                const { total, idCliente, tipo, productos, abono, municipio} = input;
                
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
                       INSERT INTO ventas SET total = ?, usuario_reg = ?, idCliente = ?, fecha = ?, tipo = ?, status = ?; 
                    `,[total, ctx.usuario.idUsuario, idCliente, mazatlanHora(), tipo, status]
                );

                for(const producto of productos){
                    
                    const productosVenta = await connection.execute(
                        `
                           INSERT INTO productos_venta SET idVenta = ?, idProducto = ?, cantidad = ?, precio = ?; 
                        `,[venta[0].insertId, producto.idProducto, producto.cantidad, Math.ceil(producto.precio)]
                    
                    );
                }
   
                if(abono > 0 && tipo !== 1){
                    const abonoI = await connection.execute(
                        `
                            INSERT INTO abonos SET idVenta = ?, abono = ?, fecha_reg = ?, saldo_anterior = ?, saldo_nuevo = ?, usuario_reg = ?, tipo = 2; 
                        `,[venta[0].insertId, abono, mazatlanHora(), total, total - abono, ctx.usuario.idUsuario]
                        
                    );
                }

                if(tipo === 1){
                    const abonoI = await connection.execute(
                        `
                            INSERT INTO abonos SET idVenta = ?, abono = ?, fecha_reg = ?, saldo_anterior = ?, saldo_nuevo = 0, usuario_reg = ?, tipo = 4; 
                        `,[venta[0].insertId, total, mazatlanHora(), total, ctx.usuario.idUsuario]
                        
                    );
                }

                if(municipio === 1){
                    for(const producto of productos){

                        const [stockResult] = await connection.query(
                            `SELECT stock FROM inventario_rosario WHERE idProducto = ?`,
                            [producto.idProducto]
                        );

                        const stockAnterior = stockResult[0].stock;
                    
                        const inventariosVenta = await connection.execute(
                            `
                            UPDATE inventario_rosario SET stock = (stock - ?) WHERE idProducto = ?; 
                            `,[producto.cantidad, producto.idProducto]
                        
                        );

                        await connection.query(
                            `INSERT INTO ajustes_inventario (idProducto, idUsuario, ubicacion, stock, nuevoStock, nota, fecha)
                            VALUES (?, ?, 'rosario', ?, ?, ?, ?)`,
                            [producto.idProducto, ctx.usuario.idUsuario, stockAnterior, stockAnterior - producto.cantidad, "Venta en rosario", mazatlanHora()]
                        );
                    }
                }else if(municipio === 2){
                    for(const producto of productos){

                        const [stockResult] = await connection.query(
                            `SELECT stock FROM inventario_escuinapa WHERE idProducto = ?`,
                            [producto.idProducto]
                        );

                        const stockAnterior = stockResult[0].stock;
                    
                        const inventariosVenta = await connection.execute(
                            `
                            UPDATE inventario_escuinapa SET stock = (stock - ?) WHERE idProducto = ?; 
                            `,[producto.cantidad, producto.idProducto]
                        
                        );

                        await connection.query(
                            `INSERT INTO ajustes_inventario (idProducto, idUsuario, ubicacion, stock, nuevoStock, nota, fecha)
                            VALUES (?, ?, 'escuinapa', ?, ?, ?, ?)`,
                            [producto.idProducto, ctx.usuario.idUsuario, stockAnterior, stockAnterior - producto.cantidad, "Venta en escuinapa", mazatlanHora()]
                        );
                    }
                }

                console.log(mazatlanHora());
                

                let datePlus45 = addDay(new Date(), 45);

                let fechaProxima = firsSchedulePayment(datePlus45);

                const pagoRedondeado = Math.ceil((total - abono) / plazo);

                const totalRedondeado = pagoRedondeado * plazo;

                const diferencia = totalRedondeado - (total - abono);

                const ultimoPago = pagoRedondeado - diferencia;
            
                if(tipo !== 1){

                    for( let index = 1; index <= plazo; index++ ){ 
                        if(index === 1){
                            fechaProxima = format(fechaProxima, "YYYY-MM-DD", "en");
                        }else{
                            fechaProxima = format(addMonth(fechaProxima), "YYYY-MM-DD", "en");
                        } 
                        
                        const abonoProgramados = await connection.execute(
                            `
                                INSERT INTO abonos_programados SET idVenta = ?, idCliente = ?, num_pago = ?, cantidad = ?, fecha_programada = ?; 
                            `,[venta[0].insertId, idCliente, index, index === plazo ? ultimoPago : pagoRedondeado, fechaProxima]
                            
                        );
                    }
                }

                await connection.execute(
                    `
                       UPDATE saldo_favor SET status = 0 WHERE idCliente = ?; 
                    `,[idCliente]
                );

                return venta[0].insertId;
                
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
        editSale: async(_,{ input }, ctx) => {

            try {
                
                const { idVenta, productos, totalCancelado, historial, opcion, saldo } = input;

                const [[totalCancela]] = await connection.query(
                    `SELECT COUNT(*) AS cancelacion FROM productos_cancelados WHERE idVenta = ?`,
                    [idVenta]
                );

                await connection.execute(
                    `
                        UPDATE abonos_programados SET status = 0 WHERE idVenta = ?; 
                    `,[idVenta]
                );

                for(const producto of productos){
                        
                    const productoVenta = await connection.execute(
                        `
                        UPDATE productos_venta SET cantidad = cantidad - ? WHERE idVenta = ? AND id = ?; 
                        `,[producto.cantidad, idVenta, producto.idProducto]
                    );
                }

                if(totalCancela.cancelacion === 0){
                    for(const producto of historial){
                        
                        const productoVenta = await connection.execute(
                            `
                            INSERT INTO productos_cancelados SET idVenta = ?, idProducto = ?, cantidad = ?, precio = ?, fecha = ?, usuario_reg = ?; 
                            `,[idVenta, producto.idProducto, producto.cantidad, producto.precio, mazatlanHora(), ctx.usuario.idUsuario]
                        );
                    }
                }

                const [[abonos]] = await connection.query(
                    `SELECT IFNULL(SUM(abono),0) AS total_enganche FROM abonos WHERE idVenta = ? AND status = 1 AND tipo = 2`,
                    [idVenta]
                );

                const [[abonosA]] = await connection.query(
                    `SELECT IFNULL(SUM(abono),0) AS total_abonado FROM abonos WHERE idVenta = ? AND status = 1 AND tipo = 1`,
                    [idVenta]
                );

                const [[infoInicial]] = await connection.query(
                    `
                        SELECT total - ? AS restante, tipo, fecha, idCliente
                        FROM ventas WHERE idVenta = ?
                    `,
                    [totalCancelado, idVenta]
                );

                const [abonosActivos] = await connection.query(
                    `
                        SELECT id, abono FROM abonos WHERE idVenta = ? AND status = 1
                    `,
                    [idVenta]
                );
                
                if(opcion === 1){

                    await connection.execute(
                        `
                            UPDATE ventas SET total = 0, status = 2 WHERE idVenta = ?; 
                        `,[idVenta]
                    );

                    await connection.execute(
                        `
                            UPDATE abonos SET status = 0 WHERE idVenta = ? AND status = 1; 
                        `,[idVenta]
                    );

                    for (const item of abonosActivos){
                        await connection.execute(
                            `
                            INSERT INTO abonos_cancelados SET idAbono = ?, cantidad = ?, fecha = ?, usuario_reg = ?; 
                            `,[item.id, item.abono, mazatlanHora(), ctx.usuario.idUsuario]
                        );
                    }

                }

                if(opcion === 2){

                    await connection.execute(
                        `
                            UPDATE ventas SET total = 0, status = 2 WHERE idVenta = ?; 
                        `,[idVenta]
                    );

                    if(saldo > 0){
                        await connection.execute(
                            `
                                INSERT INTO saldo_favor SET idCliente = ?, cantidad = ?, vencimiento = DATE_ADD(?, INTERVAL 2 MONTH)
                            `,[infoInicial.idCliente, saldo, mazatlanHora()]
                            
                        )
                    }

                    await connection.execute(
                        `
                            UPDATE abonos SET status = 0 WHERE idVenta = ? AND status = 1; 
                        `,[idVenta]
                    );

                    for (const item of abonosActivos){
                        await connection.execute(
                            `
                            INSERT INTO abonos_cancelados SET idAbono = ?, cantidad = ?, fecha = ?, usuario_reg = ?; 
                            `,[item.id, item.abono, mazatlanHora(), ctx.usuario.idUsuario]
                        );
                    }

                }

                if(opcion === 3){

                    const tipo = infoInicial.tipo = 3 && infoInicial.restante < 3500 ? 2 : infoInicial.tipo;

                    await connection.execute(
                        `
                            UPDATE ventas SET total = total - ?, tipo = ? WHERE idVenta = ?; 
                        `,[totalCancelado, tipo, idVenta]
                    );

                    let fecha_programada = format((weekStart(addDay(infoInicial.fecha, 7))),  "YYYY-MM-DD", "en")

                    let plazo = 6;

                    if(infoInicial.tipo === 3){
                        plazo = 12;
                    }

                    if(infoInicial.restante > 0){

                        const pagoRedondeado = Math.ceil((infoInicial.restante - abonos.total_enganche) / plazo);

                        const totalRedondeado = pagoRedondeado * plazo;

                        const diferencia = totalRedondeado - (infoInicial.restante - abonos.total_enganche);

                        const ultimoPago = pagoRedondeado - diferencia;

                        let prueba = addDay(infoInicial.fecha, 45);

                        let fechaProxima = firsSchedulePayment(prueba);

                        for( let index = 1; index <= plazo; index++ ){
                            if(index === 1){
                                fechaProxima = format(fechaProxima, "YYYY-MM-DD", "en");
                            }else{
                                fechaProxima = format(addMonth(fechaProxima), "YYYY-MM-DD", "en");
                            } 

                            const abonoProgramados = await connection.execute(
                                `
                                    INSERT INTO abonos_programados SET idVenta = ?, idCliente = ?, num_pago = ?, cantidad = ?, fecha_programada = ?; 
                                `,[idVenta, infoInicial.idCliente, index, index === plazo ? ultimoPago : pagoRedondeado, fechaProxima]
                                
                            );
                        }

                        const [pagos] = await connection.query(`
                            SELECT * FROM abonos_programados WHERE idVenta = ? AND pagado = 0 AND status = 1`, 
                            [idVenta]
                        );

                        let abonoRecibido = abonosA.total_abonado;
                        
                        for (const item of pagos) {
                            
                            const pendiente = parseFloat(item.cantidad - item.abono);
                            if (abonoRecibido <= 0) break;

                            const abonoAportado = Math.min(abonoRecibido, pendiente);

                            if((abonoAportado + item.abono) === item.cantidad){
                                await connection.execute(
                                    `UPDATE abonos_programados SET abono = (abono + ?), pagado = 1, fecha_liquido = ? WHERE idAbonoProgramado = ?;`,
                                    [abonoAportado, mazatlanHora(), item.idAbonoProgramado]
                                )
                            }else{
                                await connection.execute(
                                    `UPDATE abonos_programados SET abono = (abono + ?) WHERE idAbonoProgramado = ?;`,
                                    [abonoAportado, item.idAbonoProgramado]
                                )
                            }

                            abonoRecibido -= abonoAportado;
                        }
                    }

                }

                return "Modificación realizada."
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error editando venta.",{
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
