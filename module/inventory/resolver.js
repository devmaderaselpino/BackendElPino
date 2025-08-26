import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";

const inventoryResolver = {
    Query : {
        getPendingInventory: async (_,{tipo}) => {
            try {
                
                if( tipo === 1 ) {
                    const [pendingInventory] = await connection.query(
                        `   
                            SELECT SUM(stock) AS stock, 
                                (SELECT SUM(min_stock - stock)
                                FROM inventario_rosario
                                WHERE stock < min_stock) AS productos_pendientes,
                                (SELECT COUNT(*) FROM inventario_rosario WHERE stock < min_stock) AS productos
                                FROM inventario_rosario;
                        `, []
                    );

                    return [
                        {
                            name: "Disponible",
                            value: pendingInventory[0].stock,
                            color: "#10b981",
                            description: "Productos en stock",
                            productos: pendingInventory[0].stock
                        },
                        {
                            name: "Faltante",
                            value: pendingInventory[0].productos_pendientes,
                            color: "#ef4444",
                            description: "Productos agotados",
                            productos: pendingInventory[0].productos
                        },
                    ]
                } else{
                    const [pendingInventory] = await connection.query(
                        `   
                            SELECT SUM(stock) AS stock, 
                                (SELECT SUM(min_stock - stock)
                                FROM inventario_escuinapa
                                WHERE stock < min_stock) AS productos_pendientes,
                                (SELECT COUNT(*) FROM inventario_escuinapa WHERE stock < min_stock) AS productos
                                FROM inventario_escuinapa;
                        `, []
                    );

                    return [
                        {
                            name: "Disponible",
                            value: pendingInventory[0].stock,
                            color: "#10b981",
                            description: "Productos en stock",
                            productos: pendingInventory[0].stock
                        },
                        {
                            name: "Faltante",
                            value: pendingInventory[0].productos_pendientes,
                            color: "#ef4444",
                            description: "Productos agotados",
                            productos: pendingInventory[0].productos
                        },
                    ]
                }
                
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener el inventario pendiente.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        getCategories: async (_,{  }) => {
            try {
                
                const [categorias] = await connection.query(
                    `   
                        SELECT 0 AS idCategoria, "Todas" AS descripcion
                            UNION
                            SELECT * FROM categorias
                    `, []
                );
 
                return categorias;
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener las categorías.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        getProducts: async (_,{ categoria, municipio }) => {

            let where = "";

            if(categoria !== 0){
                where = `AND p.categoria = ${categoria}`
            }

            try {
                if(municipio === 1 ){
                   
                    const [productos] = await connection.query(

                        `   
                            SELECT p.*, ir.stock 
                                FROM productos p
                                INNER JOIN inventario_rosario ir ON p.idProducto = ir.idProducto
                                WHERE ir.stock > 0 ${where}
                        `,
                    );

                    return productos;
                    
                }else{

                    const [productos] = await connection.query(

                        `   
                            SELECT p.*, ie.stock 
                                FROM productos p
                                INNER JOIN inventario_escuinapa ie ON p.idProducto = ie.idProducto
                                WHERE ie.stock > 0 ${where}
                        `,
                    );

                    return productos;
                }
 
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener las categorías.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        getCategorias: async (_, __, { }) => {
            try {
                const [categorias] = await connection.query('SELECT * FROM categorias');
                return categorias;
            } catch (error) {
                console.error("Error al obtener categorías:", error);
                throw new Error("No se pudieron obtener las categorías");
            }
        },
        GetProductosInventarios: async (_, {}) => {
            try {
                const [productosInv] = await connection.query(
                    `  
                    SELECT 
                        p.idProducto,
                        p.descripcion AS nombre,
                        c.descripcion AS categoria,
                        p.precio,
                        p.img_producto,
                        p.status,
                        ir.stock AS stock_rosario,
                        ir.min_stock AS min_stock_rosario,
                        ie.stock AS stock_escuinapa,
                        ie.min_stock AS min_stock_escuinapa
                    FROM productos p
                    LEFT JOIN categorias c ON p.categoria = c.idcategoria
                    LEFT JOIN inventario_rosario ir ON p.idproducto = ir.idproducto
                    LEFT JOIN inventario_escuinapa ie ON p.idproducto = ie.idproducto;
                    `, 
                );

                return productosInv;
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener los productos de los inventarios", {
                    extensions: {
                        code: "BAD_REQUEST",
                        http: {
                            status: 400
                        }
                    }
                });
            }
        },
        getHistorialAjustes: async (_, __) => {
            try {
                const [ajustes] = await connection.query(
                    `
                        SELECT 
                            ai.id,
                            ai.idProducto,
                            p.descripcion AS producto,
                            ai.idUsuario,
                            u.nombre AS usuario,
                            ai.ubicacion,
                            ai.stock AS stockAnterior,
                            ai.nuevoStock AS cantidad,
                            ai.nota,
                            DATE_FORMAT(ai.fecha, '%Y-%m-%d %H:%i') AS fecha
                            FROM ajustes_inventario ai
                            INNER JOIN productos p ON ai.idProducto = p.idProducto
                            INNER JOIN usuarios u ON ai.idUsuario = u.idUsuario
                            ORDER BY ai.fecha DESC;
                    `
                );

                return ajustes;
            } catch (error) {
                console.error("Error al obtener historial:", error);
                throw new GraphQLError("No se pudo obtener el historial de ajustes", {
                    extensions: {
                        code: "BAD_REQUEST",
                        http: { status: 400 },
                    },
                });
            }
        }





    },

     Mutation: { 
        actualizarStockEscuinapa: async (_, { idProducto, nuevoStock, nota }, ctx) => {
            try {
                
                const [productoActivo] = await connection.query(
                    `SELECT status FROM productos WHERE idProducto = ?`,
                    [idProducto]
                );

                if (productoActivo.length === 0 || productoActivo[0].status !== 1) {
                    throw new GraphQLError("El producto está inactivo o no existe.");
                }

                
                const [stockResult] = await connection.query(
                    `SELECT stock FROM inventario_escuinapa WHERE idProducto = ?`,
                    [idProducto]
                );

                if (stockResult.length === 0) {
                    throw new GraphQLError("No se encontró el producto en Escuinapa.");
                }

                const stockAnterior = stockResult[0].stock;

                
                const [updateResult] = await connection.query(
                    `UPDATE inventario_escuinapa SET stock = ? WHERE idProducto = ?`,
                    [nuevoStock, idProducto]
                );

                if (updateResult.affectedRows === 0) {
                    throw new GraphQLError("Error al actualizar el producto.");
                }

                
                await connection.query(
                    `INSERT INTO ajustes_inventario (idProducto, idUsuario, ubicacion, stock, nuevoStock, nota, fecha)
                    VALUES (?, ?, 'escuinapa', ?, ?, ?, NOW())`,
                    [idProducto, ctx.usuario.idUsuario, stockAnterior, nuevoStock, nota]
                );

                return {
                    success: true,
                    message: "Stock actualizado correctamente en inventario_escuinapa",
                };
            } catch (error) {
                console.error("Error al actualizar el stock en Escuinapa:", error);
                throw new GraphQLError("Error al actualizar el stock en Escuinapa", {
                    extensions: {
                        code: "BAD_REQUEST",
                        http: { status: 400 },
                    },
                });
            }
        },
        actualizarStockRosario: async (_, { idProducto, nuevoStock, nota }, ctx) => {
            try {
                
                const [productoActivo] = await connection.query(
                    `SELECT status FROM productos WHERE idProducto = ?`,
                    [idProducto]
                );

                if (productoActivo.length === 0 || productoActivo[0].status !== 1) {
                    throw new GraphQLError("El producto está inactivo o no existe.");
                }

                const [stockResult] = await connection.query(
                    `SELECT stock FROM inventario_rosario WHERE idProducto = ?`,
                    [idProducto]
                );

                if (stockResult.length === 0) {
                    throw new GraphQLError("No se encontró el producto en Rosario.");
                }

                const stockAnterior = stockResult[0].stock;

                const [updateResult] = await connection.query(
                    `UPDATE inventario_rosario SET stock= ? WHERE idProducto = ?`,
                    [nuevoStock, idProducto]
                );

                if (updateResult.affectedRows === 0) {
                    throw new GraphQLError("Error al actualizar el stock.");
                }

                await connection.query(
                    `INSERT INTO ajustes_inventario (idProducto, idUsuario, ubicacion, stock, nuevoStock, nota, fecha)
                    VALUES (?, ?, 'rosario', ?, ?, ?, NOW())`,
                    [idProducto, ctx.usuario.idUsuario, stockAnterior, nuevoStock, nota]
                );

                return {
                    success: true,
                    message: "Stock actualizado correctamente en inventario_rosario",
                };
            } catch (error) {
                console.error("Error al actualizar el stock en Rosario:", error);
                throw new GraphQLError("Error al actualizar el stock en Rosario", {
                    extensions: {
                        code: "BAD_REQUEST",
                        http: {
                            status: 400,
                        },
                    },
                });
            }
        },
        crearCategoria: async (_, { descripcion }) => {
            let conn;
            try {
                conn = await connection.getConnection(); 
                const [result] = await conn.query(
                    'INSERT INTO categorias (descripcion) VALUES (?)',
                    [descripcion.toUpperCase()]
                );

                return {
                    idCategoria: result.insertId,
                    descripcion,
                };
            } catch (error) {
                console.error("Error al crear categoría:", error);
                throw new GraphQLError("No se pudo crear la categoría", {
                    extensions: {
                        code: "BAD_REQUEST",
                        originalError: error.message,
                    },
                });
            } finally {
                if (conn) conn.release(); 
            }
        },
        crearProductoConInventarios: async (_, { descripcion, categoria, precio, img_producto, status,stockMinRosario, stockMinEscuinapa }) => {
            let conn;
            try {
                conn = await connection.getConnection();
                await conn.beginTransaction();

                const [result] = await conn.query(
                    `INSERT INTO productos (descripcion, categoria, precio,img_producto,status) VALUES (?, ?, ?,?,?)`,
                    [descripcion.toUpperCase(), categoria, precio,img_producto,status]
                );

                const idProducto = result.insertId;

                await conn.query(
                    `INSERT INTO inventario_rosario (idproducto, stock, min_stock) VALUES (?, ?, ?)`,
                    [idProducto, 0, stockMinRosario]
                );

                await conn.query(
                    `INSERT INTO inventario_escuinapa (idproducto, stock, min_stock) VALUES (?, ?, ?)`,
                    [idProducto, 0, stockMinEscuinapa]
                );

                await conn.commit();

                return {
                    idProducto,
                    descripcion,
                    categoria,
                    img_producto,
                    precio,
                    status
                };
            } catch (error) {
                if (conn) await conn.rollback();
                console.error("Error en la transacción:", error);
                throw new GraphQLError("Error al crear el producto en bodegas", {
                    extensions: {
                        code: "BAD_REQUEST",
                        http: {
                            status: 400,
                        },
                    },
                });
            } finally {
                if (conn) conn.release();
            }
        },
        eliminarProducto: async (_, { idProducto }) => {
            try {
                const [result] = await connection.query(
                    `UPDATE productos SET STATUS = 0 WHERE STATUS = 1 AND idProducto = ?`,
                    [idProducto]
                );

                if (result.affectedRows === 0) {
                    return {
                        success: false,
                        message: "No se encontró el producto o ya estaba eliminado.",
                    };
                }

                return {
                    success: true,
                    message: "Producto eliminado correctamente.",
                };
            } catch (error) {
                console.error("Error al eliminar producto:", error);
                throw new GraphQLError("Error al eliminar el producto", {
                    extensions: {
                        code: "BAD_REQUEST",
                    },
                });
            }
        },
        activarProducto: async (_, { idProducto }) => {
            try {
                const [result] = await connection.query(
                    `UPDATE productos SET STATUS = 1 WHERE STATUS = 0 AND idProducto = ?`,
                    [idProducto]
                );

                if (result.affectedRows === 0) {
                    return {
                        success: false,
                        message: "No se encontró el producto o ya estaba activo.",
                    };
                }

                return {
                    success: true,
                    message: "Producto activado correctamente.",
                };
            } catch (error) {
                console.error("Error al activar producto:", error);
                throw new GraphQLError("Error al activar el producto", {
                    extensions: {
                        code: "BAD_REQUEST",
                    },
                });
            }
        },
        updateProducto: async (_,
        {
            idProducto,
            descripcion,
            categoria,
            precio,
            img_producto,
            min_stock_rosario,
            min_stock_escuinapa
        }
        ) => {
            try {
                
                const [existing] = await connection.query(
                    `SELECT * FROM productos WHERE idProducto = ?`,
                    [idProducto]
                );

                if (existing.length === 0) {
                    throw new GraphQLError("Producto no encontrado.");
                }

                const updates = [];
                const values = [];

                if (descripcion !== undefined) {
                    updates.push("descripcion = ?");
                    values.push(descripcion.toUpperCase());
                }

                if (categoria !== undefined) {
                    updates.push("categoria = ?");
                    values.push(categoria);
                }

                if (precio !== undefined) {
                    updates.push("precio = ?");
                    values.push(precio);
                }

                if (img_producto !== undefined) {
                    updates.push("img_producto = ?");
                    values.push(img_producto);
                }

                if (updates.length > 0) {
                    values.push(idProducto);

                    await connection.query(
                        `UPDATE productos SET ${updates.join(", ")} WHERE idProducto = ?`,
                        values
                    );
                }

                if (min_stock_rosario !== undefined) {
                    await connection.query(
                        `UPDATE inventario_rosario SET min_stock = ? WHERE idProducto = ?`,
                        [min_stock_rosario, idProducto]
                    );
                }

                if (min_stock_escuinapa !== undefined) {
                    await connection.query(
                        `UPDATE inventario_escuinapa SET min_stock = ? WHERE idProducto = ?`,
                        [min_stock_escuinapa, idProducto]
                    );
                }

                const [updatedProduct] = await connection.query(
                    `SELECT 
                        p.idProducto, p.descripcion, p.categoria, p.precio, p.img_producto,
                        r.min_stock AS min_stock_rosario,
                        e.min_stock AS min_stock_escuinapa
                        FROM productos p
                        LEFT JOIN inventario_rosario r ON p.idProducto = r.idProducto
                        LEFT JOIN inventario_escuinapa e ON p.idProducto = e.idProducto
                        WHERE p.idProducto = ?`,
                    [idProducto]
                );

                return {
                    success: true,
                    message: "Producto actualizado correctamente.",
                    producto: updatedProduct[0],
                };
            } catch (error) {
                console.error("Error al actualizar el producto:", error);
                throw new GraphQLError("Error al actualizar el producto.", {
                    extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }
        }
    }
    
};

export default inventoryResolver;
