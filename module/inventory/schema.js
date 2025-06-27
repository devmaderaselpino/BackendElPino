const inventorySchema = `#graphql

    type InventarioPendiente {
        name: String,
        value: Int,
        color: String,
        description: String
    }

    type Categoria {
        idCategoria: Int
        descripcion: String
    }

    type Producto {
        idProducto: Int
        descripcion: String
        categoria: Int
        precio: Float
        img_producto: String
        stock: Int
    }
    type ProductoInventario {
         idProducto: Int!
         nombre: String!
         categoria: String
         precio: Float
         stock_rosario: Int
         min_stock_rosario: Int
         stock_escuinapa: Int
         min_stock_escuinapa: Int
    }
    type Query {
        getPendingInventory(tipo: Int): [InventarioPendiente]
        getCategories: [Categoria]
        getProducts(categoria: Int, municipio: Int): [Producto]
        GetProductosInventarios: [ProductoInventario]
    }
    type Mutation {
         actualizarStockEscuinapa(idProducto: Int!, nuevoStock: Int!): ResponseMessage!
         actualizarStockRosario(idProducto: Int!, nuevoStock: Int!): ResponseMessage!
         crearCategoria(descripcion: String!): Categoria!
         crearProductoConInventarios(
                descripcion: String!,
                categoria: Int!,
                precio: Float!,
                stockMinRosario: Int!,
                stockMinEscuinapa: Int!
            ): Producto!
        }

        type ResponseMessage {
            success: Boolean
            message: String
        }
    
`
export default inventorySchema;
