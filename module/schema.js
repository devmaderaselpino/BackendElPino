import { makeExecutableSchema } from "@graphql-tools/schema";
import { mergeTypeDefs, mergeResolvers } from "@graphql-tools/merge";

import authenticationResolver from "./authentication/resolver.js";
import authenticationSchema from "./authentication/schema.js";

import clientResolver from "./clients/resolver.js";
import clientsSchema from "./clients/schema.js";

import inventoryResolver from "./inventory/resolver.js";
import inventorySchema from "./inventory/schema.js";

import paymentResolver from "./payments/resolver.js";
import paymentSchema from "./payments/schema.js";

import salesResolver from "./sales/resolver.js";
import salesSchema from "./sales/schema.js";

import locationResolver from "./locations/resolver.js";
import locationSchema from "./locations/schema.js";

const typeDefs = mergeTypeDefs([authenticationSchema, clientsSchema, inventorySchema, paymentSchema, salesSchema, locationSchema]);
const resolvers = mergeResolvers([authenticationResolver, clientResolver, inventoryResolver, paymentResolver, salesResolver, locationResolver]);

const schema = makeExecutableSchema({
    typeDefs,
    resolvers
})

export default schema;