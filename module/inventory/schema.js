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
        precio: Float
        img_producto: String
        stock: Int
    }

    type Query {
        getPendingInventory(tipo: Int): [InventarioPendiente]
        getCategories: [Categoria]
        getProducts(categoria: Int, municipio: Int): [Producto]
    }
    
`
export default inventorySchema;
