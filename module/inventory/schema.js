const inventorySchema = `#graphql

    type InventarioPendiente {
        name: String,
        value: Int,
        color: String,
        description: String
    }

    type Query {
        getPendingInventory(tipo: Int): [InventarioPendiente]

    }
    
`
export default inventorySchema;
