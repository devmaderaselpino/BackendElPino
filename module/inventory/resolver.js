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
    },
    
};

export default inventoryResolver;
