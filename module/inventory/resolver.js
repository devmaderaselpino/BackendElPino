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
                                WHERE stock < min_stock) AS productos_pendientes
                                FROM inventario_rosario;
                        `, []
                    );

                    return [
                        {
                            name: "Disponible",
                            value: pendingInventory[0].stock,
                            color: "#10b981",
                            description: "Productos en stock",
                        },
                        {
                            name: "Faltante",
                            value: pendingInventory[0].productos_pendientes,
                            color: "#ef4444",
                            description: "Productos agotados",
                        },
                    ]
                } else{
                    const [pendingInventory] = await connection.query(
                        `   
                            SELECT SUM(stock) AS stock, 
                                (SELECT SUM(min_stock - stock)
                                FROM inventario_escuinapa
                                WHERE stock < min_stock) AS productos_pendientes
                                FROM inventario_escuinapa;
                        `, []
                    );

                    return [
                        {
                            name: "Disponible",
                            value: pendingInventory[0].stock,
                            color: "#10b981",
                            description: "Productos en stock",
                        },
                        {
                            name: "Faltante",
                            value: pendingInventory[0].productos_pendientes,
                            color: "#ef4444",
                            description: "Productos agotados",
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
        
        GetProductosInventarios: async (_, {}) => {
            try {
                const [productosInv] = await connection.query(
                    `  
                    SELECT 
                        p.idProducto,
                        p.descripcion AS nombre,
                        c.descripcion AS categoria,
                        p.precio,
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






    },

     Mutation: { 
        actualizarStockEscuinapa: async (_, { idProducto, nuevoStock }) => {
            try {
                const [result] = await connection.query(
                    `UPDATE inventario_escuinapa SET stock = ? WHERE idProducto = ?`,
                    [nuevoStock, idProducto]
                );

                if (result.affectedRows === 0) {
                    throw new GraphQLError("No se encontró el producto con ese idProducto");
                }

                return {
                    success: true,
                    message: "Stock actualizado correctamente en inventario_escuinapa",
                };
            } catch (error) {
                console.error("Error al actualizar el stock en Escuinapa:", error);
                throw new GraphQLError("Error al actualizar el stock en Escuinapa", {
                    extensions: {
                        code: "BAD_REQUEST",
                        http: {
                            status: 400,
                        },
                    },
                });
            }
        },
        
        actualizarStockRosario: async (_, { idProducto, nuevoStock }) => {
            try {
                const [result] = await connection.query(
                    `UPDATE inventario_rosario SET stock = ? WHERE idProducto = ?`,
                    [nuevoStock, idProducto]
                );

                if (result.affectedRows === 0) {
                    throw new GraphQLError("No se encontró el producto con ese idProducto");
                }

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
                    [descripcion]
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

        crearProductoConInventarios: async (_, { descripcion, categoria, precio, stockMinRosario, stockMinEscuinapa }) => {
            let conn;
            try {
                conn = await connection.getConnection();
                await conn.beginTransaction();

                const [result] = await conn.query(
                    `INSERT INTO productos (descripcion, categoria, precio) VALUES (?, ?, ?)`,
                    [descripcion, categoria, precio]
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
                    precio,
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
    }
    






};

export default inventoryResolver;
